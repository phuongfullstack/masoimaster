// POST /api/game/tick — the game-flow engine. Called by the client when
// a phase timer expires. Idempotent: validates Date.now() >= timerEnd
// (or host-next bypass), then advances the room to the next state.
//
// Responsibilities (by current phase / timerPhase):
//  role_reveal            → start night (begin wake ladder)
//  night (per step)       → advance to next wake step, or resolve night
//  night_resolve          → compute deaths, transition to day
//  day                    → start voting
//  voting                 → resolve votes
//  vote_result            → next night (or hunter already handled)
import { authenticate, readBody, error, ok, isAuthError } from '@/app/api/game/_helpers'
import {
  roomDoc, playerDoc, secretDoc, nightActionsCol, votesCol, wolfPicksCol,
  loadRoom, loadPlayers, loadSecrets, loadNightActions, loadVotes, loadWolfPicks,
  type RoomDoc, type Phase, type SecretDoc, type NightActionDoc,
} from '@/lib/firestore-server'
import {
  buildNightSequence, resolveNight, resolveVotes, tallyWolfBite, PHASE_DURATIONS,
  type NightStep,
} from '@/lib/game-logic'
import { archiveMatch } from '@/lib/match-archive'

// Room TTL: phòng đã kết thúc tự bị Firestore TTL dọn sau 6 giờ.
const FINISHED_ROOM_TTL_MS = 6 * 60 * 60 * 1000

export async function POST(req: Request) {
  const auth = await authenticate(req)
  if (isAuthError(auth)) return auth
  const { uid } = auth

  const { code, force } = await readBody<{ code?: string; force?: boolean }>(req)
  if (!code) return error('Thiếu mã phòng.')
  const upper = code.toUpperCase()

  const { room } = await loadRoom(upper)
  if (!room) return error('Phòng không tồn tại!')
  if (room.status !== 'playing') return ok({ skipped: 'not playing' })

  // Caller must be in the room.
  const meSnap = await playerDoc(upper, uid).get()
  if (!meSnap.exists) return error('Bạn không có trong phòng.')

  const phase = room.timerPhase ?? room.phase
  // Idempotency: only advance if the timer really expired (unless forced by host-next).
  if (!force && (room.timerEnd == null || Date.now() < room.timerEnd)) {
    return ok({ skipped: 'timer not expired' })
  }

  switch (phase) {
    case 'role_reveal':
      return startNightLadder(upper, room)
    case 'night':
      return advanceNightStep(upper, room)
    case 'night_resolve':
      return runNightResolution(upper, room)
    case 'day':
      return startVoting(upper)
    case 'voting':
      return runVoteResolution(upper, room)
    case 'vote_result':
      return startNightLadder(upper, room)
    default:
      return ok({ skipped: 'no transition' })
  }
}

// ============================================================
// Phase transitions
// ============================================================

/**
 * Chốt bước cắn của bầy: tally wolfPicks (Sói Đầu Sỏ phá hoà) rồi ghi
 * 1 nightAction wolf_bite chuẩn (doc id cố định — idempotent khi nhiều
 * client tick trùng). Gọi khi RỜI bước wolf_bite để bước Phù Thủy sau
 * đó vẫn thấy nạn nhân như cũ.
 */
async function finalizeWolfBite(code: string, seq: NightStep[], room: RoomDoc, secrets: Map<string, SecretDoc>) {
  if (seq[room.nightStep]?.action !== 'wolf_bite') return
  const picks = await loadWolfPicks(code)
  const targetId = tallyWolfBite(picks, secrets)
  if (targetId) {
    await nightActionsCol(code).doc('pack_bite').set({
      actorId: 'pack', actionType: 'wolf_bite', targetId,
    } satisfies NightActionDoc)
  }
}

