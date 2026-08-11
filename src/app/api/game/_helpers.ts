// ============================================================
// Shared helpers for /api/game/* routes.
// ============================================================
import { NextResponse } from 'next/server'
import { verifyIdToken, bearerFromHeaders } from '@/lib/firebase-admin'

/** Authenticate the request — returns the decoded uid or a 401 response. */
export async function authenticate(req: Request): Promise<{ uid: string } | NextResponse> {
  const token = bearerFromHeaders(req.headers)
  const decoded = await verifyIdToken(token)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return { uid: decoded.uid }
}

/** Read a JSON body, tolerating empty/invalid bodies. */
export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    return {} as T
  }
}

/** Standard error response. */
export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Standard success response. */
export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data })
}

/** Type guard: was authenticate()'s result an error response? */
export function isAuthError(r: { uid: string } | NextResponse): r is NextResponse {
  return r instanceof NextResponse
}
