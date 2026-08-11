// ============================================================
// Shared Types for Ma Sói Realtime
// Role/ActionType/RoleConfig sống trong roles.ts (single source
// of truth cho 18 vai) — re-export tại đây để import cũ khỏi vỡ.
// ============================================================
import { ALL_ROLES } from '@/lib/roles'
import type { Role, ActionType, RoleConfig } from '@/lib/roles'

export type { Role, ActionType, RoleConfig, Faction, RoleDef } from '@/lib/roles'
export {
  ROLE_REGISTRY, ALL_ROLES, DEFAULT_CONFIG,
  WOLF_ROLE_KEYS, isWolfRole, NIGHT_ORDER, sumSpecial, sumTotal, countOf,
} from '@/lib/roles'

export type Phase = 'lobby' | 'role_reveal' | 'night' | 'night_resolve' | 'day' | 'voting' | 'vote_result' | 'game_over'
export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type HostMode = 'auto' | 'direct' | 'hybrid'
export type MsgType = 'public' | 'dead' | 'wolf' | 'system'

export interface PlayerInfo {
  id: string
  userId: string
  username: string
  role: Role | ''
  isAlive: boolean
  isReady: boolean
  seatIndex: number
}

export interface RoomState {
  id: string
  code: string
  hostId: string
  status: RoomStatus
  phase: Phase
  dayCount: number
  hostMode: HostMode
  hostIsPlayer: boolean
  players: PlayerInfo[]
  config: RoleConfig
  // Fields added by buildRoomStateForPlayer (per-player personalization)
  myRole: Role | ''
  isAlive: boolean
  isHost: boolean
  wolfPartners: string[]
  loverPartner: string | null
  timerEnd: number | null
  votes: Record<string, string>
  /** Con Quạ đánh dấu — public khi vote (+2 phiếu sẵn). */
  ravenMarkedId?: string | null
  /** Pack board: pick cắn hiện tại của từng sói (chỉ sói nhận được data). */
  wolfPicks?: Record<string, string>
}

export interface NightActionResult {
  actorId: string
  actionType: ActionType
  targetId: string | null
}

export interface VoteResult {
  playerId: string
  username: string
  voteCount: number
}

export interface ChatMsg {
  id: string
  senderId: string
  senderName: string
  content: string
  msgType: MsgType
  phase: string
  createdAt: string
}

export interface PhaseTimer {
  phase: Phase
  timeLeft: number
  totalTime: number
}

// Role metadata for UI — derive từ registry (shape cũ giữ nguyên
// để các màn hình đang đọc ROLE_INFO không phải sửa).
export const ROLE_INFO: Record<
  string,
  { name: string; team: string; color: string; desc: string; glowKey: string; emoji: string; implemented: boolean }
> = Object.fromEntries(
  ALL_ROLES.map((r) => [r.key, {
    name: r.nameVi, team: r.teamVi, color: r.color,
    desc: r.descVi, glowKey: r.glowKey, emoji: r.emoji,
    implemented: r.implemented,
  }]),
)

export const PHASE_CONFIG: Record<string, { duration: number; label: string }> = {
  role_reveal: { duration: 10, label: 'Lật Bài' },
  night_wolf: { duration: 30, label: 'Sói Tỉnh Dậy' },
  night_seer: { duration: 15, label: 'Tiên Tri Tỉnh Dậy' },
  night_witch: { duration: 20, label: 'Phù Thủy Tỉnh Dậy' },
  night_guard: { duration: 15, label: 'Bảo Vệ Tỉnh Dậy' },
  night_cupid: { duration: 15, label: 'Cúp Đôi Tỉnh Dậy' },
  night_resolve: { duration: 3, label: 'Giải Quyết' },
  day_announce: { duration: 10, label: 'Công Bố' },
  day_discussion: { duration: 90, label: 'Thảo Luận' },
  voting: { duration: 30, label: 'Bỏ Phiếu' },
  vote_result: { duration: 8, label: 'Kết Quả' },
  hunter_shoot: { duration: 15, label: 'Thợ Săn Bắn' },
}