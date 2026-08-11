# Ma Sói Realtime — UI/UX Design Specification v2.0

> **Canonical spec** — phản ánh chính xác hiện trạng production.
> v1.0 đã lỗi thời (đề cập Supabase/Discord/nickname-only — đã thay bằng Firebase).
> Production: `https://masoimaster.vercel.app`. Cập nhật: 2026-08-12.
>
> **Target vision** (17 vai đầy đủ, Be Vietnam Pro, moonlight-only) nằm ở:
> `design/project/design_handoff_ma_soi_realtime/` — xem để biết design goal dài hạn.
> Hiện trạng thực tế (8 vai, Nunito, hybrid palette) nằm trong spec NÀY.

---

## 1. Visual Style Guide

### 1.1 Phong cách chung

- **Theme**: Hybrid — **Dark Playful** (xanh lá Duolingo-style) cho màn public +
  **Dark Fantasy Moonlight** (xanh nhạt) cho màn bí mật.
- **Vibe**: Vui tươi, rounded, chunky shadows cho CTA (lobby, home, day, voting).
  Bí ẩn, tối giản cho màn vai trò (role reveal, night action).
- **Border radius**: 12px (button), 16-20px (card), 9999px (pill/badge)
- **Shadow**: Chunky bottom shadow (`shadow-game` = 4px solid) cho CTA, soft glow
  cho thẻ vai trò.
- **Animation**: Framer Motion — spring/bouncy cho playful, subtle fade cho
  mystery screens.

### 1.2 Bảng màu — Hybrid Palette

#### Public surfaces (playful green) — `src/styles/ma-soi-tokens.css`

| Token | Hex | Công dụng |
|---|---|---|
| `--ms-brand` | `#58cc02` | CTA primary, success, accent chính |
| `--ms-brand-dark` | `#4caf00` | Shadow cho brand button |
| `--ms-bg-primary` | `#1a1a2e` | Background chính |
| `--ms-bg-secondary` | `#16213e` | Background phụ (gradient end) |
| `--ms-card` | `#232946` | Card, panel |
| `--ms-card-hover` | `#2a2d4a` | Hover state |
| `--ms-text-primary` | `#ffffff` | Text chính |
| `--ms-text-secondary` | `#a0a3bd` | Mô tả, hint |
| `--ms-text-muted` | `#6b6f8d` | Caption, muted |
| `--ms-info` | `#1cb0f6` | Info accent (link, secondary action) |
| `--ms-warning` | `#ffc800` | Warning |
| `--ms-danger` | `#ff4b4b` / `#dc2626` | Danger, wolf action |

#### Secret surfaces (moonlight blue) — hardcoded inline trong game-screen.tsx

Dùng cho `RoleReveal`, `NightTurnHeader`, `NightScreen` target selection:

| Hex | Công dụng |
|---|---|
| `#A7C5EB` | Moonlight accent — viền, glow, target highlight |
| `#16141F` → `#211E30` | Gradient thẻ vai trò (private card bg) |
| `#353251` / `#35325180` | Border private card |
| `rgba(167,197,235,.5)` | Glow cho private card |

#### Per-role accent colors (`roles.ts` color field + `--ms-*` tokens)

| Role | Token | Hex | Ghi chú |
|---|---|---|---|
| Werewolf | `--ms-wolf` | `#ff4b4b` | Đỏ tươi |
| White Werewolf | `--ms-white-wolf` | `#ffc800` | Vàng cam |
| Seer | `--ms-seer` | `#ce82ff` | Tím |
| Witch | `--ms-witch` | `#00c9b7` | Teal |
| Guard | `--ms-guard` | `#ffc800` | Vàng |
| Hunter | `--ms-hunter` | `#ef4444` | Đỏ |
| Cupid | `--ms-cupid` | `#ff86d0` | Hồng |
| Villager | `--ms-villager` | `#3b82f6` | Xanh dương |

**⚠️ Anti-peek rule**: per-role colors CHỈ dùng ở màn **public** (lobby config,
day vote accent, game-over reveal). Trên **màn bí mật** (role card, night action
target) → dùng moonlight `#A7C5EB` neutral cho tất cả vai. Xem `docs/ANTI-PEEK.md`.

### 1.3 Typography

- **Font primary**: **Nunito** (rounded, friendly) — `var(--font-nunito)`
  - Weight: 400, 600, 700, 800, 900
  - Subset: latin + vietnamese
