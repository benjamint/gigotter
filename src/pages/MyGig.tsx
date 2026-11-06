import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, ChevronDown, ClipboardList, Copy, FileText, MapPin, Send, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import AddressField, { mapsUrl } from '../components/AddressField'
import Photo from '../components/Photo'
import { FileDrop } from '../components/Upload'
import { Empty, PageLoader, Progress, Spinner, SubPill, useToast } from '../components/ui'
import { myClaims, submitWork, withdrawClaim } from '../lib/api'
import { ago, coverFor, money, payLine, timeLeft } from '../lib/format'
import { friendlyError } from '../lib/security'
import { useScrollIntoViewOn } from '../lib/scroll'
import { useAsync, useSession } from '../lib/session'
import { PROOF_FIELDS, fieldLabel, type Submission, type SubmissionStatus } from '../lib/types'

type Tab = 'log' | 'submitted' | 'details'
const EASE = [0.22, 1, 0.36, 1] as const

export default function MyGig() {
  const { claimId } = useParams()
  const { user, profile, loading } = useSession()
  const toast = useToast()
  const nav = useNavigate()
  const { data, loading: l2, reload } = useAsync(() => (user ? myClaims() : Promise.resolve([])), [user?.id])
  const [tab, setTab] = useState<Tab>('log')
  const [form, setForm] = useState<Record<string, string>>({})
  const [proof, setProof] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const tabsRef = useScrollIntoViewOn<HTMLDivElement>([tab, formKey])

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (l2) return <PageLoader />
  const c = data?.find((x) => x.id === claimId)
  if (!c) return <div className="container-x max-w-xl py-20"><Empty title="Gig not found" action={<Link to="/me" className="btn-primary">Back to dashboard</Link>} /></div>

  const l = c.listing
  const live = c.subs.filter((s) => s.status !== 'rejected')
  const done = live.length
  const goal = l.units_per_student
  const t = timeLeft(l.expires_at)
  const canSubmit = c.status === 'active' && l.status === 'live' && !t.expired && (!goal || done < goal)
  const earned = c.subs.filter((s) => s.status === 'approved' || s.status === 'paid').reduce((a, s) => a + (s.amount ?? 0), 0)
  const pending = c.subs.filter((s) => s.status === 'pending').reduce((a, s) => a + (s.amount ?? 0), 0)
  const perUnit = l.pay_model === 'per_unit' ? l.rate : l.rate / (goal || 1)
  const unit = l.unit_label

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!proof) return toast('Add a photo as proof', 'err')
    setBusy(true)
    try {
      await submitWork(c.id, form, proof)
      toast(`${money(perUnit, l.currency)} ${unit} submitted for review`)
      setForm({}); setProof(null); setFormKey((k) => k + 1)
      reload()
    } catch (err: any) { toast(friendlyError(err.message), 'err') } finally { setBusy(false) }
  }

  const tabs: { k: Tab; label: string; icon: typeof Send; count?: number }[] = [
    { k: 'log', label: `Log a ${unit}`, icon: ClipboardList },
    { k: 'submitted', label: 'Submitted', icon: Check, count: c.subs.length },
    { k: 'details', label: 'Gig details', icon: FileText },
  ]

  return (
    <div className="container-x max-w-4xl py-8">
      <Link to="/me" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Dashboard</Link>

      {/* ── summary ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="card mt-5 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Photo src={coverFor(l)} alt="" className="h-16 w-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            {l.client_name && <div className="text-xs font-medium text-ink-muted">{l.client_name}</div>}
            <h1 className="text-2xl font-semibold leading-tight tracking-tightest md:text-3xl">{l.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4" />{payLine(l)}</span>
              <span className={`flex items-center gap-1.5 ${t.urgent && !t.expired ? 'text-clay-600' : ''}`}><Calendar className="h-4 w-4" />{t.expired ? 'Closed' : `Closes in ${t.label.replace(' left', '')}`}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{l.is_remote ? 'Remote' : l.location}</span>
            </div>
          </div>
        </div>
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
          <div className="bg-white px-5 py-4 sm:px-6">
            <div className="text-xs text-ink-muted">Progress</div>
            <div className="figure mt-1 text-3xl leading-tight">{done}{goal ? <span className="text-ink-muted"> / {goal}</span> : ''} <span className="font-sans text-sm text-ink-muted">{unit}s</span></div>
            <Progress value={done} max={goal ?? Math.max(done, 1)} className="mt-2" />
          </div>
          <div className="bg-white px-5 py-4 sm:px-6">
            <div className="text-xs text-ink-muted">Approved earnings</div>
            <div className="figure mt-1 text-3xl leading-tight">{money(earned, l.currency)}</div>
            <div className="text-xs text-ink-muted">{pending ? `${money(pending, l.currency)} in review` : 'Paid weekly to your MoMo'}</div>
          </div>
          <div className="bg-white px-5 py-4 sm:px-6">
            <div className="text-xs text-ink-muted">Your referral code</div>
            {profile?.referral_code ? (
              <button onClick={() => { navigator.clipboard?.writeText(profile.referral_code!); toast('Code copied') }} className="mt-1 flex items-center gap-2 font-mono text-xl font-semibold tracking-[0.18em] hover:text-brand-600">
                {profile.referral_code}<Copy className="h-4 w-4 text-ink-muted" />
              </button>
            ) : <div className="mt-1 text-sm text-ink-muted">—</div>}
            <div className="text-xs text-ink-muted">Ask people to use it when they sign up</div>
          </div>
        </div>
      </motion.div>

      {/* ── tabs ── */}
      <div ref={tabsRef} className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((x) => (
          <button key={x.k} onClick={() => setTab(x.k)} className={`relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-1 text-sm transition ${tab === x.k ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}>
            <x.icon className="h-4 w-4" />{x.label}
            {x.count != null && <span className={`grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1.5 text-[11px] font-semibold ${tab === x.k ? 'bg-ink text-white' : 'bg-sand text-ink-soft'}`}>{x.count}</span>}
            {tab === x.k && <motion.span layoutId="gig-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
          </button>
        ))}
      </div>

      <div className="card mt-6 p-5 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
            {tab === 'log' && (canSubmit ? (
              <form key={formKey} onSubmit={submit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">Log a {unit}</h2>
                  <p className="mt-1 text-sm text-ink-muted">Fill this in for each {unit} you complete. You’ll earn <b className="font-medium text-ink">{money(perUnit, l.currency)}</b> once it’s approved.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {l.proof_fields.map((k) => {
                    const meta = PROOF_FIELDS[k] ?? { label: fieldLabel(k), placeholder: '' }
                    const wide = meta.multiline || k === 'location'
                    return (
                      <div key={k} className={wide ? 'sm:col-span-2' : ''}>
                        <label className="label">{meta.label}{meta.optional && <span className="font-normal text-ink-muted"> (optional)</span>}</label>
                        {k === 'location' ? (
                          <AddressField value={form.location ?? ''} gps={form.gps} accuracy={form.gps_accuracy} placeholder={meta.placeholder} required
                            onChange={(v) => setForm({ ...form, location: v })}
                            onGps={(gps, acc) => { const n = { ...form }; if (gps) { n.gps = gps; n.gps_accuracy = acc ?? '' } else { delete n.gps; delete n.gps_accuracy } setForm(n) }} />
                        ) : meta.multiline ? (
                          <textarea className="input min-h-[84px]" maxLength={300} required={!meta.optional} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={meta.placeholder} />
                        ) : (
                          <input className="input" maxLength={300} required={!meta.optional} type={meta.type ?? 'text'} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={meta.placeholder} />
                        )}
                        {meta.hint && <p className={`text-xs leading-relaxed text-ink-muted ${k === 'location' ? 'mt-2' : 'mt-1.5'}`}>{meta.hint}</p>}
                      </div>
                    )
                  })}
                  <div className="sm:col-span-2">
                    <label className="label">Photo proof</label>
                    <FileDrop label="Add a photo" hint="Shopfront, the owner with the app open, or a screenshot" capture="environment" file={proof} onFile={setProof} />
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-muted">We check every submission. Fake or duplicate entries aren’t paid.</p>
                  <button className="btn-brand px-7" disabled={busy}>{busy ? <Spinner /> : <>Submit {unit} <Send className="h-4 w-4" /></>}</button>
                </div>
              </form>
            ) : (
              <Empty icon={<Check className="h-5 w-5" />}
                title={goal && done >= goal ? 'You’ve reached the limit' : 'Submissions closed'}
                body={goal && done >= goal ? 'Nice work. Payment follows once your submissions are approved.' : 'This gig is no longer taking work.'}
                action={<button onClick={() => setTab('submitted')} className="btn-ghost btn-sm">See what you submitted</button>} />
            ))}

            {tab === 'submitted' && <Submitted subs={c.subs} currency={l.currency} unit={unit} onLog={canSubmit ? () => setTab('log') : undefined} />}

            {tab === 'details' && (
              <div className="space-y-8">
                {l.summary && <p className="text-lg leading-relaxed text-ink-soft">{l.summary}</p>}
                {l.description && <div><h3 className="font-semibold">About the work</h3><p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{l.description}</p></div>}
                {l.requirements.length > 0 && (
                  <div><h3 className="font-semibold">Requirements</h3>
                    <ul className="mt-3 divide-y divide-line border-y border-line">{l.requirements.map((r, i) => <li key={i} className="flex gap-3 py-3 text-ink-soft"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{r}</li>)}</ul>
                  </div>
                )}
                <div><h3 className="font-semibold">What to submit for each {unit}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">{l.proof_fields.map((f) => <span key={f} className="chip border border-line bg-white px-3 py-1.5 text-sm text-ink-soft">{fieldLabel(f)}</span>)}<span className="chip border border-line bg-white px-3 py-1.5 text-sm text-ink-soft">Photo</span></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-muted">
                  <span>Closes {new Date(l.expires_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {c.status === 'active' && done === 0 && (
                    <button onClick={async () => { if (confirm('Give up your spot on this gig?')) { try { await withdrawClaim(c.id); toast('Spot released'); nav('/me') } catch (e: any) { toast(friendlyError(e.message), 'err') } } }} className="text-ink-muted underline underline-offset-2 hover:text-red-600">Withdraw from this gig</button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

const FILTERS: (SubmissionStatus | 'all')[] = ['all', 'pending', 'approved', 'paid', 'rejected']

function Submitted({ subs, currency, unit, onLog }: { subs: Submission[]; currency: string; unit: string; onLog?: () => void }) {
  const [f, setF] = useState<SubmissionStatus | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const list = subs.filter((s) => f === 'all' || s.status === f)
  if (!subs.length) return <Empty icon={<ClipboardList className="h-5 w-5" />} title={`No ${unit}s submitted yet`} body="Everything you log will show up here with its review status." action={onLog && <button onClick={onLog} className="btn-brand btn-sm">Log your first {unit}</button>} />
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = x === 'all' ? subs.length : subs.filter((s) => s.status === x).length
          if (x !== 'all' && !n) return null
          return <button key={x} onClick={() => setF(x)} className={`rounded-full border px-3 py-1.5 text-sm capitalize ${f === x ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30'}`}>{x} ({n})</button>
        })}
      </div>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {list.map((s) => {
          const isOpen = open === s.id
          const title = s.data.business_name || s.data.owner_name || s.data.email || 'Submission'
          return (
            <li key={s.id}>
              <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-4 py-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{title}</div>
                  <div className="truncate text-xs text-ink-muted">{s.data.location || s.data.owner_phone || ''}{s.data.location || s.data.owner_phone ? ' · ' : ''}{ago(s.created_at)}</div>
                </div>
                <div className="text-right"><div className="text-sm font-semibold">{money(s.amount, currency)}</div><SubPill s={s.status} /></div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <dl className="mb-4 grid gap-x-6 gap-y-3 rounded-2xl bg-paper p-4 text-sm sm:grid-cols-2">
                      {Object.entries(s.data).filter(([k]) => k !== 'gps_accuracy').map(([k, v]) => (
                        <div key={k} className={k === 'location' || k === 'notes' ? 'sm:col-span-2' : ''}>
                          <dt className="text-xs text-ink-muted">{fieldLabel(k)}</dt>
                          <dd className="mt-0.5 break-words font-medium">
                            {k === 'gps' ? <a href={mapsUrl(v)!} target="_blank" rel="noreferrer" className="text-brand-600 underline underline-offset-2">View pin on map</a> : v}
                          </dd>
                        </div>
                      ))}
                      {s.admin_note && <div className="sm:col-span-2"><dt className="text-xs text-ink-muted">Note from Gigotter</dt><dd className="mt-0.5 font-medium text-red-700">{s.admin_note}</dd></div>}
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
