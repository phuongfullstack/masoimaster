// POST /api/game/host-next — host forces phase advance (direct/hybrid mode).
// Delegates to the same tick engine with force=true.
import { authenticate, readBody, error, isAuthError } from '@/app/api/game/_helpers'
import { loadRoom } from '@/lib/firestore-server'
import { POST as tick } from '@/app/api/game/tick/route'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code } = await readBody<{ code?: string }>(req)
  if (!code) return error('Thiếu mã phòng.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.hostId !== uid) return error('Chỉ host mới được chuyển pha.')

  // Forward to the tick engine with force=true (skip timer-expiry check).
  const forced = new Request(req, {
    body: JSON.stringify({ code: upper, force: true }),
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(req.headers) },
  })
  return tick(forced)
}
