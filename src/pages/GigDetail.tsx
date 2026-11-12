import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowRight, Calendar, Camera, Check, MapPin, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Photo from '../components/Photo'
import { Empty, PageLoader, Progress, Spinner, useToast } from '../components/ui'
import { claimListing, getListing, listingFiles, myApplications, myClaims, withdrawApplication } from '../lib/api'
import ApplyForm from '../components/ApplyForm'
import { accountOf, audienceAllows, audienceOf, eligibilityText, isApply } from '../lib/audience'
import { AUDIENCES } from '../lib/types'
import { dayLabel, formatDay, sessionsOf, timeRange } from '../lib/sessions'
import { GigFileList } from '../components/GigFiles'
import { coverFor, isOpen, maxEarn, money, payLine, spotsLeft, timeLeft, plural } from '../lib/format'
import { useAsync, useSession } from '../lib/session'
import { GIG_TYPES } from '../lib/types'
import { photoRuleOf, schemaOf } from '../lib/forms'

const EASE = [0.22, 1, 0.36, 1] as const

export default function GigDetail() {
  const { id } = useParams()
  const { user, profile } = useSession()
  const nav = useNavigate()
  const toast = useToast()
  const { data: l, loading, reload } = useAsync(() => getListing(id!), [id])
  const claims = useAsync(() => (user ? myClaims() : Promise.resolve([])), [user?.id])
  const files = useAsync(() => listingFiles(id!), [id, user?.id])
  const apps = useAsync(() => (user ? myApplications() : Promise.resolve([])), [user?.id])
  const [applying, setApplying] = useState(false)
  const joined = !!claims.data?.some((c) => c.listing_id === id && c.status !== 'withdrawn' && c.status !== 'removed')
  const [busy, setBusy] = useState(false)
  if (loading) return <PageLoader />
  if (!l) return <div className="container-x max-w-xl py-20"><Empty title="Gig not found" action={<Link to="/gigs" className="btn-primary">Back to gigs</Link>} /></div>

  const t = timeLeft(l.expires_at)
  const mine = claims.data?.find((c) => c.listing_id === l.id && c.status === 'active')
  const open = isOpen(l)

  const apply = isApply(l)
  const aud = audienceOf(l)
  const fits = !profile || audienceAllows(aud, accountOf(profile))
  const myApp = apps.data?.find((a) => a.listing_id === l.id && a.status !== 'withdrawn')
  const looking = apply ? eligibilityText(l.eligibility) : ''

  const join = async () => {
    if (!user) return nav(`/signup?next=/gigs/${l.id}${aud === 'general' ? '&type=general' : ''}`)
    if (profile?.kyc_status !== 'verified') return nav('/verify')
    if (apply) return setApplying(true)
    setBusy(true)
    try {
      const c = await claimListing(l.id)
      toast('You’ve joined this gig')
      nav(`/me/gig/${c.id}`)
    } catch (e: any) { toast(e.message, 'err'); reload() } finally { setBusy(false) }
  }

  let cta: { label: string; disabled?: boolean; hint?: string }
  if (mine) cta = { label: 'Submit your work' }
  else if (!open) cta = { label: t.expired ? 'This gig has closed' : spotsLeft(l) === 0 ? 'All spots taken' : 'Not open', disabled: true }
  else if (!user) cta = { label: 'Sign up to apply', hint: 'Free. Takes about two minutes.' }
  else if (profile?.kyc_status === 'pending') cta = { label: 'Verification in review', disabled: true, hint: 'You can join as soon as you’re approved.' }
  else if (!fits) cta = { label: AUDIENCES[aud].label, disabled: true, hint: aud === 'students' ? 'This gig is for students. Keep an eye out for gigs open to everyone.' : 'This gig is for people who aren’t students right now.' }
  else if (profile?.kyc_status !== 'verified') cta = { label: apply ? 'Get verified to apply' : 'Get verified to join', hint: 'A quick ID and selfie check first.' }
  else if (apply && myApp) cta = myApp.status === 'declined'
    ? { label: 'Not selected this time', disabled: true, hint: 'Thank you for applying. Keep an eye out for new gigs.' }
    : { label: myApp.status === 'shortlisted' ? 'You’re on the shortlist' : 'Application sent', disabled: true, hint: 'We’ll email you when a decision is made.' }
  else if (apply) cta = { label: 'Apply for this gig', hint: 'You’ll answer a few questions. Selected people are paid after taking part.' }
  else cta = { label: 'Join this gig' }

  return (
    <div className="container-x py-8">
      <Link to="/gigs" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All gigs</Link>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: EASE }} className="mt-6 overflow-hidden rounded-[28px]">
        <Photo src={coverFor(l)} alt={l.title} label={GIG_TYPES[l.type].label} className="aspect-[21/8] min-h-[12rem] w-full" />
      </motion.div>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span className="chip bg-brand-50 text-brand-700">{GIG_TYPES[l.type].label}</span>
            {l.client_name && <span>for <b className="font-medium text-ink">{l.client_name}</b></span>}
          </div>
          <h1 className="mt-5 text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]">{l.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{l.summary}</p>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-4">
            {[
              [Wallet, 'Pay', payLine(l)],
              [Users, 'Spots left', `${spotsLeft(l)} of ${l.slots}`],
              [MapPin, 'Location', l.is_remote ? 'Remote' : l.location ?? '—'],
              [Calendar, 'Closes', `${new Date(l.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${t.label}`],
            ].map(([I, k, v]: any) => (
              <div key={k} className="bg-white p-5">
                <dt className="flex items-center gap-2 text-xs text-ink-muted"><I className="h-3.5 w-3.5" />{k}</dt>
                <dd className="mt-1.5 text-sm font-medium leading-snug">{v}</dd>
              </div>
            ))}
          </dl>

          {l.description && (<section className="mt-12"><h2 className="text-2xl font-semibold tracking-[-0.025em]">About the work</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">{l.description}</p></section>)}
          {l.requirements.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-semibold tracking-[-0.025em]">Requirements</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {l.requirements.map((r, i) => (
                  <li key={i} className="flex gap-3 py-4 text-ink-soft"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />{r}</li>
                ))}
              </ul>
            </section>
          )}
          {sessionsOf(l).length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-semibold tracking-[-0.025em]">Schedule</h2>
              <p className="mt-2 text-ink-muted">Check in on each day with {l.photo_rule !== 'none' ? 'a photo and ' : ''}a short report. Each day’s check-in opens only on that date, and you’re paid for every approved day.</p>
              <ol className="mt-4 divide-y divide-line border-y border-line">
                {sessionsOf(l).map((sd, i) => (
                  <li key={i} className="flex items-center gap-4 py-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{i + 1}</span>
                    <div><div className="font-medium">{dayLabel(sd, i)}</div><div className="text-sm text-ink-muted">{formatDay(sd.date, { weekday: 'long', day: 'numeric', month: 'long' })}{timeRange(sd) ? ` · ${timeRange(sd)}` : ''}</div></div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">What you’ll submit</h2>
            <p className="mt-2 text-ink-muted">For each {l.unit_label} you complete:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {schemaOf(l).map((f) => <span key={f.key} className="chip border border-line bg-white px-3 py-1.5 text-sm text-ink-soft">{f.label}</span>)}
              {photoRuleOf(l) !== 'none' && <span className="chip border border-line bg-white px-3 py-1.5 text-sm text-ink-soft"><Camera className="h-3.5 w-3.5" />{photoRuleOf(l) === 'optional' ? 'Photo (optional)' : 'Photo'}</span>}
            </div>
          </section>
          {(files.data?.length ?? 0) > 0 && (
            <div className="mt-12"><GigFileList files={files.data!} title="Resources" note={joined ? undefined : 'More material may be shared once you join.'} /></div>
          )}
        </motion.div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: EASE }} className="card rounded-[28px] p-7">
            <div className="text-sm text-ink-muted">You can earn up to</div>
            <div className="figure mt-1.5 text-[52px] leading-none">{money(maxEarn(l), l.currency)}</div>
            <div className="mt-1.5 text-sm text-ink-muted">{payLine(l)}{l.units_per_student ? ` · up to ${l.units_per_student} ${plural(l.unit_label, l.units_per_student)}` : ''}</div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              <span className="chip bg-sand text-ink-soft">{AUDIENCES[aud].short}</span>
              {apply && <span className="chip bg-brand-50 text-brand-700">Apply · selected by Gigotter</span>}
            </div>
            {looking && <p className="mt-3 text-sm text-ink-muted"><b className="font-medium text-ink">Looking for:</b> {looking}</p>}
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-ink-muted"><span>{l.taken ?? 0} {apply ? 'selected' : 'joined'}</span><span>{l.slots} {plural(apply ? 'place' : 'spot', l.slots)}</span></div>
              <Progress value={l.taken ?? 0} max={l.slots} />
            </div>
            {mine
              ? <Link to={`/me/gig/${mine.id}`} className="btn-brand mt-7 w-full py-3.5">{cta.label}<ArrowRight className="h-4 w-4" /></Link>
              : <button onClick={join} disabled={cta.disabled || busy} className="btn-brand mt-7 w-full py-3.5">{busy ? <Spinner /> : cta.label}</button>}
            {cta.hint && <p className="mt-3 text-center text-xs text-ink-muted">{cta.hint}</p>}
            {apply && myApp && ['applied', 'shortlisted'].includes(myApp.status) && (
              <button onClick={async () => { if (!confirm('Withdraw your application?')) return; try { await withdrawApplication(myApp.id); toast('Application withdrawn'); apps.reload() } catch (e: any) { toast(e.message, 'err') } }}
                className="mt-2 w-full text-center text-xs text-ink-muted underline underline-offset-2 hover:text-ink">Withdraw my application</button>
            )}
            {profile?.kyc_status === 'rejected' && (
              <div className="mt-5 flex gap-2.5 rounded-xl bg-red-50 p-3.5 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0 translate-y-0.5" /><span>Your verification needs attention. <Link to="/verify" className="font-medium underline">Update it</Link></span></div>
            )}
          </motion.div>
          <p className="mt-4 px-1 text-xs leading-relaxed text-ink-muted">{apply ? 'Applying doesn’t guarantee a place. If you’re selected and can’t make it, let us know so someone else can take your place.' : 'Joining reserves a spot. If you can’t complete it, withdraw from your dashboard so someone else can take it.'}</p>
        </aside>
        <ApplyForm listing={l} open={applying} onClose={() => setApplying(false)} onApplied={() => { setApplying(false); apps.reload() }} />
      </div>
    </div>
  )
}
