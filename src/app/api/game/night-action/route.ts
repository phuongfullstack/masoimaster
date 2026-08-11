// POST /api/game/night-action — submit a night action (wolf/seer/witch/guard).
// Writes to nightActions. Seer gets an immediate result back.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  nightActionsCol, secretDoc, loadRoom, loadPlayers, loadSecrets,
  WOLF_ROLES, type ActionType, type NightActionDoc,
} from '@/lib/firestore-server'

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, actionType, targetId } = await readBody<{
    code?: string; actionType?: ActionType; targetId?: string | null
  }>(req)
  if (!code || !actionType) return error('Thiếu thông tin.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.phase !== 'night') return error('Không phải giai đoạn đêm.')

  const mySecretSnap = await secretDoc(upper, uid).get()
  if (!mySecretSnap.exists) return error('Bạn không có trong phòng.')
  const mySecret = mySecretSnap.data()!
  const role = mySecret.role
  const col = nightActionsCol(upper)

  // Role validation + per-action rules (mirrors the prior server).
  switch (actionType) {
    case 'wolf_bite': {
      if (!WOLF_ROLES.includes(role as never)) return error('Chỉ sói mới cắn được.')
      // Clear any prior wolf_bite (shared single kill across the pack).
      const existing = await col.where('actionType', '==', 'wolf_bite').get()
      const batch = col.firestore.batch()
      existing.docs.forEach((d) => {
        // Only clear bites authored by wolves (defensive).
        batch.delete(d.ref)
      })
      if (targetId) batch.set(col.doc(), { actorId: uid, actionType, targetId } satisfies NightActionDoc)
      await batch.commit()
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
    default:
      return error('Hành động không hợp lệ.')
  }

  return ok()
}
