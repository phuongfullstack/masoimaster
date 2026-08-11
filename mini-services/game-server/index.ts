// ============================================================
// Ma Sói Realtime - Game Server (Socket.io)
// In-memory game logic - no DB dependency
// ============================================================
import { createServer } from 'http'
import { Server } from 'socket.io'
import { nanoid, customAlphabet } from 'nanoid'
import { initializeApp, getApps, cert, type App as AdminApp } from 'firebase-admin/app'
import { getAuth, type Auth as AdminAuth, type DecodedIdToken } from 'firebase-admin/auth'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============================================================
// Types
// ============================================================
type Role = 'werewolf' | 'white_werewolf' | 'villager' | 'seer' | 'witch' | 'guard' | 'hunter' | 'cupid'
type Phase = 'lobby' | 'role_reveal' | 'night' | 'night_resolve' | 'day' | 'voting' | 'vote_result' | 'game_over'
type RoomStatus = 'waiting' | 'playing' | 'finished'
type HostMode = 'auto' | 'direct' | 'hybrid'
type ActionType = 'wolf_bite' | 'seer_check' | 'witch_save' | 'witch_poison' | 'guard_protect' | 'cupid_link'

interface PlayerData {
  id: string
  userId: string
  username: string
  role: Role | ''
  isAlive: boolean
  isReady: boolean
  seatIndex: number
  socketId: string
  witchSaveUsed: boolean
  witchPoisonUsed: boolean
  linkedPartner?: string
}

interface RoomData {
  id: string
  code: string
  hostId: string
  status: RoomStatus
  phase: Phase
  dayCount: number
  hostMode: HostMode
  hostIsPlayer: boolean
  players: Map<string, PlayerData>
  config: RoleConfig
  nightActions: NightActionData[]
  votes: Map<string, string>
  timer: ReturnType<typeof setTimeout> | null
  timerEnd: number | null
  nightTimeouts: ReturnType<typeof setTimeout>[]
  cupidDone: boolean
  cupidPair: [string, string] | null
  lastGuardTarget: string | null
}

interface RoleConfig {
  werewolf: number
  white_werewolf: number
  seer: number
  witch: number
  guard: number
  hunter: number
  cupid: number
  villager: number
}

interface NightActionData {
  actorId: string
  actionType: ActionType
  targetId: string | null
}

// ============================================================
// In-memory state
// ============================================================
const rooms = new Map<string, RoomData>()
const userRoomMap = new Map<string, string>() // userId -> roomCode
const socketUserMap = new Map<string, string>() // socketId -> userId

const generateRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)
const WOLF_ROLES: Role[] = ['werewolf', 'white_werewolf']

// ============================================================
// Firebase Admin — verify client ID tokens to establish identity.
// Falls back gracefully: if env is missing, the server refuses auth.
// ============================================================
let _adminAuth: AdminAuth | null = null
function adminAuth(): AdminAuth {
  if (_adminAuth) return _adminAuth
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin chưa cấu hình (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).')
  }
  const app: AdminApp = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
  _adminAuth = getAuth(app)
  return _adminAuth
}

/** Verify a Firebase ID token. Returns the decoded claims, or null on failure. */
async function verifyIdToken(token: string | null | undefined): Promise<DecodedIdToken | null> {
  if (!token) return null
  try {
    return await adminAuth().verifyIdToken(token)
  } catch (err) {
    console.error('[AUTH] token verify failed:', (err as Error)?.message)
    return null
  }
}

function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase()
}

function getRoom(code: string): RoomData | undefined {
  return rooms.get(normalizeRoomCode(code))
}

function deleteRoom(code: string) {
  rooms.delete(normalizeRoomCode(code))
}

// ============================================================
// Helpers
// ============================================================
function getAlivePlayers(room: RoomData): PlayerData[] {
  return Array.from(room.players.values()).filter(p => p.isAlive)
}

