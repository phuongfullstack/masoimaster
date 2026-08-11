// ============================================================
// Role Registry — NGUỒN SỰ THẬT DUY NHẤT cho 18 vai trò.
//
// Hợp nhất 3 registry cũ (ROLE_INFO trong types.ts, ROLES trong
// werewolf-config.ts, ROLES trong design canvas MaSoiApp.dc.html).
// Mọi nơi khác (types, server, UI, balance analyzer) derive từ đây.
//
// Isomorphic: KHÔNG 'use client', không import gì ngoài chuẩn.
// ============================================================

export type Faction = 'wolf' | 'village' | 'neutral'

export type Role =
  | 'werewolf'
  | 'alpha_wolf'
  | 'wolf_seer'
  | 'cursed_wolf'
  | 'white_werewolf'
  | 'seer'
  | 'witch'
  | 'guard'
  | 'doctor'
  | 'hunter'
  | 'detective'
  | 'medium'
  | 'raven'
  | 'chief'
  | 'elder'
  | 'cupid'
  | 'jester'
  | 'villager'

export type ActionType =
  // 6 action cũ (đang chạy production — không đổi tên)
  | 'wolf_bite'
  | 'seer_check'
  | 'witch_save'
  | 'witch_poison'
  | 'guard_protect'
  | 'cupid_link'
  // 6 action mới theo design 17-vai
  | 'doctor_heal'
  | 'wolf_seer_check'
  | 'curse'
  | 'detective_compare'
  | 'raven_mark'
  | 'medium_listen'

export interface RoleDef {
  key: Role
  emoji: string
  nameVi: string
  nameEn: string
  faction: Faction
  /** Nhãn phe hiển thị (giữ tương thích ROLE_INFO.team cũ). */
  teamVi: 'Sói' | 'Dân' | 'Độc lập'
  color: string
  glowKey: string
  descVi: string
  noteVi?: string
  /** Prompt màn hành động đêm (design canvas pvi/cvi). */
  promptVi?: string
  confirmVi?: string
  /** Action đêm RIÊNG của vai (sói còn tham gia cắn chung theo faction). */
  nightAction: ActionType | null
  /** Số mục tiêu action riêng cần chọn. */
  targets: 0 | 1 | 2
  /** Action riêng chỉ dùng 1 lần mỗi ván (cursed wolf). */
  oncePerGame?: boolean
  /** Thấy đồng đội bầy sói trong thẻ bài / pack board. */
  seesPack?: boolean
  /** Badge phụ trên thẻ (label, màu) — vd 2 bình thuốc Phù Thủy. */
  badges?: Array<{ label: string; color: string }>
  category: 'essential' | 'protective' | 'offensive' | 'special'
  /**
   * Logic server đã hoàn thiện chưa. Vai chưa implement bị ẩn khỏi
   * sheet cấu hình tạo phòng (vẫn có trong registry để UI/art dùng).
   * Bật dần theo phase triển khai design 17-vai.
   */
  implemented: boolean
}

