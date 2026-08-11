'use client'

import { useCallback, useEffect, useState, useRef, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameButton } from '@/components/ui/game/GameButton'
import { GameCard, GameCardHeader, GameCardTitle, GameCardContent } from '@/components/ui/game/GameCard'
import { GameBadge } from '@/components/ui/game/GameBadge'
import { GameInput } from '@/components/ui/game/GameInput'
import { GameTimerCircle } from '@/components/ui/game/GameProgress'
import { GameAvatar } from '@/components/ui/game/GameAvatar'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { useGameStore } from '@/store/game-store'
import { useSocket } from '@/components/game/socket-provider'
import { ROLE_INFO, isWolfRole } from '@/lib/types'
import type { Role } from '@/lib/types'
import { PressToReveal } from '@/components/game/ui/PressToReveal'
import { CardFab } from '@/components/game/ui/CardFab'
import {
  Moon, Sun, Vote, Skull, Eye,
  Send, SkipForward, Heart, Target, Trophy,
  AlertTriangle, Lock, Sparkles, Zap,
} from 'lucide-react'
import {
  springBouncy, springSnappy, springGentle, staggerContainer, staggerItem,
  characterBounce, characterFloat, buttonPress, selectBounce,
  timerPulse, deathFade, winBounce, chatMessage,
} from '@/styles/animations'
import { cn } from '@/lib/utils'

// ============================================================
// Timer Hook
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
  return useSyncExternalStore(subscribe, getSnapshot, () => 0)
}

// ============================================================
// Phase Header (shared across Night/Day/Voting)
// ============================================================
function PhaseHeader({
  icon,
  iconColor,
  label,
  timerEnd,
  totalTime = 30,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  timerEnd: number | null
  totalTime?: number
}) {
  const timeLeft = useCountdown(timerEnd)
  const isUrgent = timeLeft <= 10 && timeLeft > 0

  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconColor)}>
          {icon}
        </div>
        <span className="text-white font-bold text-lg font-[family-name:var(--font-nunito)]">
          {label}
        </span>
      </div>
      {timerEnd && timeLeft > 0 && (
        <motion.div animate={isUrgent ? 'animate' : undefined} variants={timerPulse}>
          <GameTimerCircle
            timeLeft={timeLeft}
            totalTime={totalTime}
            size={52}
            strokeWidth={4}
            urgent={isUrgent}
          />
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// Player Target Button (reusable for wolf/seer/witch/guard/voting)
// ============================================================
function PlayerTarget({
  player,
  isSelected,
  accentColor,
  disabled,
  voteCount,
  onClick,
}: {
  player: { userId: string; username: string; seatIndex: number; role?: string }
  isSelected: boolean
  accentColor: string
  disabled?: boolean
  voteCount?: number
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={selectBounce.tap}
      whileHover={!disabled ? selectBounce.hover : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all duration-150 w-full',
        isSelected
          ? `${accentColor} border-transparent`
          : 'bg-[rgb(var(--ms-card))] border-white/[0.06] hover:border-white/20',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <GameAvatar
        index={player.seatIndex}
        username={player.username}
        role={player.role}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[rgb(var(--ms-text-primary))] truncate">
          {player.username}
        </div>
        <div className="text-xs text-[rgb(var(--ms-text-muted))]">#{player.seatIndex + 1}</div>
      </div>
      {isSelected ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springSnappy}
          className="w-5 h-5 rounded-full bg-[rgb(var(--ms-brand))] flex items-center justify-center flex-shrink-0"
        >
          <Zap className="w-3 h-3 text-white" />
        </motion.div>
      ) : voteCount && voteCount > 0 ? (
        <motion.span
          key={voteCount}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSnappy}
          className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[rgb(var(--ms-wolf))] text-white text-[11px] font-extrabold flex items-center justify-center"
        >
          {voteCount}
        </motion.span>
      ) : null}
    </motion.button>
  )
}

