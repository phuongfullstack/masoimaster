# Deploy miễn phí lên Vercel (Firebase Spark + Vercel Hobby)

Kiến trúc miễn phí 100%: **Vercel** chạy Next.js (web + API routes),
**Firebase Spark** chạy Auth + Firestore. Không cần bật billing ở đâu cả.

> `masoimaster.web.app` (Firebase Hosting) KHÔNG dùng được cho app này ở gói
> miễn phí — phần server Next.js đòi Cloud Run/App Hosting, tức gói Blaze.

## Bước 1 — Đẩy code lên GitHub

```bash
git add -A
git commit -m "Ma Soi Realtime - Firebase + Firestore"
# Tạo repo trên github.com (private cũng được) rồi:
git remote add origin https://github.com/<username>/masoimaster.git
git push -u origin main
```

**Kiểm tra trước khi push**: `serviceAccountKey.json` và `.env` đã nằm trong
`.gitignore` — tuyệt đối không commit 2 file này.

## Bước 2 — Import vào Vercel

1. Vào [vercel.com](https://vercel.com) → đăng nhập bằng GitHub (miễn phí).
2. **Add New → Project** → chọn repo `masoimaster` → Framework tự nhận Next.js.
3. Trước khi bấm Deploy, mở **Environment Variables** và thêm (Bước 3).

## Bước 3 — Biến môi trường trên Vercel

Copy từ `.env` local:

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyB9QIKPHTrPFmBHDyW6yxOkCDYisWRtHeA` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `masoimaster.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `masoimaster` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `masoimaster.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `543056561746` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:543056561746:web:ebd596b739c4e111f4018b` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `G-Y66PF6H0W6` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_ID` | `masoimaster` |
| `FIREBASE_PROJECT_ID` | `masoimaster` |
| `FIREBASE_CLIENT_EMAIL` | *(từ `serviceAccountKey.json` → `client_email`)* |
| `FIREBASE_PRIVATE_KEY` | *(từ `serviceAccountKey.json` → `private_key`, dán nguyên chuỗi có `\n`)* |

> Trên Vercel không có file `serviceAccountKey.json`, nên server sẽ đọc 3 biến
> `FIREBASE_*` (code đã hỗ trợ sẵn: env trước, file sau).

## Bước 4 — Deploy + thêm Authorized Domain

1. Bấm **Deploy** → nhận URL, ví dụ `https://masoimaster.vercel.app`.
2. Firebase Console → **Authentication → Settings → Authorized domains** →
   **Add domain** → `masoimaster.vercel.app`.
   (Thiếu bước này thì đăng nhập Google/email-link sẽ bị từ chối.)

## Bước 5 — Kiểm tra

Mở URL Vercel trên 2 thiết bị (hoặc 1 tab thường + 1 tab ẩn danh):
đăng nhập → tạo phòng → join bằng mã → chơi thử. Realtime chạy qua
Firestore `onSnapshot` nên không cần cấu hình gì thêm về websocket.

## Giới hạn gói miễn phí (đủ rộng cho nhóm bạn bè)

| | Ngưỡng miễn phí/ngày |
|---|---|
| Firestore reads | 50.000 |
| Firestore writes | 20.000 |
| Firestore deletes | 20.000 |
| Vercel Hobby | 100 GB băng thông/tháng, serverless không giới hạn request thực tế cho quy mô nhỏ |

Một ván 8 người ~vài trăm reads/writes → chơi thoải mái hàng chục ván/ngày.

## Cập nhật code sau này

Chỉ cần `git push` — Vercel tự build và deploy lại.
