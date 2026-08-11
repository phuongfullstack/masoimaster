'use client'

// ============================================================
// Thống kê cá nhân + lịch sử trận (dữ liệu KHÔNG realtime).
// Fetch một lần khi mở rộng card; refetch mỗi lần mở lại —
// không giữ listener vì dữ liệu chỉ đổi khi một ván kết thúc.
// ============================================================
import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { fetchMyStats, fetchMyMatches, type PlayerStats, type MatchSummary } from '@/lib/history-client'
import { GameCard, GameCardHeader, GameCardTitle } from '@/components/ui/game/GameCard'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { ROLE_INFO } from '@/lib/types'
import { Trophy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

const WINNER_LABEL: Record<MatchSummary['winner'], string> = {
  werewolf: 'Phe Sói thắng',
  villager: 'Phe Dân thắng',
  lovers: 'Cặp Đôi thắng',
  jester: 'Thằng Ngố thắng',
}

export function StatsHistory() {
  const { firebaseUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [loadError, setLoadError] = useState(false)

  const toggle = useCallback(async () => {
    const next = !open
    setOpen(next)
    if (!next || !firebaseUser) return
    setLoading(true)
    setLoadError(false)
    try {
      const [s, m] = await Promise.all([
        fetchMyStats(firebaseUser.uid),
        fetchMyMatches(firebaseUser.uid, 10),
      ])
      setStats(s)
      setMatches(m)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [open, firebaseUser])

  if (!firebaseUser) return null

  return (
    <GameCard className="animate-slide-up">
      <button onClick={toggle} className="w-full text-left">
        <GameCardHeader className="mb-0">
          <GameCardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Thống Kê &amp; Lịch Sử
            </span>
            {open
              ? <ChevronUp className="w-4 h-4 text-[rgb(var(--ms-text-muted))]" />
              : <ChevronDown className="w-4 h-4 text-[rgb(var(--ms-text-muted))]" />}
          </GameCardTitle>
        </GameCardHeader>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--ms-text-muted))]">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          )}
          {loadError && (
            <p className="text-sm text-red-300">Không tải được dữ liệu. Thử lại sau.</p>
          )}

          {!loading && !loadError && stats && (
            <>
              {/* Stats tổng quan */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatBox label="Số trận" value={stats.gamesPlayed} />
                <StatBox label="Thắng" value={stats.wins} />
                <StatBox
                  label="Tỉ lệ thắng"
                  value={stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) + '%' : '—'}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatBox label="Thắng phe Sói" value={stats.winsAsWolf} small />
                <StatBox label="Thắng phe Dân" value={stats.winsAsVillager} small />
                <StatBox label="Thắng Cặp Đôi" value={stats.winsAsLover} small />
              </div>

              {/* Lịch sử trận */}
              <div>
                <p className="text-xs font-bold text-[rgb(var(--ms-text-muted))] uppercase mb-2">
                  Trận gần đây
                </p>
                {matches.length === 0 ? (
                  <p className="text-sm text-[rgb(var(--ms-text-secondary))]">
                    Chưa có trận nào — tạo phòng và rủ bạn bè chơi thôi!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {matches.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-2xl bg-[rgb(var(--ms-bg-primary))]/60 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CharacterIcon role={m.myRole} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {ROLE_INFO[m.myRole as keyof typeof ROLE_INFO]?.name ?? m.myRole}
                              <span className="text-[rgb(var(--ms-text-muted))] font-normal"> · {m.playerCount} người</span>
                            </p>
                            <p className="text-xs text-[rgb(var(--ms-text-muted))]">
                              {WINNER_LABEL[m.winner]} · {new Date(m.endedAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-xl shrink-0 ${
                            m.myWon
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-[rgb(var(--ms-surface))] text-[rgb(var(--ms-text-muted))]'
                          }`}
                        >
                          {m.myWon ? 'Thắng' : 'Thua'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </GameCard>
  )
}

function StatBox({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--ms-bg-primary))]/60 py-2 px-1">
      <div className={`font-extrabold text-white font-mono ${small ? 'text-base' : 'text-xl'}`}>{value}</div>
      <div className="text-[10px] text-[rgb(var(--ms-text-muted))] uppercase tracking-wide">{label}</div>
    </div>
  )
}
