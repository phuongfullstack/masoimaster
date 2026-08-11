// POST /api/game/cupid-link — Cupid links two players as lovers.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, secretDoc, loadRoom, loadPlayers,
} from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, targetIds } = await readBody<{ code?: string; targetIds?: [string, string] }>(req)
  if (!code || !Array.isArray(targetIds) || targetIds.length !== 2) return error('Thiếu thông tin.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.phase !== 'night') return error('Không phải giai đoạn đêm.')
  if (room.cupidDone) return error('Đã ghép đôi rồi.')

  const cupidSnap = await secretDoc(upper, uid).get()
  if (!cupidSnap.exists) return error('Bạn không có trong phòng.')
  if (cupidSnap.data()!.role !== 'cupid') return error('Chỉ Cúp Đôi mới ghép đôi được.')

  const [idA, idB] = targetIds
  if (!idA || !idB || idA === idB) return error('Phải chọn 2 người khác nhau.')
  if (idA === uid || idB === uid) return error('Cúp Đôi không được ghép chính mình.')

  const players = await loadPlayers(upper)
  const a = players.find((p) => p.userId === idA)
  const b = players.find((p) => p.userId === idB)
  if (!a || !b) return error('Người chơi không tồn tại.')
  if (!a.isAlive || !b.isAlive) return error('Người đã chết không thể ghép đôi.')

  const batch = roomDoc(upper).firestore.batch()
  batch.update(secretDoc(upper, idA), { linkedPartner: idB })
  batch.update(secretDoc(upper, idB), { linkedPartner: idA })
  batch.update(roomDoc(upper), { cupidDone: true, cupidPair: [idA, idB] })
  await batch.commit()

  return ok({ pair: [a.username, b.username] })
}
