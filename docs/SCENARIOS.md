# Ma Sói Realtime — Kịch Bản Chơi & Role Catalog

> Tài liệu kịch bản chơi + danh bạ 18 vai trò (8 ✓ implemented + 10 ✗ planned).
> Status dựa trên `src/lib/roles.ts` (`implemented: true/false`).
> Production hiện hỗ trợ setup 4-20 người với 8 vai ✓.

---

## 1. Game Setups (Implemented — chạy production)

### Setup 4 người (tối thiểu)
```
2 Ma Sói + 1 Tiên Tri + 1 Dân Thường
```
- **Pace**: nhanh, ~5-8 phút/ván.
- **Đặc điểm**: 1 trong 4 là sói → vote đóng vai trò quyết định. Seer phảiclaim sớm nếu soi trúng.
- **Win**: Sói thắng khi cắn về 2-2. Dân phải vote đúng 1 sói trước đêm 2.

### Setup 6 người (khuyến nghị)
```
2 Ma Sói + 1 Tiên Tri + 1 Phù Thủy + 1 Bảo Vệ + 1 Dân Thường
```
- **Pace**: ~10-15 phút.
- **Đặc điểm**: đủ vai phản ứng (witch save + guard protect) để cản sói. Phù thủy cẩn thận thuốc cứu — chỉ 1 lần.
- **Edge case**: nếu guard bảo vệ cùng người bị cắn VÀ witch cũng save → không ai chết (good cho dân).

### Setup 8 người (full RPG)
```
2 Ma Sói + 1 Sói Trắng + 1 Tiên Tri + 1 Phù Thủy + 1 Bảo Vệ + 1 Thần Tình Yêu + 1 Dân Thường
```
- **Pace**: ~15-25 phút.
- **Đặc điểm**: Sói Trắng + Cupid tạo 3 phe (Sói / Dân / Tình nhân).
- **Cupid**: đêm 1 ghép đôi 2 người. Nếu hết giờ không ghép → server auto-pair ngẫu nhiên 2 người sống (không phải cupid).
- **Sói Trắng**: thắng ĐỘC LẬP khi giết hết sói thường (vẫn cắn chung với bầy đêm).

### Setup 10+ người (tournament)
```
3-4 Sói (1 có thể là Sói Trắng) + 1 Tiên Tri + 1 Phù Thủy + 1 Bảo Vệ + 1 Thợ Săn + (Cupid optional) + Dân
```
- **Thợ Săn**: khi chết (cắn/vote), được bắn 1 người theo → cân bằng phe nếu vote sai.
- **Cupid**: thêm 1 phe Độc lập thứ 3, cặp đôi phải sống sót đến cuối.

---

## 2. Role Catalog đầy đủ (18 vai)

### Phe Sói (Wolf) — thắng khi sói ≥ dân

#### 🐺 Ma Sói (werewolf) ✓
- **Phe**: Sói
- **Night action**: `wolf_bite` — cùng bầy chọn 1 người cắn (1 target chung cho cả bầy)
- **Đặc biệt**: thấy đồng đội bầy trong RoleReveal (`seesPack: true`)
- **Màu**: `#dc2626` (đỏ), glow `--ms-wolf`
- **Win**: số sói sống ≥ số dân sống

#### 👹 Sói Đầu Sỏ (alpha_wolf) ✗ planned
- **Phe**: Sói
- **Night action**: `wolf_bite` (cùng bầy)
- **Đặc biệt**: dẫn dắt bầy. Khi bầy chia phiếu (mỗi sói chọn target khác), lựa chọn của Alpha quyết định
- **Win**: như Sói thường

#### 🌘 Sói Tiên Tri (wolf_seer) ✗ planned
- **Phe**: Sói
- **Night action**: `wolf_seer_check` — soi 1 người mỗi đêm (như Tiên Tri nhưng phe Sói)
- **Đặc biệt**: thấy đồng đội bầy. Giúp sói biết vai người để cắn ưu tiên
- **Win**: như Sói

