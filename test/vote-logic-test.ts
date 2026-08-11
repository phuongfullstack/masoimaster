// Test thuần logic resolveVotes: chief ×2, raven +2, jester win.
// Chạy: bun run test/vote-logic-test.ts (thư mục test/ đã gitignore).
import { resolveVotes, tallyWolfBite, resolveNight, buildNightSequence, countNightActors } from '@/lib/game-logic'
import type { PlayerDoc, SecretDoc, RoomDoc, NightActionDoc } from '@/lib/firestore-server'

const FAKE_ROOM = { dayCount: 2, cupidDone: true, cupidPair: null } as RoomDoc
const act = (actionType: string, targetId: string | null, actorId = 'actor'): NightActionDoc =>
  ({ actorId, actionType: actionType as never, targetId })

function mkPlayers(roles: Record<string, string>): { players: PlayerDoc[]; secrets: Map<string, SecretDoc> } {
  const players: PlayerDoc[] = []
  const secrets = new Map<string, SecretDoc>()
  let i = 0
  for (const [uid, role] of Object.entries(roles)) {
    players.push({ userId: uid, username: uid.toUpperCase(), isAlive: true, isReady: true, seatIndex: i++ })
    secrets.set(uid, { role: role as never, witchSaveUsed: false, witchPoisonUsed: false, linkedPartner: null })
  }
  return { players, secrets }
}

let pass = 0, fail = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log('PASS', name) }
  else { fail++; console.log('FAIL', name, detail) }
}

// 1. Chief vote counts double
{
  const { players, secrets } = mkPlayers({ a: 'chief', b: 'villager', c: 'villager', d: 'werewolf' })
  const res = resolveVotes(new Map([['a', 'd'], ['b', 'c']]), players, secrets, null)
  check('chief ×2 quyết định kết quả', res.eliminatedId === 'd', JSON.stringify(res.voteCounts))
  check('voteCounts d=2 c=1', res.voteCounts['d'] === 2 && res.voteCounts['c'] === 1, JSON.stringify(res.voteCounts))
}

// 2. Raven +2 votes
{
  const { players, secrets } = mkPlayers({ a: 'villager', b: 'villager', c: 'villager', d: 'werewolf' })
  const res = resolveVotes(new Map([['a', 'd']]), players, secrets, null, 'b')
  check('raven +2 làm b bị loại', res.eliminatedId === 'b', JSON.stringify(res.voteCounts))
}

// 3. Raven mark trên người đã chết → bỏ qua
{
  const { players, secrets } = mkPlayers({ a: 'villager', b: 'villager', d: 'werewolf' })
  players.find(p => p.userId === 'b')!.isAlive = false
  const res = resolveVotes(new Map([['a', 'd']]), players, secrets, null, 'b')
  check('mark người chết bị bỏ qua', res.eliminatedId === 'd', JSON.stringify(res.voteCounts))
}

// 4. Jester bị loại → jester thắng
{
  const { players, secrets } = mkPlayers({ a: 'jester', b: 'villager', c: 'villager', d: 'werewolf' })
  const res = resolveVotes(new Map([['b', 'a'], ['c', 'a'], ['d', 'a']]), players, secrets, null)
  check('jester bị xử → winner=jester', res.winner === 'jester', String(res.winner))
}

// 5. Villager bị loại bình thường → không phải jester win
{
  const { players, secrets } = mkPlayers({ a: 'jester', b: 'villager', c: 'villager', d: 'werewolf', e: 'villager' })
  const res = resolveVotes(new Map([['a', 'b'], ['c', 'b'], ['d', 'b']]), players, secrets, null)
  check('villager bị xử → winner khác jester', res.winner !== 'jester', String(res.winner))
}

// 6. Hoà phiếu → không ai bị loại
{
  const { players, secrets } = mkPlayers({ a: 'villager', b: 'villager', c: 'werewolf', d: 'villager' })
  const res = resolveVotes(new Map([['a', 'c'], ['b', 'd']]), players, secrets, null)
  check('hoà phiếu → isTie', res.isTie && res.eliminatedId === null, JSON.stringify(res.voteCounts))
}

