// ============================================================
// Game logic — pure functions over loaded Firestore state.
// Ported from the in-memory server (mini-services/game-server/index.ts).
// Each function takes the loaded state and returns mutations the
// caller (API route) writes back to Firestore.
// ============================================================
import {
  type Role, type Phase, type ActionType, type RoleConfig,
  type RoomDoc, type PlayerDoc, type SecretDoc, type NightActionDoc,
  WOLF_ROLES,
} from '@/lib/firestore-server'
import { ROLE_REGISTRY } from '@/lib/roles'
import type { Winner } from '@/lib/roles'

// ---- Phase durations (ms) — single source of truth ----
export const PHASE_DURATIONS = {
  role_reveal: 10_000,
  night_resolve: 3_000,
  day: 90_000,        // discussion
  voting: 30_000,
  vote_result: 8_000,
  hunter_shoot: 15_000,
  night_step_cupid: 15_000,
  night_step_guard: 15_000,
  night_step_wolves: 30_000,
  night_step_seer: 15_000,
  night_step_witch: 20_000,
  night_step_gap: 1_500, // initial delay before first night step
} as const

// ---- Night wake ladder (order matters) ----
export interface NightStep {
  roles: Role[]
  /** 'sim_all' = một bước duy nhất, mọi vai hành động cùng lúc. */
  action: ActionType | 'sim_all'
  duration: number
  label: string
}

/** Thời lượng bước đêm đồng thời (mọi vai cùng thao tác một lượt). */
export const SIM_NIGHT_DURATION = 45_000

export function buildNightSequence(
  players: PlayerDoc[], secrets: Map<string, SecretDoc>, dayCount: number, cupidDone: boolean,
  nightMode: 'seq' | 'sim' = 'seq',
): NightStep[] {
  const alive = players.filter((p) => p.isAlive)
  const has = (r: Role[]) => alive.some((p) => r.includes(secrets.get(p.userId)?.role as Role))

  // Chế độ ĐỒNG THỜI: 1 bước duy nhất — không có thứ tự để suy đoán,
  // Phù Thủy không được báo ai bị cắn (cứu mù).
  if (nightMode === 'sim') {
    const actingRoles = alive
      .map((p) => secrets.get(p.userId)?.role as Role)
      .filter((r, i, arr) => r && arr.indexOf(r) === i)
      .filter((r) => {
        const def = ROLE_REGISTRY[r]
        if (!def?.nightAction) return false
        if (r === 'cupid') return dayCount === 0 && !cupidDone
        return true
      })
    if (actingRoles.length === 0) return []
    return [{ roles: actingRoles, action: 'sim_all', duration: SIM_NIGHT_DURATION, label: 'Đang là đêm' }]
  }
  // ANTI-REVEAL: label là PUBLIC (phaseLabel/nightWake trên room doc) — tuyệt
  // đối không nêu tên vai đang dậy, thứ tự đêm phải ẩn danh với người ngoài.
  const NIGHT_LABEL = 'Đang là đêm'
  const seq: NightStep[] = []
  if (dayCount === 0 && has(['cupid']) && !cupidDone) {
    seq.push({ roles: ['cupid'], action: 'cupid_link', duration: PHASE_DURATIONS.night_step_cupid, label: NIGHT_LABEL })
  }
  if (has(['guard'])) seq.push({ roles: ['guard'], action: 'guard_protect', duration: PHASE_DURATIONS.night_step_guard, label: NIGHT_LABEL })
  if (has(['doctor'])) seq.push({ roles: ['doctor'], action: 'doctor_heal', duration: PHASE_DURATIONS.night_step_guard, label: NIGHT_LABEL })
  if (has(WOLF_ROLES)) seq.push({ roles: WOLF_ROLES, action: 'wolf_bite', duration: PHASE_DURATIONS.night_step_wolves, label: NIGHT_LABEL })
  if (has(['wolf_seer'])) seq.push({ roles: ['wolf_seer'], action: 'wolf_seer_check', duration: PHASE_DURATIONS.night_step_seer, label: NIGHT_LABEL })
  // Sói Nguyền chỉ có bước riêng khi CHƯA dùng lời nguyền (1 lần/ván).
  const cursedWolfReady = alive.some(
    (p) => secrets.get(p.userId)?.role === 'cursed_wolf' && !secrets.get(p.userId)?.curseUsed,
  )
  if (cursedWolfReady) seq.push({ roles: ['cursed_wolf'], action: 'curse', duration: PHASE_DURATIONS.night_step_seer, label: NIGHT_LABEL })
  if (has(['seer'])) seq.push({ roles: ['seer'], action: 'seer_check', duration: PHASE_DURATIONS.night_step_seer, label: NIGHT_LABEL })
  if (has(['witch'])) seq.push({ roles: ['witch'], action: 'witch_save', duration: PHASE_DURATIONS.night_step_witch, label: NIGHT_LABEL })
  if (has(['detective'])) seq.push({ roles: ['detective'], action: 'detective_compare', duration: PHASE_DURATIONS.night_step_seer, label: NIGHT_LABEL })
  if (has(['medium'])) seq.push({ roles: ['medium'], action: 'medium_listen', duration: PHASE_DURATIONS.night_step_seer, label: NIGHT_LABEL })
  if (has(['raven'])) seq.push({ roles: ['raven'], action: 'raven_mark', duration: PHASE_DURATIONS.night_step_seer, label: NIGHT_LABEL })
  return seq
}

