import Photo from '../components/Photo'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Plus, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FileDrop } from '../components/Upload'
import { Empty, PageLoader, Progress, Spinner, SubPill, useToast } from '../components/ui'
import { myClaims, submitWork, withdrawClaim } from '../lib/api'
import { ago, coverFor, money, payLine, timeLeft } from '../lib/format'
import { useAsync, useSession } from '../lib/session'
import { PROOF_FIELDS } from '../lib/types'

export default function MyGig() {
  const { claimId } = useParams()
  const { user, profile, loading } = useSession()
  const toast = useToast()
  const nav = useNavigate()
  const { data, loading: l2, reload } = useAsync(() => (user ? myClaims() : Promise.resolve([])), [user?.id])
  const [form, setForm] = useState<Record<string, string>>({})
  const [proof, setProof] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(true)

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (l2) return <PageLoader />
  const c = data?.find((x) => x.id === claimId)
  if (!c) return <div className="mx-auto max-w-xl px-4 py-20"><Empty title="Gig not found" action={<Link to="/me" className="btn-primary">Back</Link>} /></div>
  const l = c.listing
  const done = c.subs.filter((s) => s.status !== 'rejected').length
  const goal = l.units_per_student
  const t = timeLeft(l.expires_at)
  const canSubmit = c.status === 'active' && !t.expired && (!goal || done < goal)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!proof) return toast('Add a photo as proof', 'err')
    setBusy(true)
    try {
      await submitWork(c.id, form, proof)
      toast(`+${money(l.pay_model === 'per_unit' ? l.rate : l.rate / (goal || 1), l.currency)} submitted for review`)
      setForm({}); setProof(null)
      reload()
    } catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/me" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Photo src={coverFor(l)} alt="" className="h-16 w-16 shrink-0 rounded-2xl" />
          <div><h1 className="text-3xl font-semibold tracking-tightest md:text-4xl">{l.title}</h1><div className="text-sm text-ink-muted">{payLine(l)} · {t.label}</div></div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex justify-between text-sm font-medium"><span>{done}{goal ? ` / ${goal}` : ''} {l.unit_label}s submitted</span>{goal && <span>{Math.round((done / goal) * 100)}%</span>}</div>
        <Progress value={done} max={goal ?? Math.max(done, 1)} className="mt-2 h-3" />
        {profile?.referral_code && <p className="mt-3 text-sm text-ink-muted">Tell founders to use code <b className="font-mono tracking-[0.2em] text-ink">{profile.referral_code}</b> when they sign up — that’s how we credit you.</p>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
            <h2 className="text-2xl font-semibold">Log a {l.unit_label}</h2>
            <motion.span animate={{ rotate: open ? 45 : 0 }}><Plus /></motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {canSubmit ? (
                  <form onSubmit={submit} className="mt-4 space-y-4">
                    {l.proof_fields.map((k) => {
                      const meta = PROOF_FIELDS[k] ?? { label: k, placeholder: '' }
                      return (
                        <div key={k}><label className="label">{meta.label}</label>
                          {k === 'notes'
                            ? <textarea className="input min-h-[80px]" value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={meta.placeholder} />
                            : <input className="input" required={k !== 'instagram'} type={meta.type ?? 'text'} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={meta.placeholder} />}
                        </div>
                      )
                    })}
                    <div><label className="label">Photo proof</label><FileDrop label="Shopfront, founder with the app, or a screenshot" capture="environment" file={proof} onFile={setProof} /></div>
                    <button className="btn-brand w-full" disabled={busy}>{busy ? <Spinner /> : <>Submit <Send className="h-4 w-4" /></>}</button>
                  </form>
                ) : (
                  <div className="mt-4"><Empty title={goal && done >= goal ? 'You’ve reached the limit' : 'Submissions closed'} body={goal && done >= goal ? 'Nice work. Payment follows once your submissions are approved.' : 'This gig is no longer taking work.'} /></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Submitted</h2>
          <div className="mt-4 space-y-3">
            {c.subs.length === 0 && <p className="text-ink-muted">Nothing submitted yet.</p>}
            <AnimatePresence>
              {c.subs.map((s) => (
                <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><div className="truncate font-semibold">{s.data.business_name || s.data.owner_name}</div><div className="text-xs text-ink-muted">{s.data.location || s.data.owner_phone} · {ago(s.created_at)}</div></div>
                    <div className="text-right"><div className="font-semibold">{money(s.amount, l.currency)}</div><SubPill s={s.status} /></div>
                  </div>
                  {s.admin_note && <p className="mt-2 rounded-xl bg-sand p-2 text-xs">{s.admin_note}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {c.status === 'active' && done === 0 && (
            <button onClick={async () => { if (confirm('Give up your spot on this gig?')) { await withdrawClaim(c.id); toast('Spot released'); nav('/me') } }} className="mt-8 text-sm text-ink-muted underline hover:text-red-600">Withdraw from this gig</button>
          )}
        </div>
      </div>
    </div>
  )
}
