// POST /api/game/night-action — submit a night action (wolf/seer/witch/guard/
// doctor/raven/wolf_seer/detective). Writes to nightActions (hoặc wolfPicks
// cho bầy sói). Các vai soi nhận kết quả trả về ngay.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  nightActionsCol, secretDoc, wolfPickDoc, wolfPicksCol, roomDoc,
  loadRoom, loadPlayers, loadSecrets,
  WOLF_ROLES, type ActionType, type NightActionDoc, type RoomDoc,
} from '@/lib/firestore-server'
import { isWolfRole } from '@/lib/roles'

/**
 * Cập nhật tiến độ đêm ẨN DANH (X/Y đã hành động) sau mỗi lần nộp.
 * Chế độ đồng thời: đủ người → hạ timerEnd để đêm kết thúc sớm
 * (client tick trong ~1.5s; tick idempotent nên nhiều client vô hại).
 */
async function updateNightProgress(code: string, room: RoomDoc) {
  try {
    const [actionsSnap, picksSnap] = await Promise.all([
      nightActionsCol(code).get(),
      wolfPicksCol(code).get(),
    ])
    const actors = new Set<string>()
    actionsSnap.docs.forEach((d) => {
      const a = (d.data() as NightActionDoc).actorId
      if (a && a !== 'pack') actors.add(a)
    })
    picksSnap.docs.forEach((d) => actors.add(d.id))

    const total = room.nightProgress?.total ?? 0
    const done = Math.min(actors.size, total || actors.size)
    const patch: Record<string, unknown> = { nightProgress: { done, total } }
    if ((room.nightMode ?? 'seq') === 'sim' && total > 0 && done >= total) {
      patch.timerEnd = Date.now() + 1500 // đủ người → chốt đêm sớm
    }
    await roomDoc(code).update(patch)
  } catch { /* tiến độ là phụ trợ — không làm hỏng action */ }
}

