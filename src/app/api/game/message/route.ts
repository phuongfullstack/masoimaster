// POST /api/game/message — send a chat message.
// Mỗi loại tin vào ĐÚNG collection có rules riêng:
//   public/system → messages (mọi người đọc)
//   wolf          → wolfChat  (rules: chỉ vai sói đọc)
//   dead          → deadChat  (rules: chỉ người chết đọc)
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  messagesCol, wolfChatCol, deadChatCol, loadRoom, loadSecrets, playerDoc,
  WOLF_ROLES, type MsgType,
} from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, content, msgType } = await readBody<{
    code?: string; content?: string; msgType?: MsgType
  }>(req)
  if (!code || !content?.trim()) return error('Thiếu nội dung.')
  const upper = code.toUpperCase()
  const type: MsgType = msgType ?? 'public'

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')

  const meSnap = await playerDoc(upper, uid).get()
  if (!meSnap.exists) return error('Bạn không có trong phòng.')
  const me = meSnap.data()!

  // Enforce who may send which message type + chọn collection đích.
  let target = messagesCol(upper)
  if (type === 'wolf') {
    const secrets = await loadSecrets(upper)
    const role = secrets.get(uid)?.role
    if (!WOLF_ROLES.includes(role as never)) return error('Chỉ sói mới chat được.')
    if (!me.isAlive) return error('Sói đã chết không chat bầy được.')
    target = wolfChatCol(upper)
  } else if (type === 'dead') {
    if (me.isAlive) return error('Chỉ người chết mới chat được.')
    target = deadChatCol(upper)
  } else if (type === 'public') {
    if (!me.isAlive) return error('Người chết không nói được với làng.')
  }

  await target.add({
    senderId: uid, senderName: me.username, content: content.trim(),
    msgType: type, phase: room.phase, createdAt: Date.now(),
  })
  return ok()
}