#### 🌑 Sói Nguyền (cursed_wolf) ✗ planned
- **Phe**: Sói
- **Night action**: `curse` — 1 lần/ván (`oncePerGame`), nguyền 1 người → người đó chết vào sáng hôm sau (không thể cứu được)
- **Đặc biệt**: thấy đồng đội bầy
- **Win**: như Sói

#### 🐺 Sói Trắng (white_werewolf) ✓
- **Phe**: Sói (nhưng thắng Độc lập)
- **Night action**: `wolf_bite` (cùng bầy sói) — nhưng bí mật muốn giết đồng đội sói
- **Đặc biệt**: phe sói không biết Sói Trắng là kẻ phản bội. Sói Trắng thắng khi tất cả sói KHÁC chết.
- **Win**: Sói Trắng là người sói cuối cùng sống sót (vẫn cắn dân ban ngày)
- **Màu**: `#f59e0b` (vàng cam), glow `--ms-white-wolf`

---

### Phe Dân (Village) — thắng khi không còn sói

#### 🔮 Tiên Tri (seer) ✓
- **Night action**: `seer_check` — soi 1 người mỗi đêm → biết phe (Sói/Dân)
- **Đặc biệt**: kết quả trả về ngay khi chọn (press-to-reveal, không chờ resolve)
- **Màu**: `#ce82ff` (tím), glow `--ms-seer`

#### 🧪 Phù Thủy (witch) ✓
- **Night action**: `witch_save` (cứu người bị cắn đêm đó) + `witch_poison` (giết ai đó)
- **Giới hạn**: mỗi loại thuốc chỉ 1 lần/ván (`witchSaveUsed`, `witchPoisonUsed`)
- **Đặc biệt**: thấy ai bị cắn (`bittenPlayer` field trong `nightWake`) để quyết định cứu hay không
- **Màu**: `#00c9b7` (teal), glow `--ms-witch`

#### 🛡️ Bảo Vệ (guard) ✓
- **Night action**: `guard_protect` — che chắn 1 người khỏi cắn
- **Giới hạn**: không được bảo vệ cùng người 2 đêm liền (`lastGuardTarget` check)
- **Edge case**: nếu bảo vệ đúng người bị cắn → không ai chết đêm đó (có thể chồng với witch save)
- **Màu**: `#ffc800` (vàng), glow `--ms-guard`

#### 💊 Bác Sĩ (doctor) ✗ planned
- **Night action**: `doctor_heal` — chữa 1 người mỗi đêm (như guard nhưng không có last-target rule)
- **Khác guard**: được chữa cùng người nhiều đêm liền; không che chắn được curse/poison

#### 🏹 Săn Thủ (hunter) ✓
- **Night action**: (không có — passive)
- **Trigger**: khi chết (cắn/poison/vote/curse), được bắn 1 người theo trong 15s (`hunter_shoot` phase)
- **Edge case**: nếu bị cắn trong night_resolve và là hunter → `hunter-trigger` event → 15s bắn → flow tiếp
- **Màu**: `#ef4444` (đỏ tươi), glow `--ms-hunter`

#### 🕵️ Thám Tử (detective) ✗ planned
- **Night action**: `detective_compare` — chọn 2 người → biết có cùng phe hay không (không biết phe nào)
- **Mục đích**: xác minh cặp đôi nghi vấn, tìm wolf-pair

#### 🕯️ Bà Đồng (medium) ✗ planned
- **Night action**: `medium_listen` (passive) — nghe 1 tin nhắn nặc danh từ cõi chết mỗi đêm
- **Mục đích**: người chết có thể truyền thông tin cho Bà Đồng (1 message/đêm)

#### 🐦 Con Quạ (raven) ✗ planned
- **Night action**: `raven_mark` — đánh dấu 1 người → người đó có +2 phiếu bỏ phiếu trừng phạt trong ngày hôm sau
- **Mục đích**: gây áp lực vote lên người nghi vấn

#### 🏛️ Trưởng Làng (chief) ✗ planned
- **Night action**: (không có)
- **Passive**: vote ×2 (1 phiếu chief = 2 phiếu thường)
- **Mục đích**: tăng sức nặng vote cho người chơi cẩn thận

