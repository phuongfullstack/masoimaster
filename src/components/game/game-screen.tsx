'use client'

import { useEffect, useState, useRef, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useGameStore } from '@/store/game-store'
import { useSocket } from '@/components/game/socket-provider'
import { ROLE_INFO, PHASE_CONFIG } from '@/lib/types'
import type { PlayerInfo, Role, ChatMsg, Phase } from '@/lib/types'
import {
  Moon, Sun, Vote, Crown, Skull, Shield, Eye, FlaskConical, Crosshair,
  Send, SkipForward, Clock, Ghost, Heart, Target, Swords, Trophy,
  AlertTriangle, MessageCircle, Lock,
} from 'lucide-react'

// ============================================================
// Timer Component
// ============================================================
function useCountdown(timerEnd: number | null) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!timerEnd) return () => {}
    const iv = setInterval(onStoreChange, 200)
    return () => clearInterval(iv)
  }, [timerEnd])
  const getSnapshot = useCallback(() => {
    if (!timerEnd) return 0
    return Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000))
  }, [timerEnd])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

function Timer({ timerEnd }: { timerEnd: number | null }) {
  const timeLeft = useCountdown(timerEnd)

  if (!timerEnd || timeLeft <= 0) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isUrgent = timeLeft <= 10

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
      isUrgent ? 'bg-red-900/50 text-red-300 animate-pulse' : 'bg-gray-700/50 text-gray-300'
    }`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono font-bold text-lg">{minutes > 0 ? `${minutes}:` : ''}{seconds.toString().padStart(2, '0')}</span>
    </div>
  )
}

// ============================================================
// Role Badge
// ============================================================
function RoleBadge({ role, reveal = false }: { role: string; reveal?: boolean }) {
  if (!role || (!reveal && role !== 'villager')) {
    return <Badge variant="outline" className="border-gray-600 text-gray-400">???</Badge>
  }
  const info = ROLE_INFO[role]
  if (!info) return null
  return (
    <Badge className="text-white" style={{ backgroundColor: info.color }}>
      {info.emoji} {info.name}
    </Badge>
  )
}

// ============================================================
// Role Reveal
// ============================================================
function RoleReveal() {
  const myRole = useGameStore(s => s.room?.myRole)
  const wolfPartners = useGameStore(s => s.room?.wolfPartners || [])
  const info = myRole ? ROLE_INFO[myRole] : null

  if (!info) return null
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-purple-900/30 to-gray-900 p-4">
      <Card className="w-full max-w-sm bg-gray-800/90 border-gray-600 text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="text-7xl animate-bounce">{info.emoji}</div>
          <div>
            <h2 className="text-2xl font-bold text-white">{info.name}</h2>
            <p className="text-gray-400 mt-2">{info.desc}</p>
          </div>
          <Badge className="text-white text-sm" style={{ backgroundColor: info.color }}>
            Phe: {info.team}
          </Badge>
          {wolfPartners.length > 0 && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
              <p className="text-red-300 text-sm">Đồng đội bầy sói: {wolfPartners.join(', ')}</p>
            </div>
          )}
          <p className="text-gray-500 text-xs">Ghi nhớ vai trò của bạn! Đang chuyển sang đêm...</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Night Screen (for each role)
// ============================================================
function NightScreen() {
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const myRole = useGameStore(s => s.room?.myRole) as Role | ''
  const isAlive = useGameStore(s => s.room?.isAlive)
  const nightWakeAction = useGameStore(s => s.nightWakeAction)
  const nightWakeLabel = useGameStore(s => s.nightWakeLabel)
  const seerResult = useGameStore(s => s.seerResult)
  const bittenPlayerId = useGameStore(s => s.bittenPlayerId)
  const messages = useGameStore(s => s.messages)
  const { emit } = useSocket()
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [wolfMsg, setWolfMsg] = useState('')
  const [seerRevealed, setSeerRevealed] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  if (!room) return null
  const alivePlayers = room.players.filter(p => p.isAlive && p.userId !== userId)
  const WOLF_ROLES = ['werewolf', 'white_werewolf']
  const isWolf = WOLF_ROLES.includes(myRole)

  const handleNightAction = (actionType: string, targetId: string | null) => {
    emit('night-action', { code: room.code, userId, actionType, targetId })
    setSelectedTarget(targetId)
  }

  const handleWolfChat = () => {
    if (!wolfMsg.trim()) return
    emit('send-message', { code: room.code, userId, content: wolfMsg, msgType: 'wolf' })
    setWolfMsg('')
  }

  // Seer: press-to-reveal
  const handleSeerReveal = () => {
    if (!seerResult) return
    setSeerRevealed(true)
    setTimeout(() => setSeerRevealed(false), 3000)
  }

  // Render different UI based on role
  const renderRoleAction = () => {
    // Dead players see decoy
    if (!isAlive) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Ghost className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Bạn đã chết...</p>
            <p className="text-sm mt-1">Đợi đến ngày để xem kết quả</p>
          </div>
        </div>
      )
    }

    // No wake action = decoy screen (villager or waiting)
    if (!nightWakeAction) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🌙</div>
            <p className="text-gray-400 text-lg">Đang là đêm...</p>
            <p className="text-gray-500 text-sm mt-1">Đừng mở mắt!</p>
            {/* Decoy mini-game area */}
            <div className="mt-8 bg-gray-800/50 rounded-xl p-6 max-w-xs mx-auto">
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Ghi chú riêng</p>
              <textarea
                className="w-full bg-transparent text-gray-500 text-sm resize-none h-20 outline-none"
                placeholder="Viết ghi chú..."
                disabled
              />
            </div>
          </div>
        </div>
      )
    }

    // Wolf action
    if (isWolf && (nightWakeAction === 'wolf_bite')) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🐺</div>
            <h3 className="text-red-400 font-bold text-lg">Bầy Sói Tỉnh Dậy</h3>
            <p className="text-gray-400 text-sm">Chọn người để cắn</p>
          </div>

          {/* Wolf Chat */}
          <div className="bg-gray-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {messages.filter(m => m.msgType === 'wolf').map(m => (
              <div key={m.id} className="text-sm text-red-300 mb-1">
                <span className="text-red-500 font-medium">{m.senderName}:</span> {m.content}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={wolfMsg}
              onChange={e => setWolfMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleWolfChat()}
              placeholder="Chat bầy sói..."
              className="bg-gray-700 border-gray-600 text-white text-sm h-9"
            />
            <Button size="sm" onClick={handleWolfChat} className="bg-red-700 hover:bg-red-800 h-9 px-3">
              <Send className="w-3 h-3" />
            </Button>
          </div>

          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-2">
            {alivePlayers.filter(p => !WOLF_ROLES.includes(p.role || 'villager') || p.role === 'white_werewolf').map(p => (
              <button
                key={p.userId}
                onClick={() => handleNightAction('wolf_bite', p.userId)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedTarget === p.userId
                    ? 'bg-red-600/30 border-red-500 text-white'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-red-400'
                }`}
              >
                <div className="font-medium text-sm">{p.username}</div>
                <div className="text-xs opacity-60">#{p.seatIndex + 1}</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Seer action
    if (myRole === 'seer' && nightWakeAction === 'seer_check') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🔮</div>
            <h3 className="text-purple-400 font-bold text-lg">Tiên Tri Tỉnh Dậy</h3>
            <p className="text-gray-400 text-sm">Chọn 1 người để soi phe</p>
          </div>

          {/* Seer Result - Press to reveal */}
          {seerResult && (
            <div
              className="p-4 rounded-lg border text-center cursor-pointer select-none"
              style={{
                backgroundColor: seerRevealed
                  ? (seerResult.isWolf ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)')
                  : 'rgba(55,65,81,0.5)',
                borderColor: seerRevealed
                  ? (seerResult.isWolf ? '#dc2626' : '#22c55e')
                  : '#4b5563',
              }}
              onTouchStart={handleSeerReveal}
              onMouseDown={handleSeerReveal}
            >
              {seerRevealed ? (
                <>
                  <div className="text-2xl mb-1">{seerResult.isWolf ? '🐺' : '👤'}</div>
                  <div className={`font-bold text-lg ${seerResult.isWolf ? 'text-red-400' : 'text-green-400'}`}>
                    {seerResult.targetName} là {seerResult.isWolf ? 'MA SÓI' : 'DÂN Làng'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Nhả tay để ẩn</div>
                </>
              ) : (
                <div className="text-gray-400">
                  <Lock className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm">Nhấn giữ để xem kết quả</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <button
                key={p.userId}
                onClick={() => handleNightAction('seer_check', p.userId)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedTarget === p.userId
                    ? 'bg-purple-600/30 border-purple-500 text-white'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-purple-400'
                }`}
              >
                <div className="font-medium text-sm">{p.username}</div>
                <div className="text-xs opacity-60">#{p.seatIndex + 1}</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Witch action
    if (myRole === 'witch' && nightWakeAction === 'witch_save') {
      const bittenPlayer = bittenPlayerId ? room.players.find(p => p.userId === bittenPlayerId) : null
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🧪</div>
            <h3 className="text-emerald-400 font-bold text-lg">Phù Thủy Tỉnh Dậy</h3>
          </div>

          {bittenPlayer && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
              <p className="text-red-300 text-sm mb-3">${bittenPlayer.username} bị sói cắn đêm nay!</p>
              <Button
                onClick={() => handleNightAction('witch_save', bittenPlayerId)}
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                <Heart className="w-4 h-4 mr-2" /> Dùng Thuốc Cứu
              </Button>
            </div>
          )}

          <div className="text-center text-gray-400 text-sm mb-2">Hoặc dùng thuốc độc:</div>
          <div className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <button
                key={p.userId}
                onClick={() => handleNightAction('witch_poison', p.userId)}
                className="p-3 rounded-lg border bg-gray-700/50 border-gray-600 text-gray-300 hover:border-purple-400 text-left transition-all"
              >
                <div className="font-medium text-sm">{p.username}</div>
                <div className="text-xs opacity-60">#${p.seatIndex + 1}</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Guard action
    if (myRole === 'guard' && nightWakeAction === 'guard_protect') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🛡️</div>
            <h3 className="text-amber-400 font-bold text-lg">Bảo Vệ Tỉnh Dậy</h3>
            <p className="text-gray-400 text-sm">Chọn 1 người để bảo vệ</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <button
                key={p.userId}
                onClick={() => handleNightAction('guard_protect', p.userId)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedTarget === p.userId
                    ? 'bg-amber-600/30 border-amber-500 text-white'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-amber-400'
                }`}
              >
                <div className="font-medium text-sm">{p.username}</div>
                <div className="text-xs opacity-60">#{p.seatIndex + 1}</div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Default: waiting
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌙</div>
          <p className="text-gray-400">Đêm {room.dayCount + 1}...</p>
          <p className="text-gray-500 text-sm mt-1">{nightWakeLabel || 'Đợi đến lượt'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Phase Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <span className="text-white font-semibold">Đêm {room.dayCount + 1}</span>
          </div>
          <Timer timerEnd={room.timerEnd} />
        </div>

        {/* Role Action */}
        <Card className="bg-gray-800/60 border-gray-700">
          <CardContent className="pt-4">
            {renderRoleAction()}
          </CardContent>
        </Card>

        {/* Alive Players Summary */}
        <Card className="bg-gray-800/60 border-gray-700">
          <CardContent className="pt-3 pb-3">
            <div className="text-xs text-gray-500 mb-2">Người còn sống ({room.players.filter(p => p.isAlive).length})</div>
            <div className="flex flex-wrap gap-1.5">
              {room.players.filter(p => p.isAlive).map(p => (
                <Badge key={p.userId} variant="outline" className="text-gray-300 border-gray-600 text-xs">
                  {p.isAlive ? '' : '💀 '}{p.username}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Day Screen
// ============================================================
function DayScreen() {
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const isAlive = useGameStore(s => s.room?.isAlive)
  const messages = useGameStore(s => s.messages)
  const dayDeaths = useGameStore(s => s.dayDeaths)
  const daySaved = useGameStore(s => s.daySaved)
  const isHost = useGameStore(s => s.room?.isHost)
  const hostMode = useGameStore(s => s.room?.hostMode)
  const { emit } = useSocket()
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!room) return null

  const handleSend = () => {
    if (!chatInput.trim()) return
    const msgType = isAlive ? 'public' : 'dead'
    emit('send-message', { code: room.code, userId, content: chatInput, msgType })
    setChatInput('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950/20 via-gray-900 to-gray-900 p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full space-y-4 flex-1 flex flex-col">
        {/* Phase Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            <span className="text-white font-semibold">Ngày {room.dayCount}</span>
          </div>
          <Timer timerEnd={room.timerEnd} />
        </div>

        {/* Death Announcement */}
        {dayDeaths.length > 0 && (
          <Card className="bg-red-900/30 border-red-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Skull className="w-5 h-5" />
                <span className="font-semibold">Người chết đêm qua:</span>
              </div>
              <div className="text-red-300 font-medium">{dayDeaths.join(', ')}</div>
              {daySaved && <div className="text-green-400 text-sm mt-1"> 有人 được phù thủy cứu sống!</div>}
            </CardContent>
          </Card>
        )}

        {dayDeaths.length === 0 && daySaved && (
          <Card className="bg-green-900/20 border-green-800">
            <CardContent className="pt-4">
              <div className="text-green-400">  Đêm qua hòa bình, không ai chết.</div>
            </CardContent>
          </Card>
        )}

        {/* Host Controls */}
        {isHost && hostMode !== 'auto' && (
          <div className="flex gap-2">
            <Button
              onClick={() => emit('host-next-phase', { code: room.code, userId })}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <SkipForward className="w-4 h-4 mr-1" /> Chuyển sang Bỏ Phiếu
            </Button>
          </div>
        )}

        {/* Chat */}
        <Card className="bg-gray-800/60 border-gray-700 flex-1 flex flex-col min-h-0">
          <CardContent className="pt-4 pb-2 flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 h-64">
              <div className="space-y-2 pr-4">
                {messages.filter(m => m.msgType === 'public' || m.msgType === 'system').map(m => (
                  <div key={m.id} className={m.msgType === 'system' ? 'text-center' : ''}>
                    {m.msgType === 'system' ? (
                      <span className="text-gray-500 text-xs italic">{m.content}</span>
                    ) : (
                      <div className="text-sm">
                        <span className={`font-medium ${m.senderId === userId ? 'text-blue-400' : 'text-gray-300'}`}>
                          {m.senderName}:
                        </span>{' '}
                        <span className="text-gray-200">{m.content}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="flex gap-2 mt-2 pb-1">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={isAlive ? 'Nhập tin nhắn...' : 'Chat Âm Ty...'}
                className="bg-gray-700 border-gray-600 text-white text-sm h-10"
                disabled={room.phase !== 'day'}
              />
              <Button onClick={handleSend} size="sm" className="bg-blue-600 hover:bg-blue-700 h-10 px-4">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Player Status */}
        <Card className="bg-gray-800/60 border-gray-700">
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {room.players.map(p => (
                <Badge key={p.userId}
                  variant="outline"
                  className={`text-xs ${p.isAlive ? 'text-gray-300 border-gray-600' : 'text-gray-600 border-gray-800 bg-gray-900/50 line-through'}`}
                >
                  {p.isAlive ? '' : '💀 '}{p.username}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Voting Screen
// ============================================================
function VotingScreen() {
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const isAlive = useGameStore(s => s.room?.isAlive)
  const isHost = useGameStore(s => s.room?.isHost)
  const hostMode = useGameStore(s => s.room?.hostMode)
  const voteResult = useGameStore(s => s.voteResult)
  const { emit } = useSocket()

  if (!room) return null
  const myVote = (room.votes as Record<string, string>)[userId]
  const alivePlayers = room.players.filter(p => p.isAlive && p.userId !== userId)

  // Count votes for display
  const voteCounts: Record<string, number> = {}
  Object.values(room.votes as Record<string, string>).forEach(targetId => {
    if (targetId) voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
  })

  if (voteResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
        <Card className="w-full max-w-md bg-gray-800/90 border-gray-600 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            {voteResult.isTie ? (
              <>
                <AlertTriangle className="w-16 h-16 mx-auto text-amber-400" />
                <h2 className="text-2xl font-bold text-white">Hoà Phiếu!</h2>
                <p className="text-gray-400">Không ai bị loại. Đang chuyển sang đêm...</p>
              </>
            ) : voteResult.eliminated ? (
              <>
                <Skull className="w-16 h-16 mx-auto text-red-400" />
                <h2 className="text-2xl font-bold text-white">{voteResult.eliminated}</h2>
                <p className="text-red-400">Đã bị loại bỏ!</p>
                <div className="text-sm text-gray-400 mt-4">
                  {Object.entries(voteResult.voteCounts).map(([uid, count]) => {
                    const p = room.players.find(pl => pl.userId === uid)
                    return p ? <div key={uid}>{p.username}: {count} phiếu</div> : null
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl">🤝</div>
                <h2 className="text-xl font-bold text-white">Không có ai bị loại</h2>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/20 via-gray-900 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-red-400" />
            <span className="text-white font-semibold">Bỏ Phiếu</span>
          </div>
          <Timer timerEnd={room.timerEnd} />
        </div>

        {isHost && hostMode !== 'auto' && (
          <Button onClick={() => emit('host-next-phase', { code: room.code, userId })} className="bg-red-600 hover:bg-red-700 w-full" size="sm">
            <SkipForward className="w-4 h-4 mr-1" /> Kết Quả Phiếu
          </Button>
        )}

        {/* Vote grid */}
        <div className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => (
            <button
              key={p.userId}
              onClick={() => isAlive && emit('submit-vote', { code: room.code, userId, targetId: p.userId })}
              disabled={!isAlive}
              className={`p-4 rounded-lg border text-left transition-all ${
                myVote === p.userId
                  ? 'bg-red-600/30 border-red-500 text-white'
                  : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:border-red-400'
              } ${!isAlive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{p.username}</div>
                  <div className="text-xs opacity-60">#{p.seatIndex + 1}</div>
                </div>
                {voteCounts[p.userId] ? (
                  <Badge className="bg-red-600 text-white">{voteCounts[p.userId]}</Badge>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {/* Skip vote option */}
        {isAlive && (
          <button
            onClick={() => emit('submit-vote', { code: room.code, userId, targetId: null })}
            className={`w-full p-3 rounded-lg border text-center transition-all ${
              !myVote ? 'bg-gray-600/30 border-gray-500 text-gray-300' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            Bỏ phiếu trắng (Không chọn ai)
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Hunter Shoot
// ============================================================
function HunterShoot() {
  const room = useGameStore(s => s.room)
  const userId = useGameStore(s => s.userId)
  const { emit } = useSocket()

  if (!room) return null
  const alivePlayers = room.players.filter(p => p.isAlive && p.userId !== userId)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-950 via-gray-900 to-gray-900 p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center">
          <Crosshair className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-white">Thợ Săn Bắn!</h2>
          <p className="text-gray-400 mt-2">Bạn đã chết. Chọn 1 người để bắn cùng!</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => (
            <button
              key={p.userId}
              onClick={() => emit('hunter-shoot', { code: room.code, userId, targetId: p.userId })}
              className="p-4 rounded-lg border bg-gray-800/80 border-gray-700 text-gray-300 hover:border-red-400 hover:bg-red-600/20 transition-all text-left"
            >
              <div className="font-semibold">{p.username}</div>
              <div className="text-xs opacity-60">#{p.seatIndex + 1}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Game Over
// ============================================================
function GameOverScreen() {
  const gameWinner = useGameStore(s => s.gameWinner)
  const gameOverPlayers = useGameStore(s => s.gameOverPlayers)
  const setRoom = useGameStore(s => s.setRoom)
  const setScreen = useGameStore(s => s.setScreen)

  const handleLeave = () => {
    setRoom(null)
    setScreen('home')
    useGameStore.getState().resetGame()
  }

  if (!gameWinner || !gameOverPlayers) return null

  const isWolfWin = gameWinner === 'werewolf'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Trophy className={`w-20 h-20 mx-auto ${isWolfWin ? 'text-red-400' : 'text-blue-400'}`} />
          <h1 className="text-3xl font-bold text-white mt-4">
            {isWolfWin ? '🐺 Bầy Sói Thắng!' : '👤 Dân Làng Thắng!'}
          </h1>
          <p className="text-gray-400 mt-2">
            {isWolfWin ? 'Sói đã thống trị bản làng...' : 'Dân làng đã diệt trừ toàn bộ sói!'}
          </p>
        </div>

        {/* Reveal all roles */}
        <Card className="bg-gray-800/80 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Lộ Diện Vai Trò</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gameOverPlayers.map(p => {
                const info = ROLE_INFO[p.role]
                return (
                  <div key={p.username} className={`flex items-center justify-between p-2 rounded-lg ${
                    p.isAlive ? 'bg-gray-700/50' : 'bg-gray-800/50 opacity-60'
                  }`}>
                    <span className={p.isAlive ? 'text-white' : 'text-gray-500 line-through'}>
                      {p.isAlive ? '' : '💀 '}{p.username}
                    </span>
                    {info && (
                      <Badge className="text-white text-xs" style={{ backgroundColor: info.color }}>
                        {info.emoji} {info.name}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleLeave} className="w-full h-12 text-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold">
          Về Trang Chính
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Main Game Router
// ============================================================
export function GameScreen() {
  const room = useGameStore(s => s.room)
  const phase = useGameStore(s => s.currentPhase || s.room?.phase || 'lobby')
  const myRole = useGameStore(s => s.room?.myRole)
  const isAlive = useGameStore(s => s.room?.isAlive)
  const hunterTriggered = useGameStore(s => s.hunterTriggered)

  if (!room) return null

  // Game Over
  if (phase === 'game_over') return <GameOverScreen />

  // Role Reveal
  if (phase === 'role_reveal' && myRole) return <RoleReveal />

  // Hunter Shoot
  if (hunterTriggered && myRole === 'hunter') return <HunterShoot />

  // Night
  if (phase === 'night' || phase === 'night_resolve') return <NightScreen />

  // Voting
  if (phase === 'voting' || phase === 'vote_result') return <VotingScreen />

  // Day (default)
  return <DayScreen />
}
