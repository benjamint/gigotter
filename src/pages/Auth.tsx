import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Layout'
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
      <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime-300"><MailCheck className="h-8 w-8" /></motion.div>
      <h1 className="mt-6 text-center text-3xl font-extrabold">Check your inbox</h1>
      <p className="mt-2 text-center text-ink/60">We sent a link to <b>{f.email}</b>. Tap it to confirm and continue to verification.</p>
    </Shell>
  )

  return (
    <Shell>
      <h1 className="text-4xl font-extrabold">{signup ? 'Let’s get you paid.' : 'Welcome back.'}</h1>
      <p className="mt-2 text-ink/60">{signup ? 'Make an account. Verification is next.' : 'Log in to check your gigs and earnings.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {signup && (
          <div><label className="label">Full name <span className="font-normal text-ink/40">(as on your ID)</span></label>
            <input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Abena Owusu" autoComplete="name" /></div>
        )}
        <div><label className="label">Email</label>
          <input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={signup ? 'you@st.ug.edu.gh' : 'you@email.com'} autoComplete="email" /></div>
        <div><label className="label">Password</label>
          <div className="relative">
            <input className="input pr-12" type={show ? 'text' : 'password'} required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="8+ characters" autoComplete={signup ? 'new-password' : 'current-password'} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink/50" aria-label="Toggle password">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
          </div>
        </div>
        <button className="btn-glow w-full text-base" disabled={busy}>{busy ? <Spinner /> : <>{signup ? 'Create account' : 'Log in'}<ArrowRight className="h-5 w-5" /></>}</button>
      </form>
      {!signup && !DEMO && (
        <button onClick={async () => { if (!f.email) return toast('Type your email first', 'err'); await auth.resetPassword(f.email); toast('Reset link sent') }} className="mt-3 w-full text-center text-sm text-ink/50 hover:text-ink">Forgot password?</button>
      )}
      <p className="mt-6 text-center text-sm text-ink/60">
        {signup ? <>Already have an account? <Link to={`/login${next ? `?next=${next}` : ''}`} className="font-bold text-ink underline">Log in</Link></>
          : <>New here? <Link to={`/signup${next ? `?next=${next}` : ''}`} className="font-bold text-ink underline">Start earning</Link></>}
      </p>
      {signup && <p className="mt-4 text-center text-xs text-ink/40">By signing up you agree we can verify you’re a student and store your docs privately for that purpose.</p>}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-[80vh] place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute left-1/4 top-10 h-72 w-72 animate-blob rounded-full bg-pop-300 opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-72 w-72 animate-blob rounded-full bg-glow-300 opacity-40 blur-3xl [animation-delay:-6s]" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }} className="card relative w-full max-w-md p-8">
        <Logo className="mb-8" />
        {children}
      </motion.div>
    </div>
  )
}