/** Begin a new night: reset actions/votes, set phase=night, schedule step 0. */
async function startNightLadder(code: string, room: RoomDoc) {
  const players = await loadPlayers(code)
  const secrets = await loadSecrets(code)
  const seq = buildNightSequence(players, secrets, room.dayCount, room.cupidDone)

  const batch = roomDoc(code).firestore.batch()
  // Clear per-night collections.
  const actions = await nightActionsCol(code).get()
  actions.docs.forEach((d) => batch.delete(d.ref))
  const votes = await votesCol(code).get()
  votes.docs.forEach((d) => batch.delete(d.ref))
  const picks = await wolfPicksCol(code).get()
  picks.docs.forEach((d) => batch.delete(d.ref))

  const nextDay = room.dayCount + 1

  if (seq.length === 0) {
    // No night steps (no special roles alive) → jump straight to resolution.
    batch.update(roomDoc(code), {
      phase: 'night_resolve', phaseLabel: 'Đang giải quyết...',
      timerPhase: 'night_resolve', timerEnd: Date.now() + PHASE_DURATIONS.night_resolve,
      nightStep: 0, nightWake: null, bittenTarget: null, dayCount: nextDay,
      ravenMarkedId: null, // dấu quạ chỉ sống 1 buổi vote
    } as Record<string, unknown>)
  } else {
    const step0 = seq[0]!
    const stepEnd = Date.now() + step0.duration
    batch.update(roomDoc(code), {
      phase: 'night', phaseLabel: step0.label,
      timerPhase: 'night', timerEnd: stepEnd,
      nightStep: 0, nightWake: { actionType: step0.action, label: step0.label, duration: step0.duration / 1000 },
      bittenTarget: null, dayCount: nextDay,
      ravenMarkedId: null, // dấu quạ chỉ sống 1 buổi vote
    } as Record<string, unknown>)
  }
  await batch.commit()
  return ok({ phase: 'night' })
}

/** Advance to the next night wake step, or to night_resolve if done. */
async function advanceNightStep(code: string, room: RoomDoc) {
  const players = await loadPlayers(code)
  const secrets = await loadSecrets(code)
  const seq = buildNightSequence(players, secrets, room.dayCount, room.cupidDone)
  const nextIndex = room.nightStep + 1

  // Nếu đang rời bước cắn của bầy → tally wolfPicks thành 1 phát cắn chuẩn.
  await finalizeWolfBite(code, seq, room, secrets)

  const batch = roomDoc(code).firestore.batch()

  if (nextIndex < seq.length) {
    const step = seq[nextIndex]!
    // The witch step reveals the bitten player.
    let bittenPlayer: string | null = null
    if (step.action === 'witch_save') {
      const actions = await loadNightActions(code)
      const bite = actions.find((a) => a.actionType === 'wolf_bite')
      if (bite?.targetId) {
        const victim = players.find((p) => p.userId === bite.targetId)
        bittenPlayer = victim?.username ?? null
      }
    }
    const stepEnd = Date.now() + step.duration
    batch.update(roomDoc(code), {
      nightStep: nextIndex,
      phaseLabel: step.label,
      timerEnd: stepEnd,
      nightWake: { actionType: step.action, label: step.label, duration: step.duration / 1000, bittenPlayer },
    } as Record<string, unknown>)
  } else {
    // Ladder complete → resolve.
    batch.update(roomDoc(code), {
      phase: 'night_resolve', phaseLabel: 'Đang giải quyết...',
      timerPhase: 'night_resolve', timerEnd: Date.now() + PHASE_DURATIONS.night_resolve,
      nightWake: null,
    } as Record<string, unknown>)
  }
  await batch.commit()
  return ok({ phase: 'night', step: nextIndex })
}

/** Resolve the night: compute deaths, write back, transition to day or hunter or game-over. */
async function runNightResolution(code: string, room: RoomDoc) {
  const players = await loadPlayers(code)
  const secrets = await loadSecrets(code)
  const actions = await loadNightActions(code)
  const res = resolveNight(room, players, secrets, actions)

  const batch = roomDoc(code).firestore.batch()
  // Write mutated player/secret state.
  res.updatedPlayers.forEach((p) => batch.update(playerDoc(code, p.userId), { isAlive: p.isAlive }))
  res.updatedSecrets.forEach((s, sid) => batch.set(secretDoc(code, sid), s))

  const cupidPair = res.cupidAutoPair ?? room.cupidPair
  if (res.cupidAutoPair) {
    batch.update(roomDoc(code), { cupidPair: res.cupidAutoPair, cupidDone: true } as Record<string, unknown>)
  }

  const dayCount = room.dayCount + 1

  if (res.winner) {
    const reveal: Record<string, string> = {}
    res.updatedSecrets.forEach((s, sid) => { reveal[sid] = s.role })
    batch.set(roomDoc(code), {
      status: 'finished', phase: 'game_over', gameWinner: res.winner,
      // ANTI-REVEAL: không phát tán `saved` — nguyên nhân/nguồn hiệu ứng là bí mật.
      reveal, dayResult: { deaths: res.deaths },
      timerEnd: null, timerPhase: null, phaseLabel: 'Kết Thúc',
      nightWake: null,
      expiresAt: new Date(Date.now() + FINISHED_ROOM_TTL_MS),
    } as Record<string, unknown>, { merge: true })
    await batch.commit()
    // Lưu trữ non-realtime (lịch sử + stats) — best-effort, không chặn game flow.
    try {
      await archiveMatch({ ...room, cupidPair, dayCount }, res.updatedPlayers, res.updatedSecrets, res.winner)
    } catch (e) {
      console.error('[tick] archiveMatch failed:', (e as Error).message)
    }
    return ok({ phase: 'game_over', deaths: res.deaths, winner: res.winner })
  } else if (res.deadHunterId) {
    // Give the hunter a window to shoot.
    batch.update(roomDoc(code), {
      phase: 'day', phaseLabel: 'Thợ Săn Bắn',
      timerPhase: 'day', timerEnd: Date.now() + PHASE_DURATIONS.hunter_shoot,
      dayResult: { deaths: res.deaths },
      lastGuardTarget: res.lastGuardTarget, dayCount,
      nightWake: null,
      ravenMarkedId: res.ravenMarkedId, // public: dấu quạ cho buổi vote hôm nay
    } as Record<string, unknown>)
  } else {
    batch.update(roomDoc(code), {
      phase: 'day', phaseLabel: 'Thảo Luận',
      timerPhase: 'day', timerEnd: Date.now() + PHASE_DURATIONS.day,
      dayResult: { deaths: res.deaths },
      lastGuardTarget: res.lastGuardTarget, dayCount,
      nightWake: null,
      ravenMarkedId: res.ravenMarkedId, // public: dấu quạ cho buổi vote hôm nay
    } as Record<string, unknown>)
  }
  await batch.commit()
  return ok({ phase: 'day', deaths: res.deaths, winner: res.winner })
}

