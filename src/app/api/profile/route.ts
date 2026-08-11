// ============================================================
// /api/profile — get or update the signed-in user's display name.
// Identity is taken from the verified Firebase ID token (Bearer).
// Storage: Firestore `users/{uid}` (doc id = Firebase uid). Clients
// can read their own doc (rules), but all writes go through here
// via the Admin SDK.
// ============================================================
import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { userDoc } from '@/lib/firestore-server'
import { verifyIdToken, bearerFromHeaders } from '@/lib/firebase-admin'

function defaultName(decoded: { email?: string; phone_number?: string }): string {
  if (decoded.email) return decoded.email.split('@')[0]
  if (decoded.phone_number) return 'User' + decoded.phone_number.slice(-4)
  return 'Người chơi'
}

/** Create the user doc on first login; return the current username. */
async function ensureUser(decoded: {
  uid: string; email?: string; phone_number?: string
}): Promise<string> {
  const ref = userDoc(decoded.uid)
  const snap = await ref.get()
  const existing = snap.exists ? (snap.data() as { username?: string }).username : undefined
  if (existing) return existing
  const username = defaultName(decoded) + ' ' + decoded.uid.slice(-4)
  await ref.set(
    { username, createdAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
  return username
}

export async function GET(req: Request) {
  const token = bearerFromHeaders(req.headers)
  const decoded = await verifyIdToken(token)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const username = await ensureUser(decoded)
  const snap = await userDoc(decoded.uid).get()
  const stats = snap.exists ? (snap.data() as { stats?: Record<string, unknown> }).stats ?? null : null
  return NextResponse.json({ uid: decoded.uid, displayName: username, stats })
}

export async function PATCH(req: Request) {
  const token = bearerFromHeaders(req.headers)
  const decoded = await verifyIdToken(token)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { displayName?: unknown } = {}
  try { body = await req.json() } catch { /* empty */ }
  const name = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  if (!name || name.length > 24) {
    return NextResponse.json({ error: 'Tên hiển thị không hợp lệ (1–24 ký tự)' }, { status: 400 })
  }

  await userDoc(decoded.uid).set(
    { username: name, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
  return NextResponse.json({ uid: decoded.uid, displayName: name })
}
