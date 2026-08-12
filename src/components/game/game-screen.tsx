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
import { ROLE_INFO, ROLE_REGISTRY, isWolfRole } from '@/lib/types'
import type { Role } from '@/lib/types'
import { PressToReveal } from '@/components/game/ui/PressToReveal'
import { CardFab } from '@/components/game/ui/CardFab'
import { HostPanel } from '@/components/game/ui/HostPanel'
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
        <span className="text-white font-bold text-lg">
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
          : 'bg-[rgb(var(--ms-card))] border-[rgb(var(--ms-border))] hover:border-[rgb(var(--ms-border-strong))]',
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
  const players = useGameStore(s => s.room?.players || [])
  const userId = useGameStore(s => s.userId)
  // Màn phát thẻ (S05): thẻ úp bay vào bàn, thẻ của mình sáng lên,
  // bấm "Lật thẻ của tôi" mới sang thẻ nhấn-giữ.
  const [dealt, setDealt] = useState(false)
  const info = myRole ? ROLE_INFO[myRole] : null

  if (!info) return null

  if (!dealt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-game-primary p-6 font-game">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/40 mb-6">
          Phát thẻ bài
        </p>
        <div className="grid grid-cols-4 gap-3 mb-8">
          {players.map((p, i) => {
            const mine = p.userId === userId
            return (
              <motion.div
                key={p.userId}
                initial={{ y: -140, opacity: 0, rotate: -12 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: i * 0.09, type: 'spring', stiffness: 260, damping: 20 }}
                className={cn(
                  'w-16 h-24 rounded-xl border flex flex-col items-center justify-center gap-1',
                  mine
                    ? 'border-[rgb(var(--ms-moon))] shadow-[0_0_18px_rgba(167,197,235,0.35)]'
                    : 'border-[rgb(var(--ms-border))]',
                )}
                style={{ background: 'linear-gradient(155deg,#16141F,#211E30)' }}
              >
                <span className="text-xl">🎴</span>
                <span className={cn('text-[9px] font-bold truncate max-w-[56px]', mine ? 'text-[rgb(var(--ms-moon))]' : 'text-white/40')}>
                  {mine ? 'Bạn' : p.username}
                </span>
              </motion.div>
            )
          })}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: players.length * 0.09 + 0.4 }}
        >
          <GameButton size="lg" onClick={() => setDealt(true)}>
            🎴 Lật thẻ của tôi
          </GameButton>
          <p className="text-white/35 text-xs mt-3 text-center">
            Thẻ được chia úp — không ai thấy bài của ai.
          </p>
        </motion.div>
      </div>
    )
  }

  // ANTI-PEEK (design 17-vai): mọi người ngồi chung bàn nên thẻ vai
  // KHÔNG hiển thị sẵn. Khung thẻ trung tính duy nhất (không glow,
  // không màu phe), min-height cố định, nội dung chỉ rõ khi ĐÈ GIỮ.
  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary p-4 font-game">
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
 * Tiến độ hiển thị ẨN DANH (chỉ số đếm, không vai) — ai cũng thấy như nhau.
 */
