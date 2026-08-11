'use client'

// ============================================================
// GameProvider — Firestore-backed replacement for the Socket.io provider.
//
// Exposes the SAME `useSocket()` shape the components already use, so
// existing screens keep working: `{ emit, connected }`. `emit` now maps
// the old socket event names to REST API calls + onSnapshot already
// keeps the store in sync. The Firestore subscription is owned here and
// starts/stops as the user enters/leaves a room.
// ============================================================
import {
  createContext, useContext, useEffect, useRef, useCallback, useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth-context'
import { useGameStore } from '@/store/game-store'
import { gameApi, subscribeRoom } from '@/lib/game-client'
import type { RoleConfig, ActionType } from '@/lib/types'

interface SocketContextType {
  /** Drop-in for the old socket emit; maps event names to API calls. */
  emit: (event: string, data?: any) => void
  /** Always true when authed — Firestore is "connected" by nature. */
  connected: boolean
}

const SocketContext = createContext<SocketContextType>({ emit: () => {}, connected: false })

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const store = useGameStore
  const { idToken, firebaseUser } = useAuth()
  const tokenRef = useRef<string | null>(null)
  tokenRef.current = idToken
  const [connected, setConnected] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  // Track the room code so we can subscribe when the user enters a room.
  const roomCode = useGameStore(s => s.roomCode)
  const uid = firebaseUser?.uid ?? ''
  const timerEnd = useGameStore(s => s.timerEnd)

  // Client-driven phase timer: when timerEnd passes, fire one tick.
  // Idempotent on the server (it re-validates expiry), so multiple
  // clients firing is harmless. Dedup by the timerEnd value so each
  // distinct interval (including each night-ladder step) fires once.
  const lastTickedEnd = useRef<number | null>(null)
  useEffect(() => {
    if (!timerEnd || !roomCode || !idToken) return
    // Already ticked for this exact interval.
    if (lastTickedEnd.current === timerEnd) return
    const ms = timerEnd - Date.now()
    if (ms <= 0) return // already past; another tick path will catch it
    const t = setTimeout(() => {
      if (lastTickedEnd.current === timerEnd) return
      lastTickedEnd.current = timerEnd
      gameApi.tick(idToken, roomCode).catch(() => {/* idempotent */})
    }, ms + 250) // tiny buffer so server clock agrees
    return () => clearTimeout(t)
  }, [timerEnd, roomCode, idToken])

  // Subscribe to the room document whenever we have a code + identity.
  useEffect(() => {
    if (!roomCode || !uid) {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
      setConnected(false)
      return
    }
    setConnected(true)
    // Begin subscription.
    const unsub = subscribeRoom(roomCode, uid, {
      onRoom: (room) => {
        const s = store.getState()
        if (!room) {
          // Room was deleted (host left) — back to home.
          s.setRoom(null)
          s.setScreen('home')
          if (typeof window !== 'undefined') localStorage.removeItem('ma-soi-room-code')
          return
        }
        // Mirror all derived state into the store, matching the prior
        // socket handlers' behavior.
        s.setRoom(room)
        if (room.timerEnd != null) s.setTimerEnd(room.timerEnd)
        s.setPhaseInfo(room.phase, phaseLabelFor(room.phase, room.dayCount))

        // Night wake (mirrors `night-wake` socket event).
        const nw = (room as any).nightWake
        if (nw) {
          s.setNightWake(nw.actionType, nw.label, nw.duration)
          if (nw.bittenPlayer) s.setBittenPlayer(nw.bittenPlayer)
        } else if (room.phase !== 'night') {
          s.setNightWake(null, '', 0)
        }

        // Day announce.
        const dr = (room as any).dayResult
        if (dr && (room.phase === 'day' || room.phase === 'voting' || room.phase === 'vote_result')) {
          s.setDayResult(dr.deaths ?? [], !!dr.saved)
        }

        // Vote result.
        const vr = (room as any).voteResult
        if (vr && room.phase === 'vote_result') {
          s.setVoteResult(vr)
        }

        // Game over.
        const reveal = (room as any).reveal
        if (room.phase === 'game_over' && reveal) {
          const players = room.players.map((p: any) => ({
            username: p.username, role: reveal[p.userId] ?? '', isAlive: p.isAlive,
          }))
          const winner = (room as any).gameWinner
          s.setGameOver(winner, players)
          if (typeof window !== 'undefined') localStorage.removeItem('ma-soi-room-code')
        }
      },
      onMessage: (m) => {
        store.getState().addMessage({
          id: m.id, senderId: m.senderId, senderName: m.senderName,
          content: m.content, msgType: m.msgType, phase: m.phase,
          createdAt: new Date(m.createdAt).toISOString(),
        })
      },
      onClearMessages: () => store.getState().clearMessages(),
      onError: (err) => {
        console.error('[game-provider] subscribe error:', err.message)
        store.getState().setError('Lỗi kết nối phòng.')
      },
    })
    unsubRef.current = unsub
    return () => { unsub(); unsubRef.current = null }
  }, [roomCode, uid, store])

  // ---- emit: map old socket events to API calls ----
  const emit = useCallback((event: string, data?: any) => {
    const token = tokenRef.current
    const s = store.getState()
    if (!token) return
    const code = (data?.code ?? s.roomCode) as string
    const userId = s.userId

    // Wrap and surface server errors through the store.
    const run = (p: Promise<Record<string, unknown>>) => {
      p.then((res) => {
        // night-action seer result comes back inline.
        if (res.seerResult !== undefined) {
          store.getState().setSeerResult((res.seerResult as any) ?? null)
        }
        // create/join return the canonical code → persist + enter room.
        if (res.code) {
          const c = res.code as string
          if (typeof window !== 'undefined') localStorage.setItem('ma-soi-room-code', c)
          // Setting roomCode triggers the onSnapshot subscription; the
          // actual room object arrives from Firestore shortly after.
          store.getState().setRoomCode(c)
          store.getState().clearMessages()
          store.getState().setScreen('room')
        }
      }).catch((err: Error) => {
        store.getState().setError(err.message)
        setTimeout(() => store.getState().setError(null), 3000)
      })
    }

    switch (event) {
      case 'create-room':
        run(gameApi.create(token, data?.config ?? {}, data?.hostMode ?? 'auto')); break
      case 'join-room':
        run(gameApi.join(token, data?.code ?? '')); break
      case 'leave-room':
        run(gameApi.leave(token, code))
        if (typeof window !== 'undefined') localStorage.removeItem('ma-soi-room-code')
        store.getState().setRoom(null); store.getState().setScreen('home'); break
      case 'player-ready':
        run(gameApi.ready(token, code, !!data?.ready)); break
      case 'start-game':
        run(gameApi.start(token, code)); break
      case 'host-next-phase':
        run(gameApi.hostNext(token, code)); break
      case 'night-action':
        run(gameApi.nightAction(token, code, data?.actionType as ActionType, data?.targetId ?? null)); break
      case 'cupid-link':
        run(gameApi.cupidLink(token, code, data?.targetIds)); break
      case 'submit-vote':
        run(gameApi.vote(token, code, data?.targetId ?? null)); break
      case 'hunter-shoot':
        run(gameApi.hunterShoot(token, code, data?.targetId)); break
      case 'kick-player':
        run(gameApi.kick(token, code, data?.targetUserId)); break
      case 'send-message':
        run(gameApi.message(token, code, data?.content ?? '', data?.msgType ?? 'public')); break
      case 'tick':
        run(gameApi.tick(token, code, !!data?.force)); break
      default:
        // Unknown events are no-ops (auth etc. are handled elsewhere).
        break
    }
    void userId
  }, [store])

  return (
    <SocketContext.Provider value={{ emit, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

// ---- helpers ----
function phaseLabelFor(phase: string, dayCount: number): string {
  switch (phase) {
    case 'lobby': return 'Sảnh chờ'
    case 'role_reveal': return 'Lật Bài Nhận Vai'
    case 'night': return `Đêm ${dayCount + 1}`
    case 'night_resolve': return 'Đang giải quyết...'
    case 'day': return `Ngày ${dayCount} - Thảo Luận`
    case 'voting': return 'Bỏ Phiếu'
    case 'vote_result': return 'Kết Quả'
    case 'game_over': return 'Kết Thúc'
    default: return ''
  }
}
