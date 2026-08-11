# Plan: Rewrite Ma Sói sang Firestore Realtime + Deploy Firebase

## Quyết định kiến trúc (theo best-judgment)
- **Realtime**: Firestore `onSnapshot()` thay Socket.io — phù hợp game turn-based (latency 200-500ms OK).
- **Game logic**: Next.js API routes (verify Firebase ID token qua admin SDK, compute, write Firestore).
- **Timers**: **Client-driven tick** — client countdown dựa `timerEnd`, khi hết gọi `POST /api/game/tick`. Route validate `Date.now() >= timerEnd` rồi advance. Idempotent (nhiều client gọi = không sao).
- **Deploy**: **Cloud Run** (containerize Next.js + Bun) + **Firebase Hosting rewrite** mọi path → Cloud Run. Hỗ trợ SSR + API routes.
- **Scope**: **Milestone-based** — deploy + test sau mỗi milestone.

## Vấn đề cốt lõi đã giải quyết: Secret State

Firestore không có field-level redaction theo viewer. Giải pháp = **chia 2 collection**:
- `players/{uid}` — public info (username, isAlive, isReady, seatIndex) — đọc tự do
- `secrets/{uid}` — secret info (role, witchSaveUsed, witchPoisonUsed, linkedPartner) — rule `request.auth.uid == uid` mới đọc được

---

## Firestore Data Model

```
rooms/{code}                              ← document (public trong room)
  code, hostId, hostMode, status, phase, dayCount, config
  timerEnd, timerPhase                    ← countdown state
  cupidPair, lastGuardTarget              ← admin-only (rules deny client)
  nightWake                               ← {actionType, label, duration, bittenPlayer?}
  dayResult                               ← {deaths[], saved} (phase=day)
  voteResult                              ← {eliminated, chainedDeaths[], voteCounts, isTie}
  reveal                                  ← {uid: role} (chỉ phase=game_over)

rooms/{code}/players/{uid}                ← public per-player
  userId, username, isAlive, isReady, seatIndex

rooms/{code}/secrets/{uid}                ← owner-only (rule: request.auth.uid == uid)
  role, witchSaveUsed, witchPoisonUsed, linkedPartner

rooms/{code}/nightActions/{actionId}      ← admin-only (rule: deny all client reads)
  actorId, actionType, targetId

rooms/{code}/votes/{voterUid}             ← đọc khi phase=voting
  targetId

rooms/{code}/messages/{msgId}             ← chat
  senderId, senderName, content, msgType, phase, createdAt
```

**Firestore Rules** (key logic):
- `rooms/{code}`: đọc nếu là player trong room; write qua admin SDK only
- `players/{uid}`: đọc nếu trong room
- `secrets/{uid}`: đọc chỉ khi `request.auth.uid == uid`
- `nightActions`: **deny tất cả client reads** (chỉ admin SDK)
- `votes/{uid}`: đọc khi `phase == 'voting'`
- `messages`: đọc theo msgType + role/alive (wolf chat → wolves; dead chat → dead)

---

## API Routes (thay socket handlers)

Mỗi route: verify Firebase ID token (Bearer) → compute → write Firestore via admin SDK.

| Route | Thay cho socket event |
|---|---|
| `POST /api/game/create` | `create-room` |
| `POST /api/game/join` | `join-room` |
| `POST /api/game/leave` | `leave-room` |
| `POST /api/game/ready` | `player-ready` |
| `POST /api/game/start` | `start-game` (gán role, viết secrets) |
| `POST /api/game/night-action` | `night-action` (wolf/seer/witch/guard) |
| `POST /api/game/cupid-link` | `cupid-link` |
| `POST /api/game/vote` | `submit-vote` |
| `POST /api/game/hunter-shoot` | `hunter-shoot` |
| `POST /api/game/tick` | **MỚI** — phase advance (resolve night, start voting, etc.) |
| `POST /api/game/host-next` | `host-next-phase` (chế độ direct/hybrid) |
| `POST /api/game/kick` | `kick-player` |

Logic port nguyên từ `index.ts` (resolveNight, resolveVotes, checkWinCondition, applyLoverChainDeaths, autoPairLovers) sang TypeScript module dùng admin SDK.

---

## Client Rewrite

