'use client'

// ============================================================
// Client đọc dữ liệu KHÔNG realtime: thống kê cá nhân + lịch sử trận.
// Đọc một lần (getDoc / getDocs) — không dùng onSnapshot vì dữ liệu
// này chỉ đổi khi một ván kết thúc; refetch khi người dùng mở lại.
// Rules: users/{uid} owner-only; matches chỉ người từng chơi đọc được.
// ============================================================
import {
  doc, getDoc, collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore'
import { fsDb } from '@/lib/firebase'

export interface PlayerStats {
  gamesPlayed: number
  wins: number
  winsAsWolf: number
  winsAsVillager: number
  winsAsLover: number
  roleCounts: Record<string, number>
}

export interface MatchSummary {
  id: string
  code: string
  winner: 'werewolf' | 'villager' | 'lovers'
  endedAt: number
  dayCount: number
  playerCount: number
  /** Vai + kết quả của CHÍNH người xem trong trận đó. */
  myRole: string
  myWon: boolean
}

const EMPTY_STATS: PlayerStats = {
  gamesPlayed: 0, wins: 0, winsAsWolf: 0, winsAsVillager: 0, winsAsLover: 0,
  roleCounts: {},
}

/** Thống kê tích luỹ của người đang đăng nhập. */
export async function fetchMyStats(uid: string): Promise<PlayerStats> {
  const snap = await getDoc(doc(fsDb, 'users', uid))
  if (!snap.exists()) return EMPTY_STATS
  const stats = (snap.data() as { stats?: Partial<PlayerStats> }).stats
  return { ...EMPTY_STATS, ...(stats ?? {}) }
}

/** Các trận gần nhất người này từng chơi (mới nhất trước). */
// Dùng composite index (playerIds CONTAINS + endedAt DESC) — đã deploy
// qua `bun run fb:deploy`. Chỉ đọc đúng `max` doc.
export async function fetchMyMatches(uid: string, max = 10): Promise<MatchSummary[]> {
  const q = query(
    collection(fsDb, 'matches'),
    where('playerIds', 'array-contains', uid),
    orderBy('endedAt', 'desc'),
    limit(max),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const m = d.data() as {
      code: string; winner: MatchSummary['winner']; endedAt: number
      dayCount: number; playerCount: number
      players: { uid: string; role: string; won: boolean }[]
    }
    const me = m.players.find((p) => p.uid === uid)
    return {
      id: d.id, code: m.code, winner: m.winner, endedAt: m.endedAt,
      dayCount: m.dayCount, playerCount: m.playerCount,
      myRole: me?.role ?? 'villager', myWon: me?.won ?? false,
    }
  })
}
