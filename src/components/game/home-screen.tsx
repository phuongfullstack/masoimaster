'use client'

import { useState } from 'react'
import { useGameStore } from '@/store/game-store'
import { useSocket } from '@/components/game/socket-provider'
import { useAuth } from '@/lib/auth-context'
import { GameButton } from '@/components/ui/game/GameButton'
import { GameInput } from '@/components/ui/game/GameInput'
import { GameCard, GameCardHeader, GameCardTitle } from '@/components/ui/game/GameCard'
import { GameBadge } from '@/components/ui/game/GameBadge'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { RoleCrest } from '@/components/characters/RoleCrest'
import { StatsHistory } from '@/components/game/stats-history'
import { DEFAULT_CONFIG, ROLE_INFO, sumSpecial, suggestConfig } from '@/lib/types'
import type { RoleConfig } from '@/lib/types'
import { LogOut, Users, Plus, Moon, ChevronDown, ChevronUp } from 'lucide-react'

export function HomeScreen() {
  const { emit } = useSocket()
  const { signOut } = useAuth()
  const username = useGameStore(s => s.username)
  const userId = useGameStore(s => s.userId)
  const error = useGameStore(s => s.error)

  const [joinCode, setJoinCode] = useState('')
  const [hostMode, setHostMode] = useState<'auto' | 'direct' | 'hybrid'>('auto')
  const [nightMode, setNightMode] = useState<'seq' | 'sim'>('seq')
  const [config, setConfig] = useState<RoleConfig>({ ...DEFAULT_CONFIG })
  const [showConfig, setShowConfig] = useState(false)

  const handleCreate = () => {
    emit('create-room', { userId, username, config, hostMode, nightMode })
  }

  const handleJoin = () => {
    if (!joinCode.trim()) return
    emit('join-room', { code: joinCode.trim(), userId, username })
  }

  const handleLogout = async () => {
    localStorage.removeItem('ma-soi-room-code')
    useGameStore.getState().resetGame()
    await signOut()
    // onAuthStateChanged clears identity; no hard reload needed.
  }

  const updateConfig = (key: keyof RoleConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: Math.max(0, value) }))
  }

  const totalSpecial = sumSpecial(config)

  const MIN_PLAYERS = 4
  const minPlayersNeeded = Math.max(MIN_PLAYERS, totalSpecial)
  const configWarning = totalSpecial > MIN_PLAYERS

  const hostModes: { mode: 'auto' | 'direct' | 'hybrid'; label: string; desc: string }[] = [
    { mode: 'auto', label: 'Tự động', desc: 'Hệ thống điều khiển' },
    { mode: 'direct', label: 'Đạo diễn', desc: 'Host bấm nút' },
    { mode: 'hybrid', label: 'Hỗn hợp', desc: 'Tự động + Host skip' },
  ]

  return (
    <div className="min-h-screen bg-game-primary p-4 font-game">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <CharacterIcon role="werewolf" size="lg" animated />
            <div>
              <h1 className="text-2xl font-extrabold text-white">Ma Sói Realtime</h1>
              <p className="text-sm text-[rgb(var(--ms-text-secondary))]">
                Chào <span className="font-bold text-[rgb(var(--ms-moon))]">{username}</span>!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GameBadge color="#3b82f6" size="sm">
              <Users className="w-3 h-3" /> {username}
            </GameBadge>
            <button
              onClick={handleLogout}
              className="text-[rgb(var(--ms-text-muted))] hover:text-[rgb(var(--ms-text-primary))] transition-colors p-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-[rgb(var(--ms-wolf))]/20 border border-[rgb(var(--ms-wolf))]/30 px-4 py-3 text-sm text-red-300 animate-slide-up">
            {error}
          </div>
        )}

        {/* Quick Join */}
        <GameCard className="animate-slide-up">
          <GameCardHeader>
            <GameCardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[rgb(var(--ms-info))]" /> Tham Gia Nhanh
            </GameCardTitle>
          </GameCardHeader>
          <div className="flex gap-3">
            <GameInput
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="MÃ PHÒNG"
              maxLength={6}
              className="text-center text-xl font-mono tracking-widest uppercase flex-1"
            />
            <GameButton
              onClick={handleJoin}
              disabled={joinCode.trim().length < 4}
              variant="secondary"
              size="md"
            >
              Vào Phòng
            </GameButton>
          </div>
        </GameCard>

        {/* Create Room */}
        <GameCard className="animate-slide-up">
          <GameCardHeader>
            <GameCardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-[rgb(var(--ms-moon))]" /> Tạo Phòng Mới
            </GameCardTitle>
            <p className="text-sm text-[rgb(var(--ms-text-secondary))] mt-0.5">
              Bạn sẽ trở thành Host (Quản trò)
            </p>
          </GameCardHeader>

          {/* Host Mode Selection */}
          <div className="mb-4">
            <label className="text-sm font-bold text-[rgb(var(--ms-text-secondary))] mb-2 block">
              Chế độ Quản trò
            </label>
            <div className="grid grid-cols-3 gap-2">
              {hostModes.map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => setHostMode(mode)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all duration-150 ${
                    hostMode === mode
                      ? 'bg-[rgb(var(--ms-wolf))]/20 border-[rgb(var(--ms-wolf))] text-white shadow-game-red scale-[1.02]'
                      : 'bg-[rgb(var(--ms-surface))] border-[rgb(var(--ms-border))] text-[rgb(var(--ms-text-secondary))] hover:border-[rgb(var(--ms-border-strong))]'
                  }`}
                >
                  <div className="font-bold text-sm">{label}</div>
                  <div className="text-xs opacity-70 mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Night Mode Selection */}
          <div className="mb-4">
            <label className="text-sm font-bold text-[rgb(var(--ms-text-secondary))] mb-2 block">
              Chế độ Đêm
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: 'seq' as const, label: '⇢ Tuần tự', desc: 'Từng vai một — Phù Thủy biết ai bị cắn' },
                { mode: 'sim' as const, label: '⇉ Đồng thời', desc: 'Cùng lúc, nhanh — Phù Thủy cứu mù' },
              ]).map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => setNightMode(mode)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all duration-150 ${
                    nightMode === mode
                      ? 'bg-[#A7C5EB]/15 border-[#A7C5EB] text-white'
                      : 'bg-[rgb(var(--ms-surface))] border-[rgb(var(--ms-border))] text-[rgb(var(--ms-text-secondary))] hover:border-[rgb(var(--ms-border-strong))]'
                  }`}
                >
                  <div className="font-bold text-sm">{label}</div>
                  <div className="text-xs opacity-70 mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Config Toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-sm font-bold text-[rgb(var(--ms-info))] hover:text-[rgb(var(--ms-text-primary))] flex items-center gap-1 mb-3 transition-colors"
          >
            {showConfig ? (
              <><ChevronUp className="w-4 h-4" /> Ẩn cấu hình</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> Tùy chỉnh vai trò</>
            )}
          </button>

          {showConfig && (
            <div className="rounded-2xl bg-[rgb(var(--ms-bg-primary))]/60 p-4 space-y-3 mb-4">
              <div className="text-xs text-[rgb(var(--ms-text-muted))]">
                Bộ bài: {totalSpecial} vai đặc biệt + Dân (cần ≥ {minPlayersNeeded} người)
              </div>
              {/* Gợi ý chia vai chuẩn theo số người dự kiến */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[rgb(var(--ms-text-secondary))]">⚖️ Gợi ý:</span>
                {[6, 8, 10, 12, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      const zeroed = Object.fromEntries(Object.keys(DEFAULT_CONFIG).map((k) => [k, 0]))
                      setConfig({ ...zeroed, ...suggestConfig(n) } as RoleConfig)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[rgb(var(--ms-surface))] text-xs font-bold text-[rgb(var(--ms-moon))] hover:brightness-125"
                  >
                    {n} người
                  </button>
                ))}
              </div>
              {configWarning && (
                <p className="text-xs text-amber-300">
                  Cấu hình này cần ít nhất {minPlayersNeeded} người trong phòng trước khi bắt đầu
                </p>
              )}
              {Object.entries(ROLE_INFO)
                .filter(([k, info]) => k !== 'villager' && info.implemented)
                .map(([key, info]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CharacterIcon role={key} size="sm" />
                      <span className="text-sm font-bold text-[rgb(var(--ms-text-secondary))]">
                        {info.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateConfig(key as keyof RoleConfig, (config as any)[key] - 1)
                        }
                        className="w-8 h-8 rounded-xl bg-[rgb(var(--ms-surface))] text-[rgb(var(--ms-text-muted))] hover:bg-[rgb(var(--ms-card-hover))] flex items-center justify-center transition-colors font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-white font-bold font-mono">
                        {(config as any)[key]}
                      </span>
                      <button
                        onClick={() =>
                          updateConfig(key as keyof RoleConfig, (config as any)[key] + 1)
                        }
                        className="w-8 h-8 rounded-xl bg-[rgb(var(--ms-surface))] text-[rgb(var(--ms-text-muted))] hover:bg-[rgb(var(--ms-card-hover))] flex items-center justify-center transition-colors font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <GameButton onClick={handleCreate} size="lg" className="w-full">
            {/* cutout matches the button fill so the crest's eye/muzzle knockouts read */}
            <RoleCrest role="werewolf" size={18} cutout="rgb(var(--ms-moon))" />
            Tạo Phòng
          </GameButton>
        </GameCard>

        {/* Thống kê & lịch sử (dữ liệu không realtime — fetch khi mở) */}
        <StatsHistory />
      </div>
    </div>
  )
}