#### 👴 Lão Làng (elder) ✗ planned
- **Night action**: (không có)
- **Passive**: chịu được 1 lần cắn sói (lần 2 mới chết). Nếu bị Dân xử → toàn bộ Dân mất 1 vai trò ngẫu nhiên (trừng phạt)
- **Mục đích**: vai "tank" cho phe Dân, nhưng rủi ro nếu vote nhầm

#### 👤 Dân Thường (villager) ✓
- **Night action**: (không có)
- **Mục đích**: không kỹ năng → dựa vào phân tích + vote
- **Màu**: `#3b82f6` (xanh dương), glow `--ms-villager`

---

### Phe Độc lập (Neutral)

#### 💘 Thần Tình Yêu (cupid) ✓
- **Phe**: Độc lập
- **Night action**: `cupid_link` — đêm 1 ONLY, chọn 2 người ghép đôi (`targets: 2`)
- **Auto-pair**: nếu hết giờ không ghép → server `autoPairLovers()` chọn 2 người sống ngẫu nhiên (không phải cupid)
- **Chain-death**: khi 1 người trong cặp chết, người kia chết theo ngay lập tức (`applyLoverChainDeaths`)
- **Win**: cả 2 còn sống VÀ chỉ còn 2 người sống (kiểm tra TRƯỚC sói/dân win)
- **Màu**: `#ff86d0` (hồng), glow `--ms-cupid`

#### 🤡 Thằng Ngố (jester) ✗ planned
- **Phe**: Độc lập
- **Night action**: (không có)
- **Win**: bị vote ra (bị loại bỏ qua biểu quyết) → thắng ngay, trò chơi tiếp tục
- **Mục đích**: giả vờ đáng ngờ để bị vote, nhưng không gây hại khi "thắng"

---

## 3. Night Order (thứ tự hành động)

### Implemented (8 vai)
```
1. Cupid (đêm 1 only, 15s)
2. Bảo Vệ (15s)
3. Sói (cắn chung, 30s) — gồm werewolf + white_werewolf
4. Tiên Tri (15s)
5. Phù Thủy (20s) — thấy bittenPlayer để quyết định save
─── resolve (3s) ───
```

### Target (khi đủ 18 vai)
```
1. Cupid (đêm 1)
2. Wolves (cắn chung — werewolf + alpha + wolf_seer + cursed + white_werewolf)
3. Wolf Seer (soi riêng)
4. Cursed Wolf (curse 1 lần/ván)
5. Seer
6. Witch
7. Guard
8. Detective (compare 2)
9. Medium (listen)
10. Raven (mark)
11. Doctor (heal)
─── resolve ───
```

Tham chiếu: `NIGHT_ORDER` trong `src/lib/roles.ts`.

---

## 4. Win Conditions (chi tiết)

### Thứ tự kiểm tra (trong `checkWinCondition`)
1. **Tình nhân (lovers)** — nếu `cupidPair` set:
   - Cả 2 còn sống VÀ tổng số sống = 2 → `'lovers'`
2. **Dân thắng** — không còn sói sống (werewolf, alpha, wolf_seer, cursed, white_werewolf đều chết)
3. **Sói thắng** — số sói sống ≥ số dân sống

**Lưu ý Sói Trắng**: hiện là 1 vai `werewolf` phe (chia sẻ win với sói thường) trong logic `checkWinCondition`. Sói Trắng thắng độc lập là **design target**, chưa implement riêng — hiện Sói Trắng chỉ khác về flavor.

### Edge cases
- **Cupid chain-death**: A (cupid link) chết → B chết theo. Nếu B là hunter → hunter-trigger vẫn fire (15s bắn).
- **Witch save + guard protect cùng target**: không ai chết đêm đó.
- **Witch poison + guard protect cùng target**: poison xuyên qua protect (chỉ guard chống cắn, không chống poison).
- **Tie vote**: không ai bị loại, vào đêm kế tiếp.
- **White werewolf kill wolf**: hiện white_werewolf cắn chung với bầy, không có cơ chế giết đồng đội → chỉ flavor tạm.