function NightWaiting({ progress }: { progress?: { done: number; total: number } | null }) {
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
        {progress && progress.total > 0 && (
          <p className="text-[#A7C5EB]/70 text-xs mt-3 font-bold tracking-wide">
            Đã hành động: {Math.min(progress.done, progress.total)}/{progress.total}
          </p>
        )}
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
        <div className="mt-4 p-4 rounded-2xl bg-[rgb(var(--ms-card))] border border-[rgb(var(--ms-border))]">
          <p className="text-[rgb(var(--ms-text-muted))] text-xs uppercase tracking-wider mb-2 font-bold">
            Ghi chú riêng
          </p>
          <div className="w-full h-16 rounded-xl bg-[rgb(var(--ms-bg-primary))] border border-[rgb(var(--ms-border))]" />
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// Dawn Screen — cinematic transition (night_resolve phase, 3s)
// Gradient from night → day, sun rising. No info leaked.
// ============================================================
function DawnScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative">
      {/* Animated gradient: night → dawn → day over 3s */}
      <motion.div
        className="absolute inset-0"
        initial={{ background: 'linear-gradient(180deg, #0F0E17 0%, #1A1A2E 100%)' }}
        animate={{
          background: [
            'linear-gradient(180deg, #0F0E17 0%, #1A1A2E 100%)',
            'linear-gradient(180deg, #2D2B55 0%, #4A3B6B 50%, #6B5B8A 100%)',
            'linear-gradient(180deg, #4A3B6B 0%, #6B5B8A 40%, #8FB3DE 100%)',
          ],
        }}
        transition={{ duration: 2.8, ease: 'easeInOut', times: [0, 0.5, 1] }}
      />
      {/* Stars fading out */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        style={{
          backgroundImage: 'radial-gradient(1px 1px at 20% 15%, rgba(255,255,255,.6), transparent), radial-gradient(1px 1px at 60% 8%, rgba(255,255,255,.4), transparent), radial-gradient(1.2px 1.2px at 80% 25%, rgba(255,255,255,.5), transparent)',
        }}
      />
      {/* Sun rising from bottom */}
      <motion.div
        className="absolute"
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 2.5, ease: 'easeOut', delay: 0.3 }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle, #ECC94B 0%, #F6AD55 60%, transparent 100%)',
            filter: 'drop-shadow(0 0 40px rgba(236,201,75,.6))',
          }}
        />
      </motion.div>
      {/* Text */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <p className="text-white text-xl font-bold font-[family-name:var(--font-nunito)]">
          🌅 Thiên sáng rồi...
        </p>
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
  const wolfSeerResult = useGameStore(s => s.wolfSeerResult)
  const detectiveResult = useGameStore(s => s.detectiveResult)
  const bittenPlayerId = useGameStore(s => s.bittenPlayerId)
  const messages = useGameStore(s => s.messages)
  const { emit } = useSocket()
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [saveTarget, setSaveTarget] = useState<string | null>(null)
  const [wolfMsg, setWolfMsg] = useState('')
  const [cupidPair, setCupidPair] = useState<string[]>([])
  const [detectivePair, setDetectivePair] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!room) return null
  const alivePlayers = room.players.filter(p => p.isAlive && p.userId !== userId)
  const isWolf = isWolfRole(myRole)

  // Đêm ĐỒNG THỜI ('sim_all'): mọi vai hành động cùng lúc — mỗi người
  // thấy màn của CHÍNH vai mình; vai không hành động rơi xuống decoy.
  const effectiveAction: string | null = nightWakeAction === 'sim_all'
    ? (myRole === 'cursed_wolf'
        ? (room.myCurseUsed ? 'wolf_bite' : 'curse')
        : (myRole ? ROLE_REGISTRY[myRole as Role]?.nightAction ?? null : null))
    : nightWakeAction

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
    if (!nightWakeAction) return <NightWaiting progress={room.nightProgress} />

    // ---- Wolf Action ----
    if (isWolf && effectiveAction === 'wolf_bite') {
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

          {/* Target Selection + pack board: thấy pick của bầy realtime */}
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers
              .filter(p => !isWolfRole(p.role) || p.role === 'white_werewolf')
              .map(p => {
                const pickers = Object.entries(room.wolfPicks ?? {})
                  .filter(([, targetId]) => targetId === p.userId)
                  .map(([wolfUid]) => wolfUid === userId
                    ? 'Bạn'
                    : room.players.find(pl => pl.userId === wolfUid)?.username ?? '?')
                return (
                  <div key={p.userId} className="relative">
                    <PlayerTarget
                      player={p}
                      isSelected={selectedTarget === p.userId}
                      accentColor={NIGHT_ACCENT}
                      onClick={() => handleNightAction('wolf_bite', p.userId)}
                    />
                    {pickers.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 max-w-[90%] truncate px-1.5 py-0.5 rounded-lg bg-[rgb(var(--ms-wolf))]/90 text-[10px] font-extrabold text-white">
                        🐺 {pickers.join(', ')}
                      </span>
                    )}
                  </div>
                )
              })}
          </motion.div>
          <p className="text-center text-[rgb(var(--ms-text-muted))] text-xs">
            Bầy chia phiếu thì lựa chọn của Sói Đầu Sỏ quyết định.
          </p>
        </motion.div>
      )
    }

    // ---- Seer Action ----
    if (myRole === 'seer' && effectiveAction === 'seer_check') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 1 người để soi phe" />

          {/* Seer Result — anti-peek: chỉ rõ trong lúc đè, nhả tay là che ngay */}
          {seerResult && (
            <motion.div variants={staggerItem}>
              <PressToReveal
                className="p-5 rounded-2xl border-2 text-center bg-[rgb(var(--ms-card))] border-[rgb(var(--ms-border))]"
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
                  <div className="font-extrabold text-lg mt-3 text-white">
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
    if (myRole === 'witch' && effectiveAction === 'witch_save') {
      const bittenPlayer = bittenPlayerId ? room.players.find(p => p.userId === bittenPlayerId) : null
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Dùng thuốc của bạn — hoặc không" />

          {/* Save potion — chế độ TUẦN TỰ: biết ai bị cắn */}
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

          {/* Save potion — chế độ ĐỒNG THỜI: cứu MÙ */}
          {!bittenPlayer && room.nightMode === 'sim' && (
            <motion.div variants={staggerItem}>
              <GameCard className="border-[rgb(var(--ms-border))]">
                <p className="text-sm font-bold text-white/85 mb-1">
                  🌫️ Đêm đồng thời — bạn <span className="text-[rgb(var(--ms-wolf))]">không biết ai bị cắn</span>.
                </p>
                <p className="text-xs text-[rgb(var(--ms-text-muted))] mb-3">
                  Chọn 1 người để cứu mù: chỉ hiệu lực nếu đoán trúng nạn nhân — thuốc bị trừ dù trượt.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {alivePlayers.map(p => (
                    <PlayerTarget
                      key={p.userId}
                      player={p}
                      isSelected={saveTarget === p.userId}
                      accentColor={NIGHT_ACCENT}
                      onClick={() => { setSaveTarget(p.userId); handleNightAction('witch_save', p.userId) }}
                    />
                  ))}
                </div>
                <GameButton
                  variant="secondary"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => { setSaveTarget(userId); handleNightAction('witch_save', userId) }}
                >
                  <Heart className="w-4 h-4" /> Cứu chính mình
                </GameButton>
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
    if (myRole === 'guard' && effectiveAction === 'guard_protect') {
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

    // ---- Doctor Action ----
    // Giống guard (chống cắn), nhưng: không có last-target rule, KHÔNG được tự chữa.
    if (myRole === 'doctor' && effectiveAction === 'doctor_heal') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 1 người để chữa" />

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={selectedTarget === p.userId}
                accentColor={NIGHT_ACCENT}
                onClick={() => handleNightAction('doctor_heal', p.userId)}
              />
            ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Medium Action ----
    if (myRole === 'medium' && effectiveAction === 'medium_listen') {
      const seance = room.mySeance ?? []
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Đêm nay cõi chết lên tiếng" />
          <motion.div variants={staggerItem}>
            <div
              className="rounded-2xl border p-4 space-y-2"
              style={{ background: 'linear-gradient(155deg,#16141F,#211E30)', borderColor: '#35325180' }}
            >
              {seance.length === 0 ? (
                <p className="text-sm text-white/50 text-center py-4">
                  🕯️ Cõi chết im lặng đêm nay...
                </p>
              ) : (
                seance.map((line, i) => (
                  <p key={i} className="text-sm text-white/85 italic border-l-2 border-white/15 pl-3">
                    “{line}”
                  </p>
                ))
              )}
              <p className="text-[11px] text-white/40 pt-2">
                Bạn không biết ai đang nói, và không thể nhắn lại. Nghe, rồi tự suy luận.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )
    }

    // ---- Cursed Wolf Action ----
    if (myRole === 'cursed_wolf' && effectiveAction === 'curse') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Nguyền 1 người — biến họ thành sói (1 lần cả ván)" />
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers
              .filter(p => !isWolfRole(p.role))
              .map(p => (
                <PlayerTarget
                  key={p.userId}
                  player={p}
                  isSelected={selectedTarget === p.userId}
                  accentColor={NIGHT_ACCENT}
                  onClick={() => handleNightAction('curse', p.userId)}
                />
              ))}
          </motion.div>
          <motion.div variants={staggerItem}>
            <GameButton
              variant="secondary"
              onClick={() => handleNightAction('curse', null)}
              className="w-full"
            >
              Đêm nay không nguyền (giữ lại dùng sau)
            </GameButton>
          </motion.div>
        </motion.div>
      )
    }

    // ---- Wolf Seer Action ----
    if (myRole === 'wolf_seer' && effectiveAction === 'wolf_seer_check') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Soi 1 người — có phải Tiên Tri không?" />

          {wolfSeerResult && (
            <motion.div variants={staggerItem}>
              <PressToReveal
                className="p-5 rounded-2xl border-2 text-center bg-[rgb(var(--ms-card))] border-[rgb(var(--ms-border))]"
                hint={
                  <span className="text-[rgb(var(--ms-text-muted))] text-center">
                    <Lock className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-bold">Nhấn giữ để xem kết quả</span>
                  </span>
                }
              >
                <div>
                  <p className="text-3xl mb-2">{wolfSeerResult.isSeer ? '🔮' : '❔'}</p>
                  <div className="font-extrabold text-lg text-white">
                    {wolfSeerResult.targetName} {wolfSeerResult.isSeer ? 'CHÍNH LÀ TIÊN TRI' : 'không phải Tiên Tri'}
                  </div>
                  <div className="text-[rgb(var(--ms-text-muted))] text-xs mt-1">Nhả tay để ẩn</div>
                </div>
              </PressToReveal>
            </motion.div>
          )}

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers
              .filter(p => !isWolfRole(p.role))
              .map(p => (
                <PlayerTarget
                  key={p.userId}
                  player={p}
                  isSelected={selectedTarget === p.userId}
                  accentColor={NIGHT_ACCENT}
                  onClick={() => handleNightAction('wolf_seer_check', p.userId)}
                />
              ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Detective Action ----
    if (myRole === 'detective' && effectiveAction === 'detective_compare') {
      const togglePick = (uid2: string) => {
        setDetectivePair(prev =>
          prev.includes(uid2)
            ? prev.filter(x => x !== uid2)
            : prev.length < 2 ? [...prev, uid2] : [prev[1], uid2],
        )
      }
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 2 người để so — họ có cùng phe không?" />

          {detectiveResult && (
            <motion.div variants={staggerItem}>
              <PressToReveal
                className="p-5 rounded-2xl border-2 text-center bg-[rgb(var(--ms-card))] border-[rgb(var(--ms-border))]"
                hint={
                  <span className="text-[rgb(var(--ms-text-muted))] text-center">
                    <Lock className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-bold">Nhấn giữ để xem kết quả</span>
                  </span>
                }
              >
                <div>
                  <p className="text-3xl mb-2">{detectiveResult.sameFaction ? '🤝' : '⚔️'}</p>
                  <div className="font-extrabold text-lg text-white">
                    {detectiveResult.aName} & {detectiveResult.bName}:{' '}
                    {detectiveResult.sameFaction ? 'CÙNG PHE' : 'KHÁC PHE'}
                  </div>
                  <div className="text-[rgb(var(--ms-text-muted))] text-xs mt-1">
                    Không biết là phe nào — nhả tay để ẩn
                  </div>
                </div>
              </PressToReveal>
            </motion.div>
          )}

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={detectivePair.includes(p.userId)}
                accentColor={NIGHT_ACCENT}
                onClick={() => togglePick(p.userId)}
              />
            ))}
          </motion.div>

          <motion.div variants={staggerItem}>
            <GameButton
              variant="primary"
              disabled={detectivePair.length !== 2}
              onClick={() => {
                if (detectivePair.length !== 2) return
                emit('night-action', {
                  code: room.code, userId,
                  actionType: 'detective_compare',
                  targetId: detectivePair[0], targetId2: detectivePair[1],
                })
              }}
              className="w-full"
            >
              {detectivePair.length === 2 ? 'Xác nhận so phe' : `Chọn ${2 - detectivePair.length} người nữa`}
            </GameButton>
          </motion.div>
        </motion.div>
      )
    }

    // ---- Doctor Action ----
    if (myRole === 'doctor' && effectiveAction === 'doctor_heal') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Chọn 1 người để chữa (không tự chữa được)" />
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={selectedTarget === p.userId}
                accentColor={NIGHT_ACCENT}
                onClick={() => handleNightAction('doctor_heal', p.userId)}
              />
            ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Raven Action ----
    if (myRole === 'raven' && effectiveAction === 'raven_mark') {
      return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          <NightTurnHeader prompt="Đánh dấu 1 người — họ vào buổi vote với 2 phiếu sẵn" />
          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
            {alivePlayers.map(p => (
              <PlayerTarget
                key={p.userId}
                player={p}
                isSelected={selectedTarget === p.userId}
                accentColor={NIGHT_ACCENT}
                onClick={() => handleNightAction('raven_mark', p.userId)}
              />
            ))}
          </motion.div>
        </motion.div>
      )
    }

    // ---- Cupid Action ----
    if (myRole === 'cupid' && effectiveAction === 'cupid_link') {
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
    return <NightWaiting progress={room.nightProgress} />
  }

  return (
    <div className="min-h-screen bg-game-night p-4 font-game">
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
  // Ghost mode: người chết có 2 tab — Làng (chỉ đọc) / Người chết (đọc+viết).
  const [ghostTab, setGhostTab] = useState<'village' | 'dead'>('dead')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!room) return null

  const deadView = !isAlive && ghostTab === 'dead'
  const shownMessages = deadView
    ? messages.filter(m => m.msgType === 'dead')
    : messages.filter(m => m.msgType === 'public' || m.msgType === 'system')
  // Người chết chỉ gửi được vào kênh người chết; người sống gửi kênh làng.
  const canSend = isAlive ? room.phase === 'day' : deadView

  const handleSend = () => {
    if (!chatInput.trim() || !canSend) return
    const msgType = isAlive ? 'public' : 'dead'
    emit('send-message', { code: room.code, userId, content: chatInput, msgType })
    setChatInput('')
  }

  return (
    <div className="min-h-screen bg-game-day p-4 flex flex-col font-game">
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

        {/* Báo cáo rạng sáng CÁ NHÂN — chỉ mình bạn thấy, không nêu nguồn */}
        {room.myNightFx && room.myNightFx !== 'none' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={springBouncy}>
            <div
              className="rounded-2xl border px-4 py-3 text-sm font-bold text-white/90"
              style={{ background: 'linear-gradient(155deg,#16141F,#211E30)', borderColor: '#35325180' }}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40 mb-1">
                Chỉ mình bạn thấy
              </p>
              {room.myNightFx === 'saved' && '🛡️ Đêm qua bạn bị tấn công — nhưng đã được che chắn. Bạn không biết ai đã cứu mình.'}
              {room.myNightFx === 'elder' && '👴 Bạn đã chịu một nhát cắn. Lá chắn của bạn đã vỡ — lần sau sẽ không còn.'}
              {room.myNightFx === 'cursed' && '🌑 BẠN ĐÃ BỊ NGUYỀN. Từ đêm nay bạn thuộc bầy sói — xem lại thẻ 🎴 để nhận bầy.'}
              {room.myNightFx === 'poison' && '☠️ Bạn đã trúng độc trong đêm.'}
            </div>
          </motion.div>
        )}

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
          {/* Ghost mode: 2 tab cho người chết */}
          {!isAlive && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[rgb(var(--ms-bg-primary))]/60 mb-3">
              {([['village', '🏘️ Làng (chỉ đọc)'], ['dead', '👻 Người chết']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setGhostTab(tab)}
                  className={cn(
                    'py-2 rounded-lg text-xs font-bold transition-all',
                    ghostTab === tab
                      ? 'bg-[rgb(var(--ms-card-hover))] text-white'
                      : 'text-[rgb(var(--ms-text-muted))]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {deadView && (
            <p className="text-[11px] text-white/40 mb-2">
              Kênh riêng của người chết — người sống không bao giờ đọc được.
            </p>
          )}
          <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-2">
            {shownMessages.map(m => (
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
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                      m.senderId === userId
                        ? 'bg-[rgb(var(--ms-moon))] text-[rgb(var(--ms-on-moon))]'
                        : 'bg-[rgb(var(--ms-card-hover))] text-white',
                    )}>
                      {(m.senderName || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className={cn(
                        'text-xs font-bold',
                        m.senderId === userId
                          ? 'text-[rgb(var(--ms-moon))]'
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
          <div className="flex gap-2 mt-3 pt-3 border-t border-[rgb(var(--ms-border))]">
            <GameInput
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={isAlive ? 'Nhập tin nhắn...' : deadView ? 'Nhắn với người chết...' : 'Bạn chỉ đọc được kênh làng'}
              className="text-sm h-10"
              disabled={!canSend}
            />
            <GameButton size="sm" variant="secondary" onClick={handleSend} disabled={!canSend}>
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
      <div className="min-h-screen flex items-center justify-center bg-game-primary p-4 font-game">
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
                <h2 className="text-2xl font-extrabold text-white">Hoà Phiếu!</h2>
                <p className="text-[rgb(var(--ms-text-secondary))]">Không ai bị loại. Đang chuyển sang đêm...</p>
              </div>
            ) : voteResult.eliminated ? (
              <div className="py-4 space-y-4">
                <motion.div variants={deathFade} initial="initial" animate="animate" className="flex justify-center">
                  <CharacterIcon role="villager" size="xl" state="sad" glow />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-white">
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
                <h2 className="text-xl font-extrabold text-white">
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
    <div className="min-h-screen bg-game-primary p-4 font-game">
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

        {/* Dấu Con Quạ — CÔNG KHAI theo design: mọi người cân nhắc được */}
        {room.ravenMarkedId === userId && (
          <div className="rounded-2xl bg-[rgb(var(--ms-card))] border border-[rgb(var(--ms-border))] px-4 py-2.5 text-sm font-bold text-white/85 text-center">
            🐦 Bạn bị Con Quạ đánh dấu — vào buổi vote này với 2 phiếu sẵn
          </div>
        )}

        {/* Vote grid */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-2">
          {alivePlayers.map(p => (
            <motion.div key={p.userId} variants={staggerItem} className="relative">
              <PlayerTarget
                player={p}
                isSelected={myVote === p.userId}
                accentColor="bg-[rgb(var(--ms-wolf)/0.2)] border-[rgb(var(--ms-wolf))]"
                disabled={!isAlive}
                voteCount={voteCounts[p.userId]}
                onClick={() => isAlive && emit('submit-vote', { code: room.code, userId, targetId: p.userId })}
              />
              {room.ravenMarkedId === p.userId && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-lg bg-[#2D3748] border border-white/15 text-[10px] font-extrabold text-white/90">
                  🐦 +2
                </span>
              )}
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
                : 'bg-[rgb(var(--ms-card))] border-[rgb(var(--ms-border))] text-[rgb(var(--ms-text-muted))] hover:border-[rgb(var(--ms-border-strong))]',
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
    <div className="min-h-screen flex items-center justify-center bg-game-sunset p-4 font-game">
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
          <h2 className="text-2xl font-extrabold text-white">
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

  if (!gameOverPlayers) return null

  // winner null = Host kết thúc ván (không phe nào thắng).
  const winMeta = gameWinner
    ? {
        werewolf: { accent: 'rgb(var(--ms-wolf))', char: 'werewolf', heading: 'Bầy Sói Thắng!', sub: 'Sói đã thống trị bản làng...' },
        villager: { accent: 'rgb(var(--ms-brand))', char: 'villager', heading: 'Dân Làng Thắng!', sub: 'Dân làng đã diệt trừ toàn bộ sói!' },
        lovers: { accent: 'rgb(var(--ms-cupid))', char: 'cupid', heading: 'Cặp Đôi Thắng!', sub: 'Tình yêu đã chinh phục tất cả!' },
        jester: { accent: 'rgb(var(--ms-jester))', char: 'jester', heading: 'Thằng Ngố Thắng!', sub: 'Cả làng đã trúng kế — xử đúng người muốn bị xử!' },
      }[gameWinner]
    : { accent: 'rgb(var(--ms-moon))', char: 'villager', heading: 'Ván Đấu Kết Thúc', sub: 'Quản trò đã kết thúc ván đấu.' }
  const accent = winMeta.accent

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary p-4 font-game">
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
          <h1 className="text-3xl font-extrabold" style={{ color: accent }}>
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
  const { emit } = useSocket()

  if (!room) return null

  // Game Over
  if (phase === 'game_over') return <GameOverScreen />

  // Role Reveal
  if (phase === 'role_reveal' && myRole) return <RoleReveal />

  // Nút 🎴 xem lại thẻ (đè giữ) — hiện ở mọi màn trong ván.
  // Host có thêm bảng điều khiển quản trò ⚙️ (góc trái).
  const fab = (
    <>
      {myRole && (
        <CardFab
          role={myRole}
          packmates={wolfPartners}
          extraNote={loverPartner ? `💘 Người yêu: ${loverPartner}` : null}
        />
      )}
      {room.isHost && room.status === 'playing' && <HostPanel room={room} emit={emit} />}
    </>
  )

  // Hunter Shoot
  if (hunterTriggered && myRole === 'hunter') return <>{fab}<HunterShoot /></>

  // Night resolve = dawn cinematic transition
  if (phase === 'night_resolve') return <>{fab}<DawnScreen /></>

  // Night
  if (phase === 'night') return <>{fab}<NightScreen /></>

  // Voting
  if (phase === 'voting' || phase === 'vote_result') return <>{fab}<VotingScreen /></>

  // Day (default)
  return <>{fab}<DayScreen /></>
}
