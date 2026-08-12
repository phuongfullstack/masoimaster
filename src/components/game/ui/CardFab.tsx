'use client'

// ============================================================
// CardFab — nút 🎴 nổi để xem lại thẻ vai giữa ván.
//
// Theo design: thẻ không bao giờ nằm mở trên màn hình. Nút FAB hiện
// ở mọi màn đang chơi; ĐÈ GIỮ nút thì overlay thẻ vai hiện ra, nhấc
// tay là biến mất ngay. Sói thấy danh sách bầy trong cùng overlay.
// ============================================================
import { useState, useCallback } from 'react'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { ROLE_INFO } from '@/lib/types'

interface CardFabProps {
  /** Vai của chính người chơi (rỗng = chưa có thẻ → không render). */
  role: string
  /** Tên các đồng đội bầy sói (chỉ truyền khi mình là sói). */
  packmates?: string[]
  /** Ghi chú phụ (vd "Người yêu: An"). */
  extraNote?: string | null
}

export function CardFab({ role, packmates = [], extraNote }: CardFabProps) {
  const [held, setHeld] = useState(false)
  const info = ROLE_INFO[role]

  const press = useCallback(() => {
    setHeld(true)
    try { navigator.vibrate?.(12) } catch { /* bỏ qua */ }
  }, [])
  const release = useCallback(() => setHeld(false), [])

  if (!role || !info) return null

  return (
    <>
      {/* FAB */}
      <button
        aria-label="Đè giữ để xem thẻ vai của bạn"
        className="fixed bottom-5 right-4 z-40 w-12 h-12 rounded-2xl bg-[rgb(var(--ms-card))] border border-[rgb(var(--ms-border))] shadow-game-sm text-xl flex items-center justify-center select-none active:scale-95 transition-transform"
        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        🎴
      </button>

      {/* Overlay thẻ — chỉ tồn tại trong lúc đè */}
      {held && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none p-6">
          <div
            className="w-full max-w-xs rounded-3xl border p-6 text-center"
            style={{
              minHeight: 330,
              background: 'linear-gradient(155deg,#16141F,#211E30)',
              borderColor: '#35325180',
            }}
          >
            <div className="flex justify-center mb-3">
              <CharacterIcon role={role} size="xl" glow />
            </div>
            <p className="text-2xl font-extrabold text-white tracking-wide">{info.name}</p>
            {/* Phe chỉ là CHỮ — không mã màu nền/viền theo phe (chống liếc trộm màu) */}
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50 mt-1">
              Phe {info.team}
            </p>
            <p className="text-sm text-white/70 mt-3 leading-relaxed">{info.desc}</p>

            {packmates.length > 0 && (
              <div className="mt-4 rounded-2xl bg-black/30 px-3 py-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/45 mb-1">
                  Bầy của bạn
                </p>
                <p className="text-sm font-bold text-white/85">{packmates.join(' · ')}</p>
              </div>
            )}

            {extraNote && (
              <p className="text-xs text-white/55 mt-3">{extraNote}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
