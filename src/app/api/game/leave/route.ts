// POST /api/game/leave — leave a room. If host leaves, reassign host.
// If the room becomes empty, delete it.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, playerDoc, playersCol, loadRoom,
} from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code } = await readBody<{ code?: string }>(req)
  if (!code) return error('Thiếu mã phòng.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')

  await playerDoc(upper, uid).delete()

  const playersSnap = await playersCol(upper).get()
  if (playersSnap.empty) {
    await roomDoc(upper).delete()
    return ok()
  }

  // Reassign host if the leaver was host.
  if (room.hostId === uid) {
    const remaining = playersSnap.docs.map((d) => d.data())
    const newHost = remaining.sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0))[0]
    if (newHost) await roomDoc(upper).update({ hostId: newHost.userId })
  }
  return ok()
}
