'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useGameStore } from '@/store/game-store'
import { SocketProvider } from '@/components/game/socket-provider'
import { LoginScreen } from '@/components/game/login-screen'
import { ProfileSetup } from '@/components/game/profile-setup'
import { HomeScreen } from '@/components/game/home-screen'
import { LobbyScreen } from '@/components/game/lobby-screen'
import { GameScreen } from '@/components/game/game-screen'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { DisconnectOverlay } from '@/components/game/ui/DisconnectOverlay'

/** Splash shown while Firebase auth state is resolving. */
function AuthSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary font-game">
      <div className="animate-bounce-in">
        <CharacterIcon role="werewolf" size="hero" animated />
      </div>
    </div>
  )
}

function GameRouter() {
  const screen = useGameStore(s => s.screen)
  const phase = useGameStore(s => s.currentPhase || s.room?.phase || 'lobby')

  // In a room with an active game → show GameScreen instead of Lobby
  if (screen === 'room' && phase !== 'lobby') {
    return <GameScreen />
  }

  return (
    <>
      {screen === 'login' && <LoginScreen />}
      {screen === 'home' && <HomeScreen />}
      {screen === 'room' && <LobbyScreen />}
    </>
  )
}

function MaSoiApp() {
  const { firebaseUser, loading } = useAuth()
  const setAuth = useGameStore(s => s.setAuth)
  const setRoomCode = useGameStore(s => s.setRoomCode)
  const setScreen = useGameStore(s => s.setScreen)
  const userId = useGameStore(s => s.userId)
  const [profileReady, setProfileReady] = useState<boolean | null>(null)

  // Reconnect to a cached room after refresh / reopen.
  useEffect(() => {
    if (!firebaseUser) return
    const savedCode = typeof window !== 'undefined' ? localStorage.getItem('ma-soi-room-code') : null
    if (savedCode) {
      setRoomCode(savedCode)
      setScreen('room')
    }
  }, [firebaseUser, setRoomCode, setScreen])

  // Once signed in, ask the backend whether a display name is already set.
  // profileReady === null  → still checking
  // profileReady === false → onboarding required
  // profileReady === true  → proceed to the game
  useEffect(() => {
    let cancelled = false
    setProfileReady(null)
    if (!firebaseUser) return
    ;(async () => {
      try {
        const token = await firebaseUser.getIdToken()
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('profile fetch failed')
        const { displayName } = await res.json()
        if (cancelled) return
        // Push the canonical identity into the store so screens see it.
        setAuth(firebaseUser.uid, displayName)
        setProfileReady(true)
      } catch {
        if (!cancelled) setProfileReady(false)
      }
    })()
    return () => { cancelled = true }
  }, [firebaseUser, setAuth])

  // Not signed in → login screen (store screen stays 'login' by default).
  if (!firebaseUser) return <LoginScreen />

  // Resolving auth/profile → splash.
  if (loading || profileReady === null) return <AuthSplash />

  // Signed in but no display name yet → onboarding.
  if (profileReady === false || !userId) return <ProfileSetup />

  // Fully ready → connect socket and enter the game.
  return (
    <SocketProvider>
      <GameRouter />
      <DisconnectOverlay />
    </SocketProvider>
  )
}

export default function MaSoiPage() {
  return <MaSoiApp />
}
