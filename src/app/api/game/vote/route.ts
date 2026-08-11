// POST /api/game/vote — cast/change a vote during voting phase.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import { votesCol, loadRoom, playerDoc } from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, targetId } = await readBody<{ code?: string; targetId?: string | null }>(req)
  if (!code) return error('Thiếu mã phòng.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.phase !== 'voting') return error('Không phải giai đoạn bỏ phiếu.')

  const meSnap = await playerDoc(upper, uid).get()
  if (!meSnap.exists) return error('Bạn không có trong phòng.')
  if (!meSnap.data()!.isAlive) return error('Người chết không được bỏ phiếu.')

  await votesCol(upper).doc(uid).set({ targetId: targetId || '' })
  return ok()
}
