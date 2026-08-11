# Ma Sói Realtime — Feature Catalog

> **Nguồn chân trị chính thức** cho hiện trạng production.
> Cập nhật: 2026-08-12. Production: `https://masoimaster.vercel.app`.
> Vai planned (chưa implement) nằm ở cuối mỗi mục, đánh dấu ✗.

---

## 1. Stack kỹ thuật

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 | Mobile-first |
| **UI kit** | shadcn/ui (New York) + Framer Motion + Nunito font | "Game"-prefix components |
| **Auth** | Firebase Authentication (client SDK) | 4 phương thức, xem §3 |
| **Realtime** | Firestore `onSnapshot()` | KHÔNG dùng Socket.io |
| **Game logic** | Next.js API routes + `firebase-admin` (verify token + Firestore Admin SDK) | 13 routes `/api/game/*` |
| **State store** | Firestore (room doc + subcollections) + Zustand (client) | |
| **Database** | Firestore (named DB `masoimaster`, region `asia-southeast1`) | KHÔNG phải `(default)` |
| **Match history** | Firestore `matches/{code}-{ts}` + `users/{uid}.stats` | `match-archive.ts` ghi lúc game_over |
| **Hosting** | Vercel (Cloud Run-compatible) | `masoimaster.vercel.app` |
| **Identity** | Firebase `uid` (verify mỗi API call qua Bearer ID token) | Client không bao giờ ghi Firestore trực tiếp |

### ❌ KHÔNG dùng (đã thay)
- ~~Supabase Realtime~~ → Firestore `onSnapshot`
- ~~Socket.io game server (port 3003)~~ → đã xóa, logic port sang API routes
- ~~Prisma + SQLite cho game state~~ → Firestore (Prisma còn cho profile `users/{uid}`)
- ~~Discord SSO~~ → không có
- ~~Nickname-only login~~ → yêu cầu Firebase Auth

---

## 2. Vai trò (Roles)

### 2.1 Đã implement ✓ (8 vai — chạy production)

| # | Key | Emoji | Tên VN | Phe | Night Action | Mô tả ngắn |
|---|---|---|---|---|---|---|
| 1 | `werewolf` | 🐺 | Ma Sói | Sói | `wolf_bite` (1 target) | Mỗi đêm cùng bầy chọn 1 người cắn. Thấy đồng đội bầy. |
| 2 | `white_werewolf` | 🐺 | Sói Trắng | Sói | `wolf_bite` (1 target) | Sói phe sói nhưng thắng ĐỘC LẬP khi tất cả sói khác chết. |
| 3 | `seer` | 🔮 | Tiên Tri | Dân | `seer_check` (1 target) | Mỗi đêm soi 1 người → biết phe (Sói/Dân). |
| 4 | `witch` | 🧪 | Phù Thủy | Dân | `witch_save` + `witch_poison` (mỗi loại 1 lần/ván) | Có 1 thuốc cứu (cứu người bị cắn đêm đó) + 1 thuốc độc (giết ai đó). |
| 5 | `guard` | 🛡️ | Bảo Vệ | Dân | `guard_protect` (1 target) | Mỗi đêm che chắn 1 người khỏi cắn. Không bảo vệ cùng người 2 đêm liền. |
| 6 | `hunter` | 🏹 | Săn Thủ | Dân | (passive — bắn khi chết) | Khi chết (cắn/poison/vote), được bắn 1 người theo. |
| 7 | `cupid` | 💘 | Thần Tình Yêu | Độc lập | `cupid_link` (2 targets, đêm 1 only) | Đêm 1 ghép đôi 2 người. Cặp đôi thắng ĐỘC LẬP khi cả 2 còn sống và mọi người khác chết. |
| 8 | `villager` | 👤 | Dân Thường | Dân | (không có) | Không kỹ năng. Dựa vào phân tích + vote. |

**Win conditions:**
- **Sói thắng**: số sói còn sống ≥ số dân còn sống.
- **Dân thắng**: không còn sói sống.
- **Tình nhân (cupid) thắng**: cả 2 người trong cặp còn sống VÀ chỉ còn 2 người sống (kiểm tra TRƯỚC sói/dân).
- **Sói Trắng thắng**: tất cả sói khác chết (đóng vai như 1 phe sói thường cho đến khi giết hết đồng loại).

