// POST /api/game/kick — host removes a player from the room.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import { roomDoc, playerDoc, secretDoc, loadRoom } from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, targetUid } = await readBody<{ code?: string; targetUid?: string }>(req)
  if (!code || !targetUid) return error('Thiếu mã phòng hoặc người dùng.')
  if (targetUid === uid) return error('Không thể kick chính mình.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.hostId !== uid) return error('Chỉ host mới được kick.')

  await playerDoc(upper, targetUid).delete()
  await secretDoc(upper, targetUid).delete()
  return ok()
}
