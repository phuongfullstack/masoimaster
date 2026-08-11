'use client'

// ============================================================
// DisconnectOverlay — màn "Mất kết nối" theo design (S52).
// Theo dõi navigator.onLine; khi offline hiện overlay đếm 30s.
// Firestore onSnapshot tự resume khi mạng trở lại nên chỉ cần
// che màn + trấn an; hết 30s cho nút về trang chủ (phòng vẫn
// còn — localStorage giữ mã phòng nên vào lại là auto-rejoin).
// ============================================================
import { useEffect, useState } from 'react'
import { WifiOff, RotateCcw, Home } from 'lucide-react'
import { useGameStore } from '@/store/game-store'

export function DisconnectOverlay() {
  const [offline, setOffline] = useState(false)
  const [seconds, setSeconds] = useState(30)

  useEffect(() => {
    const goOffline = () => { setOffline(true); setSeconds(30) }
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    if (typeof navigator !== 'undefined' && !navigator.onLine) goOffline()
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  useEffect(() => {
    if (!offline || seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [offline, seconds])

  if (!offline) return null

  const goHome = () => {
    localStorage.removeItem('ma-soi-room-code')
    useGameStore.getState().setRoom(null)
    useGameStore.getState().setScreen('home')
    setOffline(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6">
      <div
        className="w-full max-w-xs rounded-3xl border p-6 text-center"
        style={{ background: 'linear-gradient(155deg,#16141F,#211E30)', borderColor: '#35325180' }}
      >
        <WifiOff className="w-10 h-10 mx-auto text-[#A7C5EB]/70 mb-3" />
        <p className="text-lg font-extrabold text-white">Mất kết nối</p>
        <p className="text-sm text-white/60 mt-1">
          Đang thử kết nối lại{seconds > 0 ? ` — ${seconds}s` : '...'}
        </p>

        {seconds > 0 ? (
          <p className="text-xs text-white/40 mt-4 flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '2.4s' }} />
            Ván chơi vẫn tiếp tục, bạn sẽ vào lại đúng lượt hiện tại
          </p>
        ) : (
          <button
            onClick={goHome}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 transition-colors"
          >
            <Home className="w-4 h-4" /> Về trang chủ
          </button>
        )}
      </div>
    </div>
  )
}