// ---- tallyWolfBite ----

// 7. Đa số thắng
{
  const { secrets } = mkPlayers({ w1: 'werewolf', w2: 'werewolf', w3: 'alpha_wolf' })
  const t = tallyWolfBite(new Map([['w1', 'x'], ['w2', 'x'], ['w3', 'y']]), secrets)
  check('bầy: đa số thắng', t === 'x', String(t))
}

// 8. Hoà → alpha phá hoà
{
  const { secrets } = mkPlayers({ w1: 'werewolf', w2: 'alpha_wolf' })
  const t = tallyWolfBite(new Map([['w1', 'x'], ['w2', 'y']]), secrets)
  check('hoà: pick của alpha thắng', t === 'y', String(t))
}

// 9. Hoà không có alpha → random trong nhóm dẫn đầu
{
  const { secrets } = mkPlayers({ w1: 'werewolf', w2: 'werewolf' })
  const t = tallyWolfBite(new Map([['w1', 'x'], ['w2', 'y']]), secrets)
  check('hoà không alpha: chọn 1 trong 2', t === 'x' || t === 'y', String(t))
}

// 10. Không ai pick → null
{
  const { secrets } = mkPlayers({ w1: 'werewolf' })
  check('không pick → null', tallyWolfBite(new Map(), secrets) === null)
}

// ---- resolveNight: elder / curse / fx ----

// 11. Elder chịu 1 cắn, lá chắn vỡ, fx 'elder'
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', e: 'elder', v: 'villager' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('wolf_bite', 'e')])
  const e = secrets.get('e')!
  check('elder sống sót nhát cắn đầu', res.deaths.length === 0 && players.find(p => p.userId === 'e')!.isAlive)
  check('elder shield vỡ + fx elder', e.elderShieldUsed === true && e.lastNightFx === 'elder')
}

// 12. Elder bị cắn lần 2 → chết
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', e: 'elder', v: 'villager' })
  secrets.get('e')!.elderShieldUsed = true
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('wolf_bite', 'e')])
  check('elder chết ở nhát cắn thứ 2', res.deaths.includes('E'))
}

// 13. Curse: đổi phe, không chết, fx cursed, packmates cập nhật, curseUsed
{
  const { players, secrets } = mkPlayers({ cw: 'cursed_wolf', w: 'werewolf', v: 'villager', s: 'seer' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('curse', 'v', 'cw'), act('wolf_bite', 'v')])
  const v = secrets.get('v')!
  check('cursed: đổi role thành werewolf', v.role === 'werewolf' && v.originalRole === 'villager')
  check('cursed: không chết dù bị cắn cùng đêm', res.deaths.length === 0)
  check('cursed: fx + curseUsed', v.lastNightFx === 'cursed' && secrets.get('cw')!.curseUsed === true)
  check('packmates gồm thành viên mới', (secrets.get('w')!.packmates ?? []).includes('V') && (v.packmates ?? []).includes('CW'))
}

// 14. Không thắng kèo nguyền sói khác (route chặn nhưng logic cũng bỏ qua)
{
  const { players, secrets } = mkPlayers({ cw: 'cursed_wolf', w: 'werewolf', v: 'villager' })
  resolveNight(FAKE_ROOM, players, secrets, [act('curse', 'w', 'cw')])
  check('curse lên sói bị bỏ qua', secrets.get('w')!.role === 'werewolf' && !secrets.get('cw')!.curseUsed)
}

// 15. fx 'saved' khi được guard che
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', g: 'guard', v: 'villager' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('wolf_bite', 'v'), act('guard_protect', 'v', 'g')])
  check('guard che → sống + fx saved', res.deaths.length === 0 && secrets.get('v')!.lastNightFx === 'saved')
}

// 16. fx 'poison' cho nạn nhân thuốc độc
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', wi: 'witch', v: 'villager', v2: 'villager' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('witch_poison', 'v', 'wi')])
  check('poison chết + fx poison', res.deaths.includes('V') && secrets.get('v')!.lastNightFx === 'poison')
}

// ---- Night mode sim (đồng thời) ----

