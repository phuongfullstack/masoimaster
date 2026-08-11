# Handoff: Ma Sói Realtime — mobile app

## Overview
Bản thiết kế giao diện di động cho **Ma Sói Realtime**, một ứng dụng chơi Ma Sói dành cho nhóm người **ngồi cạnh nhau ngoài đời**, mỗi người một điện thoại. Ứng dụng thay thế bộ bài giấy và người quản trò: nó chia thẻ, chạy lượt đêm, tính phiếu, và giữ bí mật vai trò.

Ràng buộc trung tâm chi phối gần như mọi quyết định thiết kế: **người ngồi bên cạnh có thể liếc màn hình của bạn.** Vì vậy không có thông tin bí mật nào hiển thị thường trực — tất cả nằm sau thao tác nhấn-giữ, và mọi bề mặt riêng tư được thiết kế để trông giống hệt nhau khi nhìn lướt.

Gói này gồm 52 trạng thái màn hình, 17 vai trò, 2 chế độ lượt đêm, 3 chế độ quản trò, và các hiệu ứng vai-tác-động-lên-vai cả đêm lẫn ngày.

## About the Design Files
Các file trong gói này là **tài liệu thiết kế tham chiếu viết bằng HTML** — bản mẫu thể hiện hình thức và hành vi mong muốn, **không phải mã nguồn sản phẩm để copy thẳng**. Việc cần làm là **dựng lại các thiết kế này trong môi trường sẵn có của codebase đích** (React Native, Flutter, SwiftUI, web app…) theo các pattern và thư viện mà dự án đó đang dùng. Nếu chưa có môi trường nào, hãy chọn framework phù hợp nhất rồi triển khai theo tài liệu này.

Toàn bộ dữ liệu trong bản mẫu là dữ liệu giả (8 người chơi cố định, chat kịch bản sẵn, timer chạy tại chỗ). Backend thực tế cần realtime (spec gốc đề cập Supabase Realtime).

## Fidelity
**High-fidelity.** Màu, typography, spacing, bo góc, glow, animation và toàn bộ copy (tiếng Việt + tiếng Anh) đều là giá trị cuối. Dựng lại pixel-perfect bằng thư viện của codebase đích.

Ngoại lệ: emoji được dùng làm biểu tượng vai trò theo spec gốc. Nếu codebase có bộ icon riêng, thay thế được — nhưng phải giữ **cùng một kích thước và cùng một mức độ nổi bật cho mọi vai**, xem mục Chống lộ vai.

---

## Chống lộ vai — đọc mục này trước khi làm bất cứ màn hình nào

Đây là phần dễ làm hỏng nhất khi triển khai. Năm nguyên tắc, tất cả đều đã được áp dụng trong bản mẫu và **không được vi phạm khi dựng lại**:

1. **Không mã hoá phe bằng màu.** Thẻ Sói và thẻ Dân dùng *chính xác* cùng một khung: nền `linear-gradient(155deg,#16141F,#211E30)`, viền `2px solid #35325180`, glow `0 0 40px -14px rgba(167,197,235,.5)`. Phe chỉ xuất hiện dưới dạng **chữ** trên thẻ. Màu đỏ/xanh nhìn lướt là thấy; chữ thì phải nhìn thẳng mới đọc được.
2. **Mọi thẻ riêng tư cùng chiều cao.** Thẻ vai trò: `min-height: 330px`. Báo cáo rạng sáng: `min-height: 290px`. Thẻ Sói có thêm danh sách bầy nên tự nhiên sẽ cao hơn — phải ép cùng chiều cao, nếu không đoán được vai qua bóng dáng.
3. **Không in tên vai lên màn hình lúc đang chơi.** Header lượt đêm ghi "🌙 ĐẾN LƯỢT BẠN", không ghi "🧪 PHÙ THỦY". Màn chờ đêm ghi "Vai trò của bạn: • • •". Người chơi đã biết vai của mình rồi; in ra chỉ để người bên cạnh đọc.
4. **Nhãn nút không gọi tên khả năng.** Mọi nút xác nhận đều là "Xác nhận" — không phải "Xác nhận cắn" / "Xác nhận soi" / "Xác nhận nguyền".
5. **Mọi panel đêm cùng một ngôn ngữ thị giác.** Bảng bầy sói, bảng cõi chết của Bà Đồng, thẻ nạn nhân của Phù Thủy, hai nút thuốc — tất cả dùng `background: rgba(255,255,255,.04)`, `border: 1px solid #353251`. Nhìn lướt thì mọi lượt đêm trông y hệt nhau.

