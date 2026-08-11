# 📋 BÀN GIAO SESSION — Ma Sói Realtime (masoimaster)

> Tài liệu bàn giao cho AI/developer tiếp theo. Cập nhật: 2026-08-12.
> Đọc file này TRƯỚC KHI làm bất cứ điều gì với dự án.
> **Docs chính thức**: `docs/FEATURES.md`, `docs/SCENARIOS.md`, `docs/ANTI-PEEK.md`.

---

## 1. Dự án là gì

Web app **quản trò Ma Sói (Werewolf) realtime** — Next.js 16 (App Router) + Bun,
tiếng Việt, mobile-first. Người chơi đăng nhập, tạo/join phòng bằng mã 6 ký tự,
chơi theo phase (đêm/ngày/bỏ phiếu) với 9 vai trò đã implement (sói, sói trắng, tiên tri,
phù thủy, bảo vệ, thợ săn, cupid, dân).

## 2. Trạng thái: ĐANG CHẠY PRODUCTION ✅

| | |
|---|---|
| **URL production** | https://masoimaster.vercel.app (alias phụ: masoimaster-henna.vercel.app) |
| **Hosting** | Vercel — project `phuongdayrois-projects/masoimaster`, user `phuongdayroi` |
| **Git remote** | git@github.com:phuongfullstack/masoimaster.git (nhánh `main`) |
| **Firebase project** | `masoimaster` — Auth + Firestore, gói **Spark (miễn phí)** |
| **Firestore database** | id **`masoimaster`** (KHÔNG phải `(default)`!), region `asia-southeast1`, Enterprise edition |
| **Dev local** | `bun run dev` → http://localhost:3000 |

Đã verify end-to-end trên production: trang chủ, auth 401, profile API với token
thật, tạo/join phòng, security rules (13/13 + 3/3 + smoke tests PASS).

**Session 2026-08-12 đã làm:**
- ✅ 3 docs mới: `docs/FEATURES.md`, `docs/SCENARIOS.md`, `docs/ANTI-PEEK.md`
- ✅ Design spec v2.0 (`design/project/uploads/ma-soi-ui-design-spec.md`)
- ✅ Anti-peek: fix 3 vi phạm (seer color, button labels, decoy fake-busy) → **11/11 compliant**
- ✅ Google login fix (signInWithRedirect fallback)
- ✅ Deploy Vercel mới (commit `30b6009`)
- ✅ Commit `51029bf` (docs) + `30b6009` (anti-peek)

## 3. Kiến trúc dữ liệu (toàn bộ trên Firebase)

**Realtime** — client subscribe `onSnapshot`, ghi qua API routes (Admin SDK):
```
rooms/{code}              phase, timer, config, kết quả đêm/vote, hostId, expiresAt (TTL)
  players/{uid}           public: username, isAlive, isReady, seatIndex
  secrets/{uid}           owner-only: role, bình thuốc, người yêu
  nightActions/{id}       admin-only (client không bao giờ đọc được)
  votes/{voterUid}        chỉ đọc được khi phase=voting
  messages/{msgId}        chat (wolf/dead lọc ở UI)
```

**Không realtime** — client đọc một lần (`getDoc`/`getDocs`):
```
users/{uid}               username + stats (gamesPlayed, wins theo phe, roleCounts)
matches/{code}-{ts}       lịch sử trận bất biến, ghi 1 lần lúc game_over
                          (transaction idempotent trong src/lib/match-archive.ts)
```

- Security rules: `firestore.rules` (đã deploy). Composite index matches đã deploy.
- Phòng cũ tự dọn bằng `cleanupExpiredRooms()` (lazy, gọi khi tạo phòng) —
  KHÔNG dùng Firestore TTL policy vì cần Blaze.
- Chi tiết: `docs/FIRESTORE-ARCHITECTURE.md`, `docs/FIREBASE-SETUP.md`, `docs/DEPLOY-VERCEL.md`.

## 4. File code quan trọng

| File | Vai trò |
|---|---|
| `src/lib/firebase.ts` | Client SDK init (Auth + Firestore named DB + Analytics) |
| `src/lib/firestore-server.ts` | Admin SDK, path helpers, types, cleanupExpiredRooms |
| `src/lib/firebase-admin.ts` | verifyIdToken (Bearer) |
| `src/lib/game-client.ts` | onSnapshot subscribe + wrapper 13 API routes |
| `src/lib/game-logic.ts` | Pure logic: resolveNight, resolveVotes, checkWin |
| `src/lib/match-archive.ts` | Ghi lịch sử + stats lúc game_over |
| `src/lib/history-client.ts` | Client đọc stats/lịch sử (one-shot) |
| `src/app/api/game/*` | 13 routes; `tick` là engine chuyển phase |
| `src/components/game/socket-provider.tsx` | GameProvider: map emit kiểu socket cũ → API, own subscription + timer tick |
| `src/lib/auth-context.tsx` | AuthProvider (email/password, email link, phone OTP, Google) |

## 5. ⚠️ NHỮNG ĐIỀU TUYỆT ĐỐI CẦN NHỚ

