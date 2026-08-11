# Ma Sói Realtime — Anti-Peek Patterns

> Hệ thống chống lộ vai trò khi nhiều người chơi **ngồi cạnh nhau ngoài đời**,
> mỗi người một điện thoại. Bên cạnh có thể liếc màn hình của bạn.
>
> Tham chiếu design: `design/project/design_handoff_ma_soi_realtime/README.md` (mục "Chống lộ vai").
> Code: `src/components/game/ui/PressToReveal.tsx`, `src/components/game/game-screen.tsx`.

---

## Nguyên lý trung tâm

> **Không có thông tin bí mật nào hiển thị thường trực.** Tất cả nằm sau thao tác
> nhấn-giữ, và mọi bề mặt riêng tư được thiết kế để **trông giống hệt nhau khi
> nhìn lướt**.

---

## 5 nguyên tắc (design-S2)

### Rule 1: Không mã hóa phe bằng màu

**Lý do**: Màu đỏ/xanh nhìn lướt là thấy ngay → lộ vai (Sói = đỏ). Chỉ chữ mới
phải nhìn thẳng để đọc.

**Spec**: Thẻ Sói và thẻ Dân dùng **chính xác cùng khung**:
- Background: `linear-gradient(155deg, #16141F, #211E30)`
- Border: `2px solid #35325180`
- Glow: `0 0 40px -14px rgba(167, 197, 235, .5)`

Phe chỉ xuất hiện dưới dạng **chữ** trên thẻ.

**Status hiện tại**:
- ✅ **RoleReveal OK** — `game-screen.tsx:213-214` hardcode đúng gradient + border S2. Phe là text uppercase (`game-screen.tsx:234-236`).
- ⚠️ **Seer result VI PHẠM** — `game-screen.tsx:457-460` dùng `text-[rgb(var(--ms-wolf))]` (đỏ) nếu target là sói, `text-[rgb(var(--ms-brand))]` (xanh) nếu dân. Phải chuyển sang text-only ("MA SÓI" / "DÂN LÀNG") với cùng màu chữ.

**Fix cần thiết** (không trong scope task này):
```diff
- className={cn('font-extrabold text-lg',
-   seerResult.isWolf ? 'text-[rgb(var(--ms-wolf))]' : 'text-[rgb(var(--ms-brand))]')}
+ className="font-extrabold text-lg text-white"
```

---

### Rule 2: Mọi thẻ bí mật cùng chiều cao

**Lý do**: Nếu thẻ Sói tự nhiên cao hơn (do có thêm danh sách bầy) → đoán được
vai qua bóng dáng.

**Spec**: 
- Thẻ vai trò: `min-height: 330px`
- Báo cáo rạng sáng: `min-height: 290px`

**Status hiện tại**:
- ✅ **RoleReveal OK** — `game-screen.tsx:212` `minHeight: 330`.
- ℹ️ Báo cáo rạng sáng (Personal Report) chưa implement → N/A.

---

### Rule 3: Không in tên vai trên màn đang chơi

**Lý do**: Người chơi đã biết vai của mình rồi — in ra chỉ để người bên cạnh đọc.

**Spec**:
- Header lượt đêm ghi "🌙 ĐẾN LƯỢT BẠN", không ghi "🧪 PHÙ THỦY"
- Màn chờ đêm ghi "Vai trò của bạn: • • •" (3 dấu chấm, không có tên)

**Status hiện tại**:
- ✅ **Night header OK** — `game-screen.tsx:272-275` `NightTurnHeader` chỉ hiện "🌙 ĐẾN LƯỢT BẠN".
- ⚠️ **NightWaiting hơi leak** — `game-screen.tsx:597-599` (comment) có check cẩn thận không hiện `nightWakeLabel`, nhưng text "Đêm {dayCount+1}" vẫn hiện. Acceptable (không lộ vai).

---

### Rule 4: Nhãn nút generic ("Xác nhận")

**Lý do**: Nếu nút ghi "Xác nhận cắn" / "Xác nhận soi" / "Xác nhận nguyền" →
người bên cạnh đọc được tên khả năng → biết vai.

**Spec**: Mọi nút xác nhận đều là **"Xác nhận"** đơn thuần.

**Status hiện tại**:
- ⚠️ **VI PHẠM** — `roles.ts` định nghĩa `promptVi`/`confirmVi` per-role:
  - Wolf: `"Chọn người để cắn đêm nay"`, `"Xác nhận cắn"` (`roles.ts:91`)
  - Seer: `"Chọn 1 người để soi phe"`, `"Xác nhận soi"` (`roles.ts:129`)
  - Witch: `"Chọn người để đầu độc"`, `"Xác nhận"` (`roles.ts:136`)
  - Guard: `"Chọn người để bảo vệ"`, `"Xác nhận bảo vệ"` (`roles.ts:148`)
- Những verb như "cắn/soi/bảo vệ" **lộ tên khả năng** → vi phạm Rule 4.

**Fix cần thiết**:
- Đổi tất cả `promptVi` thành neutral: `"Chọn 1 người"` (hoặc bỏ prompt hoàn toàn, UI tự cung cấp).
- Đổi tất cả `confirmVi` thành `"Xác nhận"`.

---

### Rule 5: Mọi panel đêm cùng ngôn ngữ thị giác

**Lý do**: Bảng bầy sói, bảng cõi chết của Bà Đồng, thẻ nạn nhân Phù Thủy, 2 nút
thuốc — tất cả phải dùng cùng background + border. Nhìn lướt thì mọi lượt đêm
trông y hệt nhau.

