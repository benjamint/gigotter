import { motion } from 'framer-motion'
import { ArrowRight, Copy, Gift, Receipt, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate } from 'react-router'
import { POINTS_EVENT } from '../components/DailyPoint'
import { CountUp, Empty, KycPill, PageLoader, Progress, SubPill, useToast } from '../components/ui'
import { myApplications, myClaims, myPayments, myPoints, myRedemptions, updateMyProfile } from '../lib/api'
import Photo from '../components/Photo'
import OtterCard from '../components/OtterCard'
import { ago, coverFor, isPoints, money, points, timeLeft, plural } from '../lib/format'
import { subTitle } from '../lib/forms'
import { WELCOME_POINTS, type KycStatus, type PointsEntry } from '../lib/types'
import { useAsync, useSession } from '../lib/session'

/** First thing on the dashboard: the member's Otter Card with their points, and the next step. */
function RewardsTile({ kyc, data, name, code }: { kyc: KycStatus; data: { balance: number; entries: PointsEntry[] } | null; name: string; code: string }) {
  const verified = kyc === 'verified'
  if (!data) return <div className="mx-auto mt-6 aspect-[85.6/54] w-[84%] max-w-[30rem] animate-pulse rounded-[15px] bg-brand-50 sm:mx-0 sm:w-full" />
  const { balance, entries } = data
  const welcomeOnly = entries.length === 1 && entries[0].kind === 'welcome'
  const state = balance > 0 ? 'has' : verified ? 'empty' : kyc === 'pending' ? 'review' : 'unverified'
  const cta = state === 'has' ? { to: '/rewards', label: 'Spend in Rewards' } : state === 'empty' ? { to: '/gigs', label: 'Find points gigs' } : state === 'unverified' ? { to: '/verify', label: 'Verify now' } : null
  const head = state === 'has' ? (welcomeOnly ? '🎁 Your welcome bonus is on your card' : 'Your points are ready to spend')
    : state === 'empty' ? 'Your card is ready for more' : state === 'review' ? 'Verification in review' : 'Activate your Otter Card'
  const note = state === 'has' ? 'Swap your points for airtime, vouchers and Gigotter merch in Rewards.'
    : state === 'empty' ? 'Get 1 point every day you log in, and more on points gigs. Spend them in Rewards.'
    : state === 'review' ? `Hang tight, usually under 24 hours. Your ${WELCOME_POINTS} welcome points arrive as soon as you’re approved.`
    : `Get verified and we’ll add ${WELCOME_POINTS} welcome points to your card, plus 1 point every day you log in.`
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 grid items-center gap-6 rounded-[32px] bg-white p-4 shadow-[0_20px_50px_-36px_rgba(16,41,31,.45)] ring-1 ring-line sm:p-6 md:grid-cols-[minmax(0,30rem),1fr] md:gap-10">
      <OtterCard name={name} code={code} balance={balance} active={verified} />
      <div className="px-1 pb-1 md:px-0">
        <div className="eyebrow">Otter Card</div>
        <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-tight tracking-[-0.03em]">{head}</h2>
        <p className="mt-2 max-w-md text-ink-muted">{note}</p>
        {cta && <Link to={cta.to} className="btn-primary mt-5 w-full justify-center sm:w-auto">{cta.label} <ArrowRight className="h-4 w-4" /></Link>}
      </div>
    </motion.div>
  )
}

