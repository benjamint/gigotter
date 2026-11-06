import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { PageLoader, Spinner, useToast } from '../components/ui'
import { auth } from '../lib/api'
import { useSession } from '../lib/session'
import { friendlyError, passwordProblem } from '../lib/security'

/** Landing page for the "reset password" email link. Supabase signs the user in from the link; here they choose a new password. */
export default function ResetPassword() {
  const { user, loading } = useSession()
  const nav = useNavigate()
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const problem = passwordProblem(pw); if (problem) return toast(problem, 'err')
    if (pw !== pw2) return toast('Passwords don’t match', 'err')
    setBusy(true)
    try { await auth.updatePassword(pw); toast('Password updated'); nav('/me') }
    catch (err: any) { toast(friendlyError(err.message), 'err') } finally { setBusy(false) }
  }

  if (loading) return <PageLoader />
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm">
        <Logo className="mb-10" />
        {!user ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tightest">This link has expired</h1>
            <p className="mt-2 text-ink-muted">Reset links work once and expire after an hour. Request a new one from the log-in page.</p>
            <Link to="/login" className="btn-primary mt-8 w-full py-3.5">Back to log in <ArrowRight className="h-4 w-4" /></Link>
          </>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><KeyRound className="h-5 w-5" /></div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tightest">Choose a new password</h1>
            <p className="mt-2 text-ink-muted">For {user.email}</p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div><label className="label">New password</label>
                <div className="relative">
                  <input className="input pr-12" type={show ? 'text' : 'password'} minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} maxLength={72} placeholder="8+ characters, letters and numbers" autoComplete="new-password" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted" aria-label="Toggle password">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                </div>
              </div>
              <div><label className="label">Confirm new password</label>
                <input className="input" type={show ? 'text' : 'password'} minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
              <button className="btn-primary w-full py-3.5" disabled={busy}>{busy ? <Spinner /> : <>Save password <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