### 2.2 Planned (10 vai — có trong registry `roles.ts`, `implemented: false`)

Các vai này **ẩn khỏi UI tạo phòng** (`sanitizeConfig()` bỏ vai `implemented: false`). Có design target đầy đủ trong `docs/SCENARIOS.md`.

| Key | Emoji | Tên VN | Phe | Night Action | Status |
|---|---|---|---|---|---|
| `alpha_wolf` | 👹 | Sói Đầu Sỏ | Sói | `wolf_bite` (chia phiếu bầy) | ✗ planned |
| `wolf_seer` | 🌘 | Sói Tiên Tri | Sói | `wolf_seer_check` (1 target) | ✗ planned |
| `cursed_wolf` | 🌑 | Sói Nguyền | Sói | `curse` (1 lần/ván) | ✗ planned |
| `doctor` | 💊 | Bác Sĩ | Dân | `doctor_heal` (1 target) | ✗ planned |
| `detective` | 🕵️ | Thám Tử | Dân | `detective_compare` (2 targets) | ✗ planned |
| `medium` | 🕯️ | Bà Đồng | Dân | `medium_listen` (passive) | ✗ planned |
| `raven` | 🐦 | Con Quạ | Dân | `raven_mark` (1 target, +2 vote) | ✗ planned |
| `chief` | 🏛️ | Trưởng Làng | Dân | (passive — vote ×2) | ✗ planned |
| `elder` | 👴 | Lão Làng | Dân | (passive — chịu 1 cắn) | ✗ planned |
| `jester` | 🤡 | Thằng Ngố | Độc lập | (passive — thắng khi bị vote) | ✗ planned |

### 2.3 Night order (ladder thức tự hành động đêm)

**Implemented (hiện tại):**
```
cupid (đêm 1 only) → guard → wolves (cắn chung) → seer → witch (save + poison)
```

**Target (khi đủ 18 vai):** xem `NIGHT_ORDER` trong `src/lib/roles.ts` — 11 bước, các vai cùng phe sói gộp vào 1 bước `wolf_bite` chung.

---

## 3. Authentication

| Phương thức | Status | UI location | Ghi chú |
|---|---|---|---|
| **Email + Password** | ✓ | Login → tab "Email" → Đăng Ký/Đăng Nhập | Mặc định, mật khẩu ≥ 6 ký tự |
| **Email Link (passwordless)** | ✓ | Login → tab "Link Email" | Gửi link qua email, click để đăng nhập |
| **Phone OTP** | ✓ | Login → tab "Số ĐT" | reCAPTCHA invisible + SMS OTP (test mode tránh tốn phí) |
| **Google** | ✓ | Login → nút "Đăng Nhập Với Google" | `signInWithPopup` + fallback `signInWithRedirect` (cho mobile webview chặn popup) |
| ~~Discord~~ | ✗ | — | Không có |
| ~~Nickname-only~~ | ✗ | — | Không có — phải đăng nhập Firebase |

**Profile onboarding**: sau đăng nhập lần đầu, màn "Chọn Tên Hiển Thị" → lưu vào Prisma `users/{uid}.username`.

**Token verify**: mỗi API call gửi `Authorization: Bearer <idToken>`. Server `verifyIdToken()` → `uid`. Client không bao giờ gửi `userId` tự tin tưởng.

---

## 4. Phases (Game Flow)

```
lobby → role_reveal (10s)
      → night (ladder: cupid 15s → guard 15s → wolves 30s → seer 15s → witch 20s)
      → night_resolve (3s — compute deaths)
      → day (90s thảo luận + chat)
            ├── hunter_shoot (15s nếu hunter chết)
            └── voting (30s) → vote_result (8s)
                  └── loop về night HOẶC game_over
```

