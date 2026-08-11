// POST /api/game/update-config — host chỉnh cấu hình vai trò TRONG LOBBY
// (design S04: chỉnh khi đã biết số người thật). Chỉ khi phòng còn waiting.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import { roomDoc, loadRoom, DEFAULT_CONFIG, type RoleConfig } from '@/lib/firestore-server'
import { sanitizeConfig } from '@/lib/roles'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, config } = await readBody<{ code?: string; config?: Partial<RoleConfig> }>(req)
  if (!code || !config) return error('Thiếu thông tin.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.hostId !== uid) return error('Chỉ host mới chỉnh được cấu hình.')
  if (room.status !== 'waiting') return error('Ván đã bắt đầu — không chỉnh được nữa.')

  // Người gửi quyết định TOÀN BỘ cấu hình: mọi vai về 0 rồi phủ config sạch
  // lên (khác create — ở đây không trộn DEFAULT_CONFIG để bỏ vai được).
  const zeroed = Object.fromEntries(Object.keys(DEFAULT_CONFIG).map((k) => [k, 0]))
  const clean: RoleConfig = { ...zeroed, ...sanitizeConfig(config) }
  await roomDoc(upper).update({ config: clean })
  return ok({ config: clean })
}