---

## 5. Role Interaction Matrix

### Tương tác đêm (matrix)

| Tác động ↓ \ Mục tiêu → | Dân thường | Sói | Tiên Tri | Phù Thủy | Bảo Vệ | Thợ Săn | Cupid | Tình nhân |
|---|---|---|---|---|---|---|---|---|
| **Sói cắn** | chết | — | chết | chết | chết (nếu không tự bảo vệ) | chết (hunter-trigger) | chết | chết (+chain-death partner) |
| **Phù Thủy cứu** | sống | sống | sống | sống | sống | sống | sống | sống |
| **Phù Thủy độc** | chết | chết | chết | chết | chết | chết (hunter-trigger) | chết (+chain) | chết (+chain) |
| **Bảo Vệ che** | chống cắn | chống cắn | chống cắn | chống cắn | chống cắn | chống cắn | chống cắn | chống cắn |
| **Tiên Tri soi** | "Dân" | "Sói" | "Dân" | "Dân" | "Dân" | "Dân" | "Dân" | "Dân" |
| **Cupid link** | OK | OK | OK | OK | OK | OK | — (không ghép mình) | OK |

### Tương tác ngày

| Vai | Vote quyền | Đặc biệt ngày |
|---|---|---|
| Tất cả sống | 1 phiếu | — |
| Trưởng Làng ✗ | 2 phiếu | — |
| Con Quạ ✗ | 1 phiếu | đánh dấu +2 phiếu trừng phạt cho người khác |
| Người chết | 0 (không vote) | chat dead channel |

---

## 6. Sample Playthrough (6 người setup)

**Setup**: 2 Ma Sói + 1 Tiên Tri + 1 Phù Thủy + 1 Bảo Vệ + 1 Dân

```
Đêm 1:
  - Bảo Vệ chọn bảo vệ Dân (A)
  - Sói (B, C) cắn Tiên Tri (D)
  - Tiên Tri soi Phù Thủy → "Dân" ✓
  - Phù Thủy thấy D bị cắn → dùng thuốc cứu → D sống

Ngày 1 (90s thảo luận):
  - A: "Tôi là Dân, không có thông tin"
  - D: "Tôi là Tiên Tri, soi E (Phù Thủy) là Dân"  (claim sớm)
  - B (Sói): "D nói dối, tôi mới là Tiên Tri thật"
  - Vote (30s): A, D, E vote B. B, C vote D. → B bị loại (3-2)

  Win check: 1 sói (C) còn sống, 4 dân → chưa thắng
  
Đêm 2:
  - Bảo Vệ không được bảo vệ A lần nữa (last-target rule)
  - Sói (C) cắn D (Tiên Tri)
  - Phù Thủy hết thuốc cứu → D chết

Ngày 2:
  - D đã chết, không claim được nữa
  - C (Sói) đóng vai Dân: "B là sói, tôi vote B rồi mà"
  - A, E nghi C → vote C (2-1)
  
  Win check: 0 sói → DÂN THẮNG 🎉
```

---

## 7. Đề xuất thiết kế vai planned

Mỗi vai planned cần:

1. **Cập nhật `implemented: true`** trong `src/lib/roles.ts`
2. **Server logic** trong `src/lib/game-logic.ts`:
   - Thêm case trong `resolveNight()` cho action mới
   - Thêm case trong `runNightSequence`/`buildNightSequence` cho night order
3. **API route** mới hoặc extend `/api/game/night-action`
4. **UI** trong `game-screen.tsx:NightScreen` — thêm branch cho action mới
5. **Firestore rules** — nếu cần collection mới (vd `marks` cho raven)
6. **Anti-peek** — prompt/confirm generic "Xác nhận", không gọi tên khả năng
7. **Test E2E** — extend `e2e-test.mjs` với role mới

Tham chiếu design đầy đủ: `design/project/design_handoff_ma_soi_realtime/README.md` (target vision 17 vai).