// ------------------------------------------------------------
// Registry — thứ tự khai báo = thứ tự hiển thị trong config/list.
// ------------------------------------------------------------
export const ROLE_REGISTRY: Record<Role, RoleDef> = {
  werewolf: {
    key: 'werewolf', emoji: '🐺', nameVi: 'Ma Sói', nameEn: 'Werewolf',
    faction: 'wolf', teamVi: 'Sói', color: '#dc2626', glowKey: 'wolf',
    descVi: 'Mỗi đêm cùng bầy chọn 1 người để cắn.',
    promptVi: 'Chọn người để cắn đêm nay:', confirmVi: 'Xác nhận cắn',
    nightAction: 'wolf_bite', targets: 1, seesPack: true, category: 'essential', implemented: true,
  },
  alpha_wolf: {
    key: 'alpha_wolf', emoji: '👹', nameVi: 'Sói Đầu Sỏ', nameEn: 'Alpha Wolf',
    faction: 'wolf', teamVi: 'Sói', color: '#ea580c', glowKey: 'alpha-wolf',
    descVi: 'Dẫn dắt bầy sói. Khi bầy chia phiếu, lựa chọn của bạn quyết định.',
    noteVi: 'Phiếu của bạn thắng khi bầy hoà.',
    promptVi: 'Chọn người để cắn đêm nay:', confirmVi: 'Xác nhận cắn',
    nightAction: 'wolf_bite', targets: 1, seesPack: true, category: 'offensive', implemented: false,
  },
  wolf_seer: {
    key: 'wolf_seer', emoji: '🌘', nameVi: 'Sói Tiên Tri', nameEn: 'Wolf Seer',
    faction: 'wolf', teamVi: 'Sói', color: '#c026d3', glowKey: 'wolf-seer',
    descVi: 'Mỗi đêm soi 1 người để biết họ có phải Tiên Tri hay không.',
    noteVi: 'Bạn vẫn cắn cùng bầy như sói thường.',
    promptVi: 'Chọn 1 người để soi Tiên Tri:', confirmVi: 'Xác nhận soi',
    nightAction: 'wolf_seer_check', targets: 1, seesPack: true, category: 'special', implemented: false,
  },
  cursed_wolf: {
    key: 'cursed_wolf', emoji: '🌑', nameVi: 'Sói Nguyền', nameEn: 'Cursed Wolf',
    faction: 'wolf', teamVi: 'Sói', color: '#7f1d1d', glowKey: 'cursed-wolf',
    descVi: 'Một lần mỗi ván, biến 1 dân thường thành sói thay vì cắn chết họ.',
    noteVi: 'Dùng xong lời nguyền, bạn cắn như sói thường.',
    promptVi: 'Chọn người để nguyền:', confirmVi: 'Xác nhận nguyền',
    nightAction: 'curse', targets: 1, oncePerGame: true, seesPack: true, category: 'special', implemented: false,
  },
  white_werewolf: {
    key: 'white_werewolf', emoji: '🐺', nameVi: 'Sói Trắng', nameEn: 'White Werewolf',
    faction: 'wolf', teamVi: 'Sói', color: '#f59e0b', glowKey: 'white-wolf',
    descVi: 'Cắn cùng bầy, nhưng thắng một mình khi là sói cuối cùng.',
    promptVi: 'Chọn người để cắn đêm nay:', confirmVi: 'Xác nhận cắn',
    nightAction: 'wolf_bite', targets: 1, seesPack: true, category: 'special', implemented: true,
  },
  seer: {
    key: 'seer', emoji: '🔮', nameVi: 'Tiên Tri', nameEn: 'Seer',
    faction: 'village', teamVi: 'Dân', color: '#8b5cf6', glowKey: 'seer',
    descVi: 'Mỗi đêm soi 1 người để biết họ thuộc phe nào.',
    promptVi: 'Chọn 1 người để soi phe:', confirmVi: 'Xác nhận soi',
    nightAction: 'seer_check', targets: 1, category: 'essential', implemented: true,
  },
  witch: {
    key: 'witch', emoji: '🧪', nameVi: 'Phù Thủy', nameEn: 'Witch',
    faction: 'village', teamVi: 'Dân', color: '#10b981', glowKey: 'witch',
    descVi: 'Có 1 thuốc cứu và 1 thuốc độc, mỗi loại dùng được 1 lần cả ván.',
    promptVi: 'Chọn người để đầu độc:', confirmVi: 'Xác nhận',
    badges: [
      { label: 'Thuốc cứu: 1', color: '#38A169' },
      { label: 'Thuốc độc: 1', color: '#E53E3E' },
    ],
    nightAction: 'witch_save', targets: 1, category: 'essential', implemented: true,
  },
  guard: {
    key: 'guard', emoji: '🛡️', nameVi: 'Bảo Vệ', nameEn: 'Guard',
    faction: 'village', teamVi: 'Dân', color: '#f59e0b', glowKey: 'guard',
    descVi: 'Mỗi đêm bảo vệ 1 người khỏi bị cắn.',
    noteVi: 'Không bảo vệ cùng một người 2 đêm liên tiếp.',
    promptVi: 'Chọn người để bảo vệ:', confirmVi: 'Xác nhận bảo vệ',
    nightAction: 'guard_protect', targets: 1, category: 'protective', implemented: true,
  },
  doctor: {
    key: 'doctor', emoji: '💊', nameVi: 'Bác Sĩ', nameEn: 'Doctor',
    faction: 'village', teamVi: 'Dân', color: '#22c55e', glowKey: 'doctor',
    descVi: 'Mỗi đêm chữa 1 người, không được tự chữa.',
    promptVi: 'Chọn người để chữa:', confirmVi: 'Xác nhận chữa',
    nightAction: 'doctor_heal', targets: 1, category: 'protective', implemented: false,
  },
  hunter: {
    key: 'hunter', emoji: '🏹', nameVi: 'Săn Thủ', nameEn: 'Hunter',
    faction: 'village', teamVi: 'Dân', color: '#ef4444', glowKey: 'hunter',
    descVi: 'Bạn không hành động ban đêm.',
    noteVi: 'Khi chết, bạn được bắn 1 người đi theo.',
    nightAction: null, targets: 0, category: 'offensive', implemented: true,
  },
  detective: {
    key: 'detective', emoji: '🕵️', nameVi: 'Thám Tử', nameEn: 'Detective',
    faction: 'village', teamVi: 'Dân', color: '#0ea5e9', glowKey: 'detective',
    descVi: 'Mỗi đêm so 2 người để biết họ có cùng phe hay không.',
    noteVi: 'Bạn biết họ cùng phe, nhưng không biết là phe nào.',
    promptVi: 'Chọn 2 người để so phe:', confirmVi: 'Xác nhận so phe',
    nightAction: 'detective_compare', targets: 2, category: 'special', implemented: false,
  },
  medium: {
    key: 'medium', emoji: '🕯️', nameVi: 'Bà Đồng', nameEn: 'Medium',
    faction: 'village', teamVi: 'Dân', color: '#a78bfa', glowKey: 'medium',
    descVi: 'Ban đêm bạn nghe được tiếng của những người đã chết.',
    noteVi: 'Bạn không biết ai đang nói, và không nhắn lại được. Nghe, rồi tự suy luận.',
    promptVi: 'Đêm nay cõi chết lên tiếng:', confirmVi: 'Đã nghe xong',
    nightAction: 'medium_listen', targets: 0, category: 'special', implemented: false,
  },
  raven: {
    key: 'raven', emoji: '🐦', nameVi: 'Con Quạ', nameEn: 'Raven',
    faction: 'village', teamVi: 'Dân', color: '#64748b', glowKey: 'raven',
    descVi: 'Mỗi đêm đánh dấu 1 người.',
    noteVi: 'Người bị đánh dấu bắt đầu buổi biểu quyết hôm sau với 2 phiếu sẵn.',
    promptVi: 'Chọn người để đánh dấu:', confirmVi: 'Xác nhận đánh dấu',
    nightAction: 'raven_mark', targets: 1, category: 'special', implemented: false,
  },
  chief: {
    key: 'chief', emoji: '🏛️', nameVi: 'Trưởng Làng', nameEn: 'Village Chief',
    faction: 'village', teamVi: 'Dân', color: '#eab308', glowKey: 'chief',
    descVi: 'Bạn không hành động ban đêm.',
    noteVi: 'Lá phiếu của bạn tính thành 2 khi biểu quyết.',
    nightAction: null, targets: 0, category: 'special', implemented: false,
  },
  elder: {
    key: 'elder', emoji: '👴', nameVi: 'Lão Làng', nameEn: 'Elder',
    faction: 'village', teamVi: 'Dân', color: '#94a3b8', glowKey: 'elder',
    descVi: 'Bạn chịu được 1 lần bị sói cắn.',
    noteVi: 'Nếu bị dân xử, làng mất thêm 1 vai trò đặc biệt.',
    nightAction: null, targets: 0, category: 'special', implemented: false,
  },
  cupid: {
    key: 'cupid', emoji: '💘', nameVi: 'Thần Tình Yêu', nameEn: 'Cupid',
    faction: 'neutral', teamVi: 'Độc lập', color: '#ec4899', glowKey: 'cupid',
    descVi: 'Đêm đầu tiên bạn ghép đôi 2 người chơi.',
    noteVi: 'Một người trong cặp chết thì người kia chết theo.',
    promptVi: 'Chọn 2 người để ghép đôi:', confirmVi: 'Xác nhận ghép đôi',
    nightAction: 'cupid_link', targets: 2, category: 'special', implemented: true,
  },
  jester: {
    key: 'jester', emoji: '🤡', nameVi: 'Thằng Ngố', nameEn: 'Jester',
    faction: 'neutral', teamVi: 'Độc lập', color: '#f472b6', glowKey: 'jester',
    descVi: 'Bạn không hành động ban đêm.',
    noteVi: 'Bạn thắng một mình nếu bị làng biểu quyết loại.',
    nightAction: null, targets: 0, category: 'special', implemented: false,
  },
  villager: {
    key: 'villager', emoji: '👤', nameVi: 'Dân Thường', nameEn: 'Villager',
    faction: 'village', teamVi: 'Dân', color: '#3b82f6', glowKey: 'villager',
    descVi: 'Bạn không có khả năng đặc biệt.',
    noteVi: 'Dựa vào phân tích và lá phiếu của mình.',
    nightAction: null, targets: 0, category: 'essential', implemented: true,
  },
}

