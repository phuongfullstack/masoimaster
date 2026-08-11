// POST /api/game/start — host starts the game. Assigns roles (writes
// secrets), transitions to role_reveal, sets the first timer.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, secretDoc, loadRoom, loadPlayers, generateRoleList,
  type RoomDoc, type SecretDoc,
} from '@/lib/firestore-server'
import { sumSpecial } from '@/lib/roles'
import { PHASE_DURATIONS } from '@/lib/game-logic'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code } = await readBody<{ code?: string }>(req)
  if (!code) return error('Thiếu mã phòng.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.hostId !== uid) return error('Chỉ host mới được bắt đầu.')

  const players = await loadPlayers(upper)
  const total = players.length
  if (total < 4) return error('Cần ít nhất 4 người!')

  const config = { ...room.config }
  const specialCount = sumSpecial(config)
  if (specialCount > total) return error('Quá nhiều vai trò đặc biệt!')
  config.villager = total - specialCount

  // Assign roles and write each player's secret doc.
  const roles = generateRoleList(config, total)
  const batch = roomDoc(upper).firestore.batch()
  players.forEach((p, i) => {
    const role = roles[i]!
    const secret: SecretDoc = {
      role, witchSaveUsed: false, witchPoisonUsed: false, linkedPartner: null,
    }
    batch.set(secretDoc(upper, p.userId), secret)
  })

  const updates: Partial<RoomDoc> = {
    status: 'playing',
    phase: 'role_reveal',
    phaseLabel: 'Lật Bài Nhận Vai',
    dayCount: 0,
    config,
    cupidDone: false,
    cupidPair: null,
    lastGuardTarget: null,
    nightStep: 0,
    bittenTarget: null,
    dayResult: null,
    voteResult: null,
    nightWake: null,
    reveal: null,
    gameWinner: null,
    timerPhase: 'role_reveal',
    timerEnd: Date.now() + PHASE_DURATIONS.role_reveal,
    // Gia hạn TTL khi game bắt đầu (ván chơi hiếm khi quá vài giờ).
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }
  batch.update(roomDoc(upper), updates as Record<string, unknown>)
  await batch.commit()

  return ok({ phase: 'role_reveal' })
}