1. **KHÔNG nâng `firebase-admin` lên v14** — v14 kéo `jwks-rsa@4`+`jose@6`
   (ESM-only) làm crash `ERR_REQUIRE_ESM` mọi API route trên Vercel.
   Giữ **v13** (`jose@4` CJS). `engines.node = 22.x` trong package.json là cho Vercel.
2. **Firestore database tên `masoimaster`**, không phải `(default)` — mọi
   `getFirestore()` phải truyền id (code đã làm, env `NEXT_PUBLIC_FIREBASE_DATABASE_ID`).
3. **KHÔNG chạy `npx firebase` / `npx vercel` trần** — trùng tên với package SDK
   trong node_modules → lỗi "could not determine executable". Dùng scripts:
   `bun run fb:login` / `fb:deploy` / `vc:login` / `vc:deploy`.
4. `masoimaster.web.app` KHÔNG host được app này ở gói Spark (Next.js server
   cần Cloud Run = Blaze). Production là Vercel.
5. Secrets: `serviceAccountKey.json` (gốc dự án) và `.env` đã gitignore —
   **không bao giờ commit**. Trên Vercel secrets nằm trong env vars (11 biến, production).
6. Identity = Firebase `uid` từ token đã verify; client KHÔNG bao giờ được ghi
   Firestore trực tiếp (rules chặn) — mọi ghi qua API route.

## 6. Việc còn tồn đọng (không chặn hoạt động)

- [ ] **Rotate service account key** `43449d76...` — key này từng bị dán vào
      chat AI. Làm: Firebase Console → Project settings → Service accounts →
      Generate new private key → lưu đè `serviceAccountKey.json` local →
      cập nhật env `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` trên Vercel →
      xoá key cũ trong GCP IAM → redeploy (`bun run vc:deploy`).
- [ ] Bật Git integration trên Vercel dashboard (connect repo GitHub) nếu muốn
      push là tự deploy; hiện deploy thủ công bằng `bun run vc:deploy`.
- [ ] Dọn file legacy đã stub (xoá hẳn nếu muốn): `src/lib/db.ts`,
      `src/hooks/use-socket.ts`, `examples/websocket/`, `mini-services/game-server/`,
      `prisma/`, `db/custom.db`, các `.zscripts/*` của scaffold cũ.
- [ ] Wolf/dead chat hiện lọc ở UI (rules cho mọi người trong phòng đọc messages
      vì Firestore rules không lọc từng doc trong query) — nếu cần chặt hơn,
      tách wolf chat thành subcollection riêng + rule theo role.
- [ ] Nếu nâng lên Blaze sau này: bật Firestore TTL cho `rooms.expiresAt`
      (Console → Firestore → TTL) — chạy song song với lazy cleanup, vô hại.

### Session 2026-08-12 — roadmap tiếp theo (ưu tiên cao → thấp)
- [x] **Doctor** ✅ DONE (commit `6fff4ad` + earlier server-side commits) —
      9/18 vai implemented. Doctor heal = guard protect nhưng không last-target
      rule, không được tự chữa.
- [ ] **Implement 9 vai planned còn lại** (theo `docs/SCENARIOS.md`): tiếp theo
      `detective` (compare 2 — biết cùng phe hay không), `medium` (listen dead
      chat), `raven` (mark +2 vote), `chief` (vote ×2), `elder` (tank 1 bite),
      `jester` (win when voted out), `alpha_wolf` (alpha tiebreak),
      `wolf_seer` (soi phe), `cursed_wolf` (curse 1/ván). Mỗi vai cần:
      `implemented: true` + server logic + UI branch + night order.
- [ ] **Host Control Panel** — đã có commit `15a8d17` "Design Phase 6: Host
      Panel + master log + mid-game interventions" — verify có hoạt động không.
- [ ] **Personal Report (5 variants)** — design-S2 có báo cáo cá nhân mỗi
      người (saved/cursed/elder/poison/none). Hiện chỉ có death list công khai.
- [ ] **Dawn Transition** — cinematic 2-3s giữa night_resolve → day.
- [ ] **Wolf/dead chat tách subcollection** — hiện UI filter, không secure.

## 7. Lệnh thường dùng

```bash
bun run dev          # dev server :3000
bun run build        # production build (Next standalone)
bun run lint         # eslint
./node_modules/.bin/tsc --noEmit   # typecheck
bun run fb:deploy    # deploy firestore.rules + indexes (cần fb:login trước)
bun run vc:deploy    # deploy production lên Vercel (cần vc:login trước)
```

## 8. Tài khoản / nơi đăng nhập

- **Firebase Console**: project `masoimaster` (tài khoản Google của chủ dự án).
- **Vercel**: user `phuongdayroi` (đăng nhập qua GitHub), CLI đã login sẵn trên máy này.
- **GitHub**: `phuongfullstack/masoimaster`, push qua SSH key có sẵn trên máy.
- Authorized domains (Firebase Auth) hiện có: localhost, masoimaster.firebaseapp.com,
  masoimaster.web.app, masoimaster.vercel.app, masoimaster-henna.vercel.app,
  masoimaster-phuongdayrois-projects.vercel.app.
```
