'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/store/game-store'
import { SocketProvider } from '@/components/game/socket-provider'
import { LoginScreen } from '@/components/game/login-screen'
import { HomeScreen } from '@/components/game/home-screen'
import { LobbyScreen } from '@/components/game/lobby-screen'
import { GameScreen } from '@/components/game/game-screen'

function AppContent() {
  const screen = useGameStore(s => s.screen)
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const username = useGameStore(s => s.username)
  const setAuth = useGameStore(s => s.setAuth)

  // Auto-login from localStorage
  useEffect(() => {
    if (!userId) {
      const savedId = localStorage.getItem('ma-soi-user-id')
      const savedName = localStorage.getItem('ma-soi-username')
      if (savedId && savedName) {
        setAuth(savedId, savedName)
      }
    }
  }, [])

  const currentScreen = (() => {
    if (screen === 'login' || !userId) return 'login'
    if (screen === 'home') return 'home'
    if (room && room.status === 'waiting') return 'lobby'
    if (room && (room.status === 'playing' || room.status === 'finished')) return 'game'
    return 'home'
  })()

  return (
    <div className="min-h-screen bg-gray-900">
      {currentScreen === 'login' && <LoginScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'lobby' && <LobbyScreen />}
      {currentScreen === 'game' && <GameScreen />}
    </div>
  )
}

export default function MaSoiPage() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  )
}