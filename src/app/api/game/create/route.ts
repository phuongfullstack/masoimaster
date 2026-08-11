// POST /api/game/create — create a new room. Host becomes seat 0.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, playerDoc, secretDoc, generateUniqueCode, DEFAULT_CONFIG,
  cleanupExpiredRooms,
  type RoomDoc, type PlayerDoc, type SecretDoc, type RoleConfig,
} from '@/lib/firestore-server'
import { getDisplayName } from '@/lib/user-profile'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const body = await readBody<{
    config?: Partial<RoleConfig>; hostMode?: 'auto' | 'direct' | 'hybrid'
  }>(req)
  const hostMode = body.hostMode ?? 'auto'
  const config: RoleConfig = { ...DEFAULT_CONFIG, ...(body.config ?? {}) }

  // Lazy TTL: nhân tiện dọn vài phòng đã hết hạn (best-effort).
  await cleanupExpiredRooms(5)

  const displayName = await getDisplayName(uid)
  const code = await generateUniqueCode()

  const room: RoomDoc = {
    code, hostId: uid, hostMode, status: 'waiting', phase: 'lobby', dayCount: 0,
    config, timerEnd: null, timerPhase: null, phaseLabel: 'Sảnh chờ',
    cupidPair: null, cupidDone: false, lastGuardTarget: null, nightStep: 0,
    bittenTarget: null, dayResult: null, voteResult: null, nightWake: null,
    reveal: null, gameWinner: null, createdAt: Date.now(),
    // TTL: phòng chờ không dùng tự bị dọn sau 24h (gia hạn khi game bắt đầu/kết thúc).
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
  const player: PlayerDoc = {
    userId: uid, username: displayName, isAlive: true, isReady: false, seatIndex: 0,
  }
  const secret: SecretDoc = {
    role: 'villager', witchSaveUsed: false, witchPoisonUsed: false, linkedPartner: null,
  }

  // Batch-create room + player + (empty) secret so joiners see consistent state.
  await roomDoc(code).set(room)
  await playerDoc(code, uid).set(player)
  await secretDoc(code, uid).set(secret)

  return ok({ code })
}
