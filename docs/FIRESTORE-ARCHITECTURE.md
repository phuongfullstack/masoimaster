# Kiến trúc Firestore Realtime — Ma Sói Realtime

Tài liệu mô tả kiến trúc sau khi migrate từ Socket.io sang Firestore realtime.

## Tổng quan

```
┌──────────────┐   REST API (verify ID token)   ┌─────────────────┐
│  Client SPA  │ ─────────────────────────────→ │  Next.js        │
│  (Next.js)   │                                │  API Routes     │
│              │ ←─── onSnapshot (realtime) ─── │  (Admin SDK)    │
└──────────────┘            ↑                    └────────┬────────┘
        │                    │                             │
        └── Firebase Auth    └──── Firestore ←─────────────┘
                                                  (state store)
```

- **Identity**: Firebase Auth `uid` (verify mỗi API call qua ID token).
- **Realtime**: Firestore `onSnapshot()` — client tự nhận update khi doc thay.
- **Game logic**: API routes tính toán (resolveNight, resolveVotes, checkWin),
  viết kết quả về Firestore → onSnapshot sync tất cả client.
- **Timers**: client-driven tick — client đếm ngược dựa `timerEnd`, khi hết
  gọi `POST /api/game/tick`. Server validate `Date.now() >= timerEnd` rồi
  advance. Idempotent (nhiều client gọi = không sao).

## Hai lớp dữ liệu: realtime vs không realtime

| | **Realtime** | **Không realtime** |
|---|---|---|
| Collections | `rooms/{code}` + subcollections | `users/{uid}`, `matches/{id}` |
| Vòng đời | Sống theo ván chơi, TTL tự dọn | Vĩnh viễn (hồ sơ, lịch sử, thống kê) |
| Client đọc | `onSnapshot` (listener) | `getDoc`/`getDocs` một lần, refetch khi mở UI |
| Client ghi | Không — mọi ghi qua API routes | Không — mọi ghi qua API routes |
| Khi nào ghi | Mỗi action/tick trong game | 1 lần khi `game_over` (`archiveMatch`, transaction idempotent) |

- **Room TTL**: field `expiresAt` trên room doc (24h khi tạo/bắt đầu, 6h sau khi
  kết thúc). Dọn bằng **lazy cleanup trong code** (`cleanupExpiredRooms()` chạy
  mỗi lần tạo phòng mới). Firestore TTL policy gốc KHÔNG dùng được vì cần bật
  billing (Blaze) — nếu sau này nâng cấp Blaze thì bật thêm trong Console
  (Firestore → TTL → `rooms.expiresAt`), hai cơ chế chạy song song vô hại.
- **`matches/{code}-{createdAt}`**: bản ghi trận bất biến — ai chơi, vai gì, phe
  thắng, cấu hình. Doc id tất định nên tick bị gọi trùng không tạo bản ghi đôi;
  stats chỉ increment khi doc được tạo lần đầu (transaction).
- **`users/{uid}`**: username + `stats` (gamesPlayed, wins, winsAsWolf/Villager/
  Lover, roleCounts) + lastPlayedAt. Client đọc doc của chính mình; lịch sử trận
  query `matches` bằng `playerIds array-contains uid` + `orderBy endedAt desc`
  (composite index đã deploy và verify 2026-08-11).

## Data Model

```
users/{uid}                               ← KHÔNG realtime (owner-only read)
  username, createdAt, updatedAt, lastPlayedAt
  stats: { gamesPlayed, wins, winsAsWolf, winsAsVillager, winsAsLover, roleCounts }

matches/{code}-{createdAt}                ← KHÔNG realtime (chỉ người từng chơi đọc)
  code, winner, startedAt, endedAt, dayCount, playerCount, config
  playerIds: [uid...]                     ← để query array-contains
  players: [{uid, username, role, isAlive, won}]

rooms/{code}                              ← document (public trong room)
  code, hostId, hostMode, status, phase, dayCount, config
  timerEnd, timerPhase, phaseLabel        ← countdown + UI
  nightWake                               ← {actionType, label, duration, bittenPlayer?}
  dayResult, voteResult                   ← broadcast kết quả
  reveal, gameWinner                      ← chỉ phase=game_over
  cupidPair, lastGuardTarget, nightStep   ← admin-only state

rooms/{code}/players/{uid}                ← public (username, isAlive, isReady, seatIndex)
rooms/{code}/secrets/{uid}                ← owner-only (role, potions, linkedPartner)
rooms/{code}/nightActions/{actionId}      ← admin-only (chỉ API route đọc)
rooms/{code}/votes/{voterUid}             ← đọc khi phase=voting
rooms/{code}/messages/{msgId}             ← chat (rules gate wolf/dead)
```

