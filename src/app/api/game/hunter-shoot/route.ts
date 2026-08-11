// POST /api/game/hunter-shoot — a dead hunter shoots someone.
// Kills target (+ chain deaths), checks win, advances flow.
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, playerDoc, secretDoc, loadRoom, loadPlayers, loadSecrets, writeLog,
  type Phase,
} from '@/lib/firestore-server'
import { applyHunterShot, PHASE_DURATIONS } from '@/lib/game-logic'
import { archiveMatch } from '@/lib/match-archive'

// Room TTL: phòng đã kết thúc tự bị Firestore TTL dọn sau 6 giờ.
const FINISHED_ROOM_TTL_MS = 6 * 60 * 60 * 1000

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, targetId } = await readBody<{ code?: string; targetId?: string }>(req)
  if (!code || !targetId) return error('Thiếu thông tin.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')

  const mySecretSnap = await secretDoc(upper, uid).get()
  if (!mySecretSnap.exists || mySecretSnap.data()!.role !== 'hunter') {
    return error('Chỉ thợ săn mới bắn được.')
  }
  // Chỉ được bắn khi ĐÃ CHẾT và đang trong cửa sổ bắn (chống thợ săn
  // còn sống snipe bất kỳ lúc nào qua API).
  const meSnap = await playerDoc(upper, uid).get()
  if (meSnap.data()?.isAlive) return error('Thợ săn chỉ bắn khi vừa gục xuống.')
  if (room.phaseLabel !== 'Thợ Săn Bắn') return error('Đã hết cửa sổ bắn.')

  const players = await loadPlayers(upper)
  const secrets = await loadSecrets(upper)
  const result = applyHunterShot(targetId, players, secrets, room.cupidPair)
  if (!result) return error('Mục tiêu không hợp lệ.')

  // Write the death + chain deaths.
  const batch = roomDoc(upper).firestore.batch()
  players.forEach((p) => {
    batch.update(playerDoc(upper, p.userId), { isAlive: p.isAlive })
  })
  secrets.forEach((s, sid) => {
    batch.set(secretDoc(upper, sid), s)
  })

  if (result.winner) {
    const reveal: Record<string, string> = {}
    secrets.forEach((s, sid) => { reveal[sid] = s.role })
    batch.set(roomDoc(upper), {
      ...emptyFlow(),
      status: 'finished', phase: 'game_over', gameWinner: result.winner,
      reveal, timerEnd: null, timerPhase: null, phaseLabel: 'Kết Thúc',
      expiresAt: new Date(Date.now() + FINISHED_ROOM_TTL_MS),
    } as Record<string, unknown>, { merge: true })
    await batch.commit()
    // Lưu trữ non-realtime (lịch sử + stats) — best-effort.
    try {
      await archiveMatch(room, players, secrets, result.winner)
    } catch (e) {
      console.error('[hunter-shoot] archiveMatch failed:', (e as Error).message)
    }
    return ok({ targetName: result.targetName, chainedDeaths: result.chainedDeaths, winner: result.winner })
  } else {
    // Advance to next phase based on where we were.
    const next = nextPhaseAfterHunter(room.phase)
    batch.update(roomDoc(upper), {
      ...timerFor(next),
    } as Record<string, unknown>)
  }
  await batch.commit()

  await writeLog(upper, room.dayCount, room.phase, [{
    icon: '🏹',
    text: `Săn Thủ bắn ${result.targetName}${result.chainedDeaths.length ? ` (kéo theo: ${result.chainedDeaths.join(', ')})` : ''}`,
  }])

  return ok({ targetName: result.targetName, chainedDeaths: result.chainedDeaths, winner: result.winner })
}

function emptyFlow() {
  return { nightWake: null, dayResult: null, voteResult: null }
}

function nextPhaseAfterHunter(current: Phase): Phase {
  // Cửa sổ bắn sau CHẾT ĐÊM có phase='day' (đặt ở runNightResolution)
  // → bắn xong vào thảo luận ngày. Cửa sổ sau BỊ TREO có phase='vote_result'
  // → bắn xong về vote_result ngắn rồi tick tự mở đêm mới.
  if (current === 'vote_result') return 'vote_result'
  return 'day'
}

function timerFor(phase: Phase): Record<string, unknown> {
  if (phase === 'day') {
    return {
      phase, phaseLabel: 'Thảo Luận',
      timerPhase: 'day', timerEnd: Date.now() + PHASE_DURATIONS.day,
    }
  }
  // vote_result ngắn — hết giờ tick sẽ startNightLadder (đêm mới).
  // QUAN TRỌNG: timerEnd phải là số thật; để null là deadlock (không ai tick).
  return {
    phase: 'vote_result', phaseLabel: 'Kết Quả',
    timerPhase: 'vote_result', timerEnd: Date.now() + PHASE_DURATIONS.vote_result,
  }
}