// 17. Sim: witch cứu mù TRÚNG → sống
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', wi: 'witch', v: 'villager' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('wolf_bite', 'v'), act('witch_save', 'v', 'wi')], 'sim')
  check('sim: cứu mù trúng → sống + fx saved', res.deaths.length === 0 && secrets.get('v')!.lastNightFx === 'saved')
}

// 18. Sim: witch cứu mù TRƯỢT → nạn nhân vẫn chết
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', wi: 'witch', v: 'villager', v2: 'villager' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('wolf_bite', 'v'), act('witch_save', 'v2', 'wi')], 'sim')
  check('sim: cứu mù trượt → vẫn chết', res.deaths.includes('V'))
}

// 19. Seq: witch cứu luôn trúng (hành vi cũ giữ nguyên)
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', wi: 'witch', v: 'villager' })
  const res = resolveNight(FAKE_ROOM, players, secrets, [act('wolf_bite', 'v'), act('witch_save', 'v', 'wi')], 'seq')
  check('seq: cứu trúng như cũ', res.deaths.length === 0)
}

// 20. Sim: sequence = đúng 1 bước sim_all
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', s: 'seer', g: 'guard', v: 'villager' })
  const seq = buildNightSequence(players, secrets, 2, true, 'sim')
  check('sim: 1 bước sim_all', seq.length === 1 && seq[0]!.action === 'sim_all')
  const seqSeq = buildNightSequence(players, secrets, 2, true, 'seq')
  check('seq: nhiều bước như cũ', seqSeq.length === 3)
}

// 21. countNightActors: sói + seer + guard = 3 (villager & medium không tính)
{
  const { players, secrets } = mkPlayers({ w: 'werewolf', s: 'seer', g: 'guard', v: 'villager', m: 'medium' })
  check('countNightActors = 3', countNightActors(players, secrets, 2, true) === 3)
}

// ---- suggestConfig + analyzeBalance ----
import { suggestConfig, sumSpecial } from '@/lib/roles'
import { analyzeBalance, getPresetCounts } from '@/lib/werewolf-config'

// 22. Mọi mốc 4-18: tổng vai đặc biệt ≤ số người, tỷ lệ sói 15-35%
{
  let allOk = true
  for (let n = 4; n <= 18; n++) {
    const cfg = suggestConfig(n)
    const special = sumSpecial(cfg)
    const wolves = (cfg.werewolf ?? 0) + (cfg.alpha_wolf ?? 0) + (cfg.wolf_seer ?? 0) + (cfg.cursed_wolf ?? 0) + (cfg.white_werewolf ?? 0)
    const ratio = wolves / n
    if (special > n || wolves < 1 || ratio > 0.35 || ratio < 0.15 || n - special < 1) {
      allOk = false
      console.log(`  n=${n}: special=${special} wolves=${wolves} ratio=${(ratio * 100).toFixed(0)}%`)
    }
  }
  check('suggestConfig 4-18 đều hợp lệ (sói 15-35%, đủ chỗ dân)', allOk)
}

// 23. Analyzer đếm ĐỦ vai sói mới
{
  const counts = { werewolf: 1, wolf_seer: 1, cursed_wolf: 1, white_werewolf: 1, alpha_wolf: 1, seer: 1, villager: 4 }
  const r = analyzeBalance(counts)
  check('analyzer đếm đủ 5 loại sói', r.wolfCount === 5, `wolfCount=${r.wolfCount}`)
}

// 24. getPresetCounts điền đủ villager
{
  const c = getPresetCounts(10)
  const total = Object.values(c).reduce((a, b) => a + b, 0)
  check('getPresetCounts(10) tổng đúng 10', total === 10, JSON.stringify(c))
}

// 25. Preset 8 người được analyzer chấm ổn (không danger)
{
  const r = analyzeBalance(getPresetCounts(8))
  check('preset 8 người không có cảnh báo danger', r.warnings.every(w => w.level !== 'danger'), r.ratingLabel)
}

console.log(`\n${pass}/${pass + fail} PASS`)
process.exit(fail ? 1 : 0)
