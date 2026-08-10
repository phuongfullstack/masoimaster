'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useGameStore } from '@/store/game-store'

export function LoginScreen() {
  const [name, setName] = useState('')
  const setAuth = useGameStore(s => s.setAuth)
  const userId = useGameStore(s => s.userId)

  const handleSubmit = () => {
    if (!name.trim()) return
    const id = localStorage.getItem('ma-soi-user-id') || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('ma-soi-user-id', id)
    localStorage.setItem('ma-soi-username', name.trim())
    setAuth(id, name.trim())
  }

  if (userId) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800/80 border-gray-700 backdrop-blur">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🐺</div>
          <CardTitle className="text-3xl font-bold text-white">Ma Sói Realtime</CardTitle>
          <CardDescription className="text-gray-400 mt-2">
            Nhập tên của bạn để bắt đầu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Tên của bạn..."
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 h-12 text-lg"
              maxLength={20}
              autoFocus
            />
            <Button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="w-full h-12 text-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Vào Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}