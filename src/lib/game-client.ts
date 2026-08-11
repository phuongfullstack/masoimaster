'use client'

// ============================================================
// Game client — Firestore realtime subscribe + REST API wrappers.
// Replaces the Socket.io client. Components call the action wrappers;
// the GameProvider owns the onSnapshot subscription and pushes state
// into the Zustand store.
// ============================================================
import {
  collection, doc, onSnapshot, query, orderBy, type Unsubscribe,
} from 'firebase/firestore'
import { fsDb } from '@/lib/firebase'
import type {
  RoleConfig, RoomState, PlayerInfo, Phase, ActionType, MsgType,
} from '@/lib/types'

// ============================================================
// API wrappers — each POSTs to an /api/game/* route.
// ============================================================
async function post(path: string, idToken: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Yêu cầu thất bại.')
  return json as Record<string, unknown>
}

export const gameApi = {
  create: (idToken: string, config: Partial<RoleConfig>, hostMode: 'auto' | 'direct' | 'hybrid') =>
    post('/api/game/create', idToken, { config, hostMode }),
  join: (idToken: string, code: string) =>
    post('/api/game/join', idToken, { code }),
  leave: (idToken: string, code: string) =>
    post('/api/game/leave', idToken, { code }),
  ready: (idToken: string, code: string, ready: boolean) =>
    post('/api/game/ready', idToken, { code, ready }),
  start: (idToken: string, code: string) =>
    post('/api/game/start', idToken, { code }),
  nightAction: (idToken: string, code: string, actionType: ActionType, targetId: string | null, targetId2?: string | null) =>
    post('/api/game/night-action', idToken, { code, actionType, targetId, targetId2 }),
  cupidLink: (idToken: string, code: string, targetIds: [string, string]) =>
    post('/api/game/cupid-link', idToken, { code, targetIds }),
  vote: (idToken: string, code: string, targetId: string | null) =>
    post('/api/game/vote', idToken, { code, targetId }),
  hunterShoot: (idToken: string, code: string, targetId: string) =>
    post('/api/game/hunter-shoot', idToken, { code, targetId }),
  tick: (idToken: string, code: string, force = false) =>
    post('/api/game/tick', idToken, { code, force }),
  hostNext: (idToken: string, code: string) =>
    post('/api/game/host-next', idToken, { code }),
  kick: (idToken: string, code: string, targetUid: string) =>
    post('/api/game/kick', idToken, { code, targetUid }),
  message: (idToken: string, code: string, content: string, msgType: MsgType = 'public') =>
    post('/api/game/message', idToken, { code, content, msgType }),
}

// ============================================================
// onSnapshot subscription — assembles a personalized RoomState.
// Mirrors the prior server `buildRoomStateForPlayer`:
//   - own role from secrets/{uid}
//   - other players' roles blanked
//   - loverPartner from secrets/{uid}.linkedPartner
//   - votes readable during voting phase
// ============================================================
interface RoomDocClient {
  code: string; hostId: string; hostMode: 'auto' | 'direct' | 'hybrid'
  status: 'waiting' | 'playing' | 'finished'; phase: Phase; dayCount: number
  config: RoleConfig; timerEnd: number | null
  nightWake: { actionType: ActionType; label: string; duration: number; bittenPlayer?: string | null } | null
  dayResult: { deaths: string[]; saved?: boolean } | null
  voteResult: { eliminated: string | null; chainedDeaths: string[]; voteCounts: Record<string, number>; isTie: boolean } | null
  reveal: Record<string, string> | null
  gameWinner: 'werewolf' | 'villager' | 'lovers' | 'jester' | null
  ravenMarkedId?: string | null
}

export interface SubscribeCallbacks {
  onRoom: (room: RoomState | null) => void
  onMessage: (msg: { id: string; senderId: string; senderName: string; content: string; msgType: MsgType; phase: string; createdAt: number }) => void
  onClearMessages: () => void
  onError: (err: Error) => void
}

