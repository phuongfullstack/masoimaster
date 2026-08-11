// ============================================================
// Firestore server client + helpers (admin SDK).
// All game-state reads/writes go through here. The Admin SDK
// bypasses security rules — client-facing authorization is done
// in each API route after verifying the Firebase ID token.
// ============================================================
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore, type Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

let _app: App | null = null
let _db: Firestore | null = null

/** Resolve service-account credentials: env vars first, then serviceAccountKey.json ở gốc dự án. */
function resolveCredentials(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // `.env` stores the key with literal "\n"; turn those into real newlines.
  const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (envProjectId && envClientEmail && envPrivateKey) {
    return { projectId: envProjectId, clientEmail: envClientEmail, privateKey: envPrivateKey }
  }
  // Fallback: file JSON tải từ Firebase Console (đã gitignore).
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || join(process.cwd(), 'serviceAccountKey.json')
  if (existsSync(keyPath)) {
    try {
      const json = JSON.parse(readFileSync(keyPath, 'utf8')) as {
        project_id?: string; client_email?: string; private_key?: string
      }
      if (json.project_id && json.client_email && json.private_key) {
        return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key }
      }
    } catch { /* fall through to error below */ }
  }
  return null
}

export function ensureApp(): App {
  if (_app) return _app
  if (getApps().length) { _app = getApps()[0]!; return _app }
  const creds = resolveCredentials()
  if (!creds) {
    throw new Error(
      'Firebase Admin chưa cấu hình. Điền FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY ' +
      'trong .env, hoặc đặt file serviceAccountKey.json ở gốc dự án. Xem docs/FIREBASE-SETUP.md.',
    )
  }
  _app = initializeApp({ credential: cert(creds) })
  return _app
}

/** Shared Firestore instance (Admin SDK, bypasses rules). */
// Project dùng database ĐẶT TÊN (không phải "(default)") — phải truyền id.
const FIRESTORE_DB_ID = process.env.FIREBASE_DATABASE_ID || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'masoimaster'
export function db(): Firestore {
  if (_db) return _db
  _db = getFirestore(ensureApp(), FIRESTORE_DB_ID)
  return _db
}

export function adminAuth() {
  return getAuth(ensureApp())
}

// ============================================================
// Path helpers — single source of truth for collection paths.
// ============================================================
export const usersCol = () => db().collection('users')
export const userDoc = (uid: string) => usersCol().doc(uid)
export const roomsCol = () => db().collection('rooms')
export const roomDoc = (code: string) => roomsCol().doc(code.toUpperCase())
export const playersCol = (code: string) => roomDoc(code).collection('players')
export const playerDoc = (code: string, uid: string) => playersCol(code).doc(uid)
export const secretsCol = (code: string) => roomDoc(code).collection('secrets')
export const secretDoc = (code: string, uid: string) => secretsCol(code).doc(uid)
export const nightActionsCol = (code: string) => roomDoc(code).collection('nightActions')
export const votesCol = (code: string) => roomDoc(code).collection('votes')
export const messagesCol = (code: string) => roomDoc(code).collection('messages')

// ============================================================
// Domain types (server-internal — full state, includes secrets).
// ============================================================
export type Role = 'werewolf' | 'white_werewolf' | 'villager' | 'seer' | 'witch' | 'guard' | 'hunter' | 'cupid'
export type Phase = 'lobby' | 'role_reveal' | 'night' | 'night_resolve' | 'day' | 'voting' | 'vote_result' | 'game_over'
export type ActionType = 'wolf_bite' | 'seer_check' | 'witch_save' | 'witch_poison' | 'guard_protect' | 'cupid_link'
export type MsgType = 'public' | 'dead' | 'wolf' | 'system'

export const WOLF_ROLES: Role[] = ['werewolf', 'white_werewolf']

export interface RoleConfig {
  werewolf: number; white_werewolf: number; seer: number; witch: number
  guard: number; hunter: number; cupid: number; villager: number
}

export interface RoomDoc {
  code: string
  hostId: string
  hostMode: 'auto' | 'direct' | 'hybrid'
  status: 'waiting' | 'playing' | 'finished'
  phase: Phase
  dayCount: number
  config: RoleConfig
  timerEnd: number | null
  timerPhase: Phase | null
  phaseLabel: string
  // Admin-only fields (denied to clients by rules, but stored on the room
  // doc for simplicity since rules already deny client writes/reads of
  // sensitive siblings — these are not in `secrets` because they are
  // cross-player game state, not per-player).
  cupidPair: [string, string] | null
  cupidDone: boolean
  lastGuardTarget: string | null
  nightStep: number            // current index into the night wake ladder
  bittenTarget: string | null  // wolf bite target this night (for witch UI)
  // Broadcast result payloads
  dayResult: { deaths: string[]; saved: boolean } | null
  voteResult: { eliminated: string | null; chainedDeaths: string[]; voteCounts: Record<string, number>; isTie: boolean } | null
  nightWake: { actionType: ActionType; label: string; duration: number; bittenPlayer?: string | null } | null
  reveal: Record<string, Role> | null  // { uid: role } — populated at game_over
  gameWinner: 'werewolf' | 'villager' | 'lovers' | null
  createdAt: number
  // Firestore TTL: phòng tự bị dọn khi quá hạn (bật TTL policy trên field này).
  expiresAt?: Date | Timestamp
}

