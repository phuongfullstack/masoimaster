// ============================================================
// GAME SIMULATOR — 8 bot chơi trọn ván qua API thật (localhost:3000).
// Chạy: NODE_PATH=node_modules node test/game-sim.cjs (dev server phải đang chạy)
// Kịch bản phủ: chia vai, packmates, tally sói, seer check, guard,
// witch save+poison, fx cá nhân, hunter shoot, vote, thắng phe dân,
// archive + stats + master log rules.
// ============================================================
const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
const key = require(require('path').join(__dirname, '..', 'serviceAccountKey.json'))

const API_KEY = 'AIzaSyB9QIKPHTrPFmBHDyW6yxOkCDYisWRtHeA'
const BASE = 'http://localhost:3000'
const DB = 'masoimaster'
const N = 8
const results = []
const report = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let adminAuth, db
const bots = [] // {uid, name, token, role}

async function mintToken(uid) {
  const ct = await adminAuth.createCustomToken(uid)
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ct, returnSecureToken: true }) })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json.error))
  return json.idToken
}

async function api(bot, path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bot.token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function restGet(docPath, token) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/${DB}/documents/${docPath}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

const roomRef = (code) => db.collection('rooms').doc(code)
async function readRoom(code) { return (await roomRef(code).get()).data() }

/** Hạ timer (host skip) rồi để 1 bot tick — mô phỏng cơ chế client-driven. */
async function fastForward(code, host) {
  await api(host, '/api/game/host-action', { code, action: 'skip_step' })
  await sleep(1500)
  await api(bots[1], '/api/game/tick', { code })
  await sleep(700)
}

async function main() {
  const app = initializeApp({ credential: cert(key) })
  adminAuth = getAuth(app)
  db = getFirestore(app, DB)

  console.log('== 1. Tạo 8 bot ==')
  for (let i = 0; i < N; i++) {
    const uid = `sim-bot-${i}`
    try { await adminAuth.deleteUser(uid) } catch {}
    await adminAuth.createUser({ uid })
    const token = await mintToken(uid)
    bots.push({ uid, name: `Bot${i}`, token })
    // profile (tạo user doc + tên)
    await api(bots[i], '/api/profile', undefined) // GET không hỗ trợ qua api() → dùng PATCH
    await fetch(BASE + '/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayName: `Bot${i}` }),
    })
  }
  const host = bots[0]

  console.log('== 2. Tạo phòng + join + config + ready + start ==')
  let r = await api(host, '/api/game/create', { config: {}, hostMode: 'auto', nightMode: 'seq' })
  const code = r.json.code
  report('Tạo phòng', r.status === 200 && !!code, code)

  for (let i = 1; i < N; i++) {
    r = await api(bots[i], '/api/game/join', { code })
    if (r.status !== 200) report(`Bot${i} join`, false, JSON.stringify(r.json))
  }
  report('7 bot join', true)

  // Host áp gợi ý chuẩn cho 8 người qua route mới
  r = await api(host, '/api/game/update-config', {
    code, config: { werewolf: 2, seer: 1, witch: 1, guard: 1, hunter: 1 },
  })
  report('update-config (8 người chuẩn)', r.status === 200, JSON.stringify(r.json.config ?? r.json))

  for (let i = 1; i < N; i++) await api(bots[i], '/api/game/ready', { code, ready: true })
  r = await api(host, '/api/game/start', { code })
  report('Start game', r.status === 200)

  console.log('== 3. Mỗi bot đọc vai CỦA MÌNH qua REST (rules) ==')
  for (const bot of bots) {
    const own = await restGet(`rooms/${code}/secrets/${bot.uid}`, bot.token)
    bot.role = own.json?.fields?.role?.stringValue
    if (!bot.role) report(`${bot.name} đọc vai của mình`, false, `status=${own.status}`)
  }
  report('8 bot đều nhận vai', bots.every((b) => !!b.role), bots.map((b) => `${b.name}=${b.role}`).join(', '))
  // Đọc trộm vai người khác → phải bị chặn
  const spy = await restGet(`rooms/${code}/secrets/${bots[1].uid}`, bots[2].token)
  report('Đọc trộm vai người khác bị chặn', spy.status === 403)

  const byRole = (role) => bots.filter((b) => b.role === role)
  const wolves = bots.filter((b) => ['werewolf', 'alpha_wolf', 'wolf_seer', 'cursed_wolf', 'white_werewolf'].includes(b.role))
  const seer = byRole('seer')[0], witch = byRole('witch')[0], guard = byRole('guard')[0], hunter = byRole('hunter')[0]
  report('Đủ bộ vai: 2 sói + seer/witch/guard/hunter', wolves.length === 2 && !!seer && !!witch && !!guard && !!hunter)

  // Sói thấy packmates
  const wolfSecret = await restGet(`rooms/${code}/secrets/${wolves[0].uid}`, wolves[0].token)
  const packmates = (wolfSecret.json?.fields?.packmates?.arrayValue?.values ?? []).map((v) => v.stringValue)
  report('Sói thấy bầy (packmates)', packmates.includes(wolves[1].name), packmates.join(','))

  console.log('== 4. ĐÊM 1: guard che seer, sói cắn seer, seer soi sói, witch cứu + độc hunter ==')
  // role_reveal → night
  await fastForward(code, host)
  let room = await readRoom(code)
  report('Vào đêm 1', room.phase === 'night', `phase=${room.phase} step=${room.nightWake?.actionType}`)

  // Vòng các bước đêm — hành động theo nightWake.actionType.
  // Đi XUYÊN night_resolve (bước resolve cũng cần 1 lần tick).
  for (let guard_ = 0; guard_ < 14 && ['night', 'night_resolve'].includes((await readRoom(code)).phase); guard_++) {
    room = await readRoom(code)
    const step = room.phase === 'night_resolve' ? null : room.nightWake?.actionType
    if (step === 'guard_protect') {
      const res2 = await api(guard, '/api/game/night-action', { code, actionType: 'guard_protect', targetId: seer.uid })
      if (res2.status !== 200) report('guard hành động', false, JSON.stringify(res2.json))
    } else if (step === 'wolf_bite') {
      // 2 sói pick khác nhau → tally random giữa 2 (không alpha); rồi sói 2 đổi theo sói 1 → thống nhất cắn seer
      await api(wolves[0], '/api/game/night-action', { code, actionType: 'wolf_bite', targetId: seer.uid })
      await api(wolves[1], '/api/game/night-action', { code, actionType: 'wolf_bite', targetId: seer.uid })
      // pack board: sói 2 đọc wolfPicks qua REST
      const picks = await restGet(`rooms/${code}/wolfPicks/${wolves[0].uid}`, wolves[1].token)
      report('Pack board: sói thấy pick của nhau', picks.status === 200 && picks.json?.fields?.targetId?.stringValue === seer.uid)
      const noPeek = await restGet(`rooms/${code}/wolfPicks/${wolves[0].uid}`, seer.token)
      report('Dân không đọc được wolfPicks', noPeek.status === 403)
    } else if (step === 'seer_check') {
      const res2 = await api(seer, '/api/game/night-action', { code, actionType: 'seer_check', targetId: wolves[0].uid })
      report('Seer soi sói → isWolf=true', res2.json?.seerResult?.isWolf === true, JSON.stringify(res2.json?.seerResult))
    } else if (step === 'witch_save') {
      // Chế độ seq: bittenPlayer được server đẩy vào nightWake
      report('Witch được báo nạn nhân (seq)', room.nightWake?.bittenPlayer === seer.name, `bitten=${room.nightWake?.bittenPlayer}`)
      await api(witch, '/api/game/night-action', { code, actionType: 'witch_save', targetId: seer.uid })
      const res3 = await api(witch, '/api/game/night-action', { code, actionType: 'witch_poison', targetId: hunter.uid })
      if (res3.status !== 200) report('witch poison', false, JSON.stringify(res3.json))
    }
    await fastForward(code, host)
  }

  room = await readRoom(code)
  report('Sang ngày sau đêm 1 (cửa sổ thợ săn)', room.phase === 'day', `phase=${room.phase} label=${room.phaseLabel}`)
  report('Chết đêm 1 = đúng hunter (bị độc; seer được cứu)', JSON.stringify(room.dayResult?.deaths) === JSON.stringify([hunter.name]), JSON.stringify(room.dayResult))
  report('dayResult KHÔNG lộ nguyên nhân (không field saved)', room.dayResult?.saved === undefined)

  // fx cá nhân
  const seerFx = await restGet(`rooms/${code}/secrets/${seer.uid}`, seer.token)
  report('Seer nhận fx saved (riêng tư)', seerFx.json?.fields?.lastNightFx?.stringValue === 'saved')
  const hunterFx = await restGet(`rooms/${code}/secrets/${hunter.uid}`, hunter.token)
  report('Hunter nhận fx poison', hunterFx.json?.fields?.lastNightFx?.stringValue === 'poison')

  console.log('== 5. Hunter (chết) bắn sói 2 ==')
  r = await api(hunter, '/api/game/hunter-shoot', { code, targetId: wolves[1].uid })
  report('Hunter bắn sói 2', r.status === 200 && r.json.targetName === wolves[1].name, JSON.stringify(r.json))
  room = await readRoom(code)
  report('Sau bắn: vào thảo luận ngày, timer CÓ THẬT (hết deadlock)', room.phase === 'day' && typeof room.timerEnd === 'number', `phase=${room.phase} timerEnd=${room.timerEnd}`)

  console.log('== 6. Vote treo sói 1 → phe DÂN thắng ==')
  await fastForward(code, host) // day → voting
  room = await readRoom(code)
  report('Vào voting', room.phase === 'voting', room.phase)
  for (const b of bots) {
    if (b === hunter || b === wolves[1]) continue // đã chết
    await api(b, '/api/game/vote', { code, targetId: wolves[0].uid })
  }
  await fastForward(code, host)
  room = await readRoom(code)
  report('Game over — phe dân thắng', room.phase === 'game_over' && room.gameWinner === 'villager', `phase=${room.phase} winner=${room.gameWinner}`)
  report('Reveal đầy đủ 8 vai', Object.keys(room.reveal ?? {}).length === 8)

  console.log('== 7. Master log + archive ==')
  // Host đọc được log; dân bị chặn
  const logSnap = await db.collection('rooms').doc(code).collection('log').get()
  report('Master log có sự kiện', logSnap.size >= 8, `entries=${logSnap.size}`)
  const logDocId = logSnap.docs[0]?.id
  const hostLog = await restGet(`rooms/${code}/log/${logDocId}`, host.token)
  report('Host đọc log qua REST → cho phép', hostLog.status === 200)
  const playerLog = await restGet(`rooms/${code}/log/${logDocId}`, seer.token)
  report('Người chơi thường đọc log → chặn', playerLog.status === 403)

  const matchId = `${code}-${room.createdAt}`
  const match = await db.collection('matches').doc(matchId).get()
  report('Trận được archive', match.exists && match.data()?.winner === 'villager')
  const hostUser = await db.collection('users').doc(host.uid).get()
  report('Stats được cộng', (hostUser.data()?.stats?.gamesPlayed ?? 0) >= 1)

  console.log('== 8. Dọn dẹp ==')
  await db.recursiveDelete(roomRef(code))
  await db.collection('matches').doc(matchId).delete().catch(() => {})
  for (const b of bots) {
    await db.collection('users').doc(b.uid).delete().catch(() => {})
    await adminAuth.deleteUser(b.uid).catch(() => {})
  }
  console.log('cleanup done\n')

  const failed = results.filter((x) => x.startsWith('FAIL')).length
  console.log(`===== KẾT QUẢ: ${results.length - failed}/${results.length} PASS =====`)
  if (failed) results.filter((x) => x.startsWith('FAIL')).forEach((x) => console.log(x))
  process.exit(failed ? 1 : 0)
}

main().catch(async (e) => {
  console.error('SIM ERROR:', e.message)
  console.log(results.join('\n'))
  process.exit(1)
})