Emoji vai trò giới hạn ở **48px**. Ở 70px, đầu sói đọc được từ bên kia bàn.

### Ba cơ chế bảo mật
- **Nhấn giữ (press-and-hold).** Mọi nội dung bí mật ẩn sau `onPointerDown` / `onPointerUp` / `onPointerLeave`. Trạng thái ẩn: `filter: blur(7px); opacity: .35`. Trạng thái hiện: `blur(0); opacity: 1`, transition `.15s ease-out`. Thả tay hoặc trượt ngón ra ngoài là ẩn ngay lập tức. Rung nhẹ 12ms khi mở.
- **Màn hình mồi (decoy).** 5 vai không hành động ban đêm (Săn Thủ, Lão Làng, Trưởng Làng, Thằng Ngố, Dân Thường) vẫn thấy một màn hình "đang chờ các vai khác hành động" có spinner và progress bar. Người bên cạnh không thể suy ra bạn có hành động hay không qua việc bạn có bấm gì không.
- **Nút 🎴 xem lại thẻ.** Nổi ở góc phải dưới trong mọi màn hình đang chơi. Nhấn giữ để xem lại vai của mình giữa ván mà không rời màn hình hiện tại; thả ra là ẩn. Sói thấy danh sách bầy ngay trong cùng lớp phủ này.

---

## Design Tokens

### Màu
| Token | Hex | Dùng ở đâu |
|---|---|---|
| Nền chính | `#0F0E17` | nền app, chân gradient |
| Nền nổi | `#1A1825` | card, input, list item |
| Nền nổi hơn | `#211E30` | thẻ riêng tư, panel đêm |
| Nền chìm | `#141222` | vùng chat, master log |
| Nền thẻ (đỉnh gradient) | `#16141F` | đỉnh gradient thẻ riêng tư |
| Viền | `#2E2B3F` | viền mặc định |
| Viền thẻ riêng tư | `#353251` | thẻ + panel đêm (đồng nhất) |
| Chữ chính | `#FFFFFE` | tiêu đề, nội dung |
| Chữ phụ | `#94A1B2` | mô tả, nhãn |
| Chữ mờ | `#4A5568` | ghi chú, disabled |
| Chữ mờ (xanh) | `#7E93AF` | nhãn trong panel đêm |
| **Accent — ánh trăng** | `#A7C5EB` | CTA chính, selection, glow |
| Accent sáng | `#C9DDF3` | hover, gradient CTA |
| Nguy hiểm | `#E53E3E` | tử vong, biểu quyết, timer gấp |
| Thành công | `#38A169` | trạng thái sẵn sàng, online, thắng |
| Cảnh báo | `#ECC94B` | host, cảnh báo, timer ngày |
| Trung lập/ma | `#9F7AEA` | phe trung lập, tab người chết |
| Ma (sáng) | `#C4A9F5` | chữ trong kênh người chết |

**Chỉ dùng `#E53E3E`, `#38A169`, `#9F7AEA` ở bề mặt công khai** (thông báo tử vong, biểu quyết, màn kết thúc). Không bao giờ dùng ở màn hình riêng tư — xem mục Chống lộ vai.

### Typography
Font duy nhất: **Be Vietnam Pro** (Google Fonts, weights 400/500/600/700/800). Chọn vì hỗ trợ đầy đủ dấu tiếng Việt.

| Vai trò | Size | Weight | Letter-spacing |
|---|---|---|---|
| Tiêu đề màn hình lớn | 25–31px | 800 | .05–.16em |
| Tiêu đề thẻ vai | 23px | 800 | .05em |
| Tiêu đề section | 22px | 800 | .04em |
| Header phase | 13.5–14px | 800 | .1–.14em |
| Nút CTA | 14.5–15px | 800 | .04em |
| Tên người chơi (list) | 13–13.5px | 700 | — |
| Nội dung / mô tả | 12–12.5px | 400–600 | — |
| Nhãn section (uppercase) | 11–12px | 700 | .08–.1em |
| Chat | 12px | 400 | line-height 1.5 |
| Ghi chú | 10–11px | 400–700 | — |
| Badge nhỏ | 8.5–9.5px | 700–800 | .04–.1em |
| Tên người chơi (grid 4 cột) | 9.5–10px | 600 | — |

Số liệu (timer, số phiếu) dùng `font-variant-numeric: tabular-nums`.

