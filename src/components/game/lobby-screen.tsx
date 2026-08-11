'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/game-store'
import { useSocket } from '@/components/game/socket-provider'
import { GameButton } from '@/components/ui/game/GameButton'
import { GameCard, GameCardHeader, GameCardTitle } from '@/components/ui/game/GameCard'
import { GameBadge } from '@/components/ui/game/GameBadge'
import { GameAvatar } from '@/components/ui/game/GameAvatar'
import { RoleCrest } from '@/components/characters/RoleCrest'
import { ROLE_INFO, sumSpecial } from '@/lib/types'
import { Copy, CheckCircle2, DoorOpen, X, Check } from 'lucide-react'

export function LobbyScreen() {
  const { emit } = useSocket()
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const setRoom = useGameStore(s => s.setRoom)
  const setScreen = useGameStore(s => s.setScreen)
  const [copied, setCopied] = useState(false)

  if (!room) return null
  const isHost = room.hostId === userId
  const myPlayer = room.players.find((p) => p.userId === userId)
  const totalSpecial = sumSpecial(room.config)

  const minPlayersNeeded = Math.max(4, totalSpecial)

  const handleReady = () => {
    emit('player-ready', { code: room.code, userId, ready: !myPlayer?.isReady })
  }

  const handleStart = () => {
    if (room.players.length < minPlayersNeeded) return
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

  const allReady = room.players.every((p) => p.isReady || p.userId === room.hostId)
  const canStart = room.players.length >= minPlayersNeeded && allReady

  return (
    <div className="min-h-screen bg-game-primary p-4 font-game">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Room Code Header */}
        <GameCard className="animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[rgb(var(--ms-text-muted))] uppercase tracking-wider">
                Mã phòng
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-4xl font-extrabold text-white font-mono tracking-[0.2em]">
                  {room.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-[rgb(var(--ms-text-muted))] hover:text-[rgb(var(--ms-brand))] transition-colors"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-[rgb(var(--ms-brand))]" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="text-right space-y-1">
              <GameBadge color="#3b82f6" size="sm">
                {room.players.length} người chơi
              </GameBadge>
              <div className="text-xs text-[rgb(var(--ms-text-muted))]">
                {room.hostMode === 'auto'
                  ? 'Tự động'
                  : room.hostMode === 'direct'
                    ? 'Đạo diễn'
                    : 'Hỗn hợp'}
              </div>
            </div>
          </div>
        </GameCard>

        {/* Config Summary */}
        <GameCard className="animate-slide-up">
          <div className="text-xs font-bold text-[rgb(var(--ms-text-muted))] mb-2 uppercase tracking-wider">
            Bộ bài: {totalSpecial} vai đặc biệt + {Math.max(0, room.players.length - totalSpecial)} Dân
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_INFO)
              .filter(([k]) => k !== 'villager')
              .map(([key, info]) => {
                const count = (room.config as any)[key]
                if (count <= 0) return null
                return (
                  <GameBadge key={key} color={info.color} size="sm">
                    <RoleCrest role={key} size={15} /> {info.name} ×{count}
                  </GameBadge>
                )
              })}
            <GameBadge color="#3b82f6" size="sm">
              <RoleCrest role="villager" size={15} /> Dân ×
              {Math.max(0, room.players.length - totalSpecial)}
            </GameBadge>
          </div>
        </GameCard>

        {/* Player List */}
        <GameCard className="animate-slide-up">
          <GameCardHeader>
            <GameCardTitle>Danh Sách Người Chơi</GameCardTitle>
          </GameCardHeader>
          <div className="space-y-2">
            {room.players.map((player) => (
              <div
                key={player.userId}
                className="flex items-center justify-between p-3 rounded-2xl bg-[rgb(var(--ms-surface))]/60 hover:bg-[rgb(var(--ms-surface))] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GameAvatar
                    index={player.seatIndex}
                    username={player.username}
                    isHost={player.userId === room.hostId}
                    size="sm"
                  />
                  <span className="text-white font-bold">{player.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  {player.userId !== room.hostId && (
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold ${
                        player.isReady
                          ? 'bg-[rgb(var(--ms-brand))]/20 text-[rgb(var(--ms-brand))]'
                          : 'bg-[rgb(var(--ms-surface))] text-[rgb(var(--ms-text-muted))]'
                      }`}
                    >
                      {player.isReady ? (
                        <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />Sẵn sàng</span>
                      ) : (
                        'Chờ...'
                      )}
                    </span>
                  )}
                  {isHost && player.userId !== userId && (
                    <button
                      onClick={() => handleKick(player.userId)}
                      className="text-[rgb(var(--ms-text-muted))] hover:text-[rgb(var(--ms-wolf))] transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GameCard>

        {/* Actions */}
        <div className="flex gap-3 animate-slide-up">
          {!isHost && (
            <GameButton
              onClick={handleReady}
              variant={myPlayer?.isReady ? 'secondary' : 'primary'}
              size="lg"
              className="flex-1"
            >
              {myPlayer?.isReady ? (
                <>
                  <Check className="w-5 h-5" /> Đã Sẵn Sàng
                </>
              ) : (
                'Sẵn Sàng'
              )}
            </GameButton>
          )}
          {isHost && totalSpecial > room.players.length && (
            <p className="text-xs text-amber-300 text-center">
              Cần thêm {totalSpecial - room.players.length} người (cấu hình có {totalSpecial} vai đặc biệt)
            </p>
          )}
          {isHost && (
            <GameButton
              onClick={handleStart}
              disabled={!canStart}
              variant="danger"
              size="lg"
              className="flex-1"
            >
              Bắt Đầu ({room.players.length}/{minPlayersNeeded}+)
            </GameButton>
          )}
          <GameButton onClick={handleLeave} variant="ghost" size="lg">
            <DoorOpen className="w-4 h-4" /> Rời
          </GameButton>
        </div>
      </div>
    </div>
  )
}
