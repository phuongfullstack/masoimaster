'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/game-store'
import { useSocket } from '@/components/game/socket-provider'
import { Moon, Users, Plus, LogOut, Copy } from 'lucide-react'
import { useEffect } from 'react'
import { DEFAULT_CONFIG, ROLE_INFO } from '@/lib/types'
import type { RoleConfig } from '@/lib/types'

export function HomeScreen() {
  const { emit } = useSocket()
  const username = useGameStore(s => s.username)
  const userId = useGameStore(s => s.userId)
  const setRoom = useGameStore(s => s.setRoom)
  const setScreen = useGameStore(s => s.setScreen)
  const error = useGameStore(s => s.error)

  const [joinCode, setJoinCode] = useState('')
  const [hostMode, setHostMode] = useState<'auto' | 'direct' | 'hybrid'>('auto')
  const [config, setConfig] = useState<RoleConfig>({ ...DEFAULT_CONFIG })
  const [copied, setCopied] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const handleCreate = () => {
    emit('create-room', { userId, username, config, hostMode })
  }

  const handleJoin = () => {
    if (!joinCode.trim()) return
    emit('join-room', { code: joinCode.trim(), userId, username })
  }

  const handleLogout = () => {
    localStorage.removeItem('ma-soi-user-id')
    localStorage.removeItem('ma-soi-username')
    localStorage.removeItem('ma-soi-room-code')
    useGameStore.getState().resetGame()
    window.location.reload()
  }

  const updateConfig = (key: keyof RoleConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: Math.max(0, value) }))
  }

  const totalSpecial = config.werewolf + config.white_werewolf + config.seer + config.witch + config.guard + config.hunter + config.cupid

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🐺</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Ma Sói Realtime</h1>
              <p className="text-gray-400 text-sm">Chơi Ma Sói trực tuyến</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-gray-300 border-gray-600">
              <Users className="w-3 h-3 mr-1" /> {username}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Quick Join */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5" /> Tham Gia Nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Nhập mã phòng (VD: AXB123)"
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 uppercase tracking-widest text-center text-xl font-mono h-12"
                maxLength={6}
              />
              <Button onClick={handleJoin} disabled={joinCode.trim().length < 4} className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold shrink-0">
                Vào Phòng
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Room */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Moon className="w-5 h-5" /> Tạo Phòng Mới
            </CardTitle>
            <CardDescription className="text-gray-400">Bạn sẽ trở thành Host (Quản trò)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Host Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Chế độ Quản trò</label>
              <div className="grid grid-cols-3 gap-2">
                {([['auto', 'Tự động', 'Hệ thống điều khiển'], ['direct', 'Đạo diễn', 'Host bấm nút'], ['hybrid', 'Hỗn hợp', 'Tự động + Host skip']] as const).map(([mode, label, desc]) => (
                  <button
                    key={mode}
                    onClick={() => setHostMode(mode)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      hostMode === mode ? 'bg-red-600/20 border-red-500 text-white' : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs opacity-70 mt-1">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Toggle */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {showConfig ? '▾ Ẩn cấu hình' : '▸ Tùy chỉnh vai trò'}
            </button>

            {showConfig && (
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                <div className="text-xs text-gray-400">Cấu hình bộ bài ({totalSpecial} vai đặc biệt + Dân)</div>
                {Object.entries(ROLE_INFO).filter(([k]) => k !== 'villager').map(([key, info]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{info.emoji} {info.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateConfig(key as keyof RoleConfig, (config as any)[key] - 1)}
                        className="w-7 h-7 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center justify-center">−</button>
                      <span className="w-6 text-center text-white font-mono">{(config as any)[key]}</span>
                      <button onClick={() => updateConfig(key as keyof RoleConfig, (config as any)[key] + 1)}
                        className="w-7 h-7 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center justify-center">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleCreate} className="w-full h-12 text-lg bg-red-600 hover:bg-red-700 text-white font-semibold">
              Tạo Phòng
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}