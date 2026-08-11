// POST /api/game/host-action — quyền can thiệp của quản trò (Host Panel).
// Mọi action đều yêu cầu uid === room.hostId.
//   add_time        : +30s cho timer hiện tại
//   skip_step       : hạ timerEnd để phase/bước hiện tại kết thúc ngay
//   set_night_mode  : đổi chế độ đêm (áp dụng từ ĐÊM SAU)
//   set_host_mode   : đổi chế độ quản trò
//   revive          : hồi sinh 1 người (sửa sai của làng)
//   end_game        : kết thúc ván ngay, lộ toàn bộ vai, không có phe thắng
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, playerDoc, loadRoom, loadPlayers, loadSecrets, writeLog,
} from '@/lib/firestore-server'

type HostAction = 'add_time' | 'skip_step' | 'set_night_mode' | 'set_host_mode' | 'revive' | 'end_game'

const FINISHED_ROOM_TTL_MS = 6 * 60 * 60 * 1000

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, action, value, targetUid } = await readBody<{
    code?: string; action?: HostAction; value?: string; targetUid?: string
  }>(req)
  if (!code || !action) return error('Thiếu thông tin.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.hostId !== uid) return error('Chỉ quản trò mới can thiệp được.')
  if (room.status !== 'playing') return error('Ván chưa/không còn chạy.')

  switch (action) {
    case 'add_time': {
      if (!room.timerEnd) return error('Không có đồng hồ đang chạy.')
      await roomDoc(upper).update({ timerEnd: room.timerEnd + 30_000 })
      await writeLog(upper, room.dayCount, room.phase, [{ icon: '⏱️', text: 'Host cộng thêm 30 giây' }])
      return ok({ timerEnd: room.timerEnd + 30_000 })
    }
    case 'skip_step': {
      // Hạ timerEnd — client tick trong ~1.5s, engine idempotent tự chuyển.
      await roomDoc(upper).update({ timerEnd: Date.now() + 1200 })
      await writeLog(upper, room.dayCount, room.phase, [{ icon: '⏭️', text: 'Host bỏ qua bước hiện tại' }])
      return ok()
    }
    case 'set_night_mode': {
      const mode = value === 'sim' ? 'sim' : 'seq'
      await roomDoc(upper).update({ nightMode: mode })
      await writeLog(upper, room.dayCount, room.phase, [
        { icon: '🌗', text: `Host đổi chế độ đêm → ${mode === 'sim' ? 'Đồng thời' : 'Tuần tự'} (áp dụng từ đêm sau)` },
      ])
      return ok({ nightMode: mode })
    }
    case 'set_host_mode': {
      const mode = value === 'direct' ? 'direct' : value === 'hybrid' ? 'hybrid' : 'auto'
      await roomDoc(upper).update({ hostMode: mode })
      await writeLog(upper, room.dayCount, room.phase, [{ icon: '🎛️', text: `Host đổi chế độ quản trò → ${mode}` }])
      return ok({ hostMode: mode })
    }
    case 'revive': {
      if (!targetUid) return error('Thiếu người cần hồi sinh.')
      const players = await loadPlayers(upper)
      const target = players.find((p) => p.userId === targetUid)
      if (!target) return error('Không tìm thấy người chơi.')
      if (target.isAlive) return error('Người này vẫn còn sống.')
      await playerDoc(upper, targetUid).update({ isAlive: true })
      await writeLog(upper, room.dayCount, room.phase, [{ icon: '✨', text: `Host hồi sinh ${target.username}` }])
      return ok({ revived: target.username })
    }
    case 'end_game': {
      const secrets = await loadSecrets(upper)
      const reveal: Record<string, string> = {}
      secrets.forEach((s, sid) => { reveal[sid] = s.role })
      await roomDoc(upper).set({
        status: 'finished', phase: 'game_over', gameWinner: null,
        reveal, timerEnd: null, timerPhase: null, phaseLabel: 'Kết Thúc',
        nightWake: null,
        expiresAt: new Date(Date.now() + FINISHED_ROOM_TTL_MS),
      } as Record<string, unknown>, { merge: true })
      await writeLog(upper, room.dayCount, room.phase, [{ icon: '🛑', text: 'Host kết thúc ván đấu' }])
      return ok({ phase: 'game_over' })
    }
    default:
      return error('Hành động không hợp lệ.')
  }
}