- **Font mono**: Geist Mono (cho room code)
- **Font sans**: Geist Sans (fallback)
- **Target font** (chưa implement): Be Vietnam Pro (cho production Việt Nam)
- **Sizes**: heading 24-32px, section 18-20px, body 14-16px, caption 12-13px

### 1.4 Icon Style

- Line icons (lucide-react), stroke 1.5-2px, size 20x20 / 24x24
- Mỗi vai có **emoji riêng** (xem §3) — capped 48px trên màn bí mật (anti-peek)

---

## 2. Application Screens

Status: ✓ implemented / ⚠ partial / ✗ missing

### Screen 1: Login ✓

**Component**: `src/components/game/login-screen.tsx`

- 3 tabs: **Email** | **Link Email** | **Số ĐT**
- **Email tab**: đăng ký + đăng nhập, có nút "Quên mật khẩu?"
- **Link Email tab**: passwordless — gửi link qua email
- **Số ĐT tab**: phone OTP (reCAPTCHA invisible + SMS)
- **Google button**: nằm trên cùng, có logo 4 màu
- **Divider**: "hoặc" giữa Google và 3 tabs
- **Error handling**: map Firebase error codes sang tiếng Việt

**❌ KHÔNG có**: nickname-only input, Discord button, "Powered by Supabase" footer.

### Screen 2: Profile Setup ✓

**Component**: `src/components/game/profile-setup.tsx`

- Hiện sau đăng nhập lần đầu (chưa có displayName)
- Input "Chọn Tên Hiển Thị" → PATCH `/api/profile`
- Default name = email local-part hoặc 4 số cuối phone

### Screen 3: Home ✓

**Component**: `src/components/game/home-screen.tsx`

- Header: logo + chào username + logout
- **Quick Join**: input mã phòng + nút "Vào Phòng"
- **Create Room**: 
  - Host mode selector (Auto / Direct / Hybrid)
  - Config collapsible (chỉnh số mỗi vai — 8 vai implemented)
  - Warning khi config cần nhiều người
- GameButton "Tạo Phòng 🐺"

### Screen 4: Lobby ✓

**Component**: `src/components/game/lobby-screen.tsx`

- Mã phòng lớn + copy button
- Config summary (badge mỗi vai × số lượng)
- Player list (avatar + ready status + host kick)
- Ready button (non-host) / Start button (host)
- Leave button

### Screen 5: Role Reveal ✓

**Component**: `game-screen.tsx:RoleReveal` (line 190)

- **Anti-peek compliant**: same card frame cho mọi vai (gradient `#16141F→#211E30`, border `#35325180`)
- **Press-to-reveal**: nhấn giữ → hiện role, thả → ẩn
- Card height: `min-height: 330px` (uniform)
- Phe hiển thị dạng **text** uppercase, không màu
- Wolf partners list (nếu sói) — text only
- Lover partner (nếu được cupid link) — text only, pink accent
- Auto-dismiss 10s

### Screen 6: Night Phase ✓ partial

**Component**: `game-screen.tsx:NightScreen` (line 318)

- **NightTurnHeader**: "🌙 ĐẾN LƯỢT BẠN" — không in tên vai
- **Target selection**: single moonlight accent (`#A7C5EB`) cho mọi vai
- **Per-role UI branches** (implemented):
  - Wolf: chat bầy + target grid (loại trừ đồng đội)
  - Seer: target grid + PressToReveal kết quả
  - Witch: save card (nếu có bittenPlayer) + poison target grid
  - Guard: target grid (loại trừ lastGuardTarget)
  - Cupid: chọn 2 target + confirm button
- **NightWaiting decoy** (line 288): cùng UI cho vai không có action

**⚠️ Vi phạm anti-peek**: seer result dùng red/green color (xem ANTI-PEEK.md Rule 1).
**❌ Missing UI cho 10 vai planned** (doctor, detective, medium, raven, alpha_wolf, wolf_seer, cursed_wolf, chief, elder, jester).

### Screen 7: Day Discussion ✓

**Component**: `game-screen.tsx:DayScreen` (line 626)

- Header: "☀️ NGÀY THỨ N" + countdown timer
- Death announcement card (nếu có death) hoặc "Đêm qua hòa bình" card
- Chat panel (public + system messages)
- Chat input (disabled nếu đã chết)
- Player status strip (avatar alive/dead)
- Host "Chuyển sang Bỏ Phiếu" button (chế độ direct/hybrid)

**❌ KHÔNG có**: Personal Report (5 variants), dawn transition cinematic, ghost mode 2-tab UI.

### Screen 8: Voting ✓

**Component**: `game-screen.tsx:VotingScreen` (line 790)

