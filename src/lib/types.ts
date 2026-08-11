// ============================================================
// Shared Types for Ma Sói Realtime
// ============================================================

export type Role =
  | 'werewolf'
  | 'white_werewolf'
  | 'villager'
  | 'seer'
  | 'witch'
  | 'guard'
  | 'hunter'
  | 'cupid'

export type Phase = 'lobby' | 'role_reveal' | 'night' | 'night_resolve' | 'day' | 'voting' | 'vote_result' | 'game_over'
export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type HostMode = 'auto' | 'direct' | 'hybrid'
export type MsgType = 'public' | 'dead' | 'wolf' | 'system'
export type ActionType =
  | 'wolf_bite'
  | 'seer_check'
  | 'witch_save'
  | 'witch_poison'
  | 'guard_protect'
  | 'cupid_link'

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
}

export interface RoleConfig {
  werewolf: number
  white_werewolf: number
  seer: number
  witch: number
  guard: number
  hunter: number
  cupid: number
  villager: number
}

export const DEFAULT_CONFIG: RoleConfig = {
  werewolf: 2,
  white_werewolf: 0,
  seer: 1,
  witch: 1,
  guard: 1,
  hunter: 0,
  cupid: 0,
  villager: 0, // will be auto-calculated
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

// Role metadata for UI
export const ROLE_INFO: Record<
  string,
  { name: string; team: string; color: string; desc: string; glowKey: string }
> = {
  werewolf: {
    name: 'Ma Sói',
    team: 'Sói',
    color: '#dc2626',
    desc: 'Mỗi đêm chọn 1 người để cắn.',
    glowKey: 'wolf',
  },
  white_werewolf: {
    name: 'Sói Trắng',
    team: 'Sói',
    color: '#f59e0b',
    desc: 'Cắn đồng đội Sói để phá hoại.',
    glowKey: 'white-wolf',
  },
  villager: {
    name: 'Dân Thường',
    team: 'Dân',
    color: '#3b82f6',
    desc: 'Không có kỹ năng đặc biệt.',
    glowKey: 'villager',
  },
  seer: {
    name: 'Tiên Tri',
    team: 'Dân',
    color: '#8b5cf6',
    desc: 'Mỗi đêm soi 1 người để biết phe.',
    glowKey: 'seer',
  },
  witch: {
    name: 'Phù Thủy',
    team: 'Dân',
    color: '#10b981',
    desc: 'Có thuốc cứu và thuốc độc.',
    glowKey: 'witch',
  },
  guard: {
    name: 'Bảo Vệ',
    team: 'Dân',
    color: '#f59e0b',
    desc: 'Mỗi đêm che chắn 1 người khỏi Sói.',
    glowKey: 'guard',
  },
  hunter: {
    name: 'Thợ Săn',
    team: 'Độc lập',
    color: '#ef4444',
    desc: 'Khi chết có thể bắn 1 người.',
    glowKey: 'hunter',
  },
  cupid: {
    name: 'Cúp Đôi',
    team: 'Độc lập',
    color: '#ec4899',
    desc: 'Đêm đầu ghép đôi 2 người.',
    glowKey: 'cupid',
  },
}

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