- **Timer engine**: client-driven tick. Client countdown dựa `room.timerEnd`, khi hết gọi `POST /api/game/tick`. Server validate `Date.now() >= timerEnd` rồi advance. Idempotent.
- **Host modes**: `auto` (mặc định, timer-driven), `direct` (host bấm), `hybrid` (auto + host skip). Hiện `direct`/`hybrid` chỉ có 1 nút "Chuyển pha", chưa có Host Panel đầy đủ.

---

## 5. Màn hình (Screens)

| Màn | Status | Component | Ghi chú |
|---|---|---|---|
| Login | ✓ | `login-screen.tsx` | 3 tabs + Google |
| Home | ✓ | `home-screen.tsx` | Tạo/join phòng + cấu hình vai |
| Lobby | ✓ | `lobby-screen.tsx` | Mã phòng + player list + ready + start |
| Profile Setup | ✓ | `profile-setup.tsx` | Chọn tên hiển thị lần đầu |
| Role Reveal | ✓ | `game-screen.tsx:RoleReveal` | Nhấn giữ để xem, blur 7px, haptic 12ms |
| Night (per role) | ✓ partial | `game-screen.tsx:NightScreen` | Wolf/seer/witch/guard/cupid. 10 vai planned chưa có UI |
| Night Waiting (decoy) | ✓ | `game-screen.tsx:NightWaiting` | Cùng UI cho mọi vai không có action |
| Day Discussion | ✓ | `game-screen.tsx:DayScreen` | Chat + death announcement |
| Voting | ✓ | `game-screen.tsx:VotingScreen` | Chọn target + skip vote |
| Vote Result | ✓ | `VotingScreen` (inline) | Tie/eliminate + chained deaths |
| Hunter Shoot | ✓ | `game-screen.tsx:HunterShoot` | Hunter chọn ai bắn theo |
| Game Over | ✓ | `game-screen.tsx:GameOverScreen` | Winner + reveal all roles |
| Disconnect Overlay | ✓ | `ui/DisconnectOverlay.tsx` | |
| 🎴 CardFab (re-check card) | ✓ | `ui/CardFab.tsx` | Nút nổi xem lại vai của mình |
| Host Control Panel | ✗ | — | Chỉ có 1 nút "Chuyển pha", chưa có Master Log |
| Dawn Transition (cinematic) | ✗ | — | Bỏ qua, `night_resolve` 3s thay thế |
| Personal Report (5 variants) | ✗ | — | Chỉ có death list công khai |
| Card Deal (8 cards fly in) | ✗ | — | Bỏ qua, vào RoleReveal luôn |

---

## 6. Anti-peek patterns

Xem chi tiết `docs/ANTI-PEEK.md`. Tóm tắt:

| Rule | Status |
|---|---|
| 1. Không mã hóa phe bằng màu trên thẻ bí mật | ✓ RoleReveal OK / ⚠ Seer result vi phạm (dùng red/green) |
| 2. Mọi thẻ bí mật cùng chiều cao | ✓ (role card 330px) |
| 3. Không in tên vai trên màn đang chơi | ✓ Night header ghi "ĐẾN LƯỢT BẠN" |
| 4. Nhãn nút generic ("Xác nhận") | ⚠ Vi phạm — `promptVi`/`confirmVi` ghi "Xác nhận cắn/soi/bảo vệ" |
| 5. Mọi panel đêm cùng ngôn ngữ thị giác | ✓ Single `NIGHT_ACCENT` cho mọi vai |
| Press-to-reveal (blur + haptic) | ✓ `ui/PressToReveal.tsx` |
| Decoy screen (cho vai không action) | ✓ `NightWaiting` |
| Decoy fake timer + progress bar | ✗ Missing |
| 🎴 CardFab re-check | ✓ |

---

## 7. Chat system

| Type | Ai gửi được | Ai đọc được | Phân tách ở đâu |
|---|---|---|---|
| `public` | Ai còn sống | Tất cả trong phòng | Firestore `messages/{msgId}` + UI filter |
| `dead` | Ai đã chết | Chỉ người chết | API route validate role; UI lọc |
| `wolf` | Chỉ sói | Chỉ sói | API route validate role; UI lọc |
| `system` | Server (API route) | Tất cả | Auto-generated (join/leave/phase change) |

