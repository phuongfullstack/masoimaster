// ============================================================
// Firebase Admin (server-side) — single shared app instance.
// Used by Next.js API routes and (mirrored by) the game server to
// verify Firebase ID tokens issued by the client SDK.
// ============================================================
import { getAuth, type Auth as AdminAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { ensureApp } from '@/lib/firestore-server'

let _auth: AdminAuth | null = null
function authAdmin(): AdminAuth {
  // Shares the single Admin app (env vars or serviceAccountKey.json fallback).
  if (!_auth) _auth = getAuth(ensureApp())
  return _auth
}

/** Verify a Firebase ID token. Returns null on any failure (never throws). */
export async function verifyIdToken(token: string | undefined | null): Promise<DecodedIdToken | null> {
  if (!token) return null
  try {
    return await authAdmin().verifyIdToken(token)
  } catch {
    return null
  }
}

/** Extract the Bearer token from an Authorization header. */
export function bearerFromHeaders(headers: Headers): string | null {
  const h = headers.get('authorization') || headers.get('Authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}