export const ALL_ROLES: RoleDef[] = Object.values(ROLE_REGISTRY)

/** Các vai phe sói (thấy nhau, cắn chung). */
export const WOLF_ROLE_KEYS: Role[] = ALL_ROLES
  .filter((r) => r.faction === 'wolf')
  .map((r) => r.key)

export function isWolfRole(role: string | null | undefined): boolean {
  return !!role && (WOLF_ROLE_KEYS as string[]).includes(role)
}

/**
 * Thứ tự gọi dậy ban đêm (chế độ tuần tự) — theo ORDER của design canvas.
 * Chỉ vai có nightAction riêng chiếm một bước; bầy sói chung 1 bước wolf_bite.
 * (Đêm 1: game-logic đưa cupid lên đầu — xử lý ở Phase 3.)
 */
export const NIGHT_ORDER: Role[] = [
  'werewolf',       // bước bầy sói chung (gồm alpha, white, wolf_seer, cursed cùng cắn)
  'wolf_seer',
  'cursed_wolf',
  'seer',
  'witch',
  'guard',
  'detective',
  'medium',
  'raven',
  'cupid',
  'doctor',
]

// ------------------------------------------------------------
// Config helpers
// ------------------------------------------------------------
/** Config: số lượng mỗi vai. Partial để đọc an toàn phòng cũ (8 key). */
export type RoleConfig = Partial<Record<Role, number>>

