const { createServer } = require('http');
const { Server } = require('socket.io');
const { nanoid, customAlphabet } = require('nanoid');

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Types
const WOLF_ROLES = ['werewolf', 'white_werewolf'];
const rooms = new Map();
const userRoomMap = new Map();
const socketUserMap = new Map();
const generateRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

// Helpers
function getAlive(room) { return [...room.players.values()].filter(p => p.isAlive); }
function getByRole(room, role) {
  const roles = Array.isArray(role) ? role : [role];
  return [...room.players.values()].filter(p => roles.includes(p.role));
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function genRoles(config, total) {
  const r = [];
  r.push(...Array(config.werewolf).fill('werewolf'));
  r.push(...Array(config.white_werewolf).fill('white_werewolf'));
  r.push(...Array(config.seer).fill('seer'));
  r.push(...Array(config.witch).fill('witch'));
  r.push(...Array(config.guard).fill('guard'));
  r.push(...Array(config.hunter).fill('hunter'));
  r.push(...Array(config.cupid).fill('cupid'));
  const rem = total - r.length;
  if (rem > 0) r.push(...Array(rem).fill('villager'));
  return shuffle(r);
}
function clearTimer(room) { if (room.timer) { clearTimeout(room.timer); room.timer = null; room.timerEnd = null; } }
function startTimer(room, ms, cb) { clearTimer(room); room.timerEnd = Date.now() + ms; room.timer = setTimeout(() => { room.timer = null; room.timerEnd = null; cb(); }, ms); }
function emitRoom(room, ev, data) { [...room.players.values()].forEach(p => { if (p.socketId) io.to(p.socketId).emit(ev, data); }); }
function emitAlive(room, ev, data) { getAlive(room).forEach(p => { if (p.socketId) io.to(p.socketId).emit(ev, data); }); }
function emitDead(room, ev, data) { [...room.players.values()].filter(p => !p.isAlive).forEach(p => { if (p.socketId) io.to(p.socketId).emit(ev, data); }); }
function emitRole(room, role, ev, data) { getByRole(room, role).forEach(p => { if (p.socketId) io.to(p.socketId).emit(ev, data); }); }
function emitP(player, ev, data) { if (player.socketId) io.to(player.socketId).emit(ev, data); }
function getPlayer(room, uid) { return room.players.get(uid); }
function buildState(room, uid) {
  const p = room.players.get(uid);
  const isHost = room.hostId === uid;
  const wolves = getByRole(room, WOLF_ROLES);
  const isWolf = p && WOLF_ROLES.includes(p.role);
  return {
    id: room.id, code: room.code, hostId: room.hostId,
    status: room.status, phase: room.phase, dayCount: room.dayCount,
    hostMode: room.hostMode, hostIsPlayer: room.hostIsPlayer,
    config: room.config, isHost,
    myRole: p?.role || '', isAlive: p?.isAlive ?? true,
    players: [...room.players.values()].map(pp => ({
      id: pp.id, userId: pp.userId, username: pp.username,
      role: pp.userId === uid ? pp.role : '',
      isAlive: pp.isAlive, isReady: pp.isReady, seatIndex: pp.seatIndex,
    })),
    wolfPartners: isWolf ? wolves.filter(w => w.userId !== uid).map(w => w.username) : [],
    timerEnd: room.timerEnd,
    votes: room.phase === 'voting' ? Object.fromEntries(room.votes) : {},
  };
}
function sendAll(room) { [...room.players.entries()].forEach(([uid]) => { const p = room.players.get(uid); emitP(p, 'room-state', buildState(room, uid)); }); }
function checkWin(room) {
  const alive = getAlive(room);
  const wolves = alive.filter(p => WOLF_ROLES.includes(p.role));
  const villagers = alive.filter(p => !WOLF_ROLES.includes(p.role));
  if (wolves.length === 0) return 'villager';
  if (wolves.length >= villagers.length) return 'werewolf';
  return null;
}

// Night Resolution
function resolveNight(room) {
  room.phase = 'night_resolve';
  sendAll(room);
  emitRoom(room, 'phase-announce', { phase: 'night_resolve', label: 'Đang giải quyết...' });
  startTimer(room, 3000, () => {
    const actions = room.nightActions;
    const bitten = new Set(); const protected_ = new Set(); const poisoned = new Set();
    let saved = false;
    const guardAction = actions.find(a => a.actionType === 'guard_protect');
    if (guardAction?.targetId) protected_.add(guardAction.targetId);
    const wolfBite = actions.find(a => a.actionType === 'wolf_bite');
    if (wolfBite?.targetId) bitten.add(wolfBite.targetId);
    const witchSave = actions.find(a => a.actionType === 'witch_save');
    if (witchSave && bitten.size > 0) { saved = true; bitten.clear(); }
    const witchPoison = actions.find(a => a.actionType === 'witch_poison');
    if (witchPoison?.targetId) poisoned.add(witchPoison.targetId);
    const deaths = [];
    for (const pid of bitten) { if (!protected_.has(pid)) deaths.push(pid); }
    for (const pid of poisoned) deaths.push(pid);
    const deadNames = [];
    for (const uid of deaths) { const p = getPlayer(room, uid); if (p?.isAlive) { p.isAlive = false; deadNames.push(p.username); } }
    const deadHunter = deadNames.length > 0 ? [...room.players.values()].find(p => p.role === 'hunter' && !p.isAlive && deaths.includes(p.userId)) : undefined;
    room.dayCount++;
    room.phase = 'day';
    room.nightActions = [];
    room.lastGuardTarget = guardAction?.targetId || null;
    sendAll(room);
    emitRoom(room, 'day-announce', { dayCount: room.dayCount, deaths: deadNames, saved });
    emitRoom(room, 'phase-announce', { phase: 'day', label: 'Ngày ' + room.dayCount });
    if (deadHunter) {
      emitP(deadHunter, 'hunter-trigger', { message: 'Bạn đã chết! Hãy chọn người để bắn.' });
      startTimer(room, 15000, () => startDay(room));
    } else {
      const win = checkWin(room); if (win) { endGame(room, win); return; }
      startDay(room);
    }
  });
}
function startDay(room) {
  room.phase = 'day'; sendAll(room);
  emitRoom(room, 'phase-announce', { phase: 'day', label: 'Ngày ' + room.dayCount + ' - Thảo Luận' });
  if (room.hostMode === 'auto' || room.hostMode === 'hybrid') startTimer(room, 90000, () => startVoting(room));
}
function startVoting(room) {
  room.phase = 'voting'; room.votes = new Map(); sendAll(room);
  emitRoom(room, 'phase-announce', { phase: 'voting', label: 'Bỏ Phiếu' });
  if (room.hostMode === 'auto' || room.hostMode === 'hybrid') startTimer(room, 30000, () => resolveVotes(room));
}
function resolveVotes(room) {
  room.phase = 'vote_result'; sendAll(room);
  const voteCounts = new Map();
  for (const [, tid] of room.votes) { if (tid) voteCounts.set(tid, (voteCounts.get(tid) || 0) + 1); }
  let max = 0; const cands = [];
  for (const [tid, cnt] of voteCounts) {
    if (cnt > max) { max = cnt; cands.length = 0; cands.push(tid); }
    else if (cnt === max) cands.push(tid);
  }
  let eliminated = null;
  if (cands.length === 1 && max > 0) {
    eliminated = cands[0];
    const p = getPlayer(room, eliminated);
    if (p) { p.isAlive = false; emitRoom(room, 'vote-result', { eliminated: p.username, voteCounts: Object.fromEntries(voteCounts), isTie: false }); }
  } else {
    emitRoom(room, 'vote-result', { eliminated: null, voteCounts: Object.fromEntries(voteCounts), isTie: true });
  }
  sendAll(room);
  startTimer(room, 8000, () => {
    if (eliminated) {
      const p = getPlayer(room, eliminated);
      if (p?.role === 'hunter') {
        emitP(p, 'hunter-trigger', {});
        startTimer(room, 15000, () => startNight(room));
        return;
      }
    }
    const win = checkWin(room); if (win) { endGame(room, win); return; }
    startNight(room);
  });
}
function startNight(room) {
  room.phase = 'night'; room.nightActions = []; sendAll(room);
  emitRoom(room, 'phase-announce', { phase: 'night', label: 'Đêm ' + (room.dayCount + 1) });
  if (room.hostMode === 'auto') runNightSeq(room);
}
function runNightSeq(room) {
  const alive = getAlive(room);
  const hasGuard = alive.some(p => p.role === 'guard');
  const hasWolves = alive.some(p => WOLF_ROLES.includes(p.role));
  const hasSeer = alive.some(p => p.role === 'seer');
  const hasWitch = alive.some(p => p.role === 'witch');
  const seq = [];
  if (hasGuard) seq.push({ roles: ['guard'], action: 'guard_protect', dur: 15000, label: 'Bảo Vệ Tỉnh Dậy' });
  if (hasWolves) seq.push({ roles: WOLF_ROLES, action: 'wolf_bite', dur: 30000, label: 'Sói Tỉnh Dậy' });
  if (hasSeer) seq.push({ roles: ['seer'], action: 'seer_check', dur: 15000, label: 'Tiên Tri Tỉnh Dậy' });
  if (hasWitch) seq.push({ roles: ['witch'], action: 'witch_save', dur: 20000, label: 'Phù Thủy Tỉnh Dậy' });
  let delay = 1500;
  for (const step of seq) {
    setTimeout(() => {
      if (room.status !== 'playing') return;
      const bittenTarget = step.action === 'witch_save' ? room.nightActions.find(a => a.actionType === 'wolf_bite')?.targetId : undefined;
      emitRole(room, step.roles, 'night-wake', { actionType: step.action, label: step.label, duration: step.dur / 1000, bittenPlayer: bittenTarget });
      emitRoom(room, 'phase-announce', { phase: 'night', label: step.label });
    }, delay);
    delay += step.dur;
  }
  setTimeout(() => { if (room.status === 'playing') resolveNight(room); }, delay + 2000);
}
function startGame(room) {
  const players = [...room.players.values()];
  const total = players.length;
  const special = room.config.werewolf + room.config.white_werewolf + room.config.seer + room.config.witch + room.config.guard + room.config.hunter + room.config.cupid;
  if (special > total || total < 4) { emitRoom(room, 'error', { message: 'Cần ít nhất 4 người!' }); return; }
  room.config.villager = total - special;
  const roles = genRoles(room.config, total);
  players.forEach((p, i) => { p.role = roles[i]; p.isAlive = true; p.isReady = false; p.seatIndex = i; p.witchSaveUsed = false; p.witchPoisonUsed = false; });
  room.status = 'playing'; room.phase = 'role_reveal'; room.dayCount = 0;
  room.nightActions = []; room.votes = new Map(); room.cupidDone = false; room.lastGuardTarget = null;
  sendAll(room);
  emitRoom(room, 'phase-announce', { phase: 'role_reveal', label: 'Lật Bài Nhận Vai' });
  startTimer(room, 10000, () => startNight(room));
}
function endGame(room, winner) {
  room.phase = 'game_over'; room.status = 'finished'; clearTimer(room); sendAll(room);
  emitRoom(room, 'game-over', { winner, players: [...room.players.values()].map(p => ({ username: p.username, role: p.role, isAlive: p.isAlive })) });
}

// Socket Handler
io.on('connection', (socket) => {
  console.log('[CONNECT]', socket.id);
  socket.on('auth', (data) => {
    const { userId, username } = data;
    socketUserMap.set(socket.id, userId);
    const existingCode = userRoomMap.get(userId);
    if (existingCode) {
      const room = rooms.get(existingCode);
      if (room) {
        const player = room.players.get(userId);
        if (player) { player.socketId = socket.id; emitP(player, 'room-state', buildState(room, userId)); return; }
      }
    }
    socket.emit('auth-ok', { userId, username });
  });

  socket.on('create-room', (data) => {
    const { userId, username, config, hostMode } = data;
    let code = generateRoomCode();
    while (rooms.has(code)) code = generateRoomCode();
    const player = { id: nanoid(), userId, username, role: '', isAlive: true, isReady: false, seatIndex: 0, socketId: socket.id, witchSaveUsed: false, witchPoisonUsed: false };
    const room = {
      id: nanoid(), code, hostId: userId, status: 'waiting', phase: 'lobby', dayCount: 0,
      hostMode: hostMode || 'auto', hostIsPlayer: false,
      players: new Map([[userId, player]]),
      config: config || { werewolf: 2, white_werewolf: 0, seer: 1, witch: 1, guard: 1, hunter: 0, cupid: 0, villager: 0 },
      nightActions: [], votes: new Map(), timer: null, timerEnd: null, cupidDone: false, lastGuardTarget: null,
    };
    rooms.set(code, room);
    userRoomMap.set(userId, code);
    emitP(player, 'room-joined', { room: buildState(room, userId) });
    console.log('[ROOM]', code, 'by', username);
  });

  socket.on('join-room', (data) => {
    const { code, userId, username } = data;
    const room = rooms.get(code.toUpperCase());
    if (!room) { socket.emit('error', { message: 'Phòng không tồn tại!' }); return; }
    if (room.players.has(userId)) {
      const player = room.players.get(userId);
      player.socketId = socket.id;
      socketUserMap.set(socket.id, userId);
      emitP(player, 'room-state', buildState(room, userId));
      emitRoom(room, 'system-message', { content: username + ' đã kết nối lại', msgType: 'system' });
      return;
    }
    if (room.status !== 'waiting') { socket.emit('error', { message: 'Trò chơi đã bắt đầu!' }); return; }
    if (room.players.size >= 20) { socket.emit('error', { message: 'Phòng đã đầy!' }); return; }
    const player = { id: nanoid(), userId, username, role: '', isAlive: true, isReady: false, seatIndex: room.players.size, socketId: socket.id, witchSaveUsed: false, witchPoisonUsed: false };
    room.players.set(userId, player);
    userRoomMap.set(userId, code);
    socketUserMap.set(socket.id, userId);
    sendAll(room);
    emitRoom(room, 'system-message', { content: username + ' đã tham gia phòng', msgType: 'system' });
    console.log('[JOIN]', username, '->', code);
  });

  socket.on('player-ready', (data) => {
    const room = rooms.get(data.code); if (!room) return;
    const player = room.players.get(data.userId);
    if (player) { player.isReady = data.ready; sendAll(room); }
  });

  socket.on('start-game', (data) => {
    const room = rooms.get(data.code); if (!room || room.hostId !== data.userId) return;
    if (room.players.size < 4) { emitRoom(room, 'error', { message: 'Cần ít nhất 4 người!' }); return; }
    startGame(room);
  });

  socket.on('host-next-phase', (data) => {
    const room = rooms.get(data.code); if (!room || room.hostId !== data.userId) return;
    clearTimer(room);
    switch (room.phase) {
      case 'role_reveal': startNight(room); break;
      case 'night': resolveNight(room); break;
      case 'day': startVoting(room); break;
      case 'voting': resolveVotes(room); break;
      case 'vote_result': startNight(room); break;
    }
  });

  socket.on('night-action', (data) => {
    const room = rooms.get(data.code); if (!room || room.phase !== 'night') return;
    const player = getPlayer(room, data.userId); if (!player || !player.isAlive) return;
    const role = player.role;
    switch (data.actionType) {
      case 'wolf_bite':
        if (!WOLF_ROLES.includes(role)) return;
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'wolf_bite' && WOLF_ROLES.includes(getPlayer(room, a.actorId)?.role || '')));
        if (data.targetId) room.nightActions.push({ actorId: data.userId, actionType: 'wolf_bite', targetId: data.targetId });
        break;
      case 'seer_check':
        if (role !== 'seer') return;
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'seer_check' && a.actorId === data.userId));
        if (data.targetId) {
          room.nightActions.push({ actorId: data.userId, actionType: 'seer_check', targetId: data.targetId });
          const target = getPlayer(room, data.targetId);
          if (target) emitP(player, 'seer-result', { targetName: target.username, isWolf: WOLF_ROLES.includes(target.role) });
        }
        break;
      case 'witch_save':
        if (role !== 'witch' || player.witchSaveUsed) return;
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'witch_save' && a.actorId === data.userId));
        if (data.targetId) { room.nightActions.push({ actorId: data.userId, actionType: 'witch_save', targetId: data.targetId }); player.witchSaveUsed = true; }
        break;
      case 'witch_poison':
        if (role !== 'witch' || player.witchPoisonUsed) return;
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'witch_poison' && a.actorId === data.userId));
        if (data.targetId) { room.nightActions.push({ actorId: data.userId, actionType: 'witch_poison', targetId: data.targetId }); player.witchPoisonUsed = true; }
        break;
      case 'guard_protect':
        if (role !== 'guard') return;
        if (data.targetId === room.lastGuardTarget) return;
        room.nightActions = room.nightActions.filter(a => !(a.actionType === 'guard_protect' && a.actorId === data.userId));
        if (data.targetId) room.nightActions.push({ actorId: data.userId, actionType: 'guard_protect', targetId: data.targetId });
        break;
    }
    sendAll(room);
  });

  socket.on('submit-vote', (data) => {
    const room = rooms.get(data.code); if (!room || room.phase !== 'voting') return;
    const player = getPlayer(room, data.userId); if (!player || !player.isAlive) return;
    room.votes.set(data.userId, data.targetId || '');
    sendAll(room);
  });

  socket.on('hunter-shoot', (data) => {
    const room = rooms.get(data.code); if (!room) return;
    const player = getPlayer(room, data.userId); if (!player || player.role !== 'hunter') return;
    const target = getPlayer(room, data.targetId);
    if (target?.isAlive) {
      target.isAlive = false;
      emitRoom(room, 'hunter-shot', { hunterName: player.username, targetName: target.username });
      sendAll(room);
      const win = checkWin(room); if (win) endGame(room, win);
      else if (room.phase === 'night_resolve' || room.phase === 'night') startDay(room);
      else startNight(room);
    }
  });

  socket.on('send-message', (data) => {
    const room = rooms.get(data.code); if (!room) return;
    const player = getPlayer(room, data.userId); if (!player) return;
    const msgType = data.msgType || 'public';
    const msg = { id: nanoid(), senderId: data.userId, senderName: player.username, content: data.content, msgType, phase: room.phase, createdAt: new Date().toISOString() };
    if (msgType === 'wolf') emitRole(room, WOLF_ROLES, 'chat-message', msg);
    else if (msgType === 'dead') emitDead(room, 'chat-message', msg);
    else emitRoom(room, 'chat-message', msg);
  });

  socket.on('kick-player', (data) => {
    const room = rooms.get(data.code); if (!room || room.hostId !== data.userId || data.targetUserId === data.userId) return;
    const target = room.players.get(data.targetUserId); if (target) {
      room.players.delete(data.targetUserId); userRoomMap.delete(data.targetUserId);
      emitP(target, 'kicked', { message: 'Bạn bị kick!' });
      sendAll(room);
      emitRoom(room, 'system-message', { content: target.username + ' đã bị kick', msgType: 'system' });
    }
  });

  socket.on('update-config', (data) => {
    const room = rooms.get(data.code); if (!room || room.hostId !== data.userId || room.status !== 'waiting') return;
    Object.assign(room.config, data.config);
    sendAll(room);
  });

  socket.on('leave-room', (data) => {
    const room = rooms.get(data.code); if (!room) return;
    const player = room.players.get(data.userId); if (player) {
      room.players.delete(data.userId); userRoomMap.delete(data.userId);
      if (room.players.size === 0) { rooms.delete(data.code); clearTimer(room); }
      else {
        if (room.hostId === data.userId) { const nh = [...room.players.values()][0]; room.hostId = nh.userId; emitRoom(room, 'host-changed', { newHost: nh.username }); }
        sendAll(room);
        emitRoom(room, 'system-message', { content: player.username + ' đã rời phòng', msgType: 'system' });
      }
    }
  });

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) { console.log('[DISCONNECT]', userId); socketUserMap.delete(socket.id); }
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => console.log('[GAME SERVER] Ma Sói Realtime on port', PORT));
process.on('SIGTERM', () => { httpServer.close(() => process.exit(0)); });
process.on('SIGINT', () => { httpServer.close(() => process.exit(0)); });
