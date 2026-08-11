// POST /api/game/join — join an existing room by code.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  playerDoc, secretDoc, loadRoom, playersCol, type PlayerDoc,
} from '@/lib/firestore-server'
import { getDisplayName } from '@/lib/user-profile'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code } = await readBody<{ code?: string }>(req)
  if (!code) return error('Thiếu mã phòng.')

  const upper = code.toUpperCase()
  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')

  // Already a member? Idempotent re-join (e.g. after reconnect).
  const existing = await playerDoc(upper, uid).get()
  if (existing.exists) return ok({ code: upper })

  if (room.status !== 'waiting') return error('Trò chơi đã bắt đầu!')

  const playersSnap = await playersCol(upper).get()
  if (playersSnap.size >= 20) return error('Phòng đã đầy!')

  const displayName = await getDisplayName(uid)
  const player: PlayerDoc = {
    userId: uid, username: displayName, isAlive: true, isReady: false,
    seatIndex: playersSnap.size,
  }
  await playerDoc(upper, uid).set(player)
  await secretDoc(upper, uid).set({ role: 'villager', witchSaveUsed: false, witchPoisonUsed: false, linkedPartner: null })

  return ok({ code: upper })
}