- Target grid (alive players, loại trừ bản thân)
- Vote count badge trên mỗi target
- Skip vote button ("Bỏ phiếu trắng")
- Host "Kết Quả Phiếu" button (direct/hybrid)

### Screen 9: Vote Result ✓

**Component**: `VotingScreen` (inline result branch)

- Tie: "Hoà Phiếu!" + AlertTriangle icon
- Eliminate: avatar sad + name + vote breakdown
- Chained deaths (cupid): pink accent "Theo tình nhân: ..."

### Screen 10: Hunter Shoot ✓

**Component**: `game-screen.tsx:HunterShoot` (line 935)

- Hunter-only screen (khi `hunterTriggered` flag set)
- Target grid (alive players)
- 15s timer

### Screen 11: Game Over ✓

**Component**: `game-screen.tsx:GameOverScreen` (line 983)

- Winner announcement (werewolf/villager/lovers) với accent color tương ứng
- Confetti animation (Framer Motion)
- Full role reveal list (mọi player + role thật + alive/dead status)
- "Về Trang Chính" button

### Screen 12: Disconnect Overlay ✓

**Component**: `src/components/game/ui/DisconnectOverlay.tsx`

- Full-screen overlay khi mất kết nối
- Auto-reconnect indicator

### 🎴 CardFab ✓

**Component**: `src/components/game/ui/CardFab.tsx`

- Nút nổi trên mọi in-game screen
- Nhấn giữ → xem lại role của mình (PressToReveal)
- Anti-peek compliant

### ❌ Screens chưa implement

- **Host Control Panel**: chỉ có 1 nút "Chuyển pha", chưa có Master Log + 3-mode tabs
- **Dawn Transition** (cinematic 2-3s): bỏ qua, `night_resolve` 3s thay thế
- **Personal Report** (5 variants per-player): chỉ có death list công khai
- **Card Deal** (8 cards fly in animation): bỏ qua

---

## 3. Character / Role Designs

### 3.1 Implemented (8 vai ✓)

| Vai trò | Emoji | Phe | Color | Glow key | Mô tả |
|---|---|---|---|---|---|
| **Ma Sói** | 🐺 | Sói | `#dc2626` | `wolf` | Cắn chung bầy, thấy đồng đội |
| **Sói Trắng** | 🐺 | Sói* | `#f59e0b` | `white-wolf` | Sói phe sói, thắng độc lập |
| **Tiên Tri** | 🔮 | Dân | `#8b5cf6` | `seer` | Soi phe mỗi đêm |
| **Phù Thủy** | 🧪 | Dân | `#10b981` | `witch` | 1 thuốc cứu + 1 thuốc độc |
| **Bảo Vệ** | 🛡️ | Dân | `#f59e0b` | `guard` | Che chắn 1 người/đêm |
| **Săn Thủ** | 🏹 | Dân | `#ef4444` | `hunter` | Bắn 1 người khi chết |
| **Thần Tình Yêu** | 💘 | Độc lập | `#ec4899` | `cupid` | Ghép đôi đêm 1 |
| **Dân Thường** | 👤 | Dân | `#3b82f6` | `villager` | Không kỹ năng |

\* Sói Trắng phe sói nhưng win condition độc lập.

### 3.2 Planned (10 vai ✗ — trong registry, ẩn khỏi UI)

| Vai trò | Emoji | Phe | Planned action |
|---|---|---|---|
| Sói Đầu Sỏ | 👹 | Sói | `wolf_bite` (alpha, quyết khi bầy hòa) |
| Sói Tiên Tri | 🌘 | Sói | `wolf_seer_check` |
| Sói Nguyền | 🌑 | Sói | `curse` (1 lần/ván) |
| Bác Sĩ | 💊 | Dân | `doctor_heal` |
| Thám Tử | 🕵️ | Dân | `detective_compare` (2 targets) |
| Bà Đồng | 🕯️ | Dân | `medium_listen` |
| Con Quạ | 🐦 | Dân | `raven_mark` (+2 vote) |
| Trưởng Làng | 🏛️ | Dân | (passive, vote ×2) |
| Lão Làng | 👴 | Dân | (passive, chịu 1 cắn) |
| Thằng Ngố | 🤡 | Độc lập | (passive, thắng khi bị vote) |

Chi tiết: `docs/SCENARIOS.md`.

### 3.3 Character SVG components