function getPlayersByRole(room: RoomData, role: Role | Role[]): PlayerData[] {
  const roles = Array.isArray(role) ? role : [role]
  return Array.from(room.players.values()).filter(p => roles.includes(p.role as Role))
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function generateRoleList(config: RoleConfig, totalPlayers: number): Role[] {
  const roles: Role[] = []
  roles.push(...Array(config.werewolf).fill('werewolf'))
  roles.push(...Array(config.white_werewolf).fill('white_werewolf'))
  roles.push(...Array(config.seer).fill('seer'))
  roles.push(...Array(config.witch).fill('witch'))
  roles.push(...Array(config.guard).fill('guard'))
  roles.push(...Array(config.hunter).fill('hunter'))
  roles.push(...Array(config.cupid).fill('cupid'))
  const remaining = totalPlayers - roles.length
  if (remaining > 0) roles.push(...Array(remaining).fill('villager'))
  return shuffleArray(roles)
}

function clearRoomTimer(room: RoomData) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; room.timerEnd = null }
  if (room.nightTimeouts?.length) {
    room.nightTimeouts.forEach(t => clearTimeout(t))
    room.nightTimeouts = []
  }
}

function startPhaseTimer(room: RoomData, durationMs: number, callback: () => void) {
  clearRoomTimer(room)
  room.timerEnd = Date.now() + durationMs
  room.timer = setTimeout(() => { room.timer = null; room.timerEnd = null; callback() }, durationMs)
}

function emitToRoom(room: RoomData, event: string, data: any) {
  Array.from(room.players.values()).forEach(p => { if (p.socketId) io.to(p.socketId).emit(event, data) })
}

function emitToAlive(room: RoomData, event: string, data: any) {
  getAlivePlayers(room).forEach(p => { if (p.socketId) io.to(p.socketId).emit(event, data) })
}

function emitToDead(room: RoomData, event: string, data: any) {
  Array.from(room.players.values()).filter(p => !p.isAlive).forEach(p => { if (p.socketId) io.to(p.socketId).emit(event, data) })
}

function emitToRole(room: RoomData, role: Role | Role[], event: string, data: any) {
  getPlayersByRole(room, role).forEach(p => { if (p.socketId) io.to(p.socketId).emit(event, data) })
}

function emitToPlayer(player: PlayerData, event: string, data: any) {
  if (player.socketId) io.to(player.socketId).emit(event, data)
}

function buildPublicPlayerInfo(player: PlayerData, forUserId?: string): any {
  const isSelf = player.userId === forUserId
  return {
    id: player.id, userId: player.userId, username: player.username,
    role: isSelf ? player.role : '',
    isAlive: player.isAlive, isReady: player.isReady, seatIndex: player.seatIndex,
  }
}

function buildRoomStateForPlayer(room: RoomData, userId: string) {
  const player = room.players.get(userId)
  const isHost = room.hostId === userId
  const wolves = getPlayersByRole(room, WOLF_ROLES)
  const isWolf = player && WOLF_ROLES.includes(player.role as Role)

  return {
    id: room.id, code: room.code, hostId: room.hostId,
    status: room.status, phase: room.phase, dayCount: room.dayCount,
    hostMode: room.hostMode, hostIsPlayer: room.hostIsPlayer,
    config: room.config, isHost,
    myRole: player?.role || '', isAlive: player?.isAlive ?? true,
    players: Array.from(room.players.values()).map(p => buildPublicPlayerInfo(p, userId)),
    wolfPartners: isWolf ? wolves.filter(w => w.userId !== userId).map(w => w.username) : [],
    loverPartner: player?.linkedPartner ? getPlayerByUserId(room, player.linkedPartner)?.username ?? null : null,
    timerEnd: room.timerEnd,
    votes: room.phase === 'voting' ? Object.fromEntries(room.votes) : {},
  }
}

function sendRoomStateToAll(room: RoomData) {
  for (const [userId, player] of room.players) {
    emitToPlayer(player, 'room-state', buildRoomStateForPlayer(room, userId))
  }
}

function getPlayerByUserId(room: RoomData, userId: string): PlayerData | undefined {
  return room.players.get(userId)
}

