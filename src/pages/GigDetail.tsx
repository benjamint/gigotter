import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, Clock, MapPin, ShieldAlert, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, PageLoader, Progress, Spinner, useToast } from '../components/ui'
import { claimListing, getListing, myClaims } from '../lib/api'
import { ACCENTS, isOpen, maxEarn, money, payLine, spotsLeft, timeLeft } from '../lib/format'
import { useAsync, useSession } from '../lib/session'
import { GIG_TYPES, PROOF_FIELDS } from '../lib/types'

export default function GigDetail() {
  const { id } = useParams()
  const { user, profile } = useSession()
  const nav = useNavigate()
  const toast = useToast()
  const { data: l, loading, reload } = useAsync(() => getListing(id!), [id])
  const claims = useAsync(() => (user ? myClaims() : Promise.resolve([])), [user?.id])
  const [busy, setBusy] = useState(false)
  if (loading) return <PageLoader />
  if (!l) return <div className="mx-auto max-w-xl px-4 py-20"><Empty emoji="🔍" title="Gig not found" action={<Link to="/gigs" className="btn-primary">Back to gigs</Link>} /></div>

  const a = ACCENTS[l.accent] ?? ACCENTS.glow
  const t = timeLeft(l.expires_at)
  const mine = claims.data?.find((c) => c.listing_id === l.id && c.status === 'active')
  const open = isOpen(l)

  const join = async () => {
    if (!user) return nav(`/signup?next=/gigs/${l.id}`)
    if (profile?.kyc_status !== 'verified') return nav('/verify')
    setBusy(true)
    try {
      const c = await claimListing(l.id)
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 }, colors: ['#FF5C39', '#FF3CAC', '#7B5CFF', '#C8F542'] })
      toast('You’re in! Let’s get it 🔥')
      setTimeout(() => nav(`/me/gig/${c.id}`), 900)
    } catch (e: any) { toast(e.message, 'err'); reload() } finally { setBusy(false) }
  }

  let cta: { label: string; disabled?: boolean; hint?: string }
  if (mine) cta = { label: 'Submit your work →' }
  else if (!open) cta = { label: t.expired ? 'Expired' : spotsLeft(l) === 0 ? 'All spots taken' : 'Not open', disabled: true }
  else if (!user) cta = { label: 'Sign up to join', hint: 'Takes 2 mins. Free forever.' }
  else if (profile?.kyc_status === 'pending') cta = { label: 'Verification in review…', disabled: true, hint: 'We’ll unlock this as soon as you’re approved.' }
  else if (profile?.kyc_status !== 'verified') cta = { label: 'Get verified to join', hint: 'Quick ID + selfie check first.' }
  else cta = { label: 'I’m in — join this gig' }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/gigs" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink"><ArrowLeft className="h-4 w-4" />All gigs</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <motion.div initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }} className={`grid h-20 w-20 place-items-center rounded-3xl border-2 border-ink text-5xl shadow-brutal ${a.bg}`}>{l.emoji}</motion.div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip bg-ink text-white">{GIG_TYPES[l.type].emoji} {GIG_TYPES[l.type].label}</span>
            <span className={`chip ${t.urgent ? 'bg-red-100 text-red-700' : 'bg-ink/5'}`}><Clock className="h-3 w-3" />{t.label}</span>
            {l.client_name && <span className="chip bg-ink/5">by {l.client_name}</span>}
          </div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">{l.title}</motion.h1>
          <p className="mt-4 text-lg text-ink/70">{l.summary}</p>
          {l.description && <p className="mt-4 whitespace-pre-line text-ink/70">{l.description}</p>}

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [Wallet, 'Pay', payLine(l)],
              [Users, 'Spots', `${spotsLeft(l)} of ${l.slots} left`],
              [MapPin, 'Where', l.is_remote ? 'Remote' : l.location ?? '—'],
              [Calendar, 'Closes', new Date(l.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })],
            ].map(([I, k, v]: any) => (
              <div key={k} className="rounded-2xl border-2 border-ink/10 bg-white p-4">
                <I className="h-5 w-5 text-ink/40" /><div className="mt-2 text-xs text-ink/50">{k}</div><div className="font-semibold leading-tight">{v}</div>
              </div>
            ))}
          </div>

          {l.requirements.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold">What counts</h2>
              <ul className="mt-4 space-y-2">
                {l.requirements.map((r, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="flex gap-3 rounded-2xl bg-white p-4">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-300"><Check className="h-4 w-4" /></span>{r}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-10">
            <h2 className="text-2xl font-bold">Proof you’ll submit</h2>
            <p className="mt-1 text-sm text-ink/60">For every {l.unit_label}, you’ll send us:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.proof_fields.map((f) => <span key={f} className="chip border border-ink/15 bg-white py-1.5 text-sm">{PROOF_FIELDS[f]?.label ?? f}</span>)}
              <span className="chip border border-ink/15 bg-white py-1.5 text-sm">📸 A photo</span>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <div className="text-sm text-ink/50">Earn up to</div>
            <div className="font-display text-5xl font-extrabold">{money(maxEarn(l), l.currency)}</div>
            <div className={`mt-1 text-sm font-semibold ${a.text}`}>{payLine(l)}{l.units_per_student ? ` · max ${l.units_per_student} ${l.unit_label}s` : ''}</div>
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs font-semibold"><span>{l.taken ?? 0} joined</span><span>{l.slots} spots</span></div>
              <Progress value={l.taken ?? 0} max={l.slots} />
            </div>
            {mine ? (
              <Link to={`/me/gig/${mine.id}`} className="btn-glow mt-6 w-full">{cta.label}</Link>
            ) : (
              <button onClick={join} disabled={cta.disabled || busy} className="btn-glow mt-6 w-full">{busy ? <Spinner /> : cta.label}</button>
            )}
            {cta.hint && <p className="mt-2 text-center text-xs text-ink/50">{cta.hint}</p>}
            {profile?.kyc_status === 'rejected' && (
              <div className="mt-4 flex gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700"><ShieldAlert className="h-5 w-5 shrink-0" />Your verification needs fixing. <Link to="/verify" className="font-bold underline">Fix it</Link></div>
            )}
          </div>
          <p className="mt-4 px-2 text-xs text-ink/50">Joining reserves your spot. If you can’t do it, withdraw from your dashboard so someone else can.</p>
        </aside>
      </div>
    </div>
  )
}
