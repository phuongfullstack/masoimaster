// POST /api/game/message — send a chat message.
// Routing (wolf/dead/public) is enforced by Firestore rules on read,
// but we also validate role/alive here to keep the messages collection clean.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import { messagesCol, loadRoom, loadSecrets, playerDoc, type MsgType } from '@/lib/firestore-server'

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

  // Enforce who may send which message type.
  if (type === 'wolf') {
    const secrets = await loadSecrets(upper)
    const role = secrets.get(uid)?.role
    if (role !== 'werewolf' && role !== 'white_werewolf') return error('Chỉ sói mới chat được.')
  }
  if (type === 'dead' && me.isAlive) return error('Chỉ người chết mới chat được.')

  await messagesCol(upper).add({
    senderId: uid, senderName: me.username, content: content.trim(),
    msgType: type, phase: room.phase, createdAt: Date.now(),
  })
  return ok()
}
