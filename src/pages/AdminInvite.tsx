import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Empty, PageLoader, Spinner, useToast } from '../components/ui'
import { acceptAdminInvite, adminInviteInfo, auth } from '../lib/api'
import { useAsync, useSession } from '../lib/session'

const KEY = 'gigotter-admin-invite'
/** The invite token someone opened but hasn't accepted yet (kept so email confirmation can bring them back). */
export function pendingInvite(): string | null { try { return localStorage.getItem(KEY) } catch { return null } }
export const forgetInvite = () => remember(null)
const remember = (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY) } catch { /* storage blocked */ } }

/** /admin-invite?token=…: the link in an admin invite email. */
export default function AdminInvite() {
  const [sp] = useSearchParams()
  const token = (sp.get('token') ?? '').trim().slice(0, 128)
  const { user, profile, loading, refresh } = useSession()
  const nav = useNavigate()
  const toast = useToast()
  const info = useAsync(() => (token ? adminInviteInfo(token) : Promise.resolve({ status: 'invalid' as const })), [token])
  const [busy, setBusy] = useState(false)
  const open = info.data?.status === 'open'
  // keep the link while logged out, so confirming a new account's email can bring them back here once
  useEffect(() => { if (info.data && !loading) remember(open && !user ? token : null) }, [info.data, open, token, user, loading])

  if (loading || info.loading) return <PageLoader />
  const i = info.data
  const back = `/admin-invite?token=${encodeURIComponent(token)}`
  const qs = `?next=${encodeURIComponent(back)}${i?.email ? `&email=${encodeURIComponent(i.email)}` : ''}`

  if (profile?.role === 'admin' && (!open || user?.email?.toLowerCase() === i?.email)) {
    if (open || i?.status === 'accepted') return <Empty icon={<ShieldCheck className="h-6 w-6" />} title="You’re already an admin" body="This account can already use the dashboard." action={<Link to="/admin" className="btn-brand">Open the dashboard</Link>} />
  }
  if (!i || info.error || !open) {
    const why = info.error ? 'We couldn’t load this invite. Check your connection and try again.'
      : i?.status === 'accepted' ? 'This invite has already been used. Log in to open the dashboard.'
      : i?.status === 'revoked' ? 'This invite was cancelled. Ask an admin to send you a new one.'
      : i?.status === 'expired' ? 'This invite has expired. Ask an admin to send you a new one.'
      : 'This invite link isn’t valid. Check you opened the whole link from the email, or ask an admin to send a new one.'
    return <div className="mx-auto max-w-lg px-4 py-20"><Empty title="Invite can’t be used" body={why} action={<Link to={i?.status === 'accepted' ? '/login' : '/'} className="btn-primary">{i?.status === 'accepted' ? 'Log in' : 'Go home'}</Link>} /></div>
  }

  const mine = user?.email?.toLowerCase() === i.email
  const accept = async () => {
    setBusy(true)
    try { await acceptAdminInvite(token); remember(null); await refresh(); toast('Welcome to the team!'); nav('/admin', { replace: true }) }
    catch (e: any) { toast(e.message, 'err') } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:py-24">
      <div className="card p-7 text-center md:p-9">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700"><ShieldCheck className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Join the Gigotter team</h1>
        <p className="mt-2 text-ink-muted"><b className="text-ink">{i.invited_by}</b> invited <b className="text-ink">{i.email}</b> to be an admin. You’ll be able to review students, post gigs, check work and manage payouts and rewards.</p>
        {!user ? (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link to={`/signup${qs}&type=general`} className="btn-brand">I’m new: sign up</Link>
              <Link to={`/login${qs}`} className="btn-ghost">I have an account</Link>
            </div>
            <p className="mt-4 text-xs text-ink-muted">Use <b>{i.email}</b>. If you’re asked to confirm your email, do that, then log in and you’ll come back here.</p>
          </>
        ) : mine ? (
          <button className="btn-brand mt-7 w-full" onClick={accept} disabled={busy}>{busy && <Spinner />}Accept and open the dashboard</button>
        ) : (
          <>
            <p className="mt-6 rounded-xl bg-[#FDF3D3] p-3 text-sm">You’re logged in as <b>{user.email}</b>. This invite is for <b>{i.email}</b>, so log out and log in with that email.</p>
            <button className="btn-ghost mt-4 w-full" onClick={async () => { await auth.signOut(); nav(`/login${qs}`) }}>Log out and switch account</button>
          </>
        )}
      </div>
    </div>
  )
}
