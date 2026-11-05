import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Layout'
import Photo from '../components/Photo'
import { IMG } from '../lib/images'
import { Spinner, useToast } from '../components/ui'
import { DEMO, auth } from '../lib/api'
import { useSession } from '../lib/session'

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const [sp] = useSearchParams()
  const next = sp.get('next')
  const nav = useNavigate()
  const toast = useToast()
  const { user, profile, refresh } = useSession()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [check, setCheck] = useState(false)
  const signup = mode === 'signup'

  useEffect(() => {
    if (!user || !profile) return
    if (profile.role === 'admin') nav('/admin')
    else if (profile.kyc_status === 'unverified') nav('/verify')
    else nav(next ?? '/me')
  }, [user, profile, nav, next])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (signup) await auth.signUp(f.email, f.password, f.name)
      else await auth.signIn(f.email, f.password)
      await refresh()
    } catch (err: any) {
      if (err.message === 'CHECK_EMAIL') setCheck(true)
      else toast(err.message, 'err')
    } finally { setBusy(false) }
  }

  if (check) return (
    <Shell>
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><MailCheck className="h-5 w-5" /></div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tightest">Check your inbox</h1>
      <p className="mt-2 text-ink-muted">We sent a link to <b>{f.email}</b>. Tap it to confirm and continue to verification.</p>
    </Shell>
  )

  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tightest md:text-4xl">{signup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-2 text-ink-muted">{signup ? 'Start earning from real work. Verification comes next.' : 'Log in to see your gigs and earnings.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {signup && (
          <div><label className="label">Full name <span className="font-normal text-ink-muted">(as on your ID)</span></label>
            <input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Abena Owusu" autoComplete="name" /></div>
        )}
        <div><label className="label">Email</label>
          <input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={signup ? 'you@st.ug.edu.gh' : 'you@email.com'} autoComplete="email" /></div>
        <div><label className="label">Password</label>
          <div className="relative">
            <input className="input pr-12" type={show ? 'text' : 'password'} required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="8+ characters" autoComplete={signup ? 'new-password' : 'current-password'} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted" aria-label="Toggle password">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        </div>
        <button className="btn-primary w-full py-3.5" disabled={busy}>{busy ? <Spinner /> : <>{signup ? 'Create account' : 'Log in'}<ArrowRight className="h-4 w-4" /></>}</button>
      </form>
      {!signup && !DEMO && (
        <button onClick={async () => { if (!f.email) return toast('Type your email first', 'err'); await auth.resetPassword(f.email); toast('Reset link sent') }} className="mt-4 w-full text-center text-sm text-ink-muted hover:text-ink">Forgot password?</button>
      )}
      <p className="mt-8 text-center text-sm text-ink-muted">
        {signup ? <>Already have an account? <Link to={`/login${next ? `?next=${next}` : ''}`} className="font-medium text-ink underline underline-offset-2">Log in</Link></>
          : <>New here? <Link to={`/signup${next ? `?next=${next}` : ''}`} className="font-medium text-ink underline underline-offset-2">Start earning</Link></>}
      </p>
      {signup && <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">By signing up you agree we can verify you’re a student and store your docs privately for that purpose.</p>}
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