/**
 * Số người CÒN SỐNG có hành động đêm nay (mẫu số của tiến độ ẩn danh
 * "X/Y đã hành động"). Medium không nộp gì nên không tính.
 */
export function countNightActors(
  players: PlayerDoc[], secrets: Map<string, SecretDoc>, dayCount: number, cupidDone: boolean,
): number {
  return players.filter((p) => {
    if (!p.isAlive) return false
    const r = secrets.get(p.userId)?.role
    const def = r ? ROLE_REGISTRY[r] : null
    if (!def?.nightAction) return false
    if (def.key === 'medium') return false
    if (def.key === 'cupid') return dayCount === 0 && !cupidDone
    return true
  }).length
}

// ============================================================
// Wolf pack bite tally — mỗi sói pick riêng (wolfPicks/{uid}),
// chốt bước bằng đa số; bầy chia phiếu thì pick của Sói Đầu Sỏ
// quyết định; không có alpha (hoặc alpha không pick) → random
// trong nhóm dẫn đầu.
// ============================================================
export function tallyWolfBite(
  picks: Map<string, string>,
  secrets: Map<string, SecretDoc>,
): string | null {
  if (picks.size === 0) return null
  const counts = new Map<string, number>()
  for (const [, targetId] of picks) counts.set(targetId, (counts.get(targetId) ?? 0) + 1)

  let max = 0
  const leaders: string[] = []
  for (const [targetId, n] of counts) {
    if (n > max) { max = n; leaders.length = 0; leaders.push(targetId) }
    else if (n === max) leaders.push(targetId)
  }
  if (leaders.length === 1) return leaders[0]!

  // Hoà — Sói Đầu Sỏ phá hoà nếu pick của alpha nằm trong nhóm dẫn đầu.
  for (const [wolfId, targetId] of picks) {
    if (secrets.get(wolfId)?.role === 'alpha_wolf' && leaders.includes(targetId)) {
      return targetId
    }
  }
  return leaders[Math.floor(Math.random() * leaders.length)]!
}

// ============================================================
// Win condition
// ============================================================
export function checkWinCondition(
  players: PlayerDoc[], secrets: Map<string, SecretDoc>, cupidPair: [string, string] | null,
): Winner | null {
  const alive = players.filter((p) => p.isAlive)
  // Lovers (classic Cupid): both alive AND everyone else dead.
  if (cupidPair) {
    const [a, b] = cupidPair
    const bothAlive = alive.some((p) => p.userId === a) && alive.some((p) => p.userId === b)
    if (bothAlive && alive.length === 2) return 'lovers'
  }
  const wolves = alive.filter((p) => WOLF_ROLES.includes(secrets.get(p.userId)?.role as Role))
  const villagers = alive.filter((p) => !WOLF_ROLES.includes(secrets.get(p.userId)?.role as Role))
  if (wolves.length === 0) return 'villager'
  if (wolves.length >= villagers.length) return 'werewolf'
  return null
}

