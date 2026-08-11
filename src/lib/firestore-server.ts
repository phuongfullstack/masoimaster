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
// Pick cắn hiện tại của TỪNG sói — rules cho phép mọi sói trong phòng đọc
// (pack board realtime); ghi qua API. Doc id = uid sói.
export const wolfPicksCol = (code: string) => roomDoc(code).collection('wolfPicks')
export const wolfPickDoc = (code: string, uid: string) => wolfPicksCol(code).doc(uid)
// Kênh chat tách riêng — rules gate thật (không lọc UI):
// wolfChat chỉ sói đọc; deadChat chỉ người chết đọc.
export const wolfChatCol = (code: string) => roomDoc(code).collection('wolfChat')
export const deadChatCol = (code: string) => roomDoc(code).collection('deadChat')
// Master log — nhật ký ai-làm-gì-với-ai, CHỈ HOST đọc được (rules).
export const logCol = (code: string) => roomDoc(code).collection('log')

export interface LogEntry {
  at: number
  day: number
  phase: string
  icon: string
  text: string
}

/** Ghi một loạt dòng master log (best-effort — không làm hỏng game flow). */
export async function writeLog(code: string, day: number, phase: string, lines: Array<{ icon: string; text: string }>) {
  if (lines.length === 0) return
  try {
    const batch = db().batch()
    const base = Date.now()
    lines.forEach((l, i) => {
      batch.set(logCol(code).doc(), { at: base + i, day, phase, icon: l.icon, text: l.text } satisfies LogEntry)
    })
    await batch.commit()
  } catch { /* log là phụ trợ */ }
}

// ============================================================
// Domain types (server-internal — full state, includes secrets).
// Role/ActionType/RoleConfig hợp nhất về roles.ts (18 vai).
// ============================================================
import { WOLF_ROLE_KEYS, ALL_ROLES, DEFAULT_CONFIG as REGISTRY_DEFAULT_CONFIG, countOf } from '@/lib/roles'
import type { Role, ActionType, RoleConfig, Winner } from '@/lib/roles'

export type { Role, ActionType, RoleConfig, Winner } from '@/lib/roles'
export type Phase = 'lobby' | 'role_reveal' | 'night' | 'night_resolve' | 'day' | 'voting' | 'vote_result' | 'game_over'
export type MsgType = 'public' | 'dead' | 'wolf' | 'system'

/** Các vai phe sói — derive từ registry (trước đây hard-code 2 vai). */
export const WOLF_ROLES: Role[] = WOLF_ROLE_KEYS

/** Chế độ đêm: 'seq' = tuần tự từng vai (Phù Thủy biết ai bị cắn);
 *  'sim' = mọi vai hành động cùng lúc (Phù Thủy cứu mù). */
export type NightMode = 'seq' | 'sim'

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
  /** Chế độ đêm — phòng cũ thiếu field → đọc fallback 'seq'. */
  nightMode?: NightMode
  /** Tiến độ đêm ẨN DANH (public): bao nhiêu người đã hành động. */
  nightProgress?: { done: number; total: number } | null
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
  // `saved` không còn được ghi công khai (anti-reveal) — optional cho doc cũ.
  dayResult: { deaths: string[]; saved?: boolean } | null
  voteResult: { eliminated: string | null; chainedDeaths: string[]; voteCounts: Record<string, number>; isTie: boolean } | null
  // actionType 'sim_all' = chế độ đồng thời (mọi vai hành động cùng lúc).
  nightWake: { actionType: ActionType | 'sim_all'; label: string; duration: number; bittenPlayer?: string | null } | null
  reveal: Record<string, Role> | null  // { uid: role } — populated at game_over
  gameWinner: Winner | null
  /** Con Quạ đánh dấu đêm qua — PUBLIC khi vote (+2 phiếu sẵn), clear mỗi đêm mới. */
  ravenMarkedId?: string | null
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
  // ---- Field mới cho 17-vai design (optional — doc cũ đọc an toàn) ----
  packmates?: string[]          // sói: userId đồng đội bầy
  lastNightFx?: 'none' | 'saved' | 'cursed' | 'elder' | 'poison'  // báo riêng lúc rạng sáng
  elderShieldUsed?: boolean     // elder đã chịu 1 cắn
  curseUsed?: boolean           // cursed wolf đã dùng lời nguyền
  originalRole?: Role           // vai gốc trước khi bị nguyền
  seance?: string[]             // medium: tin nhắn ẩn danh từ cõi chết (server copy)
}

export interface NightActionDoc {
  actorId: string
  actionType: ActionType
  targetId: string | null
  targetId2?: string | null     // detective so 2 người
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

/** Pick cắn của từng sói đêm nay: Map<wolfUid, targetId>. */
export async function loadWolfPicks(code: string): Promise<Map<string, string>> {
  const snap = await wolfPicksCol(code).get()
  const map = new Map<string, string>()
  snap.docs.forEach((d) => {
    const data = d.data() as { targetId: string }
    if (data.targetId) map.set(d.id, data.targetId)
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

/** Default role config (derive từ registry — vai mới mặc định 0). */
export const DEFAULT_CONFIG: RoleConfig = { ...REGISTRY_DEFAULT_CONFIG }

/** Build the shuffled role list for a game start — generic theo registry. */
export function generateRoleList(config: RoleConfig, total: number): Role[] {
  const roles: Role[] = []
  for (const def of ALL_ROLES) {
    if (def.key === 'villager') continue
    const n = countOf(config, def.key)
    for (let i = 0; i < n; i++) roles.push(def.key)
  }
  const remaining = total - roles.length
  if (remaining > 0) roles.push(...Array(remaining).fill('villager') as Role[])
  return shuffle(roles)
}
