import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Plus, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FileDrop } from '../components/Upload'
import { Empty, PageLoader, Progress, Spinner, SubPill, useToast } from '../components/ui'
import { myClaims, submitWork, withdrawClaim } from '../lib/api'
import { ago, money, payLine, timeLeft } from '../lib/format'
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
  if (!c) return <div className="mx-auto max-w-xl px-4 py-20"><Empty emoji="🤔" title="Gig not found" action={<Link to="/me" className="btn-primary">Back</Link>} /></div>
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
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 }, colors: ['#FF5C39', '#FF3CAC', '#7B5CFF', '#C8F542'] })
      toast(`+${money(l.pay_model === 'per_unit' ? l.rate : l.rate / (goal || 1), l.currency)} pending review 💸`)
      setForm({}); setProof(null)
      reload()
    } catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/me" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-white text-4xl shadow-brutal">{l.emoji}</div>
          <div><h1 className="text-3xl font-extrabold md:text-4xl">{l.title}</h1><div className="text-sm text-ink/60">{payLine(l)} · {t.label}</div></div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex justify-between text-sm font-semibold"><span>{done}{goal ? ` / ${goal}` : ''} {l.unit_label}s submitted</span>{goal && <span>{Math.round((done / goal) * 100)}%</span>}</div>
        <Progress value={done} max={goal ?? Math.max(done, 1)} className="mt-2 h-3" />
        {profile?.referral_code && <p className="mt-3 text-sm text-ink/60">Tell founders to use code <b className="tracking-widest text-ink">{profile.referral_code}</b> when they sign up — that’s how we credit you.</p>}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
            <h2 className="text-2xl font-bold">Log a {l.unit_label}</h2>
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
                    <button className="btn-glow w-full" disabled={busy}>{busy ? <Spinner /> : <>Submit <Send className="h-4 w-4" /></>}</button>
                  </form>
                ) : (
                  <div className="mt-4"><Empty emoji={goal && done >= goal ? '🏆' : '⏰'} title={goal && done >= goal ? 'Quota smashed!' : 'Submissions closed'} body={goal && done >= goal ? 'You hit the max for this gig. Payouts land after review.' : 'This gig is no longer taking work.'} /></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Submitted</h2>
          <div className="mt-4 space-y-3">
            {c.subs.length === 0 && <p className="text-ink/50">Nothing yet. Your first one is the hardest — go!</p>}
            <AnimatePresence>
              {c.subs.map((s) => (
                <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border-2 border-ink/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><div className="truncate font-semibold">{s.data.business_name || s.data.owner_name}</div><div className="text-xs text-ink/50">{s.data.location || s.data.owner_phone} · {ago(s.created_at)}</div></div>
                    <div className="text-right"><div className="font-bold">{money(s.amount, l.currency)}</div><SubPill s={s.status} /></div>
                  </div>
                  {s.admin_note && <p className="mt-2 rounded-xl bg-ink/5 p-2 text-xs">{s.admin_note}</p>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {c.status === 'active' && done === 0 && (
            <button onClick={async () => { if (confirm('Give up your spot on this gig?')) { await withdrawClaim(c.id); toast('Spot released'); nav('/me') } }} className="mt-8 text-sm text-ink/40 underline hover:text-red-600">Withdraw from this gig</button>
          )}
        </div>
      </div>
    </div>
  )
}