### Spacing
Thang: 4 / 5 / 6 / 7 / 8 / 9 / 10 / 11 / 12 / 14 / 16 / 18 / 20 / 22 / 26 / 30 / 34 / 38 px.
Padding ngang màn hình: **20px** (một số màn hẹp dùng 18px, màn login/reveal dùng 24–30px).
Gap trong grid người chơi: **9px**. Gap trong list dọc: **8–9px**.

### Bo góc
| Giá trị | Dùng cho |
|---|---|
| 9999px | pill, badge, avatar, progress bar |
| 10–11px | tab bên trong segmented control |
| 14px | item nhỏ, panel đêm, input |
| 16px | nút phụ, card trong list |
| 18px | CTA chính, card lớn |
| 20px | card trang chủ |
| 22–24px | card kết quả, thông báo tử vong |
| 26px | thẻ báo cáo rạng sáng |
| 28px | thẻ vai trò |

### Đổ bóng — dùng glow, không dùng drop shadow
| Ngữ cảnh | Giá trị |
|---|---|
| CTA chính | `0 0 24px -6px rgba(167,197,235,.7)` |
| CTA nổi bật | `0 0 28px -6px rgba(167,197,235,.75)` |
| Thẻ riêng tư | `0 0 40px -14px rgba(167,197,235,.5)` |
| Item được chọn | `0 0 22px -6px rgba(167,197,235,.8)` |
| Nút nổi (🎴) | `0 8px 24px rgba(0,0,0,.5)` |
| Toast | `0 10px 30px rgba(0,0,0,.5)` |

### Animation
| Tên | Thời lượng | Mô tả |
|---|---|---|
| `msPulse` | 2s infinite | chấm trạng thái online, cảnh báo |
| `msGlow` | 3–3.5s infinite | viền phát sáng nhịp nhàng (CTA tạo phòng, header lượt đêm) |
| `msFloat` | 4–7s infinite | biểu tượng lớn trôi nhẹ ±6px |
| `msSpin` | .9–1.6s linear infinite | spinner |
| `msRise` | .3–.8s ease-out | phần tử xuất hiện, translateY(10px) → 0 |
| `msBar` | 2.4–4.5s | progress bar giả |
| Phát thẻ | .5s ease-out, stagger .11s | 8 thẻ lần lượt bay vào |
| Nhấn giữ | .15s ease-out | blur + opacity |

### Nền theo phase
| Phase | Gradient |
|---|---|
| Login / Reveal | `linear-gradient(180deg,#0F0E17,#12111C)` + lớp sao `opacity .9` |
| Đêm | `linear-gradient(175deg,#0F0E17 0%,#151328 55%,#1A1A2E 100%)` + sao `.9` |
| Rạng sáng | `linear-gradient(0deg,#4A3B2D 0%,#2D2B55 40%,#1A1825 100%)` |
| Tử vong | `linear-gradient(180deg,#1A1825,#2D2B55)` |
| Ngày | `linear-gradient(180deg,#1A1825,#252344)` |
| Biểu quyết | `linear-gradient(180deg,#1F1B2E,#2D2B55)` |
| Kết thúc | `radial-gradient(120% 80% at 50% 110%,rgba(56,161,105,.35),transparent 70%)` trên `linear-gradient(180deg,#0F0E17,#141B18)` |

Lớp sao là 6 `radial-gradient` chồng lên nhau, opacity `.9` ban đêm và `.15` ban ngày.

---

## 17 vai trò

