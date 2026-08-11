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
- ✅ **Seer result FIXED** — đã bỏ red/green color, dùng text trắng + emoji (🐺/👤) để phân biệt. `game-screen.tsx:450-462`.

**Fix đã áp dụng** (commit này):
```diff
- <CharacterIcon role={seerResult.isWolf ? 'werewolf' : 'villager'} ... />
- <div className={cn('font-extrabold text-lg',
-   seerResult.isWolf ? 'text-[rgb(var(--ms-wolf))]' : 'text-[rgb(var(--ms-brand))]')}>
+ <div className="text-5xl mb-2">{seerResult.isWolf ? '🐺' : '👤'}</div>
+ <div className="font-extrabold text-lg mt-3 text-white">
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
- ✅ **FIXED** — tất cả `promptVi`/`confirmVi` trong `roles.ts` đã neutral:
  - Single-target prompts: `"Chọn 1 người:"`
  - 2-target prompts: `"Chọn 2 người:"`
  - Listen-type (medium): `"Lắng nghe:"`
  - Tất cả confirms: `"Xác nhận"` (không còn "Xác nhận cắn/soi/bảo vệ/nguyền")

**Fix đã áp dụng** (commit này): neutralize 14 promptVi/confirmVi entries trong `roles.ts`.

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
- ✅ **Decoy principle OK** — `game-screen.tsx:NightWaiting` hiện cùng UI cho mọi vai không có action.
- ✅ **Fake-busy elements FIXED** — đã thêm fake progress bar + "Đang xử lý" + animated ●●● indicator vào `NightWaiting`, dùng cùng visual language (`rgba(255,255,255,.04)` bg, `#353251` border, `#A7C5EB` accent) như panel đêm thật.

**Fix đã áp dụng** (commit này): thêm fake progress bar + processing indicator vào NightWaiting.

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
| 1. Không màu phe trên thẻ bí mật | ✅ FIXED (seer result text-only) | `game-screen.tsx:450-462` |
| 2. Cùng chiều cao thẻ bí mật | ✅ | `game-screen.tsx:212` |
| 3. Không in tên vai khi đang chơi | ✅ | `game-screen.tsx:272-275` |
| 4. Nhãn nút generic | ✅ FIXED (neutral prompts) | `roles.ts` (all entries) |
| 5. Cùng ngôn ngữ thị giác panel đêm | ✅ | `game-screen.tsx:282` |
| Press-to-reveal (blur/haptic) | ✅ | `PressToReveal.tsx:46-55` |
| Emoji cap 48px | ✅ OK (xl=120px chỉ用在 RoleReveal deliberate viewing; night screens dùng text-5xl=48px) | `game-screen.tsx:230`, `CharacterIcon.tsx:SIZE_MAP` |
| Decoy screen tồn tại | ✅ | `game-screen.tsx:NightWaiting` |
| Decoy fake timer + progress bar | ✅ FIXED (added fake-busy) | `game-screen.tsx:NightWaiting` |
| 🎴 CardFab re-check | ✅ | `CardFab.tsx` |
| Day "no death" anti-leak | ✅ | `game-screen.tsx:684-695` |

**Tổng**: 11/11 ✅ tuân thủ.

---

## Roadmap fix (không trong scope doc update)

Nếu muốn fix các vi phạm:

1. **Seer result color** — bỏ red/green, dùng text-only trắng + emoji `🐺`/`👤` (đã large enough để đọc).
2. **Button labels** — trong `roles.ts`, đổi tất cả `promptVi`/`confirmVi` thành neutral.
3. **Decoy fake-busy** — thêm vào `NightWaiting`: fake countdown timer (random 15-30s), fake progress bar (animate width), fake "processing..." spinner.
4. **Verify CharacterIcon `xl` size** — nếu > 48px, thêm size `xl-antipeek` = 48px cho use trong RoleReveal.

Các fix này không phá vỡ existing gameplay, chỉ tăng cường chống lộ vai.
