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
  action: ActionType
  duration: number
  label: string
}

export function buildNightSequence(
  players: PlayerDoc[], secrets: Map<string, SecretDoc>, dayCount: number, cupidDone: boolean,
): NightStep[] {
  const alive = players.filter((p) => p.isAlive)
  const has = (r: Role[]) => alive.some((p) => r.includes(secrets.get(p.userId)?.role as Role))
  const seq: NightStep[] = []
  if (dayCount === 0 && has(['cupid']) && !cupidDone) {
    seq.push({ roles: ['cupid'], action: 'cupid_link', duration: PHASE_DURATIONS.night_step_cupid, label: 'Cúp Đôi Tỉnh Dậy' })
  }
  if (has(['guard'])) seq.push({ roles: ['guard'], action: 'guard_protect', duration: PHASE_DURATIONS.night_step_guard, label: 'Bảo Vệ Tỉnh Dậy' })
  if (has(WOLF_ROLES)) seq.push({ roles: WOLF_ROLES, action: 'wolf_bite', duration: PHASE_DURATIONS.night_step_wolves, label: 'Sói Tỉnh Dậy' })
  if (has(['seer'])) seq.push({ roles: ['seer'], action: 'seer_check', duration: PHASE_DURATIONS.night_step_seer, label: 'Tiên Tri Tỉnh Dậy' })
  if (has(['witch'])) seq.push({ roles: ['witch'], action: 'witch_save', duration: PHASE_DURATIONS.night_step_witch, label: 'Phù Thủy Tỉnh Dậy' })
  return seq
}

// ============================================================
// Win condition
// ============================================================
export function checkWinCondition(
  players: PlayerDoc[], secrets: Map<string, SecretDoc>, cupidPair: [string, string] | null,
): 'werewolf' | 'villager' | 'lovers' | null {
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
  winner: 'werewolf' | 'villager' | 'lovers' | null
}

export function resolveNight(
  room: RoomDoc,
  players: PlayerDoc[],
  secrets: Map<string, SecretDoc>,
  actions: NightActionDoc[],
): NightResolution {
  const protected_ = new Set<string>()
  const bitten = new Set<string>()
  const poisoned = new Set<string>()
  let saved = false

  const guardAction = actions.find((a) => a.actionType === 'guard_protect')
  if (guardAction?.targetId) protected_.add(guardAction.targetId)

  const wolfBite = actions.find((a) => a.actionType === 'wolf_bite')
  if (wolfBite?.targetId) bitten.add(wolfBite.targetId)

  const witchSave = actions.find((a) => a.actionType === 'witch_save')
  if (witchSave && bitten.size > 0) { saved = true; bitten.clear() }

  const witchPoison = actions.find((a) => a.actionType === 'witch_poison')
  if (witchPoison?.targetId) poisoned.add(witchPoison.targetId)

  // Cupid auto-pair (night 1 only, if cupid never acted)
  let cupidAutoPair: [string, string] | null = null
  if (room.dayCount === 0 && !room.cupidDone) {
    cupidAutoPair = autoPairLovers(players, secrets)
  }

  // Deaths
  const deathIds: string[] = []
  for (const pid of bitten) if (!protected_.has(pid)) deathIds.push(pid)
  for (const pid of poisoned) deathIds.push(pid)

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

  return {
    deaths, deathIds, saved, deadHunterId, cupidAutoPair,
    updatedPlayers: players, updatedSecrets: secrets,
    lastGuardTarget: guardAction?.targetId ?? null,
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
  winner: 'werewolf' | 'villager' | 'lovers' | null
}

export function resolveVotes(
  votes: Map<string, string>,
  players: PlayerDoc[],
  secrets: Map<string, SecretDoc>,
  cupidPair: [string, string] | null,
): VoteResolution {
  const voteCounts: Record<string, number> = {}
  for (const [, targetId] of votes) {
    if (targetId) voteCounts[targetId] = (voteCounts[targetId] || 0) + 1
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

  const winner = checkWinCondition(players, secrets, cupidPair)

  return { voteCounts, eliminatedId, eliminatedName, chainedDeaths, isTie, deadHunterId, winner }
}

// ============================================================
// Hunter shoot — kills target + chain deaths + win check.
// ============================================================
export interface HunterShotResult {
  targetName: string
  chainedDeaths: string[]
  winner: 'werewolf' | 'villager' | 'lovers' | null
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
