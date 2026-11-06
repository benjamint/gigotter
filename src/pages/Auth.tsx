import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, KeyRound, MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Layout'
import Photo from '../components/Photo'
import { IMG } from '../lib/images'
import { Spinner, useToast } from '../components/ui'
import Captcha, { CAPTCHA_ON } from '../components/Captcha'
import { DEMO, auth } from '../lib/api'
import { cooldownLeft, friendlyError, loginBackoff, passwordProblem, safeNext, startCooldown } from '../lib/security'
import { useSession } from '../lib/session'

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [sp] = useSearchParams()
  const next = safeNext(sp.get('next'), '')
  const nextQs = next ? `?next=${encodeURIComponent(next)}` : ''
  const nav = useNavigate()
  const toast = useToast()
  const { user, profile, refresh } = useSession()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [check, setCheck] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const [, tick] = useState(0)
  const signup = mode === 'signup'
  const email = f.email.trim().toLowerCase()

  // re-render every second while any cooldown is running so the countdown updates
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!user || !profile) return
    if (profile.role === 'admin') nav('/admin')
    else if (profile.kyc_status === 'unverified') nav('/verify')
    else nav(next || '/me')
  }, [user, profile, nav, next])

  const needCaptcha = () => { if (CAPTCHA_ON && !captcha) { toast('Please complete the “I’m human” check', 'err'); return true } return false }
  const freshCaptcha = () => { setCaptcha(null); setCaptchaKey((k) => k + 1) }
  const loginWait = cooldownLeft('login-wait:' + email)
  const resetWait = cooldownLeft('reset:' + email)
  const resendWait = cooldownLeft('resend:' + email)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (signup) { const p = passwordProblem(f.password); if (p) return toast(p, 'err') }
    if (!signup && loginWait) return toast(`Too many attempts — try again in ${loginWait}s`, 'err')
    if (needCaptcha()) return
    setBusy(true)
    try {
      if (signup) await auth.signUp(f.email, f.password, f.name, captcha ?? undefined)
      else { await auth.signIn(f.email, f.password, captcha ?? undefined); loginBackoff(email, false) }
      await refresh()
    } catch (err: any) {
      if (err.message === 'CHECK_EMAIL') { setCheck(true); startCooldown('resend:' + email, 60) }
      else {
        if (!signup && /invalid login/i.test(err.message)) {
          const wait = loginBackoff(email, true)
          toast(wait ? `Wrong email or password. Wait ${wait}s before trying again.` : 'Wrong email or password.', 'err')
        } else toast(friendlyError(err.message), 'err')
      }
    } finally { setBusy(false); freshCaptcha() }
  }

  const sendReset = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || resetWait) return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Enter the email you signed up with', 'err')
    if (needCaptcha()) return
    setBusy(true)
    try {
      await auth.resetPassword(email, captcha ?? undefined)
      startCooldown('reset:' + email, 60)
      toast('If that email has an account, a reset link is on its way')
    } catch (err: any) {
      const msg = friendlyError(err.message)
      if (msg.startsWith('Too many')) startCooldown('reset:' + email, 60)
      toast(msg, 'err')
    } finally { setBusy(false); freshCaptcha() }
  }

  const resend = async () => {
    if (busy || resendWait) return
    if (needCaptcha()) return
    setBusy(true)
    try { await auth.resendSignup(email, captcha ?? undefined); startCooldown('resend:' + email, 60); toast('Sent — check your inbox and spam folder') }
    catch (err: any) { startCooldown('resend:' + email, 60); toast(friendlyError(err.message), 'err') }
    finally { setBusy(false); freshCaptcha() }
  }

  if (check) return (
    <Shell>
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><MailCheck className="h-5 w-5" /></div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tightest">Check your inbox</h1>
      <p className="mt-2 text-ink-muted">We sent a link to <b>{f.email}</b>. Tap it to confirm and continue to verification. It can take a minute — check spam too.</p>
      <div className="mt-6"><Captcha onToken={setCaptcha} resetKey={captchaKey} /></div>
      <button onClick={resend} disabled={busy || resendWait > 0} className="btn-ghost mt-4 w-full">
        {busy ? <Spinner /> : resendWait ? `Resend email in ${resendWait}s` : 'Resend email'}
      </button>
    </Shell>
  )

  if (forgot) return (
    <Shell>
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><KeyRound className="h-5 w-5" /></div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tightest">Reset your password</h1>
      <p className="mt-2 text-ink-muted">Enter your email and we’ll send you a link to choose a new password.</p>
      <form onSubmit={sendReset} className="mt-8 space-y-4">
        <div><label className="label">Email</label>
          <input className="input" type="email" required maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></div>
        <Captcha onToken={setCaptcha} resetKey={captchaKey} />
        <button className="btn-primary w-full py-3.5" disabled={busy || resetWait > 0}>
          {busy ? <Spinner /> : resetWait ? `Link sent — resend in ${resetWait}s` : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <button onClick={() => setForgot(false)} className="mt-6 w-full text-center text-sm text-ink-muted hover:text-ink">Back to log in</button>
    </Shell>
  )

  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tightest md:text-4xl">{signup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-2 text-ink-muted">{signup ? 'Start earning from real work. Verification comes next.' : 'Log in to see your gigs and earnings.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {signup && (
          <div><label className="label">Full name <span className="font-normal text-ink-muted">(as on your ID)</span></label>
            <input className="input" required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Abena Owusu" autoComplete="name" /></div>
        )}
        <div><label className="label">Email</label>
          <input className="input" type="email" required maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={signup ? 'you@st.ug.edu.gh' : 'you@email.com'} autoComplete="email" /></div>
        <div><label className="label">Password</label>
          <div className="relative">
            <input className="input pr-12" type={show ? 'text' : 'password'} required minLength={8} maxLength={72} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder={signup ? '8+ characters, letters and numbers' : 'Your password'} autoComplete={signup ? 'new-password' : 'current-password'} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted" aria-label="Toggle password">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        </div>
        <Captcha onToken={setCaptcha} resetKey={captchaKey} />
        <button className="btn-primary w-full py-3.5" disabled={busy || (!signup && loginWait > 0)}>
          {busy ? <Spinner /> : !signup && loginWait ? `Try again in ${loginWait}s` : <>{signup ? 'Create account' : 'Log in'}<ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      {!signup && !DEMO && (
        <button onClick={() => { setForgot(true); freshCaptcha() }} className="mt-4 w-full text-center text-sm text-ink-muted hover:text-ink">Forgot password?</button>
      )}
      <p className="mt-8 text-center text-sm text-ink-muted">
        {signup ? <>Already have an account? <Link to={`/login${nextQs}`} className="font-medium text-ink underline underline-offset-2">Log in</Link></>
          : <>New here? <Link to={`/signup${nextQs}`} className="font-medium text-ink underline underline-offset-2">Start earning</Link></>}
      </p>
      {signup && <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">By signing up you agree to our <Link to="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link> and <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy Policy</Link>, including verifying you’re a student.</p>}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x grid min-h-[calc(100vh-4rem)] gap-10 py-10 lg:grid-cols-2 lg:items-stretch">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.7 }} className="flex items-center justify-center">
        <div className="w-full max-w-sm">
          <Logo className="mb-10" />
          {children}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} className="relative hidden overflow-hidden rounded-4xl lg:block">
        <Photo src={IMG.auth} alt="Students on campus" label="auth.jpg" tone="dark" className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-10 text-white">
          <p className="font-serif text-4xl italic leading-tight">Real work. Real businesses.<br />Paid to your mobile money.</p>
          <p className="mt-4 text-sm text-white/70">Verified students across Ghana and Nigeria</p>
        </div>
      </motion.div>
    </div>
  )
}
