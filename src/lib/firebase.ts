'use client'

// ============================================================
// Firebase client SDK initialization (browser only).
// Public config is safe to expose; secrets live server-side.
// ============================================================
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

// authDomain: dùng CHÍNH domain đang chạy app (same-origin — /__/auth/* được
// next.config.ts proxy về firebaseapp.com). Fix Google sign-in bị trình duyệt
// chặn third-party storage khi authDomain khác origin. SSR fallback về env.
// Yêu cầu: domain app phải có trong Authorized redirect URIs của OAuth client
// (GCP Console → Credentials) dạng https://<domain>/__/auth/handler.
const sameOriginAuthDomain =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_AUTH_SAME_ORIGIN === '1'
    ? window.location.host
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: sameOriginAuthDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Reuse existing app on HMR / re-imports
export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig)

export const auth: Auth = getAuth(firebaseApp)

// Firestore client (for onSnapshot subscriptions in game-client.ts).
// Project dùng database ĐẶT TÊN (không phải "(default)") — phải truyền id.
const FIRESTORE_DB_ID = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || 'masoimaster'
export const fsDb: Firestore = getFirestore(firebaseApp, FIRESTORE_DB_ID)

// Analytics — browser-only, và chỉ khi môi trường hỗ trợ (tránh lỗi SSR
// hoặc trình duyệt chặn cookies). Fire-and-forget khi module được nạp.
if (typeof window !== 'undefined') {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) =>
    isSupported().then((ok) => { if (ok) getAnalytics(firebaseApp) }),
  ).catch(() => { /* analytics là tính năng phụ — bỏ qua nếu lỗi */ })
}

// actionCodeSettings for passwordless email-link sign-in.
// Redirects back to the same origin's root after the user clicks the link.
export const emailLinkActionCodeSettings = {
  url: typeof window !== 'undefined' ? window.location.origin + '/' : '/',
  handleCodeInApp: true,
}
