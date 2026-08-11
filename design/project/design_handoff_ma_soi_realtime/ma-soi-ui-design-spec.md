# Ma Sói Realtime — UI/UX Design Specification

> Tài liệu mô tả giao diện, các màn hình, nhân vật để đưa cho AI thiết kế UI.
> Version 1.0 | Game Ma Sói (Werewolf) nhiều người chơi realtime trên Web.

---

## 1. Visual Style Guide

### 1.1 Phong cách chung

- **Theme chính**: Dark fantasy — nền tối (#0F0E17, #1A1825) với ánh sáng Moonlight (xanh nhạt #A7C5EB) làm accent
- **Vibe**: Bí ẩn, căng thẳng, cổ tích nhưng hiện đại. Giống phong cách Among Us meets Werewolf Online nhưng tối giản và thanh lịch hơn.
- **Border radius**: Lớn (16-20px) cho card, 12px cho button, 9999px cho pill/badge
- **Shadow**: Soft glow effect thay vì drop shadow truyền thống (box-shadow với màu accent)
- **Animation**: Mượt mà, subtle — fade-in, slide-up, pulse nhẹ. Tránh animation quá mạnh gây đau mắt khi chơi đêm.

### 1.2 Bảng màu

| Màu | Hex | Công dụng |
|-----|-----|----------|
| **Nền chính** | `#0F0E17` | Background chính toàn app |
| **Nền card** | `#1A1825` | Card, panel, modal |
| **Nền card hover** | `#232136` | Hover state |
| **Border** | `#2E2B3F` | Viền card, divider |
| **Text chính** | `#FFFFFE` | Tiêu đề, nội dung chính |
| **Text phụ** | `#94A1B2` | Mô tả, hint |
| **Accent Moonlight** | `#A7C5EB` | Nút primary, link, highlight |
| **Accent Moonlight hover** | `#8FB3DE` | Hover state accent |
| **Sói (Wolf)** | `#E53E3E` | Đỏ — phe Sói, danger |
| **Sói nền** | `#3B1A1A` | Nền đỏ tối cho card Sói |
| **Dân (Village)** | `#38A169` | Xanh lá — phe Dân, success |
| **Dân nền** | `#1A3B2A` | Nền xanh tối cho card Dân |
| **Trung lập** | `#9F7AEA` | Tím — vai trò trung lập |
| **Trung lập nền** | `#2D1B4E` | Nền tím tối |
| **Warning** | `#ECC94B` | Vàng — cảnh báo |
| **Night** | `#1A1A2E` | Xanh đậm đặc — giao diện đêm |
| **Day** | `#2D2B55` | Tím nhạt — giao diện ngày |
| **Dead/Ghost** | `#4A5568` | Xám — người đã chết |

### 1.3 Typography

- **Tiêu đề lớn**: Bold, 24-32px, tracking tight
- **Tiêu đề section**: Semi-bold, 18-20px
- **Body**: Regular, 14-16px, line-height 1.6
- **Caption/Hint**: 12-13px, color muted
- **Font**: System UI hoặc Inter cho Latin, Noto Sans SC cho CJK

### 1.4 Icon Style

- Line icons, stroke width 1.5-2px
- Kích thước tiêu chuẩn: 20x20, 24x24
- Mỗi vai trò có **emoji riêng** làm avatar chính (xem section 3)

---

## 2. Application Screens

### Screen 1: Login / Đăng nhập

```
┌─────────────────────────────────┐
│                                 │
│         🌙 MA SÓI               │
│       REALTIME                  │
│                                 │
│    ┌───────────────────────┐    │
│    │  Nhập biệt danh...    │    │
│    └───────────────────────┘    │
│                                 │
│    ┌───────────────────────┐    │
│    │    Vào trò chơi  →    │    │
│    └───────────────────────┘    │
│                                 │
│    hoặc đăng nhập bằng:        │
│    [G] Google  [D] Discord     │
│                                 │
│    v1.0 · Powered by Supabase  │
└─────────────────────────────────┘
```

- **Layout**: Centered card, max-width 400px, vertical centered trên màn hình
- **Logo**: 🌙 (moon) + text "MA SÓI REALTIME" — font bold, tracking wide, moonlight color
- **Input**: Dark background (`#1A1825`), border `#2E2B3F`, rounded-2xl, padding 14-18px, placeholder text muted
- **Button Primary**: Background accent moonlight, text đen, rounded-2xl, full-width, height 48px, hover glow
- **SSO Buttons**: Outline style, icon + text, side by side (Google và Discord)
- **Footer**: Text nhỏ, muted, ở dưới cùng
- **Background**: Gradient từ `#0F0E17` → `#1A1825`, có thể thêm subtle moon/stars pattern

---

### Screen 2: Home / Trang chủ

```
┌─────────────────────────────────┐
│  🌙 Ma Sói        [👤 Username]│
├─────────────────────────────────┤
│                                 │
│  ┌─────────────┐ ┌───────────┐ │
│  │  Tạo phòng  │ │ Tham gia  │ │
│  │    + NEW    │ │  Mã phòng │ │
│  └─────────────┘ └───────────┘ │
│                                 │
│  Phòng gần đây                  │
│  ┌─────────────────────────┐   │
│  │ 🐺 Room Alpha   6/10 👤 │   │
│  │    đang chờ...         │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ 🐺 Room Beta    8/8  🔒│   │
│  │    đang chơi            │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  📊 Thống kê            │   │
│  │  12 trận | 7 thắng | 67%│   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

- **Header**: Logo trái, avatar+username phải, height 56px
- **Hero Actions**: 2 card lớn ngang nhau (Tạo phòng / Tham gia), có icon, rounded-2xl, hover glow effect
  - **Tạo phòng**: Accent moonlight border/glow, icon +, text "Tạo phòng mới"
  - **Tham gia**: Outline, icon search, text "Nhập mã phòng" → mở input field
- **Recent Rooms**: Danh sách card nhỏ, mỗi card có: tên phòng, số người/tối đa, status badge (đang chờ/đang chơi/đã kết thúc)
- **Stats Card**: Thống kê cá nhân — tổng trận, thắng, tỷ lệ thắng (%)
- **Empty state**: Khi chưa có phòng gần đây — hiển thị illustration trống + text "Bạn chưa tham gia phòng nào"

---

### Screen 3: Lobby / Chờ trận

```
┌─────────────────────────────────┐
│  ← Quay lại     ROOM #A3F2    │
├─────────────────────────────────┤
│                                 │
│  Cấu hình trò chơi     [Host]  │
│  ┌─────────────────────────┐   │
│  │ 8 người  │ Giải đấu    │   │
│  │ 3 Sói    │ Cân bằng ✓  │   │
│  └─────────────────────────┘   │
│                                 │
│  Người chơi (6/8)               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │👤A │ │👤B │ │👤C │ │👤D │  │
│  │sẵn │ │sẵn │ │    │ │sẵn │  │
│  └────┘ └────┘ └────┘ └────┘  │
│  ┌────┐ ┌────┐                 │
│  │👤E │ │👤F │                 │
│  │    │ │sẵn │                 │
│  └────┘ └────┘                 │
│                                 │
│  ┌───────────────────────────┐ │
│  │     🐺 BẮT ĐẦU TRÒ CHƠI  │ │
│  └───────────────────────────┘ │
│                                 │
│  [📋 Copy mã] [📤 Chia sẻ]    │
└─────────────────────────────────┘
```

- **Header**: Nút back trái, mã phòng phải (có nút copy), height 56px
- **Config Card** (Host only): Hiển thị preset cấu hình. Nếu là host → có thể nhấn để mở modal chỉnh sửa vai trò. Khách chỉ xem.
- **Player Grid**: Grid 2 cột (mobile) / 4 cột (desktop), mỗi ô:
  - Avatar circle (40px) với chữ cái đầu tên, nền random pastel
  - Username bên dưới
  - Badge status: "sẵn sàng" (xanh) hoặc chờ
  - Host badge: Crown icon 👑
  - Pulse animation cho người vừa join
- **Start Button**: Full-width, chỉ active khi tất cả đã sẵn sàng. Host only. Gradient accent → glow.
- **Footer Actions**: Copy mã phòng, chia sẻ link
- **Realtime indicator**: Chấm xanh nhỏ + text "6/8 online" góc dưới

---

### Screen 4: Role Reveal / Mở vai trò

> Màn hình xuất hiện 1 lần khi trò bắt đầu. Mỗi người chơi nhấn để xem vai trò của mình.

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    Nhấn để xem          │   │
│  │    vai trò của bạn      │   │
│  │                         │   │
│  │         🔮              │   │
│  │    (nhấn giữ)           │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  ⚠️ Đừng để người khác nhìn!   │
│                                 │
└─────────────────────────────────┘
```

```
┌─────────────────────────────────┐
│         (nhấn giữ)              │
│                                 │
│  ┌─────────────────────────┐   │
│  │         🔮              │   │
│  │    TIÊN TRI             │   │
│  │    Phe Dân              │   │
│  │                         │   │
│  │  Mỗi đêm bạn có thể     │   │
│  │  soi 1 người để biết    │   │
│  │  họ thuộc phe nào.      │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  (thả ra để ẩn)                │
└─────────────────────────────────┘
```

- **Press-to-Reveal**: Nhấn giữ để xem, thả ra để ẩn ngay. Ngăn nhìn lén khi chơi cùng phòng.
- **Card vai trò**: Centered, rounded-3xl, nền gradient theo phe (đỏ cho Sói, xanh cho Dân, tím cho Trung lập)
- **Emoji vai trò**: Lớn (64-80px), ở giữa card
- **Tên vai trò**: Bold, 24px
- **Phe badge**: Pill badge nhỏ ("Phe Dân" / "Phe Sói")
- **Mô tả**: Text nhỏ, muted, mô tả ngắn khả năng
- **Nếu là Sói**: Hiển thị thêm danh sách đồng đội (emoji + tên)
- **Haptic feedback**: Rung nhẹ khi nhấn giữ (nếu thiết bị hỗ trợ)
- **Auto-dismiss**: 10 giây sau tự chuyển sang màn hình chờ

---

### Screen 5: Night Phase / Giao diện Đêm

```
┌─────────────────────────────────┐
│  🌙 ĐÊM THỨ 1      [⏱ 0:30]   │
│  ═══════════════════════════    │
│                                 │
│         🌑                     │
│                                 │
│    Thứ tự hành động đêm:       │
│                                 │
│    ✅ Bảo Vệ                    │
│    ✅ Sói                       │
│    ⏳ Phù Thủy  ← đang diễn ra│
│    ⬜ Tiên Tri                  │
│                                 │
│  ───────────────────────────── │
│  Vai trò của bạn:              │
│  🔮 TIÊN TRI                   │
│  (chờ đến lượt...)             │
│                                 │
└─────────────────────────────────┘
```

```
┌─────────────────────────────────┐
│  🌙 ĐÊM THỨ 1      [⏱ 0:20]   │
│  ═══════════════════════════    │
│                                 │
│  🔮 TIÊN TRI — Lượt của bạn   │
│                                 │
│  Chọn 1 người để soi phe:      │
│                                 │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │👤A │ │👤B │ │👤C │ │👤D │  │
│  └────┘ └────┘ └────┘ └────┘  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  │👤E │ │👤F │ │👤G │ │👤H │  │
│  └────┘ └────┘ └────┘ └────┘  │
│                                 │
│  ┌───────────────────────────┐ │
│  │       Xác nhận soi       │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

```
┌─────────────────────────────────┐
│  🌙 ĐÊM THỨ 1      [⏱ 0:15]   │
│  ═══════════════════════════    │
│                                 │
│  🔮 TIÊN TRI                   │
│                                 │
│  ┌─────────────────────────┐   │
│  │   👤 Player C           │   │
│  │   ⚠️ LÀ SÓI!           │   │
│  │   (nhấn giữ để xem)     │   │
│  └─────────────────────────┘   │
│                                 │
│  ⬜ Bảo Vệ đã hành động        │
│  ⬜ Sói đã hành động            │
│  ✅ Tiên Tri đã hành động       │
│                                 │
└─────────────────────────────────┘
```

- **Background**: Gradient night — `#0F0E17` → `#1A1A2E`, có thể thêm stars/moon SVG
- **Header**: Moon icon + "ĐÊM THỨ N" + countdown timer (pills, đỏ nhạt)
- **Action Order List**: Danh sách dọc các vai trò, với trạng thái:
  - ✅ Đã hành động (xanh)
  - ⏳ Đang diễn ra (vàng, pulse)
  - ⬜ Chờ (xám)
- **Player Grid** (khi đến lượt): Grid avatar, click để chọn target. Hover glow effect. Disable những người đã chết.
- **Result Card**: Press-to-reveal kết quả (press and hold). Màu đỏ nếu là Sói, xanh nếu là Dân.
- **"Chờ đến lượt"**: Hiển thị vai trò của người chơi + thông báo chờ, có loading spinner nhỏ.
- **Decoy Screen** (anti-peek): Khi KHÔNG phải lượt của người chơi → hiển thị fake UI:
  - Fake timer đang đếm ngược
  - Fake "đang xử lý..." text
  - Random subtle animations để trông "đang hoạt động"
  - Mục đích: người bên cạnh không biết người này có hành động hay không

---

### Screen 6: Dawn Transition / Rạng sáng

```
┌─────────────────────────────────┐
│                                 │
│         🌅                       │
│                                 │
│    Thiên sáng rồi...            │
│                                 │
│    (hiệu ứng chuyển đổi)        │
│                                 │
└─────────────────────────────────┘
```

- Transition screen ngắn (2-3 giây)
- Animation: Gradient từ night → day, sun rise effect
- Text: "Ngày bắt đầu..." hoặc "Đêm qua có người đã chết..."
- Nếu có người chết: → chuyển thẳng sang Death Announcement
- Nếu không ai chết: → chuyển sang Day Discussion

---

### Screen 7: Day Phase — Death Announcement / Thông báo tử vong

```
┌─────────────────────────────────┐
│  ☀️ NGÀY THỨ 1                  │
│  ═══════════════════════════    │
│                                 │
│         💀                      │
│                                 │
│  Đêm qua, người sau đã chết:    │
│                                 │
│  ┌─────────────────────────┐   │
│  │  👤 Player C            │   │
│  │  đã bị sói cắn chết     │   │
│  │  (nhấn giữ để xem chi tiết)│  │
└─────────────────────────┘   │
│                                 │
│  Hoặc:                          │
│  ┌─────────────────────────┐   │
│  │  ✨ Đêm qua bình yên!   │   │
│  │  Không ai chết.         │   │
│  └─────────────────────────┘   │
│                                 │
│  [Tiếp tục →]                  │
│                                 │
└─────────────────────────────────┘
```

- **Background**: Day theme — `#1A1825` → `#2D2B55` gradient
- **Death Card**: Nền đỏ tối (`#3B1A1A`), avatar xám (ghost), tên gạch ngang
- **Safe Card**: Nền xanh tối (`#1A3B2A`), text xanh, icon shield/star
- **Press-to-reveal detail**: Nhấn giữ để xem thêm (ai đã bite, ai đã cứu...)
- **Hunter trigger**: Nếu người chết là Săn Thủ → hiện thêm UI "Săn Thủ muốn bắn ai?"

---

### Screen 8: Day Phase — Discussion / Thảo luận ngày

```
┌─────────────────────────────────┐
│  ☀️ NGÀY THỨ 1     [⏱ 2:00]   │
│  ═══════════════════════════    │
│                                 │
│  Sống: 7/10   💀 Chết: 3       │
│                                 │
│  ┌───── Danh sách người ─────┐ │
│  │ 👤 A  (sống)              │ │
│  │ 👤 B  (sống)              │ │
│  │ 👤 C  💀 (đã chết)        │ │
│  │ 👤 D  (sống)              │ │
│  │ 👤 E  (sống)              │ │
│  │ ...                      │ │
│  └──────────────────────────┘ │
│                                 │
│  💬 Chat                        │
│  ┌──────────────────────────┐ │
│  │ A: Tôi nghĩ B là sói!   │ │
│  │ D: Không, tôi là dân!   │ │
│  │ F: A nói giọng to...    │ │
│  └──────────────────────────┘ │
│  ┌──────────────┐ [Gửi]      │
│  │ Nhập tin nhắn│              │
│  └──────────────┘              │
│                                 │
│  [🗳 Bắt đầu biểu quyết]      │
│                                 │
└─────────────────────────────────┘
```

- **Header**: Sun icon + "NGÀY THỨ N" + countdown timer
- **Player Strip**: Horizontal scrollable list, mỗi người là avatar circle:
  - Sống: màu bình thường, border accent
  - Chết: xám, overlay skull icon nhỏ, gạch ngang tên
- **Chat Panel**: Fixed bottom, scrollable messages. Mỗi message có avatar nhỏ + tên + nội dung.
  - Tin nhắn từ người chết: xám, italic "👻 [Ghost] A: ..."
- **Input**: Fixed bottom, rounded-xl, gửi bằng button hoặc Enter
- **Vote Button**: Full-width, accent color, xuất hiện khi host bật biểu quyết
- **Dead player view**: Nếu người chơi đã chết → chỉ xem, không chat, không vote. Nền tối hơn.

---

### Screen 9: Voting Phase / Biểu quyết

```
┌─────────────────────────────────┐
│  🗳 BIỂU QUYẾT      [⏱ 0:30]  │
│  ═══════════════════════════    │
│                                 │
│  Chọn 1 người để loại bỏ:      │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 👤 Player A    [vote]   │   │
│  │ 👤 Player B    [vote]   │   │
│  │ 👤 Player C 💀 (đã chết)│   │
│  │ 👤 Player D    [vote]   │   │
│  │ 👤 Player E    [vote]   │
│  │ ...                     │   │
│  └──────────────────────────┘ │
│                                 │
│  Kết quả: 3/7 đã bỏ phiếu      │
│  ████░░░░ 43%                   │
│                                 │
│  [🗳 Bỏ phiếu trắng]           │
│                                 │
└─────────────────────────────────┘
```

- **Vote Cards**: List dọc, mỗi card là 1 người sống, có nút [vote] bên phải
- **Voted indicator**: Card đã vote → đổi màu, icon checkmark
- **Progress bar**: Hiển thị X/total đã vote, bar fill animation
- **White vote**: Bỏ phiếu trắng (không loại ai)
- **Result**: Khi hết thời gian → hiện kết quả (ai có phiếu nhiều nhất, hòa phiếu)
- **Tie handling**: Nếu hòa → không ai bị loại, thông báo "Không đủ số phiếu"

---

### Screen 10: Game Over / Kết thúc

```
┌─────────────────────────────────┐
│                                 │
│         🏆                      │
│                                 │
│  ┌─────────────────────────┐   │
│  │   PHE DÂN THẮNG! 🎉    │   │
│  │                         │   │
│  │  Tất cả sói đã bị loại  │   │
│  │                         │   │
│  │  Thời gian: 25 phút     │   │
│  │  Sống sót: 3/10         │   │
│  └─────────────────────────┘   │
│                                 │
│  Danh sách vai trò:            │
│  👤 A — 🐺 Sói                 │
│  👤 B — 🔮 Tiên Tri            │
│  👤 C — 🧪 Phù Thủy            │
│  ...                           │
│                                 │
│  [Chơi lại]  [Về trang chủ]   │
│                                 │
└─────────────────────────────────┘
```

- **Background**: Gradient theo phe thắng (xanh cho Dân, đỏ cho Sói)
- **Result Card**: Lớn, centered, gradient nền, text lớn, confetti animation nếu thắng
- **Role Reveal**: List tất cả vai trò thật — đây là lúc mọi người biết ai là ai
- **MVP**: Người chơi xuất sắc nhất (dựa trên vote)
- **Stats**: Thời gian, số người sống sót
- **Actions**: "Chơi lại" (cùng phòng) hoặc "Về trang chủ"

---

### Screen 11: Host Control Panel / Bảng điều khiển Host

```
┌─────────────────────────────────┐
│  ← Room     👑 Host Panel     │
├─────────────────────────────────┤
│                                 │
│  Host Mode:                     │
│  [Auto] [Direct] [Hybrid]      │
│                                 │
│  ┌─────────────────────────┐   │
│  │  MASTER LOG             │   │
│  │  (chỉ host xem được)    │   │
│  │                         │   │
│  │  Đêm 1:                 │   │
│  │  → BV bảo vệ A          │   │
│  │  → Sói cắn C            │   │
│  │  → PT cứu C (drug save) │   │
│  │  → TT soi B → Dân      │   │
│  │  → C sống (được cứu)    │   │
│  │                         │   │
│  │  Đêm 2:                 │   │
│  │  → BV bảo vệ B          │   │
│  │  → Sói cắn A            │   │
│  │  → PT không cứu         │   │
│  │  → TT soi E → Sói      │   │
│  │  → A chết               │   │
│  └──────────────────────────┘ │
│                                 │
│  Phase Control:                 │
│  [Chuyển sang Ngày →]          │
│  [Kết thúc trò chơi]           │
│                                 │
└─────────────────────────────────┘
```

- **Host-only screen**: Chỉ host truy cập được, có lock icon
- **Host Mode Tabs**: 3 nút chuyển mode (Auto-Pilot / Direct / Hybrid)
- **Master Log**: Scrollable log, color-coded theo vai trò (đỏ cho Sói actions, xanh cho Dân actions)
- **Phase Control**: Nút manually chuyển phase (chỉ trong Direct/Hybrid mode)
- **Auto-Pilot mode**: Tất cả nút control bị disabled, log vẫn hiển thị

---

### Screen 12: Disconnect / Mất kết nối

```
┌─────────────────────────────────┐
│                                 │
│         ⚠️                      │
│                                 │
│  Mất kết nối với máy chủ       │
│                                 │
│  Đang thử kết nối lại...      │
│  (15 giây còn lại)             │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Về trang chủ            │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

- **Overlay**: Full-screen overlay, nền blur + tối
- **Spinner**: Pulse animation, muted color
- **Countdown**: 30 giây grace period
- **Auto-reconnect**: Nếu kết nối lại trong 30s → tự động quay vào phòng
- **Fallback**: Sau 30s → nút "Về trang chủ" sáng lên, cho phép thoát

---

## 3. Character / Role Designs

### 3.1 Avatar System

Mỗi vai trò được đại diện bởi **1 emoji chính** + **1 màu phe**. Avatar hiển thị dưới dạng:

- **Large** (64-80px): Role Reveal card, Game Over list
- **Medium** (40px): Player grid, Night action
- **Small** (28px): Chat message, Vote list
- **Circle format**: Luôn trong circle, nền theo phe color

### 3.2 Role Visual Specifications

| Vai trò | Emoji | Phe | Màu nền | Màu border | Mô tả visual |
|---------|-------|-----|---------|------------|-------------|
| **Sói** | 🐺 | Wolf | `#3B1A1A` | `#E53E3E` | Đỏ tối, border đỏ, đôi mắt sáng red glow |
| **Sói Đầu Sỏ** | 👹 | Wolf | `#3B1A1A` | `#E53E3E` | Giống Sói nhưng lớn hơn, thêm crown nhỏ |
| **Tiên Tri** | 🔮 | Village | `#1A3B2A` | `#38A169` | Xanh lá, crystal ball glow hiệu ứng shimmer |
| **Phù Thủy** | 🧪 | Village | `#1A3B2A` | `#38A169` | Xanh lá, potion bubble animation |
| **Bảo Vệ** | 🛡️ | Village | `#1A3B2A` | `#38A169` | Xanh lá, shield glow khi đang bảo vệ |
| **Săn Thủ** | 🏹 | Village | `#1A3B2A` | `#38A169` | Xanh lá, crosshair overlay subtle |
| **Thần Tình Yêu** | 💘 | Neutral | `#2D1B4E` | `#9F7AEA` | Tím, heart pulse animation |
| **Lão Làng** | 👴 | Village | `#1A3B2A` | `#38A169` | Xanh lá, beard detail, icon hơi lớn hơn |
| **Bác Sĩ** | 💊 | Village | `#1A3B2A` | `#38A169` | Xanh lá, plus cross subtle |
| **Dân Thường** | 👤 | Village | `#1A3B2A` | `#38A169` | Xanh lá, đơn giản, không特效 |

### 3.3 Player Avatar (Không phải vai trò)

Khi chưa biết vai trò (lobby, chat, voting):

- **Avatar**: Circle với **chữ cái đầu** của username, nền random từ palette pastel tối
- **Pastel palette** (cho avatar background):
  - `#2D3748` (slate)
  - `#3B3264` (indigo dark)
  - `#2D4A3E` (green dark)
  - `#4A3B2D` (amber dark)
  - `#3B2D4A` (purple dark)
  - `#2D3B4A` (blue dark)
  - `#4A2D3B` (pink dark)
  - `#3B4A2D` (lime dark)
- **Online indicator**: Chấm xanh nhỏ (6px) góc dưới phải avatar
- **Dead overlay**: Avatar xám + skull icon overlay (opacity 0.7)
- **Host badge**: Crown icon 👑 nhỏ ở góc trên phải avatar

### 3.4 Role Card Design (cho AI generate)

Mỗi vai trò có 1 card thiết kế riêng dùng trong Role Reveal. Mô tả cho AI designer:

**🐺 Sói (Werewolf)**
- Background: Dark red gradient (left to right, #1a0505 → #3B1A1A)
- Center: Wolf emoji 80px, red glow shadow
- Title: "SÓI" — white, bold, 28px
- Badge: Pill "PHE SÓI" — bg red, text white
- Detail section: List đồng đội dạng horizontal pills
- Border: 2px solid #E53E3E, rounded-3xl

**👹 Sói Đầu Sỏ (Alpha Wolf)**
- Giống Sói nhưng thêm subtle crown/horns element ở top
- Border glow mạnh hơn (double shadow)

**🔮 Tiên Tri (Seer)**
- Background: Dark emerald gradient (#0a1f14 → #1A3B2A)
- Center: Crystal ball emoji 80px, cyan shimmer animation
- Title: "TIÊN TRI" — white, bold, 28px
- Badge: Pill "PHE DÂN" — bg emerald, text white
- Description: "Soi 1 người mỗi đêm để biết phe"
- Border: 2px solid #38A169, rounded-3xl

**🧪 Phù Thủy (Witch)**
- Background: Dark emerald gradient
- Center: Potion emoji 80px, bubble particles animation
- Title: "PHÙ THỦY" — white, bold
- Badge: Pill "PHE DÂN" — bg emerald, text white
- 2 sub-badges: "Thuốc cứu: 1" (xanh) + "Thuốc độc: 1" (đỏ)
- Border: 2px solid #38A169

**🛡️ Bảo Vệ (Guard)**
- Background: Dark emerald gradient
- Center: Shield emoji 80px, metallic shimmer
- Title: "BẢO VỆ" — white, bold
- Badge: Pill "PHE DÂN"
- Border: 2px solid #38A169

**🏹 Săn Thủ (Hunter)**
- Background: Dark emerald gradient
- Center: Bow/arrow emoji 80px
- Title: "SĂN THỦ" — white, bold
- Badge: Pill "PHE DÂN"
- Note: "Khi chết, bắn 1 người theo"
- Border: 2px solid #38A169

**💘 Thần Tình Yêu (Cupid)**
- Background: Dark purple gradient (#1a0a2e → #2D1B4E)
- Center: Heart with arrow emoji 80px, pulse animation
- Title: "THẦN TÌNH YÊU" — white, bold
- Badge: Pill "TRUNG LẬP" — bg purple, text white
- Border: 2px solid #9F7AEA

**👴 Lão Làng (Elder)**
- Background: Dark emerald gradient
- Center: Old man emoji 80px
- Title: "LÃO LÀNG" — white, bold
- Badge: Pill "PHE DÂN"
- Note: "Chịu 1 cắn. Nếu bị Dân xử → mất 1 vai trò Dân"
- Border: 2px solid #38A169, slightly thicker

**💊 Bác Sĩ (Doctor)**
- Background: Dark emerald gradient
- Center: Pill emoji 80px
- Title: "BÁC SĨ" — white, bold
- Badge: Pill "PHE DÂN"
- Note: "Chữa 1 người/đêm, không tự chữa"
- Border: 2px solid #38A169

**👤 Dân Thường (Villager)**
- Background: Dark emerald gradient (nhạt hơn)
- Center: Person emoji 80px
- Title: "DÂN THƯỜNG" — white, bold
- Badge: Pill "PHE DÂN"
- Note: "Dựa vào phân tích và biểu quyết"
- Border: 2px solid #38A169, dashed

---

## 4. Component Library

### 4.1 Buttons

| Loại | Style | Công dụng |
|------|-------|----------|
| **Primary** | Bg accent moonlight, text đen, rounded-2xl, h-12 | CTA chính (Vào chơi, Bắt đầu, Xác nhận) |
| **Secondary** | Outline accent, text accent, rounded-2xl, h-12 | Hành động phụ (Copy mã, Chia sẻ) |
| **Ghost** | Transparent, text muted, rounded-xl, h-10 | Hành động nhẹ (Đặt lại, Hủy) |
| **Danger** | Bg red, text white, rounded-2xl, h-12 | Xóa phòng, Kết thúc sớm |
| **Icon** | Square, 40x40, outline | +/-, back, settings |
| **Pill** | Full-rounded, text-xs, px-3 py-1 | Badge phe, status |

### 4.2 Cards

| Loại | Style | Công dụng |
|------|-------|----------|
| **Room Card** | Bg card, border, rounded-2xl, p-4, hover glow | Phòng gần đây |
| **Player Card** | Bg card, border, rounded-2xl, p-3, flex avatar+info | Grid người chơi |
| **Action Card** | Bg card, border accent, rounded-2xl, p-4, clickable | Night action target |
| **Result Card** | Bg gradient theo phe, border glow, rounded-3xl, p-6 | Kết quả soi, thông báo tử vong |
| **Warning Card** | Bg warning-light, border warning, rounded-xl, p-3 | Cảnh báo mất cân bằng |

### 4.3 Status Indicators

| Status | Visual |
|--------|--------|
| **Online** | Chấm xanh 6px, pulse animation nhẹ |
| **Offline/Disconnect** | Chấm đỏ 6px |
| **Sẵn sàng** | Badge xanh "Sẵn sàng" |
| **Chưa sẵn sàng** | Badge xám "Chờ..." |
| **Đang chơi** | Badge vàng "Đang chơi" |
| **Đã kết thúc** | Badge xám "Kết thúc" |
| **Đã chết** | Avatar xám + skull overlay |
| **Host** | Crown icon 👑 góc phải avatar |

### 4.4 Phase Indicators

| Phase | Icon | Màu | Background |
|--------|------|------|-----------|
| **Lobby** | 🏠 | Moonlight | Default dark |
| **Đêm** | 🌙 | Moonlight blue | Night gradient #0F0E17 → #1A1A2E |
| **Rạng sáng** | 🌅 | Gold #ECC94B | Transition gradient |
| **Ngày** | ☀️ | Gold #ECC94B | Day gradient #1A1825 → #2D2B55 |
| **Biểu quyết** | 🗳 | Moonlight | Day gradient + red accent |
| **Kết thúc** | 🏆 | Gold | Winner phe gradient |

### 4.5 Animations

| Animation | Timing | Easing | Công dụng |
|-----------|--------|--------|----------|
| **Fade in** | 300ms | ease-out | Mọi card xuất hiện |
| **Slide up** | 400ms | ease-out | Modal, bottom sheet |
| **Pulse** | 2s loop | ease-in-out | Online indicator, "đang chờ" |
| **Glow pulse** | 3s loop | ease-in-out | Border card khi đến lượt |
| **Shimmer** | 2s loop | linear | Crystal ball (Tiên Tri) |
| **Countdown** | 1s step | linear | Timer đếm ngược |
| **Confetti** | 2s | ease-out | Game Over thắng |
| **Screen shake** | 500ms | ease-out | Khi có người chết (subtle) |
| **Press-to-reveal** | 150ms | ease-out | Hiện/ẩn nội dung bí mật |
| **Progress fill** | 500ms | ease-out | Vote progress bar |

---

## 5. Responsive Breakpoints

| Breakpoint | Width | Layout thay đổi |
|------------|-------|------------------|
| **Mobile** | < 640px | 1 cột, player grid 2 cột, full-width cards, bottom chat |
| **Tablet** | 640-1024px | 2 cột cho actions, player grid 3 cột |
| **Desktop** | > 1024px | Max-width 640px centered (mobile-first), player grid 4 cột |

> **Lưu ý**: App được thiết kế **mobile-first** vì người chơi thường ngồi cùng phòng, dùng điện thoại.

---

## 6. Anti-Peek UI Patterns

### 6.1 Press-to-Reveal

```
Trạng thái ẩn (mặc định):     Trạng thái hiện (nhấn giữ):
┌─────────────────────┐      ┌─────────────────────┐
│  🔮                  │      │  🔮                  │
│  NHẤN GIỮ ĐỂ XEM    │  →   │  TIÊN TRI            │
│  (text bị blur)      │      │  Kết quả: DÂN       │
│                      │      │  (text rõ)           │
└─────────────────────┘      └─────────────────────┘
```

- Touch/mouse down → hiện nội dung (150ms transition)
- Touch/mouse up → ẩn ngay lập tức
- Haptic feedback trên mobile (navigator.vibrate)

### 6.2 Decoy Screen (Màn hình mồi)

Khi người chơi KHÔNG có hành động trong đêm → hiện fake UI:

```
┌─────────────────────────────────┐
│  🌙 ĐÊM THỨ 1      [⏱ 0:25]   │
│  ═══════════════════════════    │
│                                 │
│    ⏳ Đang chờ các vai trò    │
│       khác hành động...        │
│                                 │
│    (fake loading animation)    │
│    (fake progress bar)         │
│                                 │
└─────────────────────────────────┘
```

- Mục đích: người bên cạnh KHÔNG BIẾT người này có hành động hay không
- Fake timer, fake progress bar, fake loading text
- Random subtle animation changes để trông "real"

### 6.3 Ghost Mode (Người đã chết)

- Nền tối hơn (overlay opacity 0.3)
- Tất cả buttons disabled
- Chat chỉ đọc (không gửi được)
- Text "Bạn đã chết. Xem trò chơi tiếp..." ở top
- Avatar xám + skull overlay

---

## 7. Toast / Notification System

| Loại | Icon | Màu | Ví dụ |
|------|------|------|--------|
| **Success** | Check | Xanh | "Đã tạo phòng #A3F2" |
| **Error** | X | Đỏ | "Không thể kết nối" |
| **Warning** | Alert | Vàng | "Bạn chưa sẵn sàng" |
| **Info** | Info | Blue | "Player E đã tham gia" |
| **System** | Moon | Accent | "Đêm thứ 2 bắt đầu..." |

- Position: Top center, stack tối đa 3
- Auto-dismiss: 3-5 giây
- Animation: Slide down + fade in

---

## 8. Design Prompts cho AI Image Generator

Dùng các prompt dưới đây để generate mockup với AI (Midjourney, DALL-E, v.v.):

### 8.1 App Overview (Mobile)
```
Mobile app UI design for a Werewolf (Ma Sói) realtime multiplayer game.
Dark fantasy theme, dark background #0F0E17, moonlight blue accent #A7C5EB.
Show 3 phone screens side by side: Login screen with moon logo,
Lobby with player grid, Night phase with action list.
Minimalist, elegant, card-based UI with soft glow effects.
Rounded corners (16-20px). No photos, only icons and emoji.
Style: modern dark mobile game UI, not skeuomorphic.
```

### 8.2 Night Phase (Mobile)
```
Mobile game UI screen for Werewolf night phase.
Dark background with subtle stars, moon icon top-left.
Central card showing role action: "TIÊN TRI — Chọn người để soi".
Grid of 8 player avatars (circles with initials) below.
Countdown timer top-right showing "0:25".
Color palette: dark #0F0E17, card #1A1825, accent blue #A7C5EB, green #38A169.
Minimal, atmospheric, mysterious mood. Line icons only.
```

### 8.3 Role Reveal Cards
```
Set of 10 role cards for Werewolf game, arranged in a grid.
Each card is rounded rectangle with gradient background.
Wolf roles (wolf, alpha wolf) on dark red background #3B1A1A with red border.
Village roles (seer, witch, guard, hunter, elder, doctor, villager) on dark green #1A3B2A with green border.
Neutral role (cupid) on dark purple #2D1B4E with purple border.
Each card has large emoji in center, role name below, faction badge.
Dark fantasy style, soft glow effects, elegant typography.
```

### 8.4 Game Over Screen
```
Mobile game UI screen showing Werewolf game over.
"PHE DÂN THẮNG!" text in large bold white, confetti particles.
Below: list of all 10 players with their true roles revealed
(wolf emoji for werewolves, seer emoji for seer, etc).
Dark background with emerald green gradient glow from bottom.
Two buttons at bottom: "Chơi lại" and "Về trang chủ".
Celebratory but elegant, dark fantasy aesthetic.
```