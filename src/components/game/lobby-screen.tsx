'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/game-store'
import { useSocket } from '@/components/game/socket-provider'
import { Crown, User, Check, X, DoorOpen, Copy, CheckCircle2 } from 'lucide-react'
import { ROLE_INFO } from '@/lib/types'

export function LobbyScreen() {
  const { emit } = useSocket()
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const username = useGameStore(s => s.username)
  const setRoom = useGameStore(s => s.setRoom)
  const setScreen = useGameStore(s => s.setScreen)
  const [copied, setCopied] = useState(false)

  if (!room) return null
  const isHost = room.hostId === userId
  const myPlayer = room.players.find(p => p.userId === userId)
  const totalSpecial = room.config.werewolf + room.config.white_werewolf + room.config.seer +
    room.config.witch + room.config.guard + room.config.hunter + room.config.cupid

  const handleReady = () => {
    emit('player-ready', { code: room.code, userId, ready: !myPlayer?.isReady })
  }

  const handleStart = () => {
    if (room.players.size < 4) return
    emit('start-game', { code: room.code, userId })
  }

  const handleLeave = () => {
    emit('leave-room', { code: room.code, userId })
    localStorage.removeItem('ma-soi-room-code')
    setRoom(null)
    setScreen('home')
  }

  const handleKick = (targetUserId: string) => {
    emit('kick-player', { code: room.code, userId, targetUserId })
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allReady = room.players.every(p => p.isReady || p.userId === room.hostId)
  const canStart = room.players.size >= 4 && (allReady || !isHost)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Room Header */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Mã phòng</div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-mono font-bold text-white tracking-widest">{room.code}</span>
                  <button onClick={handleCopyCode} className="text-gray-400 hover:text-white transition-colors">
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-gray-300 border-gray-600 mb-2">
                  {room.players.size} người chơi
                </Badge>
                <div className="text-xs text-gray-500">{room.hostMode === 'auto' ? 'Tự động' : room.hostMode === 'direct' ? 'Đạo diễn' : 'Hỗn hợp'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Config Summary */}
        <Card className="bg-gray-800/60 border-gray-700">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-gray-400 mb-2">Bộ bài: {totalSpecial} vai đặc biệt + {Math.max(0, room.players.size - totalSpecial)} Dân</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_INFO).filter(([k]) => k !== 'villager').map(([key, info]) => {
                const count = (room.config as any)[key]
                if (count <= 0) return null
                return (
                  <Badge key={key} variant="secondary" className="bg-gray-700 text-gray-200">
                    {info.emoji} {info.name} ×{count}
                  </Badge>
                )
              })}
              <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                👤 Dân ×{Math.max(0, room.players.size - totalSpecial)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Player List */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Danh Sách Người Chơi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {room.players.map((player) => (
                <div key={player.userId} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-bold">
                      {player.seatIndex + 1}
                    </div>
                    <div>
                      <span className="text-white font-medium">{player.username}</span>
                      {player.userId === room.hostId && (
                        <Crown className="w-3 h-3 text-yellow-400 inline ml-1" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.userId !== room.hostId && (
                      <span className={`text-xs px-2 py-1 rounded ${player.isReady ? 'bg-green-900/50 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                        {player.isReady ? 'Sẵn sàng' : 'Chờ...'}
                      </span>
                    )}
                    {isHost && player.userId !== userId && (
                      <button onClick={() => handleKick(player.userId)} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          {!isHost && (
            <Button
              onClick={handleReady}
              className={`flex-1 h-12 text-lg font-semibold ${myPlayer?.isReady ? 'bg-gray-600 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
              variant={myPlayer?.isReady ? 'secondary' : 'default'}
            >
              {myPlayer?.isReady ? (
                <><Check className="w-5 h-5 mr-2" /> Đã Sẵn Sàng</>
              ) : (
                'Sẵn Sàng'
              )}
            </Button>
          )}
          {isHost && (
            <Button
              onClick={handleStart}
              disabled={room.players.size < 4}
              className="flex-1 h-12 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white"
            >
              Bắt Đầu ({room.players.size}/4+)
            </Button>
          )}
          <Button onClick={handleLeave} variant="outline" className="h-12 px-6 border-gray-600 text-gray-300 hover:text-white">
            <DoorOpen className="w-4 h-4 mr-2" /> Rời
          </Button>
        </div>
      </div>
    </div>
  )
}