// Action nào được nộp trong bước đêm nào (nightWake.actionType của bước).
const STEP_ALLOWS: Partial<Record<ActionType, ActionType[]>> = {
  cupid_link: ['cupid_link'],
  guard_protect: ['guard_protect'],
  doctor_heal: ['doctor_heal'],
  wolf_bite: ['wolf_bite'],
  wolf_seer_check: ['wolf_seer_check'],
  seer_check: ['seer_check'],
  witch_save: ['witch_save', 'witch_poison'], // bước phù thủy nộp được cả 2
  detective_compare: ['detective_compare'],
  raven_mark: ['raven_mark'],
  curse: ['curse'],
}

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, actionType, targetId, targetId2 } = await readBody<{
    code?: string; actionType?: ActionType; targetId?: string | null; targetId2?: string | null
  }>(req)
  if (!code || !actionType) return error('Thiếu thông tin.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.phase !== 'night') return error('Không phải giai đoạn đêm.')

  // Chống nộp sai lượt (vd sói cắn trong lượt phù thủy).
  // 'sim_all' (đêm đồng thời): mọi action đêm hợp lệ đều được nộp.
  const stepAction = room.nightWake?.actionType
  if (stepAction !== 'sim_all') {
    if (!stepAction || !(STEP_ALLOWS[stepAction as ActionType] ?? []).includes(actionType)) {
      return error('Chưa đến lượt hành động này.')
    }
  }

  const mySecretSnap = await secretDoc(upper, uid).get()
  if (!mySecretSnap.exists) return error('Bạn không có trong phòng.')
  const mySecret = mySecretSnap.data()!
  const role = mySecret.role
  const col = nightActionsCol(upper)

  // Role validation + per-action rules (mirrors the prior server).
  switch (actionType) {
    case 'wolf_bite': {
      if (!WOLF_ROLES.includes(role as never)) return error('Chỉ sói mới cắn được.')
      // Mỗi sói pick RIÊNG (pack board realtime); tally + alpha phá hoà
      // diễn ra khi bước sói kết thúc (tick → finalizeWolfBite).
      if (targetId) {
        await wolfPickDoc(upper, uid).set({ targetId, at: Date.now() })
      } else {
        await wolfPickDoc(upper, uid).delete()
      }
      break
    }
    case 'seer_check': {
      if (role !== 'seer') return error('Chỉ tiên tri mới soi được.')
      const existing = await col.where('actionType', '==', 'seer_check').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await batch.commit()
      // Immediate result to the seer.
      const players = await loadPlayers(upper)
      const secrets = await loadSecrets(upper)
      const target = players.find((p) => p.userId === targetId)
      const isWolf = target ? WOLF_ROLES.includes(secrets.get(target.userId)?.role as never) : false
      return ok({ seerResult: target ? { targetName: target.username, isWolf } : null })
    }
    case 'witch_save': {
      if (role !== 'witch' || mySecret.witchSaveUsed) return error('Không thể dùng thuốc cứu.')
      const existing = await col.where('actionType', '==', 'witch_save').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) {
        batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
        batch.update(secretDoc(upper, uid), { witchSaveUsed: true })
      }
      await batch.commit()
      break
    }
    case 'witch_poison': {
      if (role !== 'witch' || mySecret.witchPoisonUsed) return error('Không thể dùng thuốc độc.')
      const existing = await col.where('actionType', '==', 'witch_poison').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) {
        batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
        batch.update(secretDoc(upper, uid), { witchPoisonUsed: true })
      }
      await batch.commit()
      break
    }
    case 'guard_protect': {
      if (role !== 'guard') return error('Chỉ bảo vệ mới che chắn được.')
      if (targetId === room.lastGuardTarget) return error('Không thể bảo vệ cùng người 2 đêm liền.')
      const existing = await col.where('actionType', '==', 'guard_protect').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await batch.commit()
      break
    }
    case 'doctor_heal': {
      if (role !== 'doctor') return error('Chỉ bác sĩ mới chữa được.')
      if (targetId === uid) return error('Bác sĩ không được tự chữa.')
      const existing = await col.where('actionType', '==', 'doctor_heal').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await batch.commit()
      break
    }
    case 'raven_mark': {
      if (role !== 'raven') return error('Chỉ Con Quạ mới đánh dấu được.')
      const existing = await col.where('actionType', '==', 'raven_mark').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await batch.commit()
      break
    }
    case 'curse': {
      if (role !== 'cursed_wolf') return error('Chỉ Sói Nguyền mới nguyền được.')
      if (mySecret.curseUsed) return error('Lời nguyền đã dùng rồi.')
      if (targetId) {
        const players = await loadPlayers(upper)
        const secrets = await loadSecrets(upper)
        const target = players.find((p) => p.userId === targetId)
        if (!target?.isAlive) return error('Mục tiêu không hợp lệ.')
        if (WOLF_ROLES.includes(secrets.get(targetId)?.role as never)) {
          return error('Không thể nguyền sói.')
        }
      }
      // Upsert — được đổi ý trong lượt; curseUsed chỉ chốt lúc resolve đêm.
      const existing = await col.where('actionType', '==', 'curse').where('actorId', '==', uid).get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => batch.delete(d.ref))
      if (targetId) batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await batch.commit()
      break
    }
    case 'wolf_seer_check': {
      if (role !== 'wolf_seer') return error('Chỉ Sói Tiên Tri mới soi được.')
      if (!targetId) return error('Thiếu mục tiêu.')
      const players = await loadPlayers(upper)
      const secrets = await loadSecrets(upper)
      const target = players.find((p) => p.userId === targetId)
      if (!target?.isAlive) return error('Mục tiêu không hợp lệ.')
      // Ghi nhận action (tiến độ + log) rồi trả kết quả ngay.
      await nightActionsCol(upper).doc(`wolf_seer_${uid}`).set(
        { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await updateNightProgress(upper, room)
      // Kết quả trả ngay: mục tiêu CÓ PHẢI Tiên Tri không.
      const isSeer = secrets.get(targetId)?.role === 'seer'
      return ok({ wolfSeerResult: { targetName: target.username, isSeer } })
    }
    case 'detective_compare': {
      if (role !== 'detective') return error('Chỉ Thám Tử mới so phe được.')
      if (!targetId || !targetId2 || targetId === targetId2) return error('Chọn 2 người khác nhau.')
      const players = await loadPlayers(upper)
      const secrets = await loadSecrets(upper)
      const a = players.find((p) => p.userId === targetId)
      const b = players.find((p) => p.userId === targetId2)
      if (!a?.isAlive || !b?.isAlive) return error('Mục tiêu không hợp lệ.')
      await nightActionsCol(upper).doc(`detective_${uid}`).set(
        { actorId: uid, actionType, targetId, targetId2 } satisfies NightActionDoc)
      await updateNightProgress(upper, room)
      // "Cùng phe": cùng bên sói hoặc cùng bên không-sói. Không lộ phe nào.
      const sameFaction = isWolfRole(secrets.get(targetId)?.role) === isWolfRole(secrets.get(targetId2)?.role)
      return ok({ detectiveResult: { aName: a.username, bName: b.username, sameFaction } })
    }
    default:
      return error('Hành động không hợp lệ.')
  }

  await updateNightProgress(upper, room)
  return ok()
}
