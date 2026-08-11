// ============================================================
// User display-name lookup. Backed by Firestore `users/{uid}`
// (doc id = Firebase uid). Falls back gracefully if the doc is missing.
// ============================================================
import { userDoc } from '@/lib/firestore-server'

/** Get the display name for a uid, defaulting to a readable placeholder. */
export async function getDisplayName(uid: string): Promise<string> {
  try {
    const snap = await userDoc(uid).get()
    const username = snap.exists ? (snap.data() as { username?: string }).username : undefined
    if (username) return username
  } catch {
    /* fall through to default */
  }
  return 'Người chơi ' + uid.slice(-4)
}