## Secret State — cách không lộ role

Firestore không có field-level redaction theo viewer. Giải pháp:

1. **`players/{uid}`** — public, mọi người đọc được (không có role).
2. **`secrets/{uid}`** — rule `request.auth.uid == uid` mới đọc được.
   Chứa role, witchSaveUsed, witchPoisonUsed, linkedPartner.
3. **`nightActions`** — rule deny tất cả client reads. Chỉ Admin SDK.

Client assemble `RoomState` từ:
- room doc (public phase/config)
- players subcollection (public)
- secrets/{uid} của chính mình (role + lover)
- reveal map (chỉ khi game_over) → biết role người khác

Wolf partners: chỉ lộ ở game_over qua `reveal`. Mid-game wolf chat vẫn hoạt
động (rules gate theo role), UI hiển thị "bầy sói" chung chung.

## API Routes

| Route | Chức năng |
|---|---|
| `POST /api/game/create` | Tạo phòng (host = seat 0) |
| `POST /api/game/join` | Tham gia phòng |
| `POST /api/game/leave` | Rời phòng (reassign host nếu cần) |
| `POST /api/game/ready` | Toggle ready |
| `POST /api/game/kick` | Host kick người |
| `POST /api/game/start` | Bắt đầu game (gán role + secrets) |
| `POST /api/game/night-action` | Wolf/seer/witch/guard hành động |
| `POST /api/game/cupid-link` | Cupid ghép đôi |
| `POST /api/game/vote` | Bỏ phiếu |
| `POST /api/game/hunter-shoot` | Thợ săn bắn |
| `POST /api/game/tick` | Phase advance (engine chính) |
| `POST /api/game/host-next` | Host force advance (direct/hybrid) |
| `POST /api/game/message` | Chat (validate role/alive) |

Tất cả route: `verifyIdToken(Bearer)` → load state → compute → write Firestore
(Admin SDK bypasses rules).

## Game Flow (auto mode)

```
start → role_reveal (10s)
  → tick → startNightLadder (phase=night, step 0)
    → tick (mỗi step hết) → advanceNightStep
      → hết ladder → night_resolve (3s)
        → tick → runNightResolution
          → deaths, hunter?, win check
          → day (90s thảo luận) hoặc hunter_shoot (15s)
  → tick → voting (30s)
    → tick → vote_result (8s)
      → hunter? → tick → startNightLadder (loop)
```

Timers trên client: `timerEnd` epoch-ms. Client setTimeout → gọi tick.
Dedup bằng `timerEnd` value (mỗi interval fire 1 lần).

## Deploy

- **Dockerfile**: multi-stage build (Bun runtime), expose port 8080.
- **Cloud Run**: deploy image, set env vars (Firebase Admin via Secret Manager).
- **Firebase Hosting**: rewrite `**` → Cloud Run service `masoimaster-web`.
- **Firestore**: deploy rules + indexes (`firebase deploy --only firestore`).

```bash
# Deploy tất cả
firebase deploy

# Chỉ Firestore rules + indexes
firebase deploy --only firestore:rules,firestore:indexes

# Chỉ Hosting (sau khi Cloud Run image đã update)
firebase deploy --only hosting
```

## Files chính

| File | Vai trò |
|---|---|
| `firestore.rules` | Security rules (secret state gate) |
| `src/lib/firestore-server.ts` | Admin SDK client + loaders + types |
| `src/lib/match-archive.ts` | Lưu trận + stats khi game_over (non-realtime) |
| `src/lib/history-client.ts` | Client đọc stats + lịch sử (one-shot get) |
| `src/components/game/stats-history.tsx` | UI Thống kê & Lịch sử ở Home |
| `src/lib/game-logic.ts` | Pure logic (resolveNight, resolveVotes, checkWin, chainDeath) |
| `src/app/api/game/*` | 12 API routes |
| `src/lib/game-client.ts` | Client API wrappers + onSnapshot subscribe |
| `src/components/game/socket-provider.tsx` | GameProvider (map emit→API, owns subscription, tick timer) |
| `src/lib/firebase.ts` | Client SDK init (Auth + Firestore) |
| `Dockerfile` | Cloud Run image |

## Rủi ro đã xử lý

- **Secret leak**: rules deny nightActions; secrets owner-only; reveal chỉ game_over.
- **Tick race**: nhiều client gọi `/tick` đồng thời → server re-validate `timerEnd`
  + Firestore write last-write-wins (idempotent vì phase chuyển 1 lần).
- **Cost**: onSnapshot chỉ subscribe room hiện tại; disconnect khi rời phòng.
- **Reconnect**: localStorage cache room code → vào lại phòng tự động.
