'use client'

// ============================================================
// PressToReveal — lõi anti-peek của design 17-vai.
//
// Mọi người ngồi chung bàn nên thông tin bí mật (thẻ vai, kết quả
// soi) KHÔNG BAO GIỜ hiển thị sẵn: nội dung bị blur 7px + mờ, chỉ
// rõ trong lúc ngón tay đè xuống (pointerdown) và che lại ngay khi
// nhấc tay / trượt ra ngoài / pointer bị hủy (cuộn trang).
//
// Nguyên tắc từ design spec:
//  - transition 0.15s, blur 7px → 0, opacity .35 → 1
//  - rung nhẹ 12ms khi lật (navigator.vibrate)
//  - chặn long-press context menu + user-select (mobile)
//  - vùng nhấn đủ lớn, KHÔNG đổi kích thước khi lật (chống lộ layout)
// ============================================================
import { useState, useCallback, type ReactNode, type CSSProperties } from 'react'

interface PressToRevealProps {
  /** Nội dung bí mật (rõ khi đè). */
  children: ReactNode
  /** Lớp phủ hướng dẫn khi đang che (vd "NHẤN GIỮ ĐỂ XEM"). */
  hint?: ReactNode
  className?: string
  style?: CSSProperties
  /** Callback mỗi lần lật (đo lường / side effects nhẹ). */
  onReveal?: () => void
  /** Cho phép lật hay không (vd thẻ chưa được chia). */
  disabled?: boolean
}

export function PressToReveal({
  children, hint, className = '', style, onReveal, disabled = false,
}: PressToRevealProps) {
  const [held, setHeld] = useState(false)

  const press = useCallback(() => {
    if (disabled) return
    setHeld(true)
    onReveal?.()
    try { navigator.vibrate?.(12) } catch { /* không hỗ trợ — bỏ qua */ }
  }, [disabled, onReveal])

  const release = useCallback(() => setHeld(false), [])

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ touchAction: 'none', WebkitUserSelect: 'none', ...style }}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        aria-hidden={!held}
        className="transition-all duration-150 ease-out"
        style={{
          filter: held ? 'blur(0px)' : 'blur(7px)',
          opacity: held ? 1 : 0.35,
          // Chặn ảnh/text bên trong bắt sự kiện riêng (giữ pointer ổn định).
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>

      {/* Hint overlay — chỉ hiện khi đang che */}
      {!held && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {hint ?? (
            <span className="px-3 py-1.5 rounded-xl bg-black/45 text-[11px] font-extrabold tracking-[0.18em] uppercase text-white/90">
              Nhấn giữ để xem
            </span>
          )}
        </div>
      )}
    </div>
  )
}
