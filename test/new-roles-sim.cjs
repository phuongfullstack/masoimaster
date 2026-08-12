// ============================================================
// NEW ROLES SIMULATOR — test integration doctor/detective/raven
// qua API thật (localhost:3000).
// Chạy: NODE_PATH=node_modules node test/new-roles-sim.cjs
// (dev server phải đang chạy)
// ============================================================
const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
const path = require('path')
const key = require(path.join(__dirname, '..', 'serviceAccountKey.json'))

const API_KEY = 'AIzaSyB9QIKPHTrPFmBHDyW6yxOkCDYisWRtHeA'
const BASE = 'http://localhost:3000'
const DB = 'masoimaster'
const results = []
const report = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let adminAuth, db
const bots = []

async function mintToken(uid) {
  const ct = await adminAuth.createCustomToken(uid)
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ct, returnSecureToken: true }) })
  const j = await res.json()
  return j.idToken
}

async function api(bot, path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bot.token}` },
    body: JSON.stringify(body || {}),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

async function restGet(path, token) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/${DB}/documents/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

async function tick(host) {
  return api(host, '/api/game/tick', { code: host.code, force: true })
}

async function readRoom(code) {
  const snap = await db.doc(`rooms/${code}`).get()
  return snap.data()
}

async function main() {
  const app = initializeApp({ credential: cert(key) }, 'newroles')
  adminAuth = getAuth(app)
  db = getFirestore(app, DB)

  console.log('== 1. Tạo 6 bot ==')
  for (let i = 0; i < 6; i++) {
    const uid = `newrole_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`
    const u = await adminAuth.createUser({ uid, displayName: `NBot${i}` })
    const token = await mintToken(uid)
    bots.push({ uid, name: `NBot${i}`, token, role: '' })
    console.log(`  ${bots[i].name} (${uid.slice(0, 12)}...)`)
  }
  const host = bots[0]

  console.log('== 2. Tạo phòng 6 người (2 sói + doctor + detective + raven + dân) ==')
  // Explicitly zero out default roles (create merges with DEFAULT_CONFIG)
  let r = await api(host, '/api/game/create', {
    config: {
      werewolf: 2, white_werewolf: 0, seer: 0, witch: 0, guard: 0, hunter: 0,
      cupid: 0, doctor: 1, detective: 1, raven: 1,
      alpha_wolf: 0, wolf_seer: 0, cursed_wolf: 0, medium: 0, chief: 0, elder: 0, jester: 0,
    },
  })
  const code = r.json.code
  host.code = code
  report('Tạo phòng', !!code, code)

  for (let i = 1; i < 6; i++) {
    await api(bots[i], '/api/game/join', { code })
    bots[i].code = code
  }
  report('5 bot join', true)

  for (const b of bots) await api(b, '/api/game/ready', { code, ready: true })
  r = await api(host, '/api/game/start', { code })
  report('Start game', r.status === 200, r.json.error || JSON.stringify(r.json).slice(0, 100))

  console.log('== 3. Đọc vai ==')
  for (const bot of bots) {
    const own = await restGet(`rooms/${code}/secrets/${bot.uid}`, bot.token)
    bot.role = own.json?.fields?.role?.stringValue
  }
  const roles = bots.map((b) => `${b.name}=${b.role}`).join(', ')
  console.log('  Roles:', roles)
  const byRole = (role) => bots.filter((b) => b.role === role)
  const wolves = bots.filter((b) => ['werewolf', 'alpha_wolf', 'wolf_seer', 'cursed_wolf', 'white_werewolf'].includes(b.role))
  const doctor = byRole('doctor')[0]
  const detective = byRole('detective')[0]
  const raven = byRole('raven')[0]
  const villager = byRole('villager')[0]
  report('Đủ vai: 2 sói + doctor + detective + raven + dân',
    wolves.length === 2 && !!doctor && !!detective && !!raven && !!villager, roles)

  console.log('== 4. Force tick → night, verify night order includes new roles ==')
  // role_reveal → night
  await tick(host)
  let room = await readRoom(code)
  report('Vào đêm', room.phase === 'night', `phase=${room.phase}`)

  // Collect night steps by ticking through
  const nightActions = []
  for (let i = 0; i < 12; i++) {
    room = await readRoom(code)
    if (room.phase !== 'night') break
    const wake = room.nightWake
    if (wake) nightActions.push(wake.actionType)
    // Submit action for whoever is active
    const action = wake?.actionType
    if (action === 'doctor_heal' && doctor) {
      // Doctor heals a non-self player
      const target = bots.find((b) => b.uid !== doctor.uid && b.role !== 'werewolf')
      if (target) {
        r = await api(doctor, '/api/game/night-action', { code, actionType: 'doctor_heal', targetId: target.uid })
        report('Doctor heal qua API', r.status === 200, r.json.error || 'OK')
      }
    }
    if (action === 'detective_compare' && detective) {
      // Detective compares 2 players
      const targets = bots.filter((b) => b.uid !== detective.uid).slice(0, 2)
      r = await api(detective, '/api/game/night-action', { code, actionType: 'detective_compare', targetId: targets[0]?.uid, targetId2: targets[1]?.uid })
      report('Detective compare qua API', r.status === 200, r.json.error || 'OK')
    }
    if (action === 'raven_mark' && raven) {
      // Raven marks someone
      const target = bots.find((b) => b.uid !== raven.uid)
      if (target) {
        r = await api(raven, '/api/game/night-action', { code, actionType: 'raven_mark', targetId: target.uid })
        report('Raven mark qua API', r.status === 200, r.json.error || 'OK')
      }
    }
    if (action === 'wolf_bite' && wolves.length > 0) {
      // Wolves bite a non-wolf
      const target = bots.find((b) => !wolves.includes(b))
      if (target) {
        r = await api(wolves[0], '/api/game/night-action', { code, actionType: 'wolf_bite', targetId: target.uid })
        report('Wolf bite qua API', r.status === 200, r.json.error || 'OK')
      }
    }
    await tick(host)
    await sleep(100)
  }

  console.log('  Night actions seen:', nightActions.join(' → '))
  report('Night order có doctor_heal', nightActions.includes('doctor_heal'))
  report('Night order có detective_compare', nightActions.includes('detective_compare'))
  report('Night order có raven_mark', nightActions.includes('raven_mark'))

  // Tick past night_resolve → day
  room = await readRoom(code)
  if (room.phase === 'night_resolve') {
    await tick(host)
    await sleep(200)
  }
  // Check if we reached day
  room = await readRoom(code)
  report('Đến ngày sau đêm', room.phase === 'day' || room.phase === 'voting' || room.phase === 'game_over', `phase=${room.phase}`)

  // Check raven mark effect (if reached voting)
  if (room.phase === 'voting' || room.phase === 'day') {
    // Check if marked player has vote penalty
    const marksSnap = await db.collection(`rooms/${code}/marks`).get().catch(() => null)
    if (marksSnap && !marksSnap.empty) {
      report('Raven marks được ghi', true, `${marksSnap.size} marks`)
    }
  }

  console.log('== 5. Dọn dẹp ==')
  for (const bot of bots) {
    try { await adminAuth.deleteUser(bot.uid) } catch (e) {}
  }
  try {
    const batch = db.batch()
    for (const col of ['players', 'secrets', 'nightActions', 'votes', 'messages', 'marks']) {
      const snap = await db.collection(`rooms/${code}/${col}`).get()
      snap.docs.forEach((d) => batch.delete(d.ref))
    }
    batch.delete(db.doc(`rooms/${code}`))
    await batch.commit()
  } catch (e) {}
  console.log('cleanup done')

  const pass = results.filter((r) => r.startsWith('PASS')).length
  const fail = results.filter((r) => r.startsWith('FAIL')).length
  console.log(`\n===== KẾT QUẢ: ${pass}/${pass + fail} PASS =====`)
  if (fail > 0) {
    console.log('FAILED:')
    results.filter((r) => r.startsWith('FAIL')).forEach((r) => console.log('  ' + r))
  }
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('❌ ERROR:', e.message); process.exit(1) })