// ============================================================
// Lover chain-death: a linked player dying drags the partner down.
// Returns usernames additionally killed + mutates secrets/players.
// ============================================================
export function applyLoverChainDeaths(
  justDiedIds: string[],
  players: PlayerDoc[], secrets: Map<string, SecretDoc>,
): string[] {
  const chained: string[] = []
  for (const deadId of justDiedIds) {
    const partnerId = secrets.get(deadId)?.linkedPartner
    if (!partnerId) continue
    const partnerPlayer = players.find((p) => p.userId === partnerId)
    if (partnerPlayer?.isAlive) {
      partnerPlayer.isAlive = false
      chained.push(partnerPlayer.username)
    }
  }
  return chained
}

// ============================================================
// Auto-pair lovers when Cupid didn't act before night ends.
// Mutates secrets (bidirectional link) + returns the pair.
// ============================================================
export function autoPairLovers(
  players: PlayerDoc[], secrets: Map<string, SecretDoc>,
): [string, string] | null {
  const cupid = players.find((p) => secrets.get(p.userId)?.role === 'cupid')
  if (!cupid) return null
  const candidates = players.filter((p) => p.isAlive && p.userId !== cupid.userId)
  if (candidates.length < 2) return null
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const [a, b] = shuffled
  const sa = secrets.get(a.userId)
  const sb = secrets.get(b.userId)
  if (sa) sa.linkedPartner = b.userId
  if (sb) sb.linkedPartner = a.userId
  return [a.userId, b.userId]
}

// ============================================================
// Resolve night actions → deaths + chain deaths + hunter detection.
// Returns everything the caller needs to write back + decide flow.
// ============================================================
export interface NightResolution {
  deaths: string[]             // usernames that died
  deathIds: string[]           // userIds that died (incl chained)
  saved: boolean
  deadHunterId: string | null  // hunter among the dead → triggers shoot window
  cupidAutoPair: [string, string] | null
  updatedPlayers: PlayerDoc[]  // mutated isAlive flags
  updatedSecrets: Map<string, SecretDoc>  // mutated (witch potions, lover links)
  lastGuardTarget: string | null
  /** Con Quạ đánh dấu — public khi vote (+2 phiếu sẵn). */
  ravenMarkedId: string | null
  winner: Winner | null
}