### `src/lib/game-client.ts` (NEW) — thay socket-provider
- `joinRoom(code)`, `createRoom(config)`, `startGame()`, `nightAction(...)`, `vote(...)`, v.v. — wrapper gọi API routes.
- `subscribeRoom(code, callbacks)` — `onSnapshot` room + players + secrets + messages + votes; trả unsubscribe.

### `src/store/game-store.ts` (EDIT)
- Thêm `unsubscribe: () => void` field.
- `setRoom` giờ nhận từ Firestore snapshot thay vì socket event.

### `src/components/game/socket-provider.tsx` (REPLACE)
- Đổi thành `GameProvider` — gọi `subscribeRoom` khi vào room, unsubscribe khi rời.
- Không còn Socket.io.

### Timer hook (NEW)
- `usePhaseTimer(room)` — countdown dựa `room.timerEnd`; khi = 0, gọi `POST /api/game/tick` (một client, có dedup bằng `phase` check).

---

## Milestones (deploy + test sau mỗi)

### M1: Firestore infra + Lobby lifecycle
- `firestore.rules`, `firestore.indexes.json`
- API routes: create, join, leave, ready, kick
- Client: GameProvider, subscribeRoom, lobby UI dùng Firestore
- Deploy Cloud Run + Hosting, test tạo phòng + join + ready

### M2: Game start + Night
- API routes: start (gán role + secrets), night-action, cupid-link, tick (resolve night)
- Client: role reveal, night screens (wolf/seer/witch/guard/cupid), timer hook
- Deploy, test night flow

### M3: Day + Voting + Endgame
- API routes: vote, tick (resolve vote), hunter-shoot, tick (advance)
- Client: day, voting, vote result, game over, hunter shoot
- Chat (messages subcollection + rules wolf/dead)
- Deploy, test full game end-to-end

---

## Deploy Infrastructure

### `Dockerfile` (root, NEW)
- Multi-stage: install deps → build Next.js standalone → run `bun .next/standalone/server.js`
- Bun runtime image (`oven/bun:1.1`)

### `firebase.json` (NEW)
```json
{
  "hosting": {
    "rewrites": [{ "source": "**", "run": { "serviceId": "masoimaster-web", "region": "us-central1" } }]
  },
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
}
```

### `.firebaserc` (NEW)
```json
{ "projects": { "default": "masoimaster" } }
```

### `apphosting.yaml` HOẶY Cloud Run env
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Secret Manager)
- `NEXT_PUBLIC_FIREBASE_*` (env vars)

### Cleanup
- Xóa `mini-services/game-server/` (không còn dùng — logic port sang API routes).
- Cập nhật `next.config.ts` (bỏ socket.io rewrite).

---

## Tóm tắt file
| File | Hành động |
|---|---|
| `firestore.rules` | **NEW** — secret state rules |
| `firestore.indexes.json` | **NEW** |
| `firebase.json`, `.firebaserc` | **NEW** — deploy config |
| `Dockerfile` | **NEW** — Bun + Next standalone |
| `src/lib/firestore-server.ts` | **NEW** — admin SDK Firestore client |
| `src/lib/game-logic.ts` | **NEW** — port resolveNight/resolveVotes/checkWin/chainDeath |
| `src/app/api/game/*.ts` (12 routes) | **NEW** |
| `src/lib/game-client.ts` | **NEW** — API wrappers + onSnapshot subscribe |
| `src/components/game/game-provider.tsx` | **NEW** (thay socket-provider) |
| `src/store/game-store.ts` | EDIT |
| `src/app/page.tsx` | EDIT (dùng GameProvider) |
| `next.config.ts` | EDIT (bỏ socket rewrite) |
| `docs/FIRESTORE-ARCHITECTURE.md` | **NEW** |
| `mini-services/game-server/` | DELETE |

## Rủi ro
- **Secret state**: rules phải test kỹ — leak role = game hỏng.
- **Tick race**: nhiều client gọi `/tick` đồng thời — dùng Firestore transaction + `phase` check để idempotent.
- **Chat msgType enforcement**: rules phức tạp (wolf chat chỉ wolves); test kỹ.
- **Cost**: Firestore reads/writes theo usage; onSnapshot intelligent (chỉ subscribe room hiện tại).
- **Scope lớn**: ~12 API routes + client rewrite. Milestone-based để giảm rủi ro.

## Bắt đầu với M1
Tôi sẽ bắt đầu milestone 1: Firestore rules + lobby API routes + client subscribe + deploy infra. Sau khi M1 deploy + test OK, báo bạn rồi tiếp M2.