| Key | Icon | Tên VI | Tên EN | Phe | Khả năng |
|---|---|---|---|---|---|
| `wolf` | 🐺 | SÓI | Werewolf | wolf | Đêm: cùng bầy chọn 1 người để cắn. Thấy đồng đội theo thời gian thực. |
| `alpha` | 👹 | SÓI ĐẦU SỎ | Alpha Wolf | wolf | Như Sói. Phiếu của Alpha phá hoà khi bầy chia phiếu. |
| `wolfseer` | 🌘 | SÓI TIÊN TRI | Wolf Seer | wolf | Đêm: soi 1 người xem có phải Tiên Tri không. Vẫn cắn cùng bầy. |
| `cursedwolf` | 🌑 | SÓI NGUYỀN | Cursed Wolf | wolf | 1 lần/ván: biến 1 dân thành sói thay vì giết. Sau đó cắn như sói thường. |
| `seer` | 🔮 | TIÊN TRI | Seer | village | Đêm: soi 1 người để biết phe. |
| `witch` | 🧪 | PHÙ THỦY | Witch | village | 1 thuốc cứu + 1 thuốc độc, mỗi loại 1 lần/ván. |
| `guard` | 🛡️ | BẢO VỆ | Guard | village | Đêm: che 1 người. Không che cùng người 2 đêm liên tiếp. |
| `doctor` | 💊 | BÁC SĨ | Doctor | village | Đêm: chữa 1 người, không tự chữa. |
| `hunter` | 🏹 | SĂN THỦ | Hunter | village | Không hành động đêm. Khi chết được bắn 1 người đi theo. |
| `detective` | 🕵️ | THÁM TỬ | Detective | village | Đêm: so 2 người, biết cùng phe hay không (không biết phe nào). |
| `medium` | 🕯️ | BÀ ĐỒNG | Medium | village | Đêm: nghe 1 tin ẩn danh từ người chết. Một chiều, không nhắn lại. |
| `raven` | 🐦 | CON QUẠ | Raven | village | Đêm: đánh dấu 1 người → hôm sau người đó bắt đầu với 2 phiếu. |
| `elder` | 👴 | LÃO LÀNG | Elder | village | Sống sót lần cắn đầu tiên. Nếu bị làng xử, làng mất thêm 1 vai đặc biệt. |
| `chief` | 🏛️ | TRƯỞNG LÀNG | Village Chief | village | Không hành động đêm. Phiếu tính đôi. |
| `villager` | 👤 | DÂN THƯỜNG | Villager | village | Không có khả năng. |
| `cupid` | 💘 | THẦN TÌNH YÊU | Cupid | neutral | Đêm 1: ghép đôi 2 người. Một người chết thì người kia chết theo. |
| `jester` | 🤡 | THẰNG NGỐ | Jester | neutral | Không hành động đêm. Thắng một mình nếu bị làng biểu quyết loại. |

**Thứ tự hành động đêm** (chế độ lần lượt): `wolf → alpha → wolfseer → cursedwolf → seer → witch → guard → hunter → detective → medium → raven → cupid → elder → doctor → chief → jester → villager`. Chỉ các vai có hành động mới chiếm một lượt; các vai còn lại nhận màn hình mồi.

---

## Các nhóm màn hình

### 1. Vào phòng (5 màn) — giống nhau với mọi vai
**Login** — logo 🌙 trôi nhẹ, ô nhập biệt danh, CTA "Vào trò chơi", 2 nút SSO (Google / Discord), version footer.
**Home** — 2 card lớn (Tạo phòng / Nhập mã), danh sách phòng gần đây với badge trạng thái, khối thống kê (số trận / thắng / tỷ lệ) kèm progress bar.
**Lobby** — mã phòng #A3F2 copy được, khối cấu hình, lưới 8 người chơi 4 cột (avatar + chấm online + vương miện host + badge sẵn sàng), CTA bắt đầu, đếm online.
**Lobby — cấu hình** — bottom sheet host chỉnh số người và số lượng từng vai, có kiểm tra cân bằng.
**Phát thẻ bài** — 8 thẻ úp bay vào lần lượt; thẻ của bạn sáng hơn, 7 thẻ kia mờ. CTA "Lật thẻ của tôi". Cảnh báo vàng: "Chỉ mình bạn được xem thẻ này. Nghiêng máy hoặc che màn hình trước khi lật."

### 2. Mở vai trò (18 màn — 17 vai + trạng thái ẩn)
Một thẻ duy nhất, nhấn giữ để đọc. **Mọi vai dùng cùng một khung.** Nội dung: emoji 48px → tên vai → pill phe → mô tả → (nếu có) badge tài nguyên hoặc danh sách đồng đội. Sói thấy bầy dưới dạng pill trung tính (`rgba(255,255,255,.06)`, viền `#353251`) — không phải pill đỏ.

Dưới thẻ: cảnh báo vàng về việc che màn hình, và nút "Tiếp tục".

### 3. Đêm (17 màn)
**Header** — 🌙 + số đêm + badge chế độ (⇢ Lần lượt / ⇉ Đồng thời) + timer + progress bar.

**Chờ lượt (lần lượt)** — 4 ô trạng thái ẩn danh (đã xong / đang chạy / chưa tới), đếm "2/4 đã hành động". Không nêu vai nào đang chạy. Chân màn hình: "Vai trò của bạn: • • •" + gợi ý giữ 🎴.