export interface PlayerDoc {
  userId: string
  username: string
  isAlive: boolean
  isReady: boolean
  seatIndex: number
}

export interface SecretDoc {
  role: Role
  witchSaveUsed: boolean
  witchPoisonUsed: boolean
  linkedPartner: string | null  // userId of lover
}

export interface NightActionDoc {
  actorId: string
  actionType: ActionType
  targetId: string | null
}

// ============================================================
// Read helpers — load full game state for logic computation.
// ============================================================
export async function loadRoom(code: string): Promise<{ room: RoomDoc | null }> {
  const snap = await roomDoc(code).get()
  return { room: snap.exists ? (snap.data() as RoomDoc) : null }
}

export async function loadPlayers(code: string): Promise<PlayerDoc[]> {
  const snap = await playersCol(code).orderBy('seatIndex').get()
  return snap.docs.map((d) => d.data() as PlayerDoc)
}

export async function loadSecrets(code: string): Promise<Map<string, SecretDoc>> {
  const snap = await secretsCol(code).get()
  const map = new Map<string, SecretDoc>()
  snap.docs.forEach((d) => map.set(d.id, d.data() as SecretDoc))
  return map
}

export async function loadNightActions(code: string): Promise<NightActionDoc[]> {
  const snap = await nightActionsCol(code).get()
  return snap.docs.map((d) => d.data() as NightActionDoc)
}

export async function loadVotes(code: string): Promise<Map<string, string>> {
  const snap = await votesCol(code).get()
  const map = new Map<string, string>()
  snap.docs.forEach((d) => {
    const data = d.data() as { targetId: string }
    map.set(d.id, data.targetId || '')
  })
  return map
}

// ============================================================
// Lazy TTL — dọn phòng hết hạn bằng code.
// Firestore TTL policy cần quyền owner để bật; thay vào đó mỗi lần
// tạo phòng mới ta dọn tối đa vài phòng đã quá `expiresAt` (kèm toàn
// bộ subcollections qua recursiveDelete). Best-effort: lỗi bị nuốt.
// Nếu sau này TTL policy được bật (firebase deploy), cả hai cùng chạy
// cũng vô hại.
// ============================================================
export async function cleanupExpiredRooms(max = 5): Promise<number> {
  try {
    const snap = await roomsCol().where('expiresAt', '<=', new Date()).limit(max).get()
    await Promise.all(snap.docs.map((d) => db().recursiveDelete(d.ref)))
    return snap.size
  } catch {
    return 0
  }
}

// ============================================================
// Misc helpers
// ============================================================
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return code
}

export async function generateUniqueCode(): Promise<string> {
  let code = generateRoomCode()
  // Retry on collision (extremely rare with 30^6 space).
  for (let i = 0; i < 10; i++) {
    const exists = (await roomDoc(code).get()).exists
    if (!exists) return code
    code = generateRoomCode()
  }
  return code
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Default role config (matches the prior server default). */
export const DEFAULT_CONFIG: RoleConfig = {
  werewolf: 2, white_werewolf: 0, seer: 1, witch: 1,
  guard: 1, hunter: 0, cupid: 0, villager: 0,
}

/** Build the shuffled role list for a game start. */
export function generateRoleList(config: RoleConfig, total: number): Role[] {
  const roles: Role[] = []
  roles.push(...Array(config.werewolf).fill('werewolf') as Role[])
  roles.push(...Array(config.white_werewolf).fill('white_werewolf') as Role[])
  roles.push(...Array(config.seer).fill('seer') as Role[])
  roles.push(...Array(config.witch).fill('witch') as Role[])
  roles.push(...Array(config.guard).fill('guard') as Role[])
  roles.push(...Array(config.hunter).fill('hunter') as Role[])
  roles.push(...Array(config.cupid).fill('cupid') as Role[])
  const remaining = total - roles.length
  if (remaining > 0) roles.push(...Array(remaining).fill('villager') as Role[])
  return shuffle(roles)
}