// ============================================================
// Alive Players Bar
// ============================================================
function AlivePlayersBar({ players }: { players: { userId: string; username: string; seatIndex: number; isAlive: boolean; role?: string }[] }) {
  const alive = players.filter(p => p.isAlive)
  return (
    <GameCard className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[rgb(var(--ms-brand))]" />
        <span className="text-xs font-bold text-[rgb(var(--ms-text-secondary))] uppercase tracking-wider">
          Còn sống ({alive.length}/{players.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map(p => (
          <GameAvatar
            key={p.userId}
            index={p.seatIndex}
            username={p.username}
            role={p.role}
            isAlive={p.isAlive}
            size="sm"
          />
        ))}
      </div>
    </GameCard>
  )
}

// ============================================================
// Role Reveal
// ============================================================
function RoleReveal() {
  const myRole = useGameStore(s => s.room?.myRole)
  const wolfPartners = useGameStore(s => s.room?.wolfPartners || [])
  const loverPartner = useGameStore(s => s.room?.loverPartner)
  const info = myRole ? ROLE_INFO[myRole] : null

  if (!info) return null

  // ANTI-PEEK (design 17-vai): mọi người ngồi chung bàn nên thẻ vai
  // KHÔNG hiển thị sẵn. Khung thẻ trung tính duy nhất (không glow,
  // không màu phe), min-height cố định, nội dung chỉ rõ khi ĐÈ GIỮ.
  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springBouncy}
        className="w-full max-w-sm"
      >
        <div
          className="rounded-3xl border p-6 text-center"
          style={{
            minHeight: 330,
            background: 'linear-gradient(155deg,#16141F,#211E30)',
            borderColor: '#35325180',
          }}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/40 mb-4">
            Thẻ bài của bạn
          </p>

          <PressToReveal
            hint={
              <span className="px-4 py-2 rounded-2xl bg-black/55 text-[11px] font-extrabold tracking-[0.2em] uppercase text-white/90">
                🎴 Nhấn giữ để lật thẻ
              </span>
            }
          >
            <div className="space-y-3" style={{ minHeight: 250 }}>
              <div className="flex justify-center">
                <CharacterIcon role={myRole || 'villager'} size="xl" state="happy" />
              </div>
              <h2 className="text-2xl font-extrabold text-white">{info.name}</h2>
              {/* Phe chỉ là chữ — không mã màu (chống liếc trộm màu từ xa) */}
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/50">
                Phe {info.team}
              </p>
              <p className="text-sm text-white/70 leading-relaxed">{info.desc}</p>

              {wolfPartners.length > 0 && (
                <div className="rounded-2xl bg-black/30 px-3 py-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/45 mb-1">
                    Bầy của bạn
                  </p>
                  <p className="text-sm font-bold text-white/85">{wolfPartners.join(' · ')}</p>
                </div>
              )}

              {loverPartner && (
                <p className="text-sm font-bold text-white/85 flex items-center gap-1.5 justify-center">
                  <Heart className="w-3.5 h-3.5" /> Người yêu: {loverPartner}
                </p>
              )}
            </div>
          </PressToReveal>

          <p className="text-white/35 text-xs mt-4">
            Nhấc tay là thẻ tự úp lại. Giữa ván, đè nút 🎴 để xem lại.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// Night — shared anti-reveal pieces
// ============================================================
/** Header ẩn danh cho lượt hành động: KHÔNG icon vai, KHÔNG tên vai, KHÔNG màu phe. */
function NightTurnHeader({ prompt }: { prompt: string }) {
  return (
    <motion.div variants={staggerItem} className="text-center">
      <p className="text-2xl mb-2">🌙</p>
      <h3 className="text-[#A7C5EB] font-extrabold text-lg tracking-[0.14em] uppercase">
        Đến lượt bạn
      </h3>
      <p className="text-[rgb(var(--ms-text-secondary))] text-sm mt-1">{prompt}</p>
    </motion.div>
  )
}

/** Màu chọn mục tiêu trung tính — mọi vai dùng CHUNG (chống suy vai từ màu). */
const NIGHT_ACCENT = 'bg-[#A7C5EB]/15 border-[#A7C5EB]'

/**
 * Màn chờ đêm — DECOY: vai không hành động, vai đã xong lượt, và người
 * chờ lượt đều thấy CHÍNH XÁC màn này (khác một pixel là lộ vai).
 */
function NightWaiting() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-center w-full max-w-xs"
      >
        <div className="relative mb-6">
          <Moon className="w-16 h-16 text-[#A7C5EB]/60 mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#A7C5EB]/10 animate-glow-pulse" />
          </div>
        </div>
        <p className="text-[rgb(var(--ms-text-secondary))] text-lg font-bold">Đang là đêm...</p>
        <p className="text-[rgb(var(--ms-text-muted))] text-sm mt-1">Đừng mở mắt!</p>
        {/* Fake-busy decoy elements — identical visual language to NightTurnHeader
            so a bystander cannot tell whether this player has an action or not. */}
        <div className="mt-6 p-4 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[#353251]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#7E93AF] text-xs font-bold uppercase tracking-wider">Đang xử lý</span>
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[#A7C5EB] text-xs font-mono"
            >
              ●●●
            </motion.span>
          </div>
          {/* Fake progress bar — animates the same way as a real night step */}
          <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
            <motion.div
              animate={{ width: ['15%', '70%', '92%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.6, 1] }}
              className="h-full rounded-full bg-[#A7C5EB]/40"
            />
          </div>
        </div>
        <div className="mt-4 p-4 rounded-2xl bg-[rgb(var(--ms-card))] border border-white/[0.06]">
          <p className="text-[rgb(var(--ms-text-muted))] text-xs uppercase tracking-wider mb-2 font-bold">
            Ghi chú riêng
          </p>
          <div className="w-full h-16 rounded-xl bg-[rgb(var(--ms-bg-primary))] border border-white/[0.04]" />
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// Night Screen (per role)
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
  const [cupidPair, setCupidPair] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!room) return null
  const alivePlayers = room.players.filter(p => p.isAlive && p.userId !== userId)
  const isWolf = isWolfRole(myRole)

  const handleNightAction = (actionType: string, targetId: string | null) => {
    emit('night-action', { code: room.code, userId, actionType, targetId })
    setSelectedTarget(targetId)
  }

  const handleWolfChat = () => {
    if (!wolfMsg.trim()) return
    emit('send-message', { code: room.code, userId, content: wolfMsg, msgType: 'wolf' })
    setWolfMsg('')
  }


  // ---- Render role-specific action ----
  const renderRoleAction = () => {
    // Dead players
    if (!isAlive) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, 4, 0], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-4"
            >
              <CharacterIcon role="villager" size="xl" state="sad" glow />
            </motion.div>
            <p className="text-[rgb(var(--ms-text-secondary))] text-lg font-bold">Bạn đã chết...</p>
            <p className="text-[rgb(var(--ms-text-muted))] text-sm mt-1">Đợi đến ngày để xem kết quả</p>
          </motion.div>
        </div>
      )
    }

    // Waiting / no wake action — decoy thống nhất
    if (!nightWakeAction) return <NightWaiting />

    // ---- Wolf Action ----
    if (isWolf && nightWakeAction === 'wolf_bite') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn người để cắn đêm nay" />

          {/* Wolf Chat */}
          <motion.div variants={staggerItem}>
            <GameCard className="bg-[rgb(var(--ms-card))]">
              <div className="max-h-28 overflow-y-auto space-y-1 mb-3">
                {messages.filter(m => m.msgType === 'wolf').map(m => (
                  <motion.div key={m.id} variants={chatMessage} initial="initial" animate="animate">
                    <span className="text-[rgb(var(--ms-wolf))] font-bold text-sm">{m.senderName}:</span>{' '}
                    <span className="text-[rgb(var(--ms-wolf))]/80 text-sm">{m.content}</span>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <GameInput
                  value={wolfMsg}
                  onChange={e => setWolfMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleWolfChat()}
                  placeholder="Chat bầy sói..."
                  className="text-sm h-9"
                />
                <GameButton size="sm" variant="danger" onClick={handleWolfChat}>
                  <Send className="w-3.5 h-3.5" />
                </GameButton>
              </div>
            </GameCard>
          </motion.div>

          {/* Target Selection */}
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers
              .filter(p => !isWolfRole(p.role) || p.role === 'white_werewolf')
              .map(p => (
                <PlayerTarget
                  key={p.userId}
                  player={p}
                  isSelected={selectedTarget === p.userId}
                  accentColor={NIGHT_ACCENT}
                  onClick={() => handleNightAction('wolf_bite', p.userId)}
                />
              ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Seer Action ----
    if (myRole === 'seer' && nightWakeAction === 'seer_check') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 1 người để soi phe" />

          {/* Seer Result — anti-peek: chỉ rõ trong lúc đè, nhả tay là che ngay */}
          {seerResult && (
            <motion.div variants={staggerItem}>
              <PressToReveal
                className="p-5 rounded-2xl border-2 text-center bg-[rgb(var(--ms-card))] border-white/[0.06]"
                hint={
                  <span className="text-[rgb(var(--ms-text-muted))] text-center">
                    <Lock className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-bold">Nhấn giữ để xem kết quả</span>
                  </span>
                }
              >
                <div>
                  <div className="text-5xl mb-2">
                    {seerResult.isWolf ? '🐺' : '👤'}
                  </div>
                  <div className="font-extrabold text-lg mt-3 font-[family-name:var(--font-nunito)] text-white">
                    {seerResult.targetName} là {seerResult.isWolf ? 'MA SÓI' : 'DÂN LÀNG'}
                  </div>
                  <div className="text-[rgb(var(--ms-text-muted))] text-xs mt-1">Nhả tay để ẩn</div>
                </div>
              </PressToReveal>
            </motion.div>
          )}

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={selectedTarget === p.userId}
                accentColor={NIGHT_ACCENT}
                onClick={() => handleNightAction('seer_check', p.userId)}
              />
            ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Witch Action ----
    if (myRole === 'witch' && nightWakeAction === 'witch_save') {
      const bittenPlayer = bittenPlayerId ? room.players.find(p => p.userId === bittenPlayerId) : null
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Dùng thuốc của bạn — hoặc không" />

          {/* Save potion */}
          {bittenPlayer && (
            <motion.div variants={staggerItem}>
              <GameCard className="border-[rgb(var(--ms-wolf)/0.3)]">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-[rgb(var(--ms-wolf))] font-bold text-sm">
                    <Skull className="w-4 h-4" />
                    <span>{bittenPlayer.username} bị sói cắn đêm nay!</span>
                  </div>
                  <GameButton variant="primary" onClick={() => handleNightAction('witch_save', bittenPlayerId)} className="w-full">
                    <Heart className="w-4 h-4" /> Dùng Thuốc Cứu
                  </GameButton>
                </div>
              </GameCard>
            </motion.div>
          )}

          {/* Poison */}
          <motion.div variants={staggerItem}>
            <div className="text-center text-[rgb(var(--ms-text-secondary))] text-sm mb-3 font-bold">
              Hoặc dùng thuốc độc:
            </div>
          </motion.div>
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={selectedTarget === p.userId}
                accentColor={NIGHT_ACCENT}
                onClick={() => handleNightAction('witch_poison', p.userId)}
              />
            ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Guard Action ----
    if (myRole === 'guard' && nightWakeAction === 'guard_protect') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 1 người để bảo vệ" />

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={selectedTarget === p.userId}
                accentColor={NIGHT_ACCENT}
                onClick={() => handleNightAction('guard_protect', p.userId)}
              />
            ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Cupid Action ----
    if (myRole === 'cupid' && nightWakeAction === 'cupid_link') {
      const togglePair = (uid: string) => {
        setCupidPair(prev =>
          prev.includes(uid)
            ? prev.filter(x => x !== uid)
            : prev.length < 2 ? [...prev, uid] : [prev[1], uid],
        )
      }
      const confirmPair = () => {
        if (cupidPair.length !== 2) return
        emit('cupid-link', { code: room.code, userId, targetIds: [cupidPair[0], cupidPair[1]] })
      }
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 2 người để ghép đôi" />

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={cupidPair.includes(p.userId)}
                accentColor={NIGHT_ACCENT}
                onClick={() => togglePair(p.userId)}
              />
            ))}
          </motion.div>

          <motion.div variants={staggerItem}>
            <GameButton
              variant="primary"
              disabled={cupidPair.length !== 2}
              onClick={confirmPair}
              className="w-full"
            >
              <Heart className="w-4 h-4" />
              {cupidPair.length === 2 ? 'Ghép Đôi!' : `Chọn ${2 - cupidPair.length} người nữa`}
            </GameButton>
            <p className="text-center text-[rgb(var(--ms-text-muted))] text-xs mt-2">
              Nếu hết giờ, hệ thống sẽ ghép ngẫu nhiên.
            </p>
          </motion.div>
        </motion.div>
      )
    }

    // Default waiting — decoy thống nhất (KHÔNG hiện nightWakeLabel:
    // biết vai nào đang dậy = lộ thứ tự đêm)
    return <NightWaiting />
  }

  return (
    <div className="min-h-screen bg-game-night p-4">
      <div className="max-w-2xl mx-auto">
        <PhaseHeader
          icon={<Moon className="w-5 h-5 text-[rgb(var(--ms-seer))]" />}
          iconColor="bg-[rgb(var(--ms-seer)/0.15)]"
          label={`Đêm ${room.dayCount + 1}`}
          timerEnd={room.timerEnd}
          totalTime={30}
        />

        <GameCard>
          <GameCardContent>{renderRoleAction()}</GameCardContent>
        </GameCard>

        <AlivePlayersBar players={room.players} />
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
    <div className="min-h-screen bg-game-day p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col gap-4">
        <PhaseHeader
          icon={<Sun className="w-5 h-5 text-[rgb(var(--ms-guard))]" />}
          iconColor="bg-[rgb(var(--ms-guard)/0.15)]"
          label={`Ngày ${room.dayCount}`}
          timerEnd={room.timerEnd}
          totalTime={90}
        />

        {/* Death Announcement */}
        <AnimatePresence>
          {dayDeaths.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springBouncy}
            >
              <GameCard className="border-[rgb(var(--ms-wolf)/0.3)] bg-[rgb(var(--ms-wolf)/0.08)]">
                <div className="flex items-center gap-2 text-[rgb(var(--ms-wolf))] font-bold mb-1">
                  <Skull className="w-4 h-4" />
                  <span className="text-sm">Người chết đêm qua:</span>
                </div>
                <div className="text-[rgb(var(--ms-wolf))] font-extrabold">
                  {dayDeaths.join(', ')}
                </div>
              </GameCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ANTI-REVEAL: hiện khi không ai chết BẤT KỂ lý do — sự có mặt của
            hộp này không được tiết lộ chuyện Phù Thủy đã cứu hay sói cắn hụt */}
        {dayDeaths.length === 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={springBouncy}>
            <GameCard className="border-[rgb(var(--ms-brand)/0.3)] bg-[rgb(var(--ms-brand)/0.08)]">
              <div className="flex items-center gap-2 text-[rgb(var(--ms-brand))] text-sm font-bold">
                <Moon className="w-4 h-4 shrink-0" />
                Đêm qua hòa bình, không ai chết.
              </div>
            </GameCard>
          </motion.div>
        )}

        {/* Host Controls */}
        {isHost && hostMode !== 'auto' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GameButton variant="secondary" size="sm" onClick={() => emit('host-next-phase', { code: room.code, userId })}>
              <SkipForward className="w-4 h-4" /> Chuyển sang Bỏ Phiếu
            </GameButton>
          </motion.div>
        )}

        {/* Chat */}
        <GameCard className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-2">
            {messages.filter(m => m.msgType === 'public' || m.msgType === 'system').map(m => (
              <motion.div
                key={m.id}
                variants={chatMessage}
                initial="initial"
                animate="animate"
                className={m.msgType === 'system' ? 'text-center' : ''}
              >
                {m.msgType === 'system' ? (
                  <span className="text-[rgb(var(--ms-text-muted))] text-xs italic">{m.content}</span>
                ) : (
                  <div className="flex gap-2 items-start">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white',
                      m.senderId === userId
                        ? 'bg-[rgb(var(--ms-info))]'
                        : 'bg-[rgb(var(--ms-card-hover))]',
                    )}>
                      {(m.senderName || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className={cn(
                        'text-xs font-bold',
                        m.senderId === userId
                          ? 'text-[rgb(var(--ms-info))]'
                          : 'text-[rgb(var(--ms-text-secondary))]',
                      )}>
                        {m.senderName}
                      </span>
                      <p className={cn(
                        'text-sm leading-relaxed',
                        m.senderId === userId
                          ? 'text-[rgb(var(--ms-text-primary))]'
                          : 'text-[rgb(var(--ms-text-secondary))]',
                      )}>
                        {m.content}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
            <GameInput
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isAlive ? 'Nhập tin nhắn...' : 'Chat Âm Ty...'}
              className="text-sm h-10"
              disabled={room.phase !== 'day'}
            />
            <GameButton size="sm" variant="secondary" onClick={handleSend} disabled={room.phase !== 'day'}>
              <Send className="w-4 h-4" />
            </GameButton>
          </div>
        </GameCard>

        {/* Player Status */}
        <div className="flex flex-wrap gap-2">
          {room.players.map(p => (
            <GameAvatar
              key={p.userId}
              index={p.seatIndex}
              username={p.username}
              isAlive={p.isAlive}
              size="sm"
            />
          ))}
        </div>
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

  const voteCounts: Record<string, number> = {}
  Object.values(room.votes as Record<string, string>).forEach(targetId => {
    if (targetId) voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
  })

  // ---- Vote Result ----
  if (voteResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-game-primary p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springBouncy}
          className="w-full max-w-md"
        >
          <GameCard className="text-center">
            {voteResult.isTie ? (
              <div className="py-4 space-y-4">
                <motion.div variants={characterBounce} initial="initial" animate="animate" className="flex justify-center">
                  <AlertTriangle className="w-16 h-16 text-[rgb(var(--ms-warning))]" />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-white font-[family-name:var(--font-nunito)]">Hoà Phiếu!</h2>
                <p className="text-[rgb(var(--ms-text-secondary))]">Không ai bị loại. Đang chuyển sang đêm...</p>
              </div>
            ) : voteResult.eliminated ? (
              <div className="py-4 space-y-4">
                <motion.div variants={deathFade} initial="initial" animate="animate" className="flex justify-center">
                  <CharacterIcon role="villager" size="xl" state="sad" glow />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-white font-[family-name:var(--font-nunito)]">
                  {voteResult.eliminated}
                </h2>
                <p className="text-[rgb(var(--ms-wolf))] font-bold">Đã bị loại bỏ!</p>
                {voteResult.chainedDeaths && voteResult.chainedDeaths.length > 0 && (
                  <p className="text-[rgb(var(--ms-cupid))] font-bold text-sm mt-2 flex items-center justify-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    Theo tình nhân: {voteResult.chainedDeaths.join(', ')}
                  </p>
                )}
                <div className="text-sm text-[rgb(var(--ms-text-secondary))] mt-4 space-y-1">
                  {Object.entries(voteResult.voteCounts).map(([uid, count]) => {
                    const p = room.players.find(pl => pl.userId === uid)
                    return p ? (
                      <div key={uid} className="flex justify-between px-3 py-1.5 rounded-xl bg-[rgb(var(--ms-card-hover))]">
                        <span>{p.username}</span>
                        <span className="font-bold">{count} phiếu</span>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                  <div className="w-16 h-16 rounded-full bg-[rgb(var(--ms-brand)/0.2)] flex items-center justify-center mx-auto">
                    <Target className="w-8 h-8 text-[rgb(var(--ms-brand))]" />
                  </div>
                </motion.div>
                <h2 className="text-xl font-extrabold text-white font-[family-name:var(--font-nunito)]">
                  Không có ai bị loại
                </h2>
              </div>
            )}
          </GameCard>
        </motion.div>
      </div>
    )
  }

  // ---- Voting UI ----
  return (
    <div className="min-h-screen bg-game-primary p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <PhaseHeader
          icon={<Vote className="w-5 h-5 text-[rgb(var(--ms-wolf))]" />}
          iconColor="bg-[rgb(var(--ms-wolf)/0.15)]"
          label="Bỏ Phiếu"
          timerEnd={room.timerEnd}
          totalTime={30}
        />

        {isHost && hostMode !== 'auto' && (
          <GameButton
            variant="danger"
            size="sm"
            onClick={() => emit('host-next-phase', { code: room.code, userId })}
            className="w-full"
          >
            <SkipForward className="w-4 h-4" /> Kết Quả Phiếu
          </GameButton>
        )}

        {/* Vote grid */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => (
            <motion.div key={p.userId} variants={staggerItem}>
              <PlayerTarget
                player={p}
                isSelected={myVote === p.userId}
                accentColor="bg-[rgb(var(--ms-wolf)/0.2)] border-[rgb(var(--ms-wolf))]"
                disabled={!isAlive}
                voteCount={voteCounts[p.userId]}
                onClick={() => isAlive && emit('submit-vote', { code: room.code, userId, targetId: p.userId })}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Skip vote */}
        {isAlive && (
          <motion.button
            whileTap={buttonPress.tap}
            whileHover={buttonPress.hover}
            onClick={() => emit('submit-vote', { code: room.code, userId, targetId: null })}
            className={cn(
              'w-full p-3 rounded-2xl border-2 text-center transition-all duration-150 font-bold text-sm',
              !myVote
                ? 'bg-[rgb(var(--ms-card-hover))] border-white/20 text-[rgb(var(--ms-text-primary))]'
                : 'bg-[rgb(var(--ms-card))] border-white/[0.06] text-[rgb(var(--ms-text-muted))] hover:border-white/20',
            )}
          >
            Bỏ phiếu trắng (Không chọn ai)
          </motion.button>
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
    <div className="min-h-screen flex items-center justify-center bg-game-sunset p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springBouncy}
        className="max-w-md w-full space-y-4"
      >
        <GameCard className="text-center">
          <motion.div variants={characterBounce} initial="initial" animate="animate" className="flex justify-center mb-4">
            <CharacterIcon role="hunter" size="xl" state="action" glow />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-white font-[family-name:var(--font-nunito)]">
            Thợ Săn Bắn!
          </h2>
          <p className="text-[rgb(var(--ms-text-secondary))] mt-2 text-sm">
            Bạn đã chết. Chọn 1 người để bắn cùng!
          </p>
        </GameCard>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => (
            <motion.div key={p.userId} variants={staggerItem}>
              <PlayerTarget
                player={p}
                isSelected={false}
                accentColor="bg-[rgb(var(--ms-hunter)/0.2)] border-[rgb(var(--ms-hunter))]"
                onClick={() => emit('hunter-shoot', { code: room.code, userId, targetId: p.userId })}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
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

  const winMeta = {
    werewolf: { accent: 'rgb(var(--ms-wolf))', char: 'werewolf', heading: 'Bầy Sói Thắng!', sub: 'Sói đã thống trị bản làng...' },
    villager: { accent: 'rgb(var(--ms-info))', char: 'villager', heading: 'Dân Làng Thắng!', sub: 'Dân làng đã diệt trừ toàn bộ sói!' },
    lovers: { accent: 'rgb(var(--ms-cupid))', char: 'cupid', heading: 'Cặp Đôi Thắng!', sub: 'Tình yêu đã chinh phục tất cả!' },
  }[gameWinner]
  const accent = winMeta.accent

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springBouncy}
        className="max-w-md w-full space-y-5"
      >
        {/* Winner Announcement */}
        <div className="text-center py-6">
          <motion.div variants={winBounce} initial="initial" animate="animate" className="mb-4">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}>
              <Trophy className="w-14 h-14" style={{ color: accent }} />
            </div>
          </motion.div>
          <motion.div
            variants={characterBounce}
            initial="initial"
            animate="animate"
            className="flex justify-center mb-4"
          >
            <CharacterIcon
              role={winMeta.char}
              size="xl"
              state="happy"
              glow
            />
          </motion.div>
          <h1 className="text-3xl font-extrabold font-[family-name:var(--font-nunito)]" style={{ color: accent }}>
            {winMeta.heading}
          </h1>
          <p className="text-[rgb(var(--ms-text-secondary))] mt-2 text-sm">
            {winMeta.sub}
          </p>
        </div>

        {/* Reveal All Roles */}
        <GameCard>
          <GameCardHeader>
            <GameCardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[rgb(var(--ms-seer))]" />
              Lộ Diện Vai Trò
            </GameCardTitle>
          </GameCardHeader>
          <GameCardContent>
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
              {gameOverPlayers.map(p => {
                const info = ROLE_INFO[p.role]
                return (
                  <motion.div
                    key={p.username}
                    variants={staggerItem}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl transition-all',
                      p.isAlive
                        ? 'bg-[rgb(var(--ms-card-hover))]'
                        : 'bg-[rgb(var(--ms-card))] opacity-50',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <CharacterIcon role={p.role} size="sm" state={p.isAlive ? 'happy' : 'sad'} />
                      <span className={cn(
                        'font-bold text-sm',
                        p.isAlive ? 'text-white' : 'text-[rgb(var(--ms-text-muted))] line-through',
                      )}>
                        {p.username}
                      </span>
                    </div>
                    {info && (
                      <GameBadge color={info.color} size="sm">
                        {info.name}
                      </GameBadge>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          </GameCardContent>
        </GameCard>

        <GameButton variant="primary" size="lg" onClick={handleLeave} className="w-full font-extrabold">
          Về Trang Chính
        </GameButton>
      </motion.div>
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
  const wolfPartners = useGameStore(s => s.room?.wolfPartners || [])
  const loverPartner = useGameStore(s => s.room?.loverPartner)

  if (!room) return null

  // Game Over
  if (phase === 'game_over') return <GameOverScreen />

  // Role Reveal
  if (phase === 'role_reveal' && myRole) return <RoleReveal />

  // Nút 🎴 xem lại thẻ (đè giữ) — hiện ở mọi màn trong ván.
  const fab = myRole ? (
    <CardFab
      role={myRole}
      packmates={wolfPartners}
      extraNote={loverPartner ? `💘 Người yêu: ${loverPartner}` : null}
    />
  ) : null

  // Hunter Shoot
  if (hunterTriggered && myRole === 'hunter') return <>{fab}<HunterShoot /></>

  // Night
  if (phase === 'night' || phase === 'night_resolve') return <>{fab}<NightScreen /></>

  // Voting
  if (phase === 'voting' || phase === 'vote_result') return <>{fab}<VotingScreen /></>

  // Day (default)
  return <>{fab}<DayScreen /></>
}