**Chờ lượt (đồng thời)** — không có thứ tự, chỉ một progress bar "5/8 người đã xong".

**Lượt của bạn** — header trung tính "🌙 ĐẾN LƯỢT BẠN", dòng nhắc nhỏ mô tả việc cần làm, lưới 8 mục tiêu 4 cột, CTA "Xác nhận". Biến thể theo vai:
- Sói / Sói Đầu Sỏ: thêm bảng bầy hiện lựa chọn của đồng đội theo thời gian thực
- Phù Thủy: 2 nút chế độ (cứu / độc) + thẻ nạn nhân — **chỉ ở chế độ lần lượt**; ở chế độ đồng thời hiện ô "Chưa biết ai bị cắn — dùng thuốc cứu lúc này là đặt cược"
- Thám Tử / Thần Tình Yêu: chọn 2 mục tiêu
- Bảo Vệ: người đêm qua bị khoá, không chọn lại được
- Bà Đồng: không chọn ai — chỉ đọc 1 tin ẩn danh từ người chết
- Sói Nguyền: lời nguyền dùng 1 lần, hết thì cắn như sói thường

**Kết quả** — thẻ nhấn-giữ hiện kết luận (ví dụ "LÀ SÓI!"). Các vai không nhận thông tin (Bảo Vệ, Bác Sĩ, Con Quạ) thấy màn "Đã ghi nhận" cùng bố cục.

**Màn hình mồi** — spinner + progress bar giả + dòng "Đang chờ các vai trò khác hành động…". Bố cục giống hệt màn chờ để không phân biệt được.

### 4. Ngày (13 màn)
**Rạng sáng** — 🌅 lớn, transition 2.6 giây tự chuyển.
**Báo cáo cá nhân** (5 biến thể: được che / bị nguyền / chịu cắn / trúng độc / không bị gì) — thẻ riêng tư cùng khung, cùng chiều cao 290px. Chỉ nói *điều gì đã xảy ra với bạn*, không nói *ai gây ra*.
**Thông báo tử vong** — người chết, không nêu nguyên nhân với người chơi thường; nhấn giữ để xem chi tiết (chỉ host).
**Săn Thủ bắn** — kích hoạt khi Săn Thủ chết, chọn 1 người bắn theo.
**Thảo luận** — dải avatar ngang (người chết gạch ngang + 💀), chat, đếm sống/chết, CTA mở biểu quyết.
**Ghost Mode** — người chết thấy 2 tab: *Làng* (chỉ đọc) và *👻 Người chết* (nhắn được). **Tin ở kênh người chết không bao giờ đến người sống.**
**Xem lại thẻ** — lớp phủ nhấn-giữ, có ở cả ban ngày lẫn ban đêm.

### 5. Biểu quyết & kết thúc (5 màn)
**Biểu quyết** — danh sách người chơi kèm số phiếu, dấu quạ +2 hiện công khai, phiếu đôi Trưởng Làng, progress bar tiến độ, nút bỏ phiếu trắng.
**Kết quả** — người bị loại, phe được tiết lộ.
**Hoà phiếu** — không ai bị loại, sang đêm tiếp.
**Kết thúc** — 🏆, phe thắng, thống kê trận, danh sách toàn bộ vai trò (đây là **màn duy nhất** được mã hoá màu theo phe), CTA chơi lại / về nhà.

### 6. Quản trò & hệ thống (4 màn)
**Host Panel** — 3 chế độ (Auto / Direct / Hybrid), 2 chế độ lượt đêm (Lần lượt / Đồng thời), Master Log ghi mọi hành động theo đêm/ngày, nút điều khiển phase (khoá ở chế độ Auto).
**Host — Direct** — bottom sheet can thiệp: sửa kết quả, hồi sinh, ép chuyển phase.
**Mất kết nối** — lớp phủ blur, ⚠️ đập nhịp, đếm ngược 30 giây, spinner, nút về trang chủ.
**Toast** — pill nổi ở đỉnh, viền xanh lá, tự tắt sau 2.2 giây.

---

## Interactions & Behavior

### Nhấn giữ
```
onPointerDown  → hiện (blur 0, opacity 1), rung 12ms
onPointerUp    → ẩn (blur 7px, opacity .35)
onPointerLeave → ẩn
transition: filter .15s ease-out, opacity .15s ease-out
```
Trượt ngón ra ngoài phải ẩn — nếu không, đặt ngón rồi nghiêng máy cho người khác xem được.

