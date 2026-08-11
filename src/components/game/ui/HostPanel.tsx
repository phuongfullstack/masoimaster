'use client'

// ============================================================
// HostPanel — bảng điều khiển quản trò (design S49/S50).
// Chỉ render cho host khi ván đang chạy. Gồm:
//  - Can thiệp: +30s, bỏ qua bước, đổi chế độ đêm/quản trò,
//    hồi sinh, kết thúc ván (bấm 2 lần để xác nhận).
//  - Master log: nhật ký ai-làm-gì-với-ai — rules chỉ cho host đọc;
//    subscribe khi panel mở, hủy khi đóng.
// ============================================================
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore'
import { fsDb } from '@/lib/firebase'
import type { RoomState } from '@/lib/types'
import { Settings, X, Timer, SkipForward, Sparkles, OctagonX } from 'lucide-react'

interface LogRow { id: string; at: number; day: number; phase: string; icon: string; text: string }

export function HostPanel({
  room, emit,
}: {
  room: RoomState
  emit: (event: string, data?: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [confirmEnd, setConfirmEnd] = useState(false)

  // Master log — chỉ subscribe khi panel mở (host-only theo rules).
  useEffect(() => {
    if (!open) return
    const q = query(collection(fsDb, 'rooms', room.code, 'log'), orderBy('at', 'desc'), limit(60))
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LogRow, 'id'>) })))
    }, () => setLogs([]))
    return unsub
  }, [open, room.code])

  const setOpenAndReset = (v: boolean) => { setOpen(v); setConfirmEnd(false) }

  const act = (action: string, extra?: Record<string, unknown>) =>
    emit('host-action', { code: room.code, action, ...extra })

  const deadPlayers = room.players.filter((p) => !p.isAlive)

  return (
    <>
      {/* FAB quản trò — góc trái (🎴 nằm góc phải) */}
      <button
        aria-label="Bảng điều khiển quản trò"
        onClick={() => setOpenAndReset(true)}
        className="fixed bottom-5 left-4 z-40 w-12 h-12 rounded-2xl bg-[rgb(var(--ms-card))] border border-white/10 shadow-game-sm flex items-center justify-center text-[#ECC94B] active:scale-95 transition-transform"
      >
        <Settings className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-3">
          <div
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border p-5"
            style={{ background: 'linear-gradient(155deg,#16141F,#211E30)', borderColor: '#35325180' }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#ECC94B]" /> Quản Trò
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  chỉ host thấy
                </span>
              </p>
              <button onClick={() => setOpenAndReset(false)} className="text-white/50 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Can thiệp */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => act('add_time')} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-sm font-bold text-white/90">
                <Timer className="w-4 h-4" /> +30 giây
              </button>
              <button onClick={() => act('skip_step')} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-sm font-bold text-white/90">
                <SkipForward className="w-4 h-4" /> Bỏ qua bước
              </button>
              <button
                onClick={() => act('set_night_mode', { value: room.nightMode === 'sim' ? 'seq' : 'sim' })}
                className="col-span-2 px-3 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-sm font-bold text-white/90 text-left"
              >
                🌗 Chế độ đêm: <span className="text-[#A7C5EB]">{room.nightMode === 'sim' ? '⇉ Đồng thời' : '⇢ Tuần tự'}</span>
                <span className="text-white/40 font-normal"> — bấm để đổi (từ đêm sau)</span>
              </button>
              <button
                onClick={() => {
                  const order = ['auto', 'hybrid', 'direct'] as const
                  const next = order[(order.indexOf((room.hostMode ?? 'auto') as typeof order[number]) + 1) % 3]
                  act('set_host_mode', { value: next })
                }}
                className="col-span-2 px-3 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-sm font-bold text-white/90 text-left"
              >
                🎛️ Chế độ quản trò: <span className="text-[#A7C5EB]">{room.hostMode}</span>
                <span className="text-white/40 font-normal"> — bấm để đổi</span>
              </button>
            </div>

            {/* Hồi sinh */}
            {deadPlayers.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/40 mb-1.5">
                  <Sparkles className="w-3 h-3 inline mr-1" />Hồi sinh (sửa sai)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {deadPlayers.map((p) => (
                    <button
                      key={p.userId}
                      onClick={() => act('revive', { targetUid: p.userId })}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-white/80"
                    >
                      ✨ {p.username}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kết thúc ván — xác nhận 2 bước */}
            <button
              onClick={() => {
                if (!confirmEnd) { setConfirmEnd(true); return }
                act('end_game'); setOpenAndReset(false)
              }}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold mb-4 transition-colors ${
                confirmEnd
                  ? 'bg-[rgb(var(--ms-wolf))] text-white'
                  : 'bg-[rgb(var(--ms-wolf))]/15 text-[rgb(var(--ms-wolf))] hover:bg-[rgb(var(--ms-wolf))]/25'
              }`}
            >
              <OctagonX className="w-4 h-4" />
              {confirmEnd ? 'Bấm lần nữa để XÁC NHẬN kết thúc' : 'Kết thúc ván đấu'}
            </button>

            {/* Master log */}
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/40 mb-1.5">
              Nhật ký ván đấu (mới nhất trước)
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto rounded-2xl bg-black/25 p-3">
              {logs.length === 0 ? (
                <p className="text-xs text-white/40">Chưa có sự kiện nào.</p>
              ) : (
                logs.map((l) => (
                  <p key={l.id} className="text-xs text-white/75 leading-relaxed">
                    <span className="text-white/35 font-mono">[{l.phase === 'night' ? `Đ${l.day}` : l.phase === 'voting' ? `N${l.day}` : '•'}]</span>{' '}
                    {l.icon} {l.text}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
