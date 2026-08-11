// POST /api/game/ready — toggle ready state.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import { playerDoc, loadRoom } from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, ready } = await readBody<{ code?: string; ready?: boolean }>(req)
  if (!code) return error('Thiếu mã phòng.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')

  await playerDoc(upper, uid).update({ isReady: !!ready })
  return ok()
}