Mỗi vai có SVG component riêng tại `src/components/characters/`:
- `Werewolf.tsx`, `WhiteWerewolf.tsx`, `Seer.tsx`, `Witch.tsx`, `Guard.tsx`, `Hunter.tsx`, `Cupid.tsx`, `Villager.tsx`
- Unified qua `CharacterIcon.tsx` — props: `role`, `size` (sm/md/lg/xl/hero), `state` (idle/happy/sad/action), `animated`, `glow`

---

## 4. Component Library

### 4.1 Game-prefix components (`src/components/ui/game/`)

| Component | Style | Công dụng |
|---|---|---|
| **GameButton** | Chunky shadow, 4 variants (primary/danger/secondary/ghost), 3 sizes | CTA |
| **GameInput** | Rounded-2xl, border focus brand | Text input |
| **GameCard** | Rounded-3xl, optional glow prop | Card wrapper |
| **GameBadge** | Pill, color prop | Role/team badge |
| **GameAvatar** | Circle, deterministic color from seatIndex | Player avatar |
| **GameTimerCircle** | Circular countdown | Phase timer |
| **GameProgress** | Linear progress | Vote progress |

### 4.2 Anti-peek primitives (`src/components/game/ui/`)

| Component | Công dụng |
|---|---|
| **PressToReveal** | Nhấn giữ để xem nội dung bí mật (blur 7px, haptic 12ms) |
| **CardFab** | 🎴 nút nổi re-check role |
| **DisconnectOverlay** | Mất kết nối |

### 4.3 Status indicators

| Status | Visual |
|---|---|
| Online | (Firestore realtime — không cần indicator) |
| Sẵn sàng | Badge xanh "✓ Sẵn Sàng" |
| Chờ | Badge xám "Chờ..." |
| Đã chết | Avatar xám + opacity 50% + line-through name |
| Host | (không có crown icon hiện tại — phân biệt qua Leader hint) |

---

## 5. Tech Stack

| Layer | Tech |
|---|---|
| **Auth** | Firebase Authentication (Email/PW + Email Link + Phone OTP + Google) |
| **Realtime** | Firestore `onSnapshot()` |
| **Game logic** | Next.js API routes + `firebase-admin` |
| **Database** | Firestore (named DB `masoimaster`) |
| **Hosting** | Vercel |
| **Identity** | Firebase `uid` (verify mỗi API call) |

**❌ KHÔNG dùng**: Supabase, Socket.io, Discord SSO, Prisma cho game state.

Chi tiết: `docs/FIRESTORE-ARCHITECTURE.md`, `docs/FEATURES.md`.

---

## 6. Anti-Peek Patterns

5 nguyên tắc + status hiện tại: xem `docs/ANTI-PEEK.md`.

Tóm tắt: 7/11 ✅ tuân thủ, 3 ⚠ vi phạm nhẹ (seer color, button labels, emoji size), 1 ❌ missing (decoy fake-busy elements).

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | 1 cột, player grid 2 cột, full-width cards |
| Tablet | 640-1024px | 2 cột actions, player grid 3 cột |
| Desktop | > 1024px | Max-width 640px centered, player grid 4 cột |

Mobile-first — người chơi thường ngồi cùng phòng, dùng điện thoại.

---

## 8. Animation Library (`src/styles/animations.ts`)

| Animation | Type | Công dụng |
|---|---|---|
| `springBouncy` | Spring | Card entrance |
| `springSnappy` | Spring | Selection feedback |
| `characterBounce` | Keyframe | Character icon entrance |
| `characterFloat` | Keyframe | Idle float |
| `staggerContainer/Item` | Variants | List stagger |
| `selectBounce` | Target | Target selection tap |
| `timerPulse` | Target | Timer urgent |
| `deathFade` | Variant | Death card |
| `winBounce` | Variant | Game over winner |
| `chatMessage` | Variant | Chat message entrance |
| `buttonPress` | Target | CTA tap |

CSS animations (`ma-soi-tokens.css`): `animate-float`, `animate-bounce-in`, `animate-slide-up`, `animate-glow-pulse`.

---

## 9. Tham chiếu

- **Feature catalog chính thức**: `docs/FEATURES.md`
- **Role catalog + kịch bản**: `docs/SCENARIOS.md`
- **Anti-peek rules + status**: `docs/ANTI-PEEK.md`
- **Architecture**: `docs/FIRESTORE-ARCHITECTURE.md`
- **Firebase setup**: `docs/FIREBASE-SETUP.md`
- **Deploy guide**: `docs/DEPLOY-VERCEL.md`
- **Target vision (17 vai, Be Vietnam Pro)**: `design/project/design_handoff_ma_soi_realtime/`