export default function Me() {
  const { user, profile, loading, refresh } = useSession()
  const toast = useToast()
  const { data, loading: l2 } = useAsync(() => (user ? myClaims() : Promise.resolve([])), [user?.id])
  const pays = useAsync(() => (user ? myPayments() : Promise.resolve([])), [user?.id])
  const apps = useAsync(() => (user ? myApplications() : Promise.resolve([])), [user?.id])
  const pts = useAsync(() => (user ? Promise.all([myPoints(), myRedemptions()]) : Promise.resolve(null)), [user?.id])
  // refresh the card when today's login point lands
  useEffect(() => { const on = () => pts.reload(); window.addEventListener(POINTS_EVENT, on); return () => window.removeEventListener(POINTS_EVENT, on) }, [pts.reload])
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login?next=/me" replace />
  if (!profile || l2) return <PageLoader />

  const claims = data ?? []
  const subs = claims.flatMap((c) => c.subs.map((s) => ({ ...s, cur: c.listing.currency, title: c.listing.title })))
  // cash totals in the main cash currency (points gigs are shown separately)
  const cur = claims.find((c) => !isPoints(c.listing))?.listing.currency ?? 'GHS'
  const sum = (st: string[]) => subs.filter((s) => st.includes(s.status) && s.cur === cur).reduce((a, s) => a + (s.amount ?? 0), 0)
  const active = claims.filter((c) => c.status === 'active')
  const first = profile.full_name?.split(' ')[0] || 'friend'

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">Welcome back, <span className="em text-brand-600">{first}</span></motion.h1>
          <div className="mt-2 flex items-center gap-2"><KycPill s={profile.kyc_status} />{profile.school && <span className="text-sm text-ink-muted">{profile.school}</span>}</div>
        </div>
        {profile.referral_code && (
          <button onClick={() => { navigator.clipboard?.writeText(profile.referral_code!); toast('Code copied') }} className="card hidden items-center gap-3 px-4 py-3 text-left hover:bg-brand-50 sm:flex">
            <div><div className="text-xs text-ink-muted">Your referral code</div><div className="font-mono text-lg font-semibold tracking-[0.2em]">{profile.referral_code}</div></div><Copy className="h-4 w-4" />
          </button>
        )}
      </div>

      <RewardsTile kyc={profile.kyc_status} data={pts.data?.[0] ?? null} name={profile.full_name || 'Gigotter member'} code={`OTTER · ${(profile.referral_code || profile.id.slice(0, 6)).toUpperCase()}`} />

      {profile.kyc_status !== 'verified' && profile.kyc_status !== 'pending' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink p-5 bg-brand-50`}>
          <div className="flex items-center gap-3"><ShieldAlert className="h-6 w-6" />
            <div><div className="font-semibold">{profile.kyc_status === 'rejected' ? 'Verification needs a fix' : 'Finish verification to unlock gigs'}</div>
              <div className="text-sm text-ink-muted">{profile.kyc_note ?? 'Takes about 5 minutes.'}</div></div>
          </div>
        </motion.div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Paid out', sum(['paid']), 'bg-[#c9d6c8]'],
          ['Approved, payout coming', sum(['approved']), 'bg-[#efdcc6]'],
          ['In review', sum(['pending']), 'bg-brand-50'],
        ].map(([k, v, bg], i) => (
          <motion.div key={k as string} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`rounded-3xl p-6 ${bg}`}>
            <div className="text-sm font-medium text-ink-muted">{k}</div>
            <div className="figure mt-3 text-[44px] leading-none"><CountUp to={v as number} prefix={money(0, cur).replace(/0$/, '')} /></div>
          </motion.div>
        ))}
      </div>

      {profile.referral_code && (
        <button onClick={() => { navigator.clipboard?.writeText(profile.referral_code!); toast('Code copied') }} className="card mt-4 flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-brand-50 sm:hidden">
          <div><div className="text-xs text-ink-muted">Your referral code</div><div className="font-mono text-lg font-semibold tracking-[0.2em]">{profile.referral_code}</div></div><Copy className="h-4 w-4" />
        </button>
      )}

      <div className="mt-12 flex items-end justify-between">
        <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">Your <span className="em">gigs</span></h2>
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
          <h2 className="mt-12 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">Recent <span className="em">activity</span></h2>
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
      {(apps.data ?? []).filter((a) => a.status !== 'withdrawn').length > 0 && (
        <>
          <h2 className="mt-12 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">Your <span className="em">applications</span></h2>
          <div className="card mt-5 divide-y divide-line overflow-hidden">
            {apps.data!.filter((a) => a.status !== 'withdrawn').map((a) => {
              const st = ({ applied: ['Sent', 'bg-sand text-ink-soft'], shortlisted: ['Shortlisted', 'bg-amber-50 text-amber-800'], accepted: ['Selected', 'bg-brand-50 text-brand-700'], declined: ['Not selected', 'bg-sand text-ink-muted'], withdrawn: ['Withdrawn', 'bg-sand'] } as const)[a.status]
              return (
                <Link key={a.id} to={`/gigs/${a.listing_id}`} className="flex items-center gap-4 p-4 hover:bg-paper">
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{a.listing?.title ?? 'Gig'}</div><div className="text-xs text-ink-muted">Applied {ago(a.created_at)}{a.status === 'accepted' ? ' · open it from “Your gigs” above' : ''}</div></div>
                  <span className={`chip ${st[1]}`}>{st[0]}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}
      {(pts.data?.[1].length ?? 0) > 0 && (
        <>
          <h2 className="mt-12 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">Your <span className="em">rewards</span></h2>
          <div className="card mt-5 divide-y divide-line overflow-hidden">
            {pts.data![1].map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F9C93A]/30 text-ink"><Gift className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.item_name} <span className="font-normal text-ink-muted">· {points(r.points)}</span></div>
                  <div className="truncate text-xs text-ink-muted">Requested {ago(r.created_at)}{r.admin_note ? ` · ${r.admin_note}` : ''}</div>
                </div>
                <span className={`chip ${r.status === 'sent' ? 'bg-brand-50 text-brand-700' : r.status === 'cancelled' ? 'bg-sand text-ink-muted' : 'bg-[#efdcc6] text-ink'}`}>{r.status === 'requested' ? 'On its way soon' : r.status === 'sent' ? 'Sent' : 'Cancelled, refunded'}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {(pays.data?.length ?? 0) > 0 && (
        <>
          <h2 className="mt-12 text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">Payments <span className="em">received</span></h2>
          <div className="card mt-5 divide-y divide-line overflow-hidden">
            {pays.data!.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Receipt className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{money(p.amount, p.currency)} <span className="font-normal text-ink-muted">to {p.method || 'MoMo'}{p.momo_number ? ` ••• ${p.momo_number.replace(/\D/g, '').slice(-3)}` : ''}</span></div>
                  <div className="truncate text-xs text-ink-muted">Receipt {p.receipt_no} · {new Date(p.paid_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}{p.reference ? ` · Ref ${p.reference}` : ''} · {p.items} item{p.items === 1 ? '' : 's'}</div>
                  {p.note && <div className="mt-1 text-xs text-ink-soft">{p.note}</div>}
                </div>
                <span className="chip bg-brand-50 text-brand-700">Paid</span>
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