/** Start voting: clear votes, set voting timer. */
async function startVoting(code: string) {
  const batch = roomDoc(code).firestore.batch()
  const votes = await votesCol(code).get()
  votes.docs.forEach((d) => batch.delete(d.ref))
  batch.update(roomDoc(code), {
    phase: 'voting', phaseLabel: 'Bỏ Phiếu',
    timerPhase: 'voting', timerEnd: Date.now() + PHASE_DURATIONS.voting,
  } as Record<string, unknown>)
  await batch.commit()
  return ok({ phase: 'voting' })
}

/** Resolve votes: compute elimination, transition to vote_result or night or game-over. */
async function runVoteResolution(code: string, room: RoomDoc) {
  const votes = await loadVotes(code)
  const players = await loadPlayers(code)
  const secrets = await loadSecrets(code)
  const res = resolveVotes(votes, players, secrets, room.cupidPair, room.ravenMarkedId ?? null)

  const batch = roomDoc(code).firestore.batch()
  // Write mutated player/secret state.
  players.forEach((p) => batch.update(playerDoc(code, p.userId), { isAlive: p.isAlive }))
  secrets.forEach((s, sid) => batch.set(secretDoc(code, sid), s))

  batch.update(roomDoc(code), {
    voteResult: {
      eliminated: res.eliminatedName, chainedDeaths: res.chainedDeaths,
      voteCounts: res.voteCounts, isTie: res.isTie,
    },
  } as Record<string, unknown>)

  if (res.winner) {
    const reveal: Record<string, string> = {}
    secrets.forEach((s, sid) => { reveal[sid] = s.role })
    batch.set(roomDoc(code), {
      status: 'finished', phase: 'game_over', gameWinner: res.winner,
      reveal, timerEnd: null, timerPhase: null, phaseLabel: 'Kết Thúc',
      expiresAt: new Date(Date.now() + FINISHED_ROOM_TTL_MS),
    } as Record<string, unknown>, { merge: true })
    await batch.commit()
    try {
      await archiveMatch(room, players, secrets, res.winner)
    } catch (e) {
      console.error('[tick] archiveMatch failed:', (e as Error).message)
    }
    return ok({ phase: 'game_over', eliminated: res.eliminatedName, winner: res.winner })
  } else if (res.deadHunterId) {
    batch.update(roomDoc(code), {
      phase: 'vote_result', phaseLabel: 'Thợ Săn Bắn',
      timerPhase: 'vote_result', timerEnd: Date.now() + PHASE_DURATIONS.hunter_shoot,
    } as Record<string, unknown>)
  } else {
    batch.update(roomDoc(code), {
      phase: 'vote_result', phaseLabel: 'Kết Quả',
      timerPhase: 'vote_result', timerEnd: Date.now() + PHASE_DURATIONS.vote_result,
    } as Record<string, unknown>)
  }
  await batch.commit()
  return ok({ phase: 'vote_result', eliminated: res.eliminatedName, winner: res.winner })
}
