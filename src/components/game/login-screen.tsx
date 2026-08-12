'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { GameButton } from '@/components/ui/game/GameButton'
import { GameInput } from '@/components/ui/game/GameInput'
import { CharacterIcon } from '@/components/characters/CharacterIcon'
import { Mail, Phone, Link2, Lock, Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'

/** Deterministic 0–1; rounded so SSR and client stringify identically. */
function starUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return Math.round((x - Math.floor(x)) * 1e5) / 1e5
}

function starStyle(i: number) {
  const pct = (seed: number) => (starUnit(seed) * 100).toFixed(5)
  const sec = (seed: number, base: number, scale: number) =>
    (base + starUnit(seed) * scale).toFixed(5)
  return {
    left: `${pct(i * 4 + 1)}%`,
    top: `${pct(i * 4 + 2)}%`,
    animationDelay: `${sec(i * 4 + 3, 0, 3)}s`,
    animationDuration: `${sec(i * 4 + 4, 3, 4)}s`,
  }
}

/** Map Firebase error codes to friendly Vietnamese. */
function friendlyError(code: string | undefined, fallback: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/missing-email': 'Vui lòng nhập email.',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa.',
    'auth/user-not-found': 'Không tìm thấy tài khoản.',
    'auth/wrong-password': 'Mật khẩu không đúng.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/email-already-in-use': 'Email đã được đăng ký.',
    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
    'auth/missing-password': 'Vui lòng nhập mật khẩu.',
    'auth/too-many-requests': 'Thử lại sau, bạn đã nhập sai quá nhiều lần.',
    'auth/network-request-failed': 'Lỗi mạng. Kiểm tra kết nối.',
    'auth/invalid-phone-number': 'Số điện thoại không hợp lệ.',
    'auth/invalid-verification-code': 'Mã xác nhận không đúng.',
    'auth/code-expired': 'Mã đã hết hạn. Gửi lại mã mới.',
    'auth/missing-verification-code': 'Vui lòng nhập mã xác nhận.',
    'auth/missing-verification-id': 'Chưa gửi mã OTP. Hãy bấm "Gửi mã".',
    'auth/operation-not-allowed': 'Phương thức đăng nhập chưa được bật trong Firebase Console.',
    'auth/popup-blocked': 'Trình duyệt chặn popup. Cho phép popup cho trang này rồi thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google. Thử lại nhé.',
    'auth/cancelled-popup-request': 'Đã hủy. Chỉ một cửa sổ đăng nhập được mở tại một thời điểm.',
    'auth/unauthorized-domain': 'Domain này chưa được thêm vào Firebase Auth → Authorized domains.',
    'auth/redirect-operation-out-of-flow': 'Đăng nhập bị chặn. Thử lại trong tab mới.',
    'auth/quota-exceeded': 'Đã vượt giới hạn gửi SMS. Thử lại sau.',
    'auth/argument-error': 'Thông tin nhập không hợp lệ.',
    'auth/expired-action-code': 'Liên kết đã hết hạn.',
    'auth/invalid-action-code': 'Liên kết không hợp lệ.',
  }
  return (code && map[code]) || fallback
}

type Tab = 'email' | 'link' | 'phone'

