'use client'

// ============================================================
// AuthProvider + useAuth — Firebase Authentication wrapper.
// Owns the signed-in user, the latest ID token, and auth actions.
// The game store stays decoupled from Firebase; this context is the
// single bridge that pushes uid + displayName into the store.
// ============================================================
import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import {
  onAuthStateChanged, onIdTokenChanged, signOut as fbSignOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, sendSignInLinkToEmail, isSignInWithEmailLink,
  signInWithEmailLink,
  RecaptchaVerifier, signInWithPhoneNumber,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
} from 'firebase/auth'
import { auth, emailLinkActionCodeSettings } from '@/lib/firebase'
import { useGameStore } from '@/store/game-store'

interface AuthContextValue {
  firebaseUser: User | null
  /** True until the first onAuthStateChanged fires. */
  loading: boolean
  /** Latest Firebase ID token (refreshes hourly via onIdTokenChanged). */
  idToken: string | null
  /** phone-auth intermediate state */
  verificationId: string | null

  // ---- Actions (throw FirebaseError on failure) ----
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  sendEmailLink: (email: string) => Promise<void>
  /** Complete email-link sign-in from the landing URL. */
  completeEmailLink: (href: string, email: string) => Promise<void>
  /** Returns true if the current URL is an email-link sign-in landing. */
  isEmailLinkLanding: () => boolean
  sendPhoneOtp: (phone: string, containerId: string) => Promise<void>
  confirmPhoneOtp: (code: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [verificationId, setVerificationId] = useState<string | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const setAuth = useGameStore(s => s.setAuth)

  // Track the signed-in user + keep the latest token fresh.
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      setLoading(false)
      // Mirror into game store so existing screens keep working.
      if (user) {
        const name =
          user.displayName ||
          user.email?.split('@')[0] ||
          user.phoneNumber?.slice(-4) ||
          'Người chơi'
        setAuth(user.uid, name)
      } else {
        // Signed out: clear store identity but keep on whatever screen.
        setAuth('', '')
      }
    })
    const unsubToken = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken()
        setIdToken(token)
      } else {
        setIdToken(null)
      }
    })
    return () => { unsubAuth(); unsubToken() }
  }, [setAuth])

  const signInEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signUpEmail = useCallback(async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email, emailLinkActionCodeSettings)
  }, [])

  const sendEmailLink = useCallback(async (email: string) => {
    await sendSignInLinkToEmail(auth, email, emailLinkActionCodeSettings)
    // Remember the email so we can complete sign-in after the redirect.
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('emailForSignIn', email)
    }
  }, [])

  const isEmailLinkLanding = useCallback(() => {
    if (typeof window === 'undefined') return false
    return isSignInWithEmailLink(auth, window.location.href)
  }, [])

  const completeEmailLink = useCallback(async (href: string, email: string) => {
    await signInWithEmailLink(auth, email, href)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('emailForSignIn')
    }
  }, [])

  const sendPhoneOtp = useCallback(async (phone: string, containerId: string) => {
    // Invisible reCAPTCHA rendered into the given container id.
    const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
    await verifier.render()
    recaptchaRef.current = verifier
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier)
    setVerificationId(confirmation.verificationId)
  }, [])

  const confirmPhoneOtp = useCallback(async (code: string) => {
    if (!verificationId) throw new Error('Chưa gửi mã OTP. Hãy bấm "Gửi mã" trước.')
    const { PhoneAuthProvider, signInWithCredential } = await import('firebase/auth')
    const cred = PhoneAuthProvider.credential(verificationId, code)
    await signInWithCredential(auth, cred)
    setVerificationId(null)
    recaptchaRef.current?.clear()
    recaptchaRef.current = null
  }, [verificationId])

  const signInGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()
    // Ask for the account picker every time (no silent re-login).
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      // Popup works in regular browsers (desktop).
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      // IAB / mobile webview / strict popup-blocker → fall back to full-page redirect.
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/cancelled-popup-request' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider)
        return
      }
      throw e
    }
  }, [])

  // Complete a redirect-based sign-in when the page loads after the Google bounce-back.
  useEffect(() => {
    getRedirectResult(auth).catch((e) => {
      // Surface redirect errors through the store (non-fatal if none).
      if (e?.code && e.code !== 'auth/null-user') {
        useGameStore.getState().setError('Đăng nhập Google thất bại: ' + (e.code))
      }
    })
  }, [])

  const signOut = useCallback(async () => {
    if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null }
    await fbSignOut(auth)
  }, [])

  const value: AuthContextValue = {
    firebaseUser, loading, idToken, verificationId,
    signInEmail, signUpEmail, resetPassword,
    sendEmailLink, completeEmailLink, isEmailLinkLanding,
    sendPhoneOtp, confirmPhoneOtp, signInGoogle, signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
