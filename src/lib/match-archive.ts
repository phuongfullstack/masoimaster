// ============================================================
// Match archive — lớp dữ liệu KHÔNG realtime.
//
// Khi game kết thúc (game_over), server ghi:
//   1. `matches/{code}-{createdAt}` — bản ghi trận đấu bất biến
//      (ai chơi, vai gì, phe nào thắng). Người tham gia đọc lại
//      được qua rules (playerIds array-contains uid).
//   2. `users/{uid}.stats` — thống kê tích luỹ (increment).
//
// Chạy trong 1 transaction, khoá idempotency là chính doc trận:
// nếu doc đã tồn tại (tick bị gọi trùng) thì bỏ qua toàn bộ,
// nên stats không bao giờ bị cộng đôi.
// ============================================================
import { FieldValue } from 'firebase-admin/firestore'
import {
  db, userDoc, WOLF_ROLES,
  type RoomDoc, type PlayerDoc, type SecretDoc, type Role,
} from '@/lib/firestore-server'

export type { Winner } from '@/lib/roles'
import type { Winner } from '@/lib/roles'

export interface MatchPlayer {
  uid: string
  username: string
  role: Role
  isAlive: boolean
  won: boolean
}

export interface MatchDoc {
  code: string
  winner: Winner
  startedAt: number   // room.createdAt (epoch ms)
  endedAt: number     // epoch ms
  dayCount: number
  playerCount: number
  config: RoomDoc['config']
  playerIds: string[]          // để query array-contains
  players: MatchPlayer[]
}

/** Một người chơi có thắng không, theo phe thắng. */
function playerWon(winner: Winner, role: Role, cupidPair: [string, string] | null, uid: string): boolean {
  if (winner === 'lovers') {
    return cupidPair != null && (uid === cupidPair[0] || uid === cupidPair[1])
  }
  // Thằng Ngố thắng một mình khi bị xử — chỉ người cầm vai jester thắng.
  if (winner === 'jester') return role === 'jester'
  const isWolf = WOLF_ROLES.includes(role)
  if (winner === 'werewolf') return isWolf
  return !isWolf
}

/**
 * Ghi bản ghi trận + cập nhật stats cho mọi người chơi.
 * Best-effort: caller nên bọc try/catch — lỗi lưu trữ không được
 * làm hỏng luồng game (game_over đã được ghi vào room doc trước đó).
 */
export async function archiveMatch(
  room: RoomDoc,
  players: PlayerDoc[],
  secrets: Map<string, SecretDoc>,
  winner: Winner,
): Promise<void> {
  const matchId = `${room.code}-${room.createdAt}`
  const matchRef = db().collection('matches').doc(matchId)

  const matchPlayers: MatchPlayer[] = players.map((p) => {
    const secret = secrets.get(p.userId)
    const role = (secret?.role ?? 'villager') as Role
    return {
      uid: p.userId,
      username: p.username,
      role,
      isAlive: p.isAlive,
      won: playerWon(winner, role, room.cupidPair, p.userId),
    }
  })

  const match: MatchDoc = {
    code: room.code,
    winner,
    startedAt: room.createdAt,
    endedAt: Date.now(),
    dayCount: room.dayCount,
    playerCount: players.length,
    config: room.config,
    playerIds: matchPlayers.map((p) => p.uid),
    players: matchPlayers,
  }

  await db().runTransaction(async (tx) => {
    const existing = await tx.get(matchRef)
    if (existing.exists) return // đã archive (tick trùng) — bỏ qua

    tx.set(matchRef, match)
    for (const p of matchPlayers) {
      tx.set(
        userDoc(p.uid),
        {
          lastPlayedAt: FieldValue.serverTimestamp(),
          stats: {
            gamesPlayed: FieldValue.increment(1),
            wins: FieldValue.increment(p.won ? 1 : 0),
            winsAsWolf: FieldValue.increment(p.won && WOLF_ROLES.includes(p.role) ? 1 : 0),
            winsAsVillager: FieldValue.increment(p.won && !WOLF_ROLES.includes(p.role) && winner !== 'lovers' && winner !== 'jester' ? 1 : 0),
            winsAsLover: FieldValue.increment(p.won && winner === 'lovers' ? 1 : 0),
            roleCounts: { [p.role]: FieldValue.increment(1) },
          },
        },
        { merge: true },
      )
    }
  })
}