export function LoginScreen() {
  const auth = useAuth()
  const [tab, setTab] = useState<Tab>('email')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const run = async (fn: () => Promise<void>, fallbackMsg: string) => {
    setError(''); setInfo(''); setBusy(true)
    try {
      await fn()
    } catch (e: any) {
      setError(friendlyError(e?.code, fallbackMsg))
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'link', label: 'Link Email', icon: <Link2 className="w-4 h-4" /> },
    { id: 'phone', label: 'Số ĐT', icon: <Phone className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-primary p-4 font-game relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && [...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20 animate-float"
            style={starStyle(i)}
          />
        ))}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[rgb(var(--ms-moon))]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-[rgb(var(--ms-seer))]/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl bg-[rgb(var(--ms-card))] border border-[rgb(var(--ms-border))] shadow-game-lg p-8 text-center">
          {/* Hero */}
          <div className="animate-bounce-in mb-4 flex justify-center">
            <CharacterIcon role="werewolf" size="hero" animated />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">
            Ma Sói Realtime
          </h1>
          <p className="text-[rgb(var(--ms-text-secondary))] mb-6">
            Đăng nhập để bắt đầu chơi
          </p>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[rgb(var(--ms-bg-primary))]/60 mb-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(''); setInfo('') }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t.id
                    ? 'bg-[rgb(var(--ms-moon))] text-[rgb(var(--ms-on-moon))] shadow-game-blue'
                    : 'text-[rgb(var(--ms-text-secondary))] hover:text-white'
                }`}
              >
                {t.icon}
                <span className="hidden xs:inline sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Google sign-in — available on every tab */}
          <GoogleButton
            busy={busy}
            run={run}
            auth={auth}
          />

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-[rgb(var(--ms-text-muted))] font-bold uppercase">hoặc</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {tab === 'email' && <EmailTab busy={busy} error={error} run={run} auth={auth} />}
          {tab === 'link' && <LinkTab busy={busy} error={error} info={info} run={run} auth={auth} />}
          {tab === 'phone' && <PhoneTab busy={busy} error={error} run={run} auth={auth} />}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Google sign-in button (brand colors, popup flow)
// ============================================================
function GoogleButton({
  busy, run, auth,
}: {
  busy: boolean
  run: (fn: () => Promise<void>, fallback: string) => void
  auth: ReturnType<typeof useAuth>
}) {
  return (
    <button
      onClick={() => run(() => auth.signInGoogle(), 'Đăng nhập Google thất bại.')}
      disabled={busy}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl bg-white text-[#1a1a2e] font-bold shadow-game-sm hover:brightness-95 active:brightness-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      <span>Đăng Nhập Với Google</span>
    </button>
  )
}

// ============================================================
// Email + Password tab
// ============================================================
function EmailTab({
  busy, error, run, auth,
}: {
  busy: boolean
  error: string
  run: (fn: () => Promise<void>, fallback: string) => void
  auth: ReturnType<typeof useAuth>
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const submit = () => {
    if (!email.trim() || !password) return
    run(
      () => mode === 'signin'
        ? auth.signInEmail(email.trim(), password)
        : auth.signUpEmail(email.trim(), password),
      'Đăng nhập thất bại.',
    )
  }

  const reset = () => {
    if (!email.trim()) return
    run(async () => {
      await auth.resetPassword(email.trim())
      setResetSent(true)
    }, 'Không gửi được email đặt lại mật khẩu.')
  }

  return (
    <div className="space-y-3 text-left">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[rgb(var(--ms-bg-primary))]/60">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResetSent(false) }}
            className={`py-2 rounded-lg text-sm font-bold transition-all ${
              mode === m ? 'bg-[rgb(var(--ms-info))] text-white' : 'text-[rgb(var(--ms-text-secondary))]'
            }`}
          >
            {m === 'signin' ? 'Đăng Nhập' : 'Đăng Ký'}
          </button>
        ))}
      </div>

      <GameInput
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        icon={<Mail className="w-4 h-4" />}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="relative">
        <GameInput
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          icon={<Lock className="w-4 h-4" />}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ms-text-muted))] hover:text-white"
          tabIndex={-1}
        >
          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && <p className="text-sm text-[rgb(var(--ms-wolf))] font-bold">{error}</p>}

      <GameButton onClick={submit} disabled={busy || !email.trim() || !password} size="lg" className="w-full">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>{mode === 'signin' ? 'Đăng Nhập' : 'Tạo Tài Khoản'} <ArrowRight className="w-4 h-4" /></>
        )}
      </GameButton>

      {mode === 'signin' && (
        <button
          onClick={reset}
          disabled={busy || !email.trim()}
          className="w-full text-xs text-[rgb(var(--ms-text-muted))] hover:text-[rgb(var(--ms-info))] transition-colors"
        >
          {resetSent ? (
            <span className="inline-flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" />Đã gửi email đặt lại mật khẩu
            </span>
          ) : (
            'Quên mật khẩu?'
          )}
        </button>
      )}
    </div>
  )
}

// ============================================================
// Passwordless Email Link tab
// ============================================================
function LinkTab({
  busy, error, info, run, auth,
}: {
  busy: boolean
  error: string
  info: string
  run: (fn: () => Promise<void>, fallback: string) => void
  auth: ReturnType<typeof useAuth>
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  // If we landed here via an email-link URL, complete the sign-in.
  useEffect(() => {
    if (auth.isEmailLinkLanding()) {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('emailForSignIn') : null
      const askEmail = window.prompt('Nhập lại email để hoàn tất đăng nhập:') || ''
      if (saved || askEmail) {
        run(
          () => auth.completeEmailLink(window.location.href, saved || askEmail),
          'Liên kết không hợp lệ hoặc đã hết hạn.',
        )
      }
    }
  }, [])

  const send = () => {
    if (!email.trim()) return
    run(async () => {
      await auth.sendEmailLink(email.trim())
      setSent(true)
    }, 'Không gửi được liên kết đăng nhập.')
  }

  return (
    <div className="space-y-3 text-left">
      <p className="text-sm text-[rgb(var(--ms-text-secondary))] text-center">
        Nhập email — chúng tôi sẽ gửi một liên kết để đăng nhập không cần mật khẩu.
      </p>
      <GameInput
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
        icon={<Mail className="w-4 h-4" />}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        autoFocus
      />
      {error && <p className="text-sm text-[rgb(var(--ms-wolf))] font-bold">{error}</p>}
      {info && <p className="text-sm text-[rgb(var(--ms-info))] font-bold">{info}</p>}
      {sent && (
        <p className="flex items-center justify-center gap-1.5 text-sm text-[rgb(var(--ms-brand))] font-bold text-center">
          <Check className="w-4 h-4 shrink-0" />Đã gửi! Mở hộp thư và bấm vào liên kết để đăng nhập.
        </p>
      )}
      <GameButton onClick={send} disabled={busy || !email.trim()} size="lg" className="w-full">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Gửi Liên Kết <Link2 className="w-4 h-4" /></>}
      </GameButton>
    </div>
  )
}

// ============================================================
// Phone OTP tab
// ============================================================
function PhoneTab({
  busy, error, run, auth,
}: {
  busy: boolean
  error: string
  run: (fn: () => Promise<void>, fallback: string) => void
  auth: ReturnType<typeof useAuth>
}) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const sendOtp = () => {
    if (phone.trim().length < 8) return
    run(async () => {
      await auth.sendPhoneOtp(phone.trim(), 'recaptcha-container')
      setOtpSent(true)
    }, 'Không gửi được mã OTP. Kiểm tra số điện thoại.')
  }

  const verify = () => {
    if (code.trim().length < 4) return
    run(() => auth.confirmPhoneOtp(code.trim()), 'Xác thực thất bại.')
  }

  return (
    <div className="space-y-3 text-left">
      {!otpSent ? (
        <>
          <p className="text-sm text-[rgb(var(--ms-text-secondary))] text-center">
            Nhập số điện thoại (bao gồm mã quốc gia, vd +84...).
          </p>
          <GameInput
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+84 901 234 567"
            icon={<Phone className="w-4 h-4" />}
            onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
            autoFocus
          />
          {error && <p className="text-sm text-[rgb(var(--ms-wolf))] font-bold">{error}</p>}
          <GameButton onClick={sendOtp} disabled={busy || phone.trim().length < 8} size="lg" className="w-full">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Gửi Mã OTP <ArrowRight className="w-4 h-4" /></>}
          </GameButton>
        </>
      ) : (
        <>
          <p className="text-sm text-[rgb(var(--ms-text-secondary))] text-center">
            Nhập mã OTP đã gửi tới <span className="font-bold text-white">{phone}</span>
          </p>
          <GameInput
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="• • • • • •"
            className="text-center text-2xl tracking-[0.5em] font-mono"
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            autoFocus
          />
          {error && <p className="text-sm text-[rgb(var(--ms-wolf))] font-bold">{error}</p>}
          <GameButton onClick={verify} disabled={busy || code.trim().length < 4} size="lg" className="w-full">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Xác Nhận <ArrowRight className="w-4 h-4" /></>}
          </GameButton>
          <button
            onClick={() => { setOtpSent(false); setCode('') }}
            className="w-full text-xs text-[rgb(var(--ms-text-muted))] hover:text-[rgb(var(--ms-info))] transition-colors"
          >
            Đổi số điện thoại
          </button>
        </>
      )}
      {/* reCAPTCHA mount point (invisible) */}
      <div id="recaptcha-container" className="min-h-0" />
    </div>
  )
}