**Lưu ý**: hiện UI lọc wolf/dead chat ở client (`DayScreen` chỉ hiện public + system). Người chết thấy chat dead qua message type. Rules Firestore cho phép mọi người trong phòng đọc `messages` (không lọc per-doc được) → enforcement nằm ở API route.

---

## 8. Security model

- **Identity**: Firebase `uid` từ ID token đã verify. KHÔNG bao giờ tin `userId` client gửi.
- **Firestore rules**:
  - `rooms/{code}` — đọc cho mọi user authed; write chỉ qua Admin SDK.
  - `players/{uid}` — public trong phòng.
  - `secrets/{uid}` — owner-only (`request.auth.uid == uid`).
  - `nightActions` — deny tất cả client reads.
  - `votes` — đọc khi `phase == 'voting'`.
- **API routes**: mỗi route `verifyIdToken(Bearer)` → load state → compute → write Firestore (Admin SDK bypasses rules).

Xem `firestore.rules` + `docs/FIRESTORE-ARCHITECTURE.md`.

---

## 9. Match History & Player Stats

- **`matches/{code}-{ts}`** — bản ghi trận bất biến, ghi 1 lần lúc `game_over`:
  - `src/lib/match-archive.ts` — transaction idempotent (an toàn khi tick retry)
  - Dữ liệu: players, roles, winner, duration, dayCount
- **`users/{uid}.stats`** — thống kê cá nhân:
  - `gamesPlayed`, `wins` theo phe, `roleCounts`
  - Cập nhật cùng lúc với match-archive
- **Client read** (one-shot `getDoc`, KHÔNG realtime):
  - `src/lib/history-client.ts` — wrapper đọc stats + lịch sử
  - `src/components/game/stats-history.tsx` — UI hiển thị

---

## 9. Production status

| | |
|---|---|
| **URL** | https://masoimaster.vercel.app |
| **E2E test** | ✓ PASS (4 users, full flow: create → join → start → night → resolve → game over) |
| **Firestore rules** | ✓ Deployed, test 13/13 PASS |
| **Firebase Auth providers** | ✓ Email/PW, Email Link, Phone, Google |
| **Service account key** | ⚠ Cần rotate (key `43449d76...` từng bị lộ) |

---

## 10. Files tham chiếu

| File | Vai trò |
|---|---|
| `src/lib/roles.ts` | Role registry (18 vai, `implemented` flag, night order) |
| `src/lib/types.ts` | Phase, PHASE_CONFIG, ROLE_INFO re-export |
| `src/styles/ma-soi-tokens.css` | CSS design tokens (playful green + per-role) |
| `src/lib/auth-context.tsx` | AuthProvider (4 methods + Google) |
| `src/lib/firebase.ts` | Client SDK init (Auth + Firestore named DB) |
| `src/lib/firestore-server.ts` | Admin SDK client + loaders + types |
| `src/lib/game-logic.ts` | Pure logic (resolveNight, resolveVotes, checkWin, chainDeath) |
| `src/lib/game-client.ts` | onSnapshot subscribe + 13 API wrappers |
| `src/lib/match-archive.ts` | Ghi lịch sử trận + stats lúc game_over |
| `src/lib/history-client.ts` | Client đọc stats/lịch sử (one-shot) |
| `src/app/api/game/*` | 13 routes; `tick` là engine chuyển phase |
| `src/components/game/game-screen.tsx` | RoleReveal/NightScreen/DayScreen/VotingScreen/HunterShoot/GameOver |
| `src/components/game/ui/PressToReveal.tsx` | Anti-peek primitive (nhấn giữ) |
| `src/components/game/ui/CardFab.tsx` | 🎴 re-check card |
| `firestore.rules` | Security rules |
| `docs/FIRESTORE-ARCHITECTURE.md` | Backend architecture |
| `docs/FIREBASE-SETUP.md` | Firebase Console setup guide |
| `docs/SCENARIOS.md` | 18-role catalog + game setups |
| `docs/ANTI-PEEK.md` | Anti-peek rules + status |