export function subscribeRoom(code: string, uid: string, cb: SubscribeCallbacks): Unsubscribe {
  const upper = code.toUpperCase()
  let latestRoom: RoomDocClient | null = null
  let latestPlayers: PlayerInfo[] = []
  let latestSecret: { role: string; linkedPartner: string | null; packmates?: string[] } | null = null
  let latestVotes: Record<string, string> = {}
  let latestWolfPicks: Record<string, string> = {}
  let messagesCleared = false

  const emit = () => {
    if (!latestRoom || !latestSecret) return

    const players: PlayerInfo[] = latestPlayers.map((p) => ({
      ...p,
      role: p.userId === uid ? (latestSecret!.role as PlayerInfo['role']) : '',
    }))

    const loverPartnerName = latestSecret.linkedPartner
      ? latestPlayers.find((p) => p.userId === latestSecret!.linkedPartner)?.username ?? null
      : null

    const roomState: RoomState = {
      id: upper, code: upper, hostId: latestRoom.hostId, status: latestRoom.status,
      phase: latestRoom.phase, dayCount: latestRoom.dayCount, hostMode: latestRoom.hostMode,
      hostIsPlayer: false, config: latestRoom.config,
      myRole: latestSecret.role as PlayerInfo['role'],
      isAlive: players.find((p) => p.userId === uid)?.isAlive ?? true,
      isHost: latestRoom.hostId === uid, players,
      // Sói thấy bầy NGAY TỪ ĐẦU VÁN qua secrets.packmates (ghi lúc start);
      // fallback reveal map cho game_over / phòng cũ chưa có packmates.
      wolfPartners: latestSecret.packmates?.length
        ? latestSecret.packmates
        : Object.entries(latestRoom.reveal ?? {})
            .filter(([id, r]) => id !== uid && (r === 'werewolf' || r === 'white_werewolf'))
            .map(([id]) => latestPlayers.find((p) => p.userId === id)?.username ?? id),
      loverPartner: loverPartnerName,
      timerEnd: latestRoom.timerEnd,
      votes: latestRoom.phase === 'voting' ? latestVotes : {},
      ravenMarkedId: latestRoom.ravenMarkedId ?? null,
      wolfPicks: latestWolfPicks,
    } as RoomState

    cb.onRoom(roomState)
  }

  // Room doc
  const unsubRoom = onSnapshot(doc(fsDb, 'rooms', upper), (snap) => {
    if (!snap.exists()) { cb.onRoom(null); return }
    latestRoom = snap.data() as RoomDocClient
    if (!messagesCleared) { cb.onClearMessages(); messagesCleared = true }
    emit()
  }, (err) => cb.onError(err))

  // Players subcollection (public)
  const unsubPlayers = onSnapshot(query(collection(fsDb, 'rooms', upper, 'players'), orderBy('seatIndex')), (snap) => {
    latestPlayers = snap.docs.map((d) => d.data() as PlayerInfo)
    emit()
  }, (err) => cb.onError(err))

  // Own secret (role, potions, lover)
  const unsubSecret = onSnapshot(doc(fsDb, 'rooms', upper, 'secrets', uid), (snap) => {
    latestSecret = snap.exists()
      ? (snap.data() as { role: string; linkedPartner: string | null })
      : { role: '', linkedPartner: null }
    emit()
  }, (err) => cb.onError(err))

  // Votes — only readable during voting (rules gate it).
  const unsubVotes = onSnapshot(collection(fsDb, 'rooms', upper, 'votes'), (snap) => {
    const v: Record<string, string> = {}
    snap.docs.forEach((d) => { v[d.id] = (d.data() as { targetId: string }).targetId })
    latestVotes = v
    emit()
  }, () => { /* permission-denied when not voting — ignore */ })

  // Wolf picks — pack board realtime; rules chỉ cho sói đọc,
  // non-wolf bị permission-denied → bỏ qua êm.
  const unsubWolfPicks = onSnapshot(collection(fsDb, 'rooms', upper, 'wolfPicks'), (snap) => {
    const v: Record<string, string> = {}
    snap.docs.forEach((d) => { v[d.id] = (d.data() as { targetId: string }).targetId })
    latestWolfPicks = v
    emit()
  }, () => { /* permission-denied for non-wolves — ignore */ })

  // Messages (chat).
  const unsubMessages = onSnapshot(
    query(collection(fsDb, 'rooms', upper, 'messages'), orderBy('createdAt')),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const d = change.doc.data() as { senderId: string; senderName: string; content: string; msgType: MsgType; phase: string; createdAt: number }
          cb.onMessage({ id: change.doc.id, ...d })
        }
      })
    },
    () => { /* ignore permission errors */ },
  )

  return () => { unsubRoom(); unsubPlayers(); unsubSecret(); unsubVotes(); unsubWolfPicks(); unsubMessages() }
}
