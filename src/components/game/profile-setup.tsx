'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useGameStore } from '@/store/game-store'
import { GameButton } from '@/components/ui/game/GameButton'
import { GameInput } from '@/components/ui/game/GameInput'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { Loader2, ArrowRight } from 'lucide-react'

/**
 * First-time onboarding: pick a display name after signing in.
 * Shown while the user has a Firebase identity but no chosen name yet.
 */
export function ProfileSetup() {
  const { firebaseUser, idToken, signOut } = useAuth()
  const setAuth = useGameStore(s => s.setAuth)

  const defaultName =
    firebaseUser?.displayName ||
    firebaseUser?.email?.split('@')[0] ||
    (firebaseUser?.phoneNumber ? 'User' + firebaseUser.phoneNumber.slice(-4) : 'Người chơi')

  const [name, setName] = useState(defaultName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed || !idToken) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ displayName: trimmed }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Lưu thất bại.')
      }
      // Update the store identity in place; the page router will move on.
      setAuth(firebaseUser!.uid, trimmed)
    } catch (e: any) {
      setError(e.message || 'Không lưu được.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary p-4 font-game relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[rgb(var(--ms-moon))]/20 blur-3xl pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl bg-[rgb(var(--ms-card))] border border-[rgb(var(--ms-border))] shadow-game-lg p-8 text-center">
          <div className="animate-bounce-in mb-4 flex justify-center">
            <CharacterIcon role="seer" size="hero" animated />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Chọn Tên Hiển Thị</h1>
          <p className="text-[rgb(var(--ms-text-secondary))] mb-6 text-sm">
            Bạn đã đăng nhập. Đặt tên để mọi người nhận ra bạn trong game.
          </p>

          <div className="space-y-3 text-left">
            <GameInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn..."
              maxLength={24}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            {error && <p className="text-sm text-[rgb(var(--ms-wolf))] font-bold">{error}</p>}
            <GameButton onClick={save} disabled={busy || !name.trim()} size="lg" className="w-full">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Lưu & Vào Game <ArrowRight className="w-4 h-4" /></>}
            </GameButton>
            <button
              onClick={() => signOut()}
              className="w-full text-xs text-[rgb(var(--ms-text-muted))] hover:text-[rgb(var(--ms-text-primary))] transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