export function resolveNight(
  room: RoomDoc,
  players: PlayerDoc[],
  secrets: Map<string, SecretDoc>,
  actions: NightActionDoc[],
  nightMode: 'seq' | 'sim' = 'seq',
): NightResolution {
  const protected_ = new Set<string>()
  const bitten = new Set<string>()
  const poisoned = new Set<string>()
  let saved = false

  // Reset báo cáo rạng sáng: mọi người còn sống mặc định 'none';
  // các hiệu ứng bên dưới ghi đè. Client chỉ đọc fx của CHÍNH MÌNH
  // (secrets owner-only) — nguồn hiệu ứng không bao giờ được nêu.
  for (const p of players) {
    const s = secrets.get(p.userId)
    if (s && p.isAlive) s.lastNightFx = 'none'
  }

  const guardAction = actions.find((a) => a.actionType === 'guard_protect')
  if (guardAction?.targetId) protected_.add(guardAction.targetId)

  // Doctor heal — same effect as guard (target survives bite), but no
  // last-target restriction and cannot self-heal (enforced at action submit).
  const doctorAction = actions.find((a) => a.actionType === 'doctor_heal')
  if (doctorAction?.targetId) protected_.add(doctorAction.targetId)

  const wolfBite = actions.find((a) => a.actionType === 'wolf_bite')
  if (wolfBite?.targetId) bitten.add(wolfBite.targetId)

  // Sói Nguyền: biến 1 người không-sói thành sói THAY VÌ giết.
  // Không bị guard/doctor chặn; cắn cùng đêm vào người này bị vô hiệu
  // (họ đã thuộc bầy). Đánh dấu curseUsed cho sói nguyền tại đây.
  const curseAction = actions.find((a) => a.actionType === 'curse')
  if (curseAction?.targetId) {
    const ts = secrets.get(curseAction.targetId)
    const tp = players.find((p) => p.userId === curseAction.targetId)
    if (ts && tp?.isAlive && !WOLF_ROLES.includes(ts.role)) {
      ts.originalRole = ts.role
      ts.role = 'werewolf'
      ts.lastNightFx = 'cursed'
      const actorSecret = secrets.get(curseAction.actorId)
      if (actorSecret) actorSecret.curseUsed = true
      bitten.delete(curseAction.targetId)
      // Cập nhật packmates cho CẢ bầy (kể cả thành viên mới).
      const wolves = players.filter((p) => WOLF_ROLES.includes(secrets.get(p.userId)?.role as Role))
      for (const w of wolves) {
        const ws = secrets.get(w.userId)
        if (ws) ws.packmates = wolves.filter((o) => o.userId !== w.userId).map((o) => o.username)
      }
    }
  }

  // Lão Làng: chịu được 1 lần cắn (không cần ai che). Lá chắn vỡ tại đây.
  for (const pid of [...bitten]) {
    const s = secrets.get(pid)
    if (s?.role === 'elder' && !s.elderShieldUsed && !protected_.has(pid)) {
      s.elderShieldUsed = true
      s.lastNightFx = 'elder'
      bitten.delete(pid)
    }
  }

  const witchSave = actions.find((a) => a.actionType === 'witch_save')
  if (witchSave) {
    if (nightMode === 'sim') {
      // ĐỒNG THỜI: Phù Thủy cứu MÙ — chỉ hiệu lực nếu đoán trúng nạn nhân.
      // Thuốc vẫn bị trừ dù trượt (đặt cược — route đã mark witchSaveUsed).
      if (witchSave.targetId && bitten.has(witchSave.targetId)) {
        saved = true
        const s = secrets.get(witchSave.targetId)
        if (s) s.lastNightFx = 'saved'
        bitten.delete(witchSave.targetId)
      }
    } else if (bitten.size > 0) {
      // TUẦN TỰ: Phù Thủy được báo ai bị cắn → cứu là trúng.
      saved = true
      // Người bị cắn nhưng được cứu → báo riêng 'saved' (không nêu nguồn).
      for (const pid of bitten) {
        const s = secrets.get(pid)
        if (s) s.lastNightFx = 'saved'
      }
      bitten.clear()
    }
  }

  const witchPoison = actions.find((a) => a.actionType === 'witch_poison')
  if (witchPoison?.targetId) poisoned.add(witchPoison.targetId)

  // Cupid auto-pair (night 1 only, if cupid never acted)
  let cupidAutoPair: [string, string] | null = null
  if (room.dayCount === 0 && !room.cupidDone) {
    cupidAutoPair = autoPairLovers(players, secrets)
  }

  // Deaths
  const deathIds: string[] = []
  for (const pid of bitten) {
    if (protected_.has(pid)) {
      // Cắn hụt vì được che — báo riêng cho nạn nhân.
      const s = secrets.get(pid)
      if (s) s.lastNightFx = 'saved'
    } else {
      deathIds.push(pid)
    }
  }
  for (const pid of poisoned) {
    deathIds.push(pid)
    // Nạn nhân biết riêng mình trúng độc (công bố chung không nêu nguyên nhân).
    const s = secrets.get(pid)
    if (s) s.lastNightFx = 'poison'
  }

  const deaths: string[] = []
  for (const uid of deathIds) {
    const p = players.find((pl) => pl.userId === uid)
    if (p?.isAlive) { p.isAlive = false; deaths.push(p.username) }
  }

  // Lover chain-death
  if (deathIds.length > 0) {
    const chained = applyLoverChainDeaths(deathIds, players, secrets)
    deaths.push(...chained)
    // chained deaths can themselves be a hunter
    chained.forEach((name) => {
      const p = players.find((pl) => pl.username === name)
      if (p) deathIds.push(p.userId)
    })
  }

  // Hunter detection
  const deadHunterId = deathIds.length > 0
    ? players.find((p) => secrets.get(p.userId)?.role === 'hunter' && !p.isAlive && deathIds.includes(p.userId))?.userId ?? null
    : null

  const winner = checkWinCondition(players, secrets, cupidAutoPair ?? room.cupidPair)

  // Con Quạ: dấu +2 phiếu áp lên buổi vote hôm sau (public).
  const ravenAction = actions.find((a) => a.actionType === 'raven_mark')

  return {
    deaths, deathIds, saved, deadHunterId, cupidAutoPair,
    updatedPlayers: players, updatedSecrets: secrets,
    lastGuardTarget: guardAction?.targetId ?? null,
    ravenMarkedId: ravenAction?.targetId ?? null,
    winner,
  }
}