function checkWinCondition(room: RoomData): 'werewolf' | 'villager' | 'lovers' | null {
  const alive = getAlivePlayers(room)
  // Lovers (classic Cupid): both alive AND everyone else dead
  if (room.cupidPair) {
    const [a, b] = room.cupidPair
    const bothAlive = alive.some(p => p.userId === a) && alive.some(p => p.userId === b)
    if (bothAlive && alive.length === 2) return 'lovers'
  }
  const wolves = alive.filter(p => WOLF_ROLES.includes(p.role as Role))
  const villagers = alive.filter(p => !WOLF_ROLES.includes(p.role as Role))
  if (wolves.length === 0) return 'villager'
  if (wolves.length >= villagers.length) return 'werewolf'
  return null
}

// ============================================================
// Lover chain-death (Cupid): when one linked player dies, the partner dies too.
// Returns the usernames additionally killed by the chain.
// ============================================================
function applyLoverChainDeaths(room: RoomData, justDiedIds: string[]): string[] {
  const chained: string[] = []
  for (const deadId of justDiedIds) {
    const dead = getPlayerByUserId(room, deadId)
    const partnerId = dead?.linkedPartner
    if (!partnerId) continue
    const partner = getPlayerByUserId(room, partnerId)
    if (partner?.isAlive) {
      partner.isAlive = false
      chained.push(partner.username)
    }
  }
  return chained
}

// ============================================================
// Cupid auto-pair (fires on night-1 timeout if cupid didn't pick)
// Links 2 random alive non-cupid players bidirectionally.
// ============================================================
function autoPairLovers(room: RoomData): boolean {
  if (room.cupidDone) return false
  const cupid = Array.from(room.players.values()).find(p => p.role === 'cupid')
  if (!cupid) return false
  const candidates = getAlivePlayers(room).filter(p => p.userId !== cupid.userId)
  if (candidates.length < 2) return false
  // pick 2 random distinct players
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const [a, b] = shuffled
  a.linkedPartner = b.userId
  b.linkedPartner = a.userId
  room.cupidPair = [a.userId, b.userId]
  room.cupidDone = true
  return true
}

// ============================================================
// Night Resolution
// ============================================================
function resolveNight(room: RoomData) {
  room.phase = 'night_resolve'
  sendRoomStateToAll(room)
  emitToRoom(room, 'phase-announce', { phase: 'night_resolve', label: 'Đang giải quyết...' })

  startPhaseTimer(room, 3000, () => {
    const actions = room.nightActions
    const bitten: Set<string> = new Set()
    const protected_: Set<string> = new Set()
    const poisoned: Set<string> = new Set()
    let saved = false

    // 1. Guard
    const guardAction = actions.find(a => a.actionType === 'guard_protect')
    if (guardAction?.targetId) protected_.add(guardAction.targetId)

    // 2. Wolf bite
    const wolfBite = actions.find(a => a.actionType === 'wolf_bite')
    if (wolfBite?.targetId) bitten.add(wolfBite.targetId)

    // 3. Witch save
    const witchSave = actions.find(a => a.actionType === 'witch_save')
    if (witchSave && bitten.size > 0) { saved = true; bitten.clear() }

    // 4. Witch poison
    const witchPoison = actions.find(a => a.actionType === 'witch_poison')
    if (witchPoison?.targetId) poisoned.add(witchPoison.targetId)

    // 5. Cupid auto-pair (night 1 only, if cupid never acted)
    if (room.dayCount === 0 && !room.cupidDone) autoPairLovers(room)

    // 6. Deaths
    const deaths: string[] = []
    for (const pid of bitten) { if (!protected_.has(pid)) deaths.push(pid) }
    for (const pid of poisoned) deaths.push(pid)

    const deadPlayers: string[] = []
    for (const userId of deaths) {
      const player = getPlayerByUserId(room, userId)
      if (player?.isAlive) { player.isAlive = false; deadPlayers.push(player.username) }
    }

    // 7. Lover chain-death: a linked player dying drags the partner down
    if (deaths.length > 0) {
      const chained = applyLoverChainDeaths(room, deaths)
      deadPlayers.push(...chained)
      // chained deaths can themselves be a hunter → recheck below
      deaths.push(...chained
        .map(name => Array.from(room.players.values()).find(p => p.username === name)?.userId)
        .filter((u): u is string => !!u))
    }

    // Hunter check
    const deadHunter = deadPlayers.length > 0
      ? Array.from(room.players.values()).find(p => p.role === 'hunter' && !p.isAlive && deaths.includes(p.userId))
      : undefined

    room.dayCount++
    room.phase = 'day'
    room.nightActions = []
    room.lastGuardTarget = guardAction?.targetId || null

    sendRoomStateToAll(room)
    emitToRoom(room, 'day-announce', { dayCount: room.dayCount, deaths: deadPlayers, saved })
    emitToRoom(room, 'phase-announce', { phase: 'day', label: `Ngày ${room.dayCount}` })

    if (deadHunter) {
      emitToPlayer(deadHunter, 'hunter-trigger', { message: 'Bạn đã chết! Hãy chọn người để bắn.' })
      startPhaseTimer(room, 15000, () => startDayDiscussion(room))
    } else {
      const win = checkWinCondition(room)
      if (win) { endGame(room, win); return }
      startDayDiscussion(room)
    }
  })
}