/** Config mặc định — đầy đủ key (vai mới = 0 → gameplay như cũ). */
export const DEFAULT_CONFIG: Required<RoleConfig> = {
  werewolf: 2, alpha_wolf: 0, wolf_seer: 0, cursed_wolf: 0, white_werewolf: 0,
  seer: 1, witch: 1, guard: 1, doctor: 0, hunter: 0,
  detective: 0, medium: 0, raven: 0, chief: 0, elder: 0,
  cupid: 0, jester: 0, villager: 0, // villager tự tính khi start
}

export function countOf(config: RoleConfig, role: Role): number {
  return config[role] ?? 0
}

/** Tổng số vai đặc biệt (mọi vai trừ villager). */
export function sumSpecial(config: RoleConfig): number {
  return ALL_ROLES
    .filter((r) => r.key !== 'villager')
    .reduce((sum, r) => sum + countOf(config, r.key), 0)
}

/** Tổng số người theo config (kể cả villager). */
export function sumTotal(config: RoleConfig): number {
  return ALL_ROLES.reduce((sum, r) => sum + countOf(config, r.key), 0)
}

/**
 * Làm sạch config từ client: chỉ giữ vai đã implement, ép số nguyên ≥ 0.
 * Chống gọi API trực tiếp với vai chưa có logic server.
 */
export function sanitizeConfig(raw: unknown): RoleConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: RoleConfig = {}
  for (const def of ALL_ROLES) {
    if (!def.implemented) continue
    const v = input[def.key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[def.key] = Math.max(0, Math.floor(v))
    }
  }
  return out
}
