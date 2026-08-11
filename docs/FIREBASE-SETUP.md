# Hướng dẫn cấu hình Firebase Authentication

Game Ma Sói Realtime dùng **Firebase Authentication** để định danh người dùng bằng
Email/Mật khẩu, Liên kết Email (passwordless), Số điện thoại (Phone OTP) và Google.
Tài liệu này mô tả các bước cần làm trong Firebase Console và trên máy dev.

> Project Firebase đã tạo sẵn: **masoimaster** (`masoimaster.firebaseapp.com`).

---

## 1. Bật các phương thức đăng nhập

Mở [Firebase Console → Authentication → Sign-in method](https://console.firebase.google.com/project/masoimaster/authentication/providers)
và **bật** 3 nhà cung cấp sau:

| Phương thức | Cài đặt |
|---|---|
| **Email/Password** | Bật công tắc Email/Password. **Không** cần bật "Email link" ở đây (dùng mục riêng bên dưới). |
| **Email link (passwordless)** | Bật công tắc Email link (Passwordless). Authorized domains đã có `localhost`. |
| **Phone** | Bật công tắc Phone. Thêm số test (xem mục 3) để tránh tốn phí SMS khi dev. |
| **Google** | Bật công tắc Google. Project public-facing name = "Ma Sói Realtime", email support tuỳ chọn. Authorized domains tự thêm ở mục 2. |

---

## 2. Thêm Authorized Domains

Vào **Authentication → Settings → Authorized domains** và đảm bảo có:

- `localhost` (dev)
- Domain production (ví dụ `masoimaster.vercel.app` hoặc domain tùy chỉnh)

Nếu không thêm, đăng nhập bằng email link / phone sẽ bị từ chối.

---

## 3. Số điện thoại test (tránh tốn SMS)

**Authentication → Sign-in method → Phone → Phone numbers for testing** — thêm
cặp số/mã OTP giả, ví dụ:

```
+84901234567   →   123456
+15555555555   →   123456
```

Khi đăng nhập bằng số test, Firebase không gửi SMS thật và luôn chấp nhận mã đã
cài. **Chỉ dùng cho dev** — bỏ trước khi production.

---

## 4. Lấy Service Account Key (verify token server-side)

Server cần một service account để verify ID token do client gửi.

1. Vào **Project settings (⚙️) → Service accounts → Firebase Admin SDK**.
2. Chọn **Node.js** rồi bấm **Generate new private key**.
3. Tải file JSON về. **Không commit file này vào git.**
4. Chọn MỘT trong hai cách cấu hình:

**Cách 1 (khuyên dùng):** đổi tên file JSON thành `serviceAccountKey.json` và đặt
ở gốc dự án. File đã được `.gitignore`; server tự động đọc khi các biến env
Admin để trống. Có thể đổi đường dẫn qua `FIREBASE_SERVICE_ACCOUNT_FILE`.

**Cách 2:** mở file JSON, copy 3 giá trị vào `.env`:

| Trường trong JSON | Biến env trong `.env` |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

---

## 5. Điền file `.env`

Copy `.env.example` → `.env` rồi điền. Phần client (public) đã có sẵn từ config:

```env
# ---- Firebase client (public, từ Project settings → General → Web app) ----
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=masoimaster.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=masoimaster
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=masoimaster.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=543056561746
NEXT_PUBLIC_FIREBASE_APP_ID=1:543056561746:web:ebd596b739c4e111f4018b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Y66PF6H0W6

# ---- Firebase Admin (server, từ Service account JSON) ----
FIREBASE_PROJECT_ID=masoimaster
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@masoimaster.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> **Quan trọng về `FIREBASE_PRIVATE_KEY`:**
> - Giữ nguyên cặp ngoặc kép `"..."`.
> - Các xuống dòng trong key phải là chuỗi ký tự `\n` (như trong file JSON gốc).
>   Code sẽ tự đổi `\n` thành xuống dòng thật khi đọc.

`.env` đã được `.gitignore` (trừ `.env.example`).

---

## 6. Kiểm tra (local)

1. Đảm bảo service account key đã điền trong `.env` (mục 5) — cần thiết
   cho cả Firebase Auth verify lẫn Firestore Admin SDK.
2. Khởi động Next.js (game logic giờ chạy trong API routes, không cần
   game-server riêng):
   ```bash
   bun run dev
   ```
3. Mở http://localhost:3000 → màn đăng nhập (3 tab + Google).
4. Đăng ký email/mật khẩu → "Chọn Tên Hiển Thị" → Home.
5. Tạo phòng, mở tab ẩn danh khác (hoặc thiết bị khác) để join → test
   realtime qua Firestore `onSnapshot`.

## 7. Deploy lên Firebase (Cloud Run + Hosting)

```bash
# 1. Đăng nhập Firebase CLI (lần đầu)
npx firebase login

# 2. Deploy Firestore rules + indexes
npx firebase deploy --only firestore

# 3. Build + push container image lên Cloud Run
#    (cần gcloud CLI đã auth, hoặc dùng Cloud Build)
gcloud builds submit --tag us-central1-docker.pkg.dev/masoimaster/...
#    Hoặc:
gcloud run deploy masoimaster-web --source . --region us-central1 \
  --allow-unauthenticated --port 8080 \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_*..." \
  --update-secrets "FIREBASE_PRIVATE_KEY=..."

# 4. Deploy Hosting (rewrite → Cloud Run)
npx firebase deploy --only hosting
```

App sẽ chạy tại `https://masoimaster.web.app` (hoặc domain tùy chỉnh).

**Authorized domains**: thêm `masoimaster.web.app` + domain tùy chỉnh vào
Authentication → Settings → Authorized domains (cùng lúc với localhost).

---

## Cấu trúc code

| Vai trò | File |
|---|---|
| Client Firebase init | `src/lib/firebase.ts` |
| Client auth context (login/logout/token) | `src/lib/auth-context.tsx` |
| Màn hình đăng nhập (3 tab) | `src/components/game/login-screen.tsx` |
| Onboarding tên hiển thị | `src/components/game/profile-setup.tsx` |
| Server verify (Next.js API) | `src/lib/firebase-admin.ts` |
| Firestore Admin + path helpers + domain types | `src/lib/firestore-server.ts` |
| Profile API (Firestore `users/{uid}`) | `src/app/api/profile/route.ts` |
| Realtime subscribe (onSnapshot) + API wrappers | `src/lib/game-client.ts` |
| GameProvider (map socket-style emit → API) | `src/components/game/socket-provider.tsx` |
| Game logic (night resolve, vote, win check) | `src/lib/game-logic.ts` + `src/app/api/game/*` |
| Security rules | `firestore.rules` |

## Nguyên tắc bảo mật

- **Identity = Firebase `uid`**, không bao giờ tin `userId` client gửi. Mọi API
  route verify Bearer ID token (`verifyIdToken`) rồi mới thao tác, và luôn dùng
  `uid` từ token đã verify.
- ID token tự hết hạn sau ~1 giờ; `onIdTokenChanged` trên client giữ token mới
  nhất cho các lời gọi API.
- Client chỉ đọc Firestore qua `onSnapshot` theo `firestore.rules` (secrets
  owner-only, nightActions không bao giờ đọc được); mọi ghi đi qua Admin SDK
  trong API routes.
- Service account key là bí mật — chỉ nằm trong `.env` hoặc
  `serviceAccountKey.json` (đã gitignore), không bao giờ commit.