### Timer
Đêm 30 giây, ngày 120 giây, biểu quyết 30 giây, mất kết nối đếm ngược 30 giây. Hiển thị `m:ss`, tabular-nums. Progress bar thu hẹp theo thời gian còn lại.

### Vòng lặp
```
Phát thẻ → Mở vai → Đêm → Rạng sáng → Báo cáo cá nhân → Tử vong
  → (Săn Thủ bắn nếu có) → Thảo luận → Biểu quyết → Kết quả
  → Hoà? → Đêm kế tiếp | Loại? → kiểm tra thắng → Đêm kế tiếp hoặc Kết thúc
```
Số đêm/ngày tăng dần. Chỉ đến Kết thúc khi có phe thắng hoặc host kết thúc.

### Chế độ lượt đêm — đổi luật, không chỉ đổi nhịp
- **Lần lượt**: từng vai một theo `ORDER`. Phù Thủy **biết** ai vừa bị cắn.
- **Đồng thời**: tất cả hành động cùng lúc. Phù Thủy **không biết** ai bị cắn, phải cứu mù. Nhanh hơn hẳn.

### Chế độ quản trò
- **Auto** — hệ thống tự chuyển phase, nút điều khiển bị khoá.
- **Direct** — host chuyển phase thủ công, can thiệp được kết quả.
- **Hybrid** — tự động nhưng host ghi đè được.

### Kênh người chết
Hai kênh tách biệt. Người sống chỉ có kênh làng. Người chết đọc được kênh làng (chỉ đọc) và nhắn ở kênh riêng. Bà Đồng nhận **1 tin ẩn danh mỗi đêm**, một chiều, không nhắn lại được — thiết kế như vậy để người chết không trở thành nguồn tin sạch làm game dễ đi.

---

## State Management
```
screen        màn hình hiện tại
role          vai của người chơi (1 trong 17 key)
day           số ngày/đêm hiện tại
nightPhase    waiting | turn | result | decoy
nightMode     seq | sim
hostMode      Auto | Direct | Hybrid
peek          đang nhấn giữ thẻ vai
card          đang nhấn giữ nút 🎴
target        mục tiêu đang chọn
pair          [id, id] cho Thám Tử / Thần Tình Yêu
witchMode     idle | save | poison
potions       {save: 0|1, poison: 0|1}
fx            hiệu ứng đêm qua: none | saved | cursed | elder | poison
ghost         người chơi đã chết
chatTab       village | ghost
votes         {playerId: số phiếu}
myVote        id | 'white' | null
timer         giây còn lại
lang          vi | en
```

Backend cần realtime cho: trạng thái phòng, lựa chọn của bầy sói (đồng bộ giữa các sói), chat (2 kênh), phiếu bầu, chuyển phase, và phát hiện mất kết nối.

---

## Nội dung song ngữ
Toàn bộ copy có sẵn cả tiếng Việt và tiếng Anh trong `MaSoiApp.dc.html` (object `T` với 2 key `vi` / `en`). Tiếng Việt là bản gốc; tiếng Anh là bản dịch. Mọi chuỗi dùng trong app đều nằm ở đó — không hard-code chuỗi mới.

## Assets
Không có ảnh hay icon file. Biểu tượng vai trò dùng emoji hệ thống. Font tải từ Google Fonts:
```
https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap
```

## Files
| File | Nội dung |
|---|---|
| `MaSoiApp.dc.html` | Toàn bộ ứng dụng — 52 trạng thái màn hình, 17 vai, mọi copy song ngữ, mọi giá trị màu/spacing/animation. Đây là nguồn tham chiếu chính. |
| `Ma Soi Realtime.dc.html` | Bảng tổng hợp — dựng 52 màn hình cạnh nhau theo 6 nhóm, kèm ghi chú từng màn. Đọc file này để nắm phạm vi. |
| `ios-frame.jsx` | Khung iPhone dùng để hiển thị bản mẫu. Không phải phần của thiết kế. |
| `ma-soi-ui-design-spec.md` | Spec gốc do người dùng cung cấp. |

Mở `Ma Soi Realtime.dc.html` trong trình duyệt để xem toàn bộ; mở `MaSoiApp.dc.html` để bấm thử.

### Kích thước
Thiết kế ở **402 × 874** (iPhone 14/15 Pro). Padding trên 54px (status bar), dưới 30px — tăng lên 80px ở các màn có nút 🎴 nổi.