function startDayDiscussion(room: RoomData) {
  room.phase = 'day'
  sendRoomStateToAll(room)
  emitToRoom(room, 'phase-announce', { phase: 'day', label: `Ngày ${room.dayCount} - Thảo Luận` })

  if (room.hostMode === 'auto' || room.hostMode === 'hybrid') {
    startPhaseTimer(room, 90000, () => startVoting(room))
  }
}

// ============================================================
// Voting
// ============================================================
function startVoting(room: RoomData) {
  room.phase = 'voting'
  room.votes = new Map()
  sendRoomStateToAll(room)
  emitToRoom(room, 'phase-announce', { phase: 'voting', label: 'Bỏ Phiếu' })

  if (room.hostMode === 'auto' || room.hostMode === 'hybrid') {
    startPhaseTimer(room, 30000, () => resolveVotes(room))
  }
}

function resolveVotes(room: RoomData) {
  room.phase = 'vote_result'
  sendRoomStateToAll(room)

  const voteCounts: Map<string, number> = new Map()
  for (const [, targetId] of room.votes) {
    if (targetId) voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1)
  }

  let maxVotes = 0
  const candidates: string[] = []
  for (const [targetId, count] of voteCounts) {
    if (count > maxVotes) { maxVotes = count; candidates.length = 0; candidates.push(targetId) }
    else if (count === maxVotes) candidates.push(targetId)
  }

  let eliminated: string | null = null
  let chainedNames: string[] = []
  if (candidates.length === 1 && maxVotes > 0) {
    eliminated = candidates[0]
    const player = getPlayerByUserId(room, eliminated)
    if (player) {
      player.isAlive = false
      chainedNames = applyLoverChainDeaths(room, [eliminated])
      emitToRoom(room, 'vote-result', {
        eliminated: player.username, chainedDeaths: chainedNames,
        voteCounts: Object.fromEntries(voteCounts), isTie: false,
      })
    }
  } else {
    emitToRoom(room, 'vote-result', { eliminated: null, voteCounts: Object.fromEntries(voteCounts), isTie: true })
  }

  sendRoomStateToAll(room)

  startPhaseTimer(room, 8000, () => {
    if (eliminated) {
      const player = getPlayerByUserId(room, eliminated)
      if (player?.role === 'hunter') {
        emitToPlayer(player, 'hunter-trigger', { message: 'Bạn bị loại! Hãy bắn 1 người.' })
        startPhaseTimer(room, 15000, () => startNight(room))
        return
      }
    }
    const win = checkWinCondition(room)
    if (win) { endGame(room, win); return }
    startNight(room)
  })
}

// ============================================================
// Night Phase
// ============================================================
function startNight(room: RoomData) {
  room.phase = 'night'
  room.nightActions = []
  sendRoomStateToAll(room)
  emitToRoom(room, 'phase-announce', { phase: 'night', label: `Đêm ${room.dayCount + 1}` })

  if (room.hostMode === 'auto') runNightSequence(room)
}