// ============================================================
// Resolve votes → eliminated player + chain deaths + hunter detection.
// ============================================================
export interface VoteResolution {
  voteCounts: Record<string, number>
  eliminatedId: string | null
  eliminatedName: string | null
  chainedDeaths: string[]
  isTie: boolean
  deadHunterId: string | null
  winner: Winner | null
}

export function resolveVotes(
  votes: Map<string, string>,
  players: PlayerDoc[],
  secrets: Map<string, SecretDoc>,
  cupidPair: [string, string] | null,
  ravenMarkedId: string | null = null,
): VoteResolution {
  const voteCounts: Record<string, number> = {}
  // Con Quạ: người bị đánh dấu vào buổi vote với 2 phiếu sẵn (public).
  if (ravenMarkedId && players.find((p) => p.userId === ravenMarkedId)?.isAlive) {
    voteCounts[ravenMarkedId] = 2
  }
  for (const [voterId, targetId] of votes) {
    if (!targetId) continue
    // Trưởng Làng: lá phiếu tính đôi.
    const weight = secrets.get(voterId)?.role === 'chief' ? 2 : 1
    voteCounts[targetId] = (voteCounts[targetId] || 0) + weight
  }
  let maxVotes = 0
  const candidates: string[] = []
  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) { maxVotes = count; candidates.length = 0; candidates.push(targetId) }
    else if (count === maxVotes) candidates.push(targetId)
  }

  let eliminatedId: string | null = null
  let eliminatedName: string | null = null
  let chainedDeaths: string[] = []
  let isTie = candidates.length !== 1 || maxVotes === 0

  if (!isTie) {
    eliminatedId = candidates[0]!
    const p = players.find((pl) => pl.userId === eliminatedId)
    if (p) {
      p.isAlive = false
      eliminatedName = p.username
      chainedDeaths = applyLoverChainDeaths([eliminatedId], players, secrets)
    }
  }

  const deadHunterId = eliminatedId
    ? players.find((p) => p.userId === eliminatedId && secrets.get(p.userId)?.role === 'hunter')?.userId ?? null
    : null

  // Thằng Ngố: bị làng biểu quyết loại → thắng MỘT MÌNH, ván kết thúc ngay
  // (ưu tiên trên mọi điều kiện thắng khác).
  let winner: Winner | null
  if (eliminatedId && secrets.get(eliminatedId)?.role === 'jester') {
    winner = 'jester'
  } else {
    winner = checkWinCondition(players, secrets, cupidPair)
  }

  return { voteCounts, eliminatedId, eliminatedName, chainedDeaths, isTie, deadHunterId, winner }
}

// ============================================================
// Hunter shoot — kills target + chain deaths + win check.
// ============================================================
export interface HunterShotResult {
  targetName: string
  chainedDeaths: string[]
  winner: Winner | null
}

export function applyHunterShot(
  targetId: string,
  players: PlayerDoc[],
  secrets: Map<string, SecretDoc>,
  cupidPair: [string, string] | null,
): HunterShotResult | null {
  const target = players.find((p) => p.userId === targetId)
  if (!target?.isAlive) return null
  target.isAlive = false
  const chainedDeaths = applyLoverChainDeaths([targetId], players, secrets)
  const winner = checkWinCondition(players, secrets, cupidPair)
  return { targetName: target.username, chainedDeaths, winner }
}