**Spec**:
- Background: `rgba(255, 255, 255, .04)`
- Border: `1px solid #353251`

**Status hiện tại**:
- ✅ **OK** — `game-screen.tsx:282` `NIGHT_ACCENT = 'bg-[#A7C5EB]/15 border-[#A7C5EB]'` áp dụng cho MỌI vai's target selection (single neutral moonlight accent).

---

## Bonus patterns

### Press-to-reveal (nhấn giữ)

**Spec**:
- `pointerdown` → hiện nội dung (transition 150ms ease-out)
- `pointerup`/`pointerleave`/`pointercancel` → ẩn ngay
- Blur 7px → 0, opacity .35 → 1
- Haptic: `navigator.vibrate(12)` (mobile)
- Emoji cap 48px (70px = readable across table)

**Status**:
- ✅ **PressToReveal.tsx OK** — `src/components/game/ui/PressToReveal.tsx:46-55` implement đầy đủ pointer events + vibrate 12ms + blur 7px.
- ⚠️ **Emoji cap 48px có thể vi phạm** — `RoleReveal` dùng `<CharacterIcon size="xl">` (`game-screen.tsx:230`). Cần verify `xl` có thực sự ≤ 48px không. Spec design-S2 cấm > 48px.

---

### Decoy screen (màn hình mồi)

**Lý do**: Khi người chơi KHÔNG có hành động đêm (Dân, hoặc đã hành động xong)
→ phải hiện fake UI trông giống hệt người đang có action. Nếu không → người bên
cạnh biết người này "không có gì làm" → suy ra vai.

**Spec**: Fake timer đếm ngược + fake progress bar + fake "đang xử lý" text +
random subtle animation.

**Status**:
- ✅ **Decoy principle OK** — `game-screen.tsx:288-313` `NightWaiting` hiện cùng UI (Moon icon + "Đang là đêm..." + "Đừng mở mắt!") cho:
  - Vai không có night action (Dân, Hunter, v.v.)
  - Vai có action nhưng đã confirm xong
  - Vai có action nhưng chưa đến lượt
- ⚠️ **Fake timer + fake progress bar MISSING** — `NightWaiting` chỉ có static content, không có:
  - Fake countdown timer (đang "đếm ngược" gì đó)
  - Fake progress bar (đang "tiến triển" gì đó)
  - Fake "processing" animation
  
  → Bystander thông thạo design có thể nhận ra "đây là decoy" qua **thiếu** visual busy elements.

**Fix cần thiết**: thêm fake timer + progress bar vào `NightWaiting`, dùng cùng animation styling như `NightTurnHeader` thật.

---

### 🎴 CardFab (re-check card)

**Spec**: Nút nổi cho phép người chơi xem lại vai của mình giữa game (nhấn giữ).

**Status**:
- ✅ **OK** — `src/components/game/ui/CardFab.tsx`, mounted ở `game-screen.tsx:1113-1119` trên mọi in-game screen.

---

### Day-screen "no death" anti-reveal

**Spec**: Khi không ai chết đêm qua (witch save, guard protect, hoặc không tấn
công) → phải hiện cùng thông báo "Đêm qua hòa bình", không leak nguyên nhân.

**Status**:
- ✅ **OK** — `game-screen.tsx:684-695` `DayScreen` hiện "🌙 Đêm qua hòa bình, không ai chết." cho mọi trường hợp không death. Comment code giải thích rõ anti-leak intent.

---

## Tóm tắt scorecard

| Rule | Status | Code ref |
|---|---|---|
| 1. Không màu phe trên thẻ bí mật | ⚠ Seer result vi phạm | `game-screen.tsx:457-460` |
| 2. Cùng chiều cao thẻ bí mật | ✅ | `game-screen.tsx:212` |
| 3. Không in tên vai khi đang chơi | ✅ | `game-screen.tsx:272-275` |
| 4. Nhãn nút generic | ⚠ Vi phạm (cắn/soi/bảo vệ) | `roles.ts:91,129,136,148` |
| 5. Cùng ngôn ngữ thị giác panel đêm | ✅ | `game-screen.tsx:282` |
| Press-to-reveal (blur/haptic) | ✅ | `PressToReveal.tsx:46-55` |
| Emoji cap 48px | ⚠ Verify `xl` size | `game-screen.tsx:230` |
| Decoy screen tồn tại | ✅ | `game-screen.tsx:288-313` |
| Decoy fake timer + progress bar | ❌ Missing | `game-screen.tsx:288-313` |
| 🎴 CardFab re-check | ✅ | `CardFab.tsx` |
| Day "no death" anti-leak | ✅ | `game-screen.tsx:684-695` |

**Tổng**: 7/11 ✅ tuân thủ, 3 ⚠ vi phạm nhẹ (cần fix), 1 ❌ missing (decoy busy elements).

---

## Roadmap fix (không trong scope doc update)

Nếu muốn fix các vi phạm:

1. **Seer result color** — bỏ red/green, dùng text-only trắng + emoji `🐺`/`👤` (đã large enough để đọc).
2. **Button labels** — trong `roles.ts`, đổi tất cả `promptVi`/`confirmVi` thành neutral.
3. **Decoy fake-busy** — thêm vào `NightWaiting`: fake countdown timer (random 15-30s), fake progress bar (animate width), fake "processing..." spinner.
4. **Verify CharacterIcon `xl` size** — nếu > 48px, thêm size `xl-antipeek` = 48px cho use trong RoleReveal.

Các fix này không phá vỡ existing gameplay, chỉ tăng cường chống lộ vai.