function runNightSequence(room: RoomData) {
  clearRoomTimer(room)
  if (!room.nightTimeouts) room.nightTimeouts = []
  const alive = getAlivePlayers(room)
  const hasCupid = room.dayCount === 0 && alive.some(p => p.role === 'cupid') && !room.cupidDone
  const hasGuard = alive.some(p => p.role === 'guard')
  const hasWolves = alive.some(p => WOLF_ROLES.includes(p.role as Role))
  const hasSeer = alive.some(p => p.role === 'seer')
  const hasWitch = alive.some(p => p.role === 'witch')

  const sequence: { roles: Role[]; action: ActionType; duration: number; label: string }[] = []
  if (hasCupid) sequence.push({ roles: ['cupid'], action: 'cupid_link', duration: 15000, label: 'Cúp Đôi Tỉnh Dậy' })
  if (hasGuard) sequence.push({ roles: ['guard'], action: 'guard_protect', duration: 15000, label: 'Bảo Vệ Tỉnh Dậy' })
  if (hasWolves) sequence.push({ roles: WOLF_ROLES, action: 'wolf_bite', duration: 30000, label: 'Sói Tỉnh Dậy' })
  if (hasSeer) sequence.push({ roles: ['seer'], action: 'seer_check', duration: 15000, label: 'Tiên Tri Tỉnh Dậy' })
  if (hasWitch) sequence.push({ roles: ['witch'], action: 'witch_save', duration: 20000, label: 'Phù Thủy Tỉnh Dậy' })

  let delay = 1500
  for (const step of sequence) {
    const t = setTimeout(() => {
      if (room.status !== 'playing') return
      const bittenTarget = step.action === 'witch_save'
        ? room.nightActions.find(a => a.actionType === 'wolf_bite')?.targetId
        : undefined
      emitToRole(room, step.roles, 'night-wake', {
        actionType: step.action, label: step.label,
        duration: step.duration / 1000,
        bittenPlayer: bittenTarget,
      })
      emitToRoom(room, 'phase-announce', { phase: 'night', label: step.label })
    }, delay)
    room.nightTimeouts.push(t)
    delay += step.duration
  }

  const resolveT = setTimeout(() => {
    if (room.status !== 'playing') return
    resolveNight(room)
  }, delay + 2000)
  room.nightTimeouts.push(resolveT)
}

// ============================================================
// Game Flow
// ============================================================
function startGame(room: RoomData) {
  const players = Array.from(room.players.values())
  const totalPlayers = players.length
  const specialCount = room.config.werewolf + room.config.white_werewolf + room.config.seer +
    room.config.witch + room.config.guard + room.config.hunter + room.config.cupid

  if (specialCount > totalPlayers) { emitToRoom(room, 'error', { message: 'Quá nhiều vai trò đặc biệt!' }); return }
  if (totalPlayers < 4) { emitToRoom(room, 'error', { message: 'Cần ít nhất 4 người!' }); return }

  room.config.villager = totalPlayers - specialCount
  const roles = generateRoleList(room.config, totalPlayers)
  players.forEach((p, i) => {
    p.role = roles[i]; p.isAlive = true; p.isReady = false; p.seatIndex = i
    p.witchSaveUsed = false; p.witchPoisonUsed = false
  })

  room.status = 'playing'; room.phase = 'role_reveal'; room.dayCount = 0
  room.nightActions = []; room.votes = new Map(); room.cupidDone = false; room.cupidPair = null; room.lastGuardTarget = null; room.nightTimeouts = []

  sendRoomStateToAll(room)
  emitToRoom(room, 'phase-announce', { phase: 'role_reveal', label: 'Lật Bài Nhận Vai' })

  startPhaseTimer(room, 10000, () => startNight(room))
}

function endGame(room: RoomData, winner: 'werewolf' | 'villager' | 'lovers') {
  room.phase = 'game_over'; room.status = 'finished'
  clearRoomTimer(room)
  sendRoomStateToAll(room)
  emitToRoom(room, 'game-over', {
    winner,
    players: Array.from(room.players.values()).map(p => ({
      username: p.username, role: p.role, isAlive: p.isAlive,
    })),
  })
}

