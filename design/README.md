# Ma Sói Realtime — Design Documentation

> Thư mục chứa tài liệu thiết kế UI/UX cho Ma Sói Realtime.

## Cấu trúc

```
design/
├── README.md                          ← file này
└── project/
    ├── uploads/
    │   └── ma-soi-ui-design-spec.md   ← ⭐ SPEC CHÍNH THỨC v2.0 (phản ánh production)
    ├── design_handoff_ma_soi_realtime/ ← TARGET VISION (17 vai, archived reference)
    │   ├── README.md                  ← handoff doc (có banner target-vision)
    │   ├── ma-soi-ui-design-spec.md   ← spec v1.0 (archived)
    │   ├── Ma Soi Realtime.dc.html    ← design canvas chính
    │   ├── MaSoiApp.dc.html           ← 52 trạng thái màn hình (124KB)
    │   ├── ios-frame.jsx              ← iOS device frame
    │   └── support.js                 ← canvas support script
    ├── Ma Soi Realtime.dc.html        ← canvas copy
    ├── MaSoiApp.dc.html               ← canvas copy
    ├── ios-frame.jsx                  ← frame copy
    └── support.js                     ← support copy
```

## Đọc theo thứ tự

1. **`project/uploads/ma-soi-ui-design-spec.md`** (v2.0) — spec chính thức, phản ánh
   đúng production hiện tại (8 vai, hybrid palette, Firebase auth).
2. **Docs implementation**:
   - `docs/FEATURES.md` — feature catalog đầy đủ
   - `docs/SCENARIOS.md` — kịch bản chơi + 18-role catalog
   - `docs/ANTI-PEEK.md` — anti-peek patterns + status
3. **`project/design_handoff_ma_soi_realtime/`** — chỉ khi cần tham khảo target
   vision dài hạn (17 vai, design canvas high-fidelity).

## Lưu ý

- ❌ **KHÔNG dùng** `project/design_handoff_ma_soi_realtime/ma-soi-ui-design-spec.md`
  (v1.0) làm spec chính — nó đã lỗi thời (đề cập Supabase, Discord, nickname-only).
- ❌ **KHÔNG sửa** `MaSoiApp.dc.html` (124KB canvas) — giữ nguyên làm reference.
- ✅ Spec chính là `uploads/ma-soi-ui-design-spec.md` v2.0.
