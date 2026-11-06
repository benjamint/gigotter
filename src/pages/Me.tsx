import { motion } from 'framer-motion'
import { ArrowRight, Copy, ShieldAlert, Sparkles } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { CountUp, Empty, KycPill, PageLoader, Progress, SubPill, useToast } from '../components/ui'
import { myClaims, updateMyProfile } from '../lib/api'
import Photo from '../components/Photo'
import { ago, coverFor, money, timeLeft, plural } from '../lib/format'
import { subTitle } from '../lib/forms'
import { useAsync, useSession } from '../lib/session'

export default function Me() {
  const { user, profile, loading, refresh } = useSession()
  const toast = useToast()
  const { data, loading: l2 } = useAsync(() => (user ? myClaims() : Promise.resolve([])), [user?.id])
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login?next=/me" replace />
  if (!profile || l2) return <PageLoader />

  const claims = data ?? []
  const subs = claims.flatMap((c) => c.subs.map((s) => ({ ...s, cur: c.listing.currency, title: c.listing.title })))
  // group totals by currency, display main currency
  const cur = claims[0]?.listing.currency ?? 'GHS'
  const sum = (st: string[]) => subs.filter((s) => st.includes(s.status) && s.cur === cur).reduce((a, s) => a + (s.amount ?? 0), 0)
  const active = claims.filter((c) => c.status === 'active')
  const first = profile.full_name?.split(' ')[0] || 'friend'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-semibold tracking-tightest md:text-5xl">Welcome back, <span className="em text-brand-600">{first}</span></motion.h1>
          <div className="mt-2 flex items-center gap-2"><KycPill s={profile.kyc_status} />{profile.school && <span className="text-sm text-ink-muted">{profile.school}</span>}</div>
        </div>
        {profile.referral_code && (
          <button onClick={() => { navigator.clipboard?.writeText(profile.referral_code!); toast('Code copied') }} className="card flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-50">
            <div><div className="text-xs text-ink-muted">Your referral code</div><div className="font-mono text-lg font-semibold tracking-[0.2em]">{profile.referral_code}</div></div><Copy className="h-4 w-4" />
          </button>
        )}
      </div>

      {profile.kyc_status !== 'verified' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink p-5 ${profile.kyc_status === 'pending' ? 'bg-amber-50' : 'bg-brand-50'}`}>
          <div className="flex items-center gap-3"><ShieldAlert className="h-6 w-6" />
            <div><div className="font-semibold">{profile.kyc_status === 'pending' ? 'Verification in review' : profile.kyc_status === 'rejected' ? 'Verification needs a fix' : 'Finish verification to unlock gigs'}</div>
              <div className="text-sm text-ink-muted">{profile.kyc_status === 'pending' ? 'Hang tight, usually under 24hrs.' : profile.kyc_note ?? 'Takes 2 minutes.'}</div></div>
          </div>
          {profile.kyc_status !== 'pending' && <Link to="/verify" className="btn-primary btn-sm">Verify now</Link>}
        </motion.div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Paid out', sum(['paid']), 'bg-brand-50'],
          ['Approved, payout coming', sum(['approved']), 'bg-white'],
          ['In review', sum(['pending']), 'bg-white'],
        ].map(([k, v, bg], i) => (
          <motion.div key={k as string} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`card p-6 ${bg}`}>
            <div className="text-sm font-medium text-ink-muted">{k}</div>
            <div className="figure mt-2 text-5xl leading-none"><CountUp to={v as number} prefix={money(0, cur).replace(/0$/, '')} /></div>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 flex items-end justify-between">
        <h2 className="text-3xl font-semibold tracking-tightest">Your <span className="em">gigs</span></h2>
        <Link to="/gigs" className="btn-ghost btn-sm">Find more <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {active.length === 0 && <div className="md:col-span-2"><Empty title="No gigs yet" body="Browse open gigs and join one to start earning." action={<Link to="/gigs" className="btn-brand">Browse gigs</Link>} /></div>}
        {active.map((c, i) => {
          const done = c.subs.filter((s) => s.status !== 'rejected').length
          const goal = c.listing.units_per_student ?? Math.max(done, 1)
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={`/me/gig/${c.id}`} className="card group flex h-full flex-col p-5 transition hover:-translate-y-1 hover:shadow-soft">
                <div className="flex items-start gap-4">
                  <Photo src={coverFor(c.listing)} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold">{c.listing.title}</h3><div className="text-xs text-ink-muted">{timeLeft(c.listing.expires_at).label}</div></div>
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </div>
                <div className="mt-5 flex justify-between text-sm font-medium"><span>{done} / {goal} {plural(c.listing.unit_label, goal)}</span><span className="text-ink-muted">{Math.round((done / goal) * 100)}%</span></div>
                <Progress value={done} max={goal} className="mt-2" />
              </Link>
            </motion.div>
          )
        })}
      </div>

      {subs.length > 0 && (
        <>
          <h2 className="mt-12 text-3xl font-semibold tracking-tightest">Recent <span className="em">activity</span></h2>
          <div className="card mt-5 divide-y divide-line overflow-hidden">
            {subs.slice(0, 12).map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4">
                <Sparkles className="h-5 w-5 shrink-0 text-brand-600" />
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{subTitle(s)}</div><div className="truncate text-xs text-ink-muted">{s.title} · {ago(s.created_at)}</div></div>
                <div className="text-right"><div className="font-semibold">{money(s.amount, s.cur)}</div><SubPill s={s.status} /></div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="card mt-12 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-medium">Show me in “Recently paid”</div>
          <p className="mt-0.5 text-sm text-ink-muted">When you’re paid, we can show your first name, last initial and school (never your phone or full name) in the live feed on Gigotter.</p>
        </div>
        <button role="switch" aria-checked={profile.show_in_feed !== false}
          onClick={async () => { try { await updateMyProfile({ show_in_feed: profile.show_in_feed === false }); await refresh(); toast('Saved') } catch (e: any) { toast('Couldn’t save that just now — try again later', 'err') } }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${profile.show_in_feed !== false ? 'bg-brand-600' : 'bg-line'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${profile.show_in_feed !== false ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
    </div>
  )
}