// ============================================================
// Socket Handler
// ============================================================
// Every handler asserts that the claimed userId matches the socket's
// verified identity (set during `auth`), so a client cannot impersonate
// another player by spoofing the userId field.
function socketUserId(socket: any): string | undefined {
  return socketUserMap.get(socket.id)
}

io.on('connection', (socket) => {
  console.log(`[CONNECT] ${socket.id}`)

  socket.on('auth', async (data: { idToken: string; displayName: string }) => {
    const { idToken, displayName } = data
    // Establish identity from the verified Firebase token, never from client input.
    const decoded = await verifyIdToken(idToken)
    if (!decoded) {
      socket.emit('auth-error', { message: 'Token không hợp lệ hoặc đã hết hạn.' })
      return
    }
    const userId = decoded.uid
    const username = (displayName && displayName.trim())
      || decoded.email?.split('@')[0]
      || 'Người chơi'
    socketUserMap.set(socket.id, userId)

    // Reconnect check — restore the player's previous room, if any.
    const existingCode = userRoomMap.get(userId)
    if (existingCode) {
      const room = getRoom(existingCode)
      if (room) {
        const player = room.players.get(userId)
        if (player) {
          player.socketId = socket.id
          emitToPlayer(player, 'room-state', buildRoomStateForPlayer(room, userId))
          emitToRoom(room, 'system-message', { content: `${username} đã kết nối lại`, msgType: 'system' })
          socket.emit('auth-ok', { userId, username })
          return
        }
      }
    }
    socket.emit('auth-ok', { userId, username })
  })

  socket.on('create-room', (data: { userId: string; username: string; config?: RoleConfig; hostMode?: HostMode }) => {
    const { userId, username, config, hostMode } = data
    if (userId !== socketUserId(socket)) return
    let code = generateRoomCode()
    while (rooms.has(code)) code = generateRoomCode()

    const player: PlayerData = {
      id: nanoid(), userId, username, role: '', isAlive: true, isReady: false,
      seatIndex: 0, socketId: socket.id, witchSaveUsed: false, witchPoisonUsed: false,
    }

    const room: RoomData = {
      id: nanoid(), code, hostId: userId, status: 'waiting', phase: 'lobby',
      dayCount: 0, hostMode: hostMode || 'auto', hostIsPlayer: false,
      players: new Map([[userId, player]]),
      config: config || { werewolf: 2, white_werewolf: 0, seer: 1, witch: 1, guard: 1, hunter: 0, cupid: 0, villager: 0 },
      nightActions: [], votes: new Map(), timer: null, timerEnd: null,
      cupidDone: false, cupidPair: null, lastGuardTarget: null, nightTimeouts: [],
    }

    rooms.set(code, room)
    userRoomMap.set(userId, code)
    emitToPlayer(player, 'room-joined', { room: buildRoomStateForPlayer(room, userId) })
    console.log(`[ROOM] ${code} created by ${username}`)
  })

  socket.on('join-room', (data: { code: string; userId: string; username: string }) => {
    const { code, userId, username } = data
    if (userId !== socketUserId(socket)) return
    const roomCode = normalizeRoomCode(code)
    console.log(`[JOIN-ROOM] code=${roomCode} userId=${userId} username=${username}`)
    const room = getRoom(roomCode)

    if (!room) { socket.emit('error', { message: 'Phòng không tồn tại!' }); return }

    // Reconnect
    if (room.players.has(userId)) {
      const player = room.players.get(userId)!
      player.socketId = socket.id
      socketUserMap.set(socket.id, userId)
      emitToPlayer(player, 'room-state', buildRoomStateForPlayer(room, userId))
      emitToRoom(room, 'system-message', { content: `${username} đã kết nối lại`, msgType: 'system' })
      return
    }

    if (room.status !== 'waiting') { socket.emit('error', { message: 'Trò chơi đã bắt đầu!' }); return }
    if (room.players.size >= 20) { socket.emit('error', { message: 'Phòng đã đầy!' }); return }

    const player: PlayerData = {
      id: nanoid(), userId, username, role: '', isAlive: true, isReady: false,
      seatIndex: room.players.size, socketId: socket.id, witchSaveUsed: false, witchPoisonUsed: false,
    }

    room.players.set(userId, player)
    userRoomMap.set(userId, room.code)
    socketUserMap.set(socket.id, userId)
    sendRoomStateToAll(room)
    emitToRoom(room, 'system-message', { content: `${username} đã tham gia phòng`, msgType: 'system' })
    emitToPlayer(player, 'room-joined', { room: buildRoomStateForPlayer(room, userId) })
  })

  socket.on('player-ready', (data: { code: string; userId: string; ready: boolean }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room) return
    const player = room.players.get(data.userId)
    if (player) { player.isReady = data.ready; sendRoomStateToAll(room) }
  })

  socket.on('start-game', (data: { code: string; userId: string }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.hostId !== data.userId) return
    if (room.players.size < 4) { emitToRoom(room, 'error', { message: 'Cần ít nhất 4 người!' }); return }
    startGame(room)
  })

  socket.on('host-next-phase', (data: { code: string; userId: string }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.hostId !== data.userId) return
    clearRoomTimer(room)
    switch (room.phase) {
      case 'role_reveal': startNight(room); break
      case 'night': resolveNight(room); break
      case 'day': startVoting(room); break
      case 'voting': resolveVotes(room); break
      case 'vote_result': startNight(room); break
    }
  })

  socket.on('cupid-link', (data: { code: string; userId: string; targetIds: [string, string] }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.phase !== 'night') return
    if (room.cupidDone) return
    const cupid = getPlayerByUserId(room, data.userId)
    if (!cupid || cupid.role !== 'cupid' || !cupid.isAlive) return
    const [idA, idB] = data.targetIds
    if (!idA || !idB || idA === idB) return
    const a = getPlayerByUserId(room, idA)
    const b = getPlayerByUserId(room, idB)
    if (!a || !b || !a.isAlive || !b.isAlive) return
    // Cupid cannot link themselves
    if (a.userId === cupid.userId || b.userId === cupid.userId) return
    a.linkedPartner = b.userId
    b.linkedPartner = a.userId
    room.cupidPair = [a.userId, b.userId]
    room.cupidDone = true
    emitToPlayer(cupid, 'cupid-linked', { pair: [a.username, b.username] })
    sendRoomStateToAll(room)
  })

  socket.on('night-action', (data: { code: string; userId: string; actionType: ActionType; targetId: string | null }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.phase !== 'night') return
    const player = getPlayerByUserId(room, data.userId)
    if (!player || !player.isAlive) return

    const role = player.role as Role
    switch (data.actionType) {
      case 'wolf_bite':
        if (!WOLF_ROLES.includes(role)) return
        room.nightActions = room.nightActions.filter(a =>
          !(a.actionType === 'wolf_bite' && WOLF_ROLES.includes(getPlayerByUserId(room, a.actorId)?.role as Role ?? ''))
        )
        if (data.targetId) room.nightActions.push({ actorId: data.userId, actionType: 'wolf_bite', targetId: data.targetId })
        break
      case 'seer_check':
        if (role !== 'seer') return
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'seer_check' && a.actorId === data.userId))
        if (data.targetId) {
          room.nightActions.push({ actorId: data.userId, actionType: 'seer_check', targetId: data.targetId })
          const target = getPlayerByUserId(room, data.targetId)
          if (target) {
            emitToPlayer(player, 'seer-result', { targetName: target.username, isWolf: WOLF_ROLES.includes(target.role as Role) })
          }
        }
        break
      case 'witch_save':
        if (role !== 'witch' || player.witchSaveUsed) return
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'witch_save' && a.actorId === data.userId))
        if (data.targetId) { room.nightActions.push({ actorId: data.userId, actionType: 'witch_save', targetId: data.targetId }); player.witchSaveUsed = true }
        break
      case 'witch_poison':
        if (role !== 'witch' || player.witchPoisonUsed) return
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'witch_poison' && a.actorId === data.userId))
        if (data.targetId) { room.nightActions.push({ actorId: data.userId, actionType: 'witch_poison', targetId: data.targetId }); player.witchPoisonUsed = true }
        break
      case 'guard_protect':
        if (role !== 'guard') return
        if (data.targetId === room.lastGuardTarget) return
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'guard_protect' && a.actorId === data.userId))
        if (data.targetId) room.nightActions.push({ actorId: data.userId, actionType: 'guard_protect', targetId: data.targetId })
        break
    }
    sendRoomStateToAll(room)
  })

  socket.on('submit-vote', (data: { code: string; userId: string; targetId: string | null }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.phase !== 'voting') return
    const player = getPlayerByUserId(room, data.userId)
    if (!player || !player.isAlive) return
    room.votes.set(data.userId, data.targetId || '')
    sendRoomStateToAll(room)
  })

  socket.on('hunter-shoot', (data: { code: string; userId: string; targetId: string }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room) return
    const player = getPlayerByUserId(room, data.userId)
    if (!player || player.role !== 'hunter') return
    const target = getPlayerByUserId(room, data.targetId)
    if (target?.isAlive) {
      target.isAlive = false
      const chained = applyLoverChainDeaths(room, [target.userId])
      emitToRoom(room, 'hunter-shot', { hunterName: player.username, targetName: target.username, chainedDeaths: chained })
      sendRoomStateToAll(room)
      const win = checkWinCondition(room)
      if (win) endGame(room, win)
      else if (room.phase === 'night_resolve' || room.phase === 'night') startDayDiscussion(room)
      else startNight(room)
    }
  })

  socket.on('send-message', (data: { code: string; userId: string; content: string; msgType?: string }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room) return
    const player = getPlayerByUserId(room, data.userId)
    if (!player) return
    const msgType = data.msgType || 'public'
    const msg = {
      id: nanoid(), senderId: data.userId, senderName: player.username,
      content: data.content, msgType, phase: room.phase, createdAt: new Date().toISOString(),
    }
    if (msgType === 'wolf') emitToRole(room, WOLF_ROLES, 'chat-message', msg)
    else if (msgType === 'dead') emitToDead(room, 'chat-message', msg)
    else emitToRoom(room, 'chat-message', msg)
  })

  socket.on('kick-player', (data: { code: string; userId: string; targetUserId: string }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.hostId !== data.userId || data.targetUserId === data.userId) return
    const target = room.players.get(data.targetUserId)
    if (target) {
      room.players.delete(data.targetUserId)
      userRoomMap.delete(data.targetUserId)
      emitToPlayer(target, 'kicked', { message: 'Bạn bị kick!' })
      sendRoomStateToAll(room)
      emitToRoom(room, 'system-message', { content: `${target.username} đã bị kick`, msgType: 'system' })
    }
  })

  socket.on('update-config', (data: { code: string; userId: string; config: Partial<RoleConfig> }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room || room.hostId !== data.userId || room.status !== 'waiting') return
    Object.assign(room.config, data.config)
    sendRoomStateToAll(room)
  })

  socket.on('leave-room', (data: { code: string; userId: string }) => {
    if (data.userId !== socketUserId(socket)) return
    const room = getRoom(data.code)
    if (!room) return
    const player = room.players.get(data.userId)
    if (player) {
      room.players.delete(data.userId)
      userRoomMap.delete(data.userId)
      if (room.players.size === 0) { deleteRoom(data.code); clearRoomTimer(room) }
      else {
        if (room.hostId === data.userId) {
          const newHost = Array.from(room.players.values())[0]
          room.hostId = newHost.userId
          emitToRoom(room, 'host-changed', { newHost: newHost.username })
        }
        sendRoomStateToAll(room)
        emitToRoom(room, 'system-message', { content: `${player.username} đã rời phòng`, msgType: 'system' })
      }
    }
  })

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id)
    if (userId) { console.log(`[DISCONNECT] ${userId}`); socketUserMap.delete(socket.id) }
  })

  socket.on('error', (err) => { console.error(`[SOCKET ERROR] ${socket.id}:`, err) })
})

const PORT = 3003
httpServer.listen(PORT, () => console.log(`[GAME SERVER] Ma Sói Realtime on port ${PORT}`))

process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)) })
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)) })
