import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Reveal, Spinner, useToast } from '../components/ui'
import { createRequest } from '../lib/api'

export default function Brief() {
  const toast = useToast()
  const [f, setF] = useState({ name: '', email: '', company: '', need: '', budget: '', deadline: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    try { await createRequest({ ...f, company: f.company || null, budget: f.budget || null, deadline: f.deadline || null }); setDone(true) }
    catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-2">
      <div>
        <div className="chip bg-brand-50 text-brand-700">For businesses & founders</div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-5xl font-semibold tracking-tightest leading-[0.95] md:text-6xl">
          Need boots on the ground? <span className="text-brand-600">We’ve got students.</span>
        </motion.h1>
        <p className="mt-5 text-lg text-ink-soft">Customer sign-ups, market research, focus groups, product sampling. Tell us what you need — we scope it, post it, and verified students get it done.</p>
        <div className="mt-8 space-y-3">
          {['Every student is ID + selfie verified', 'Pay per result, not per hour', 'Proof for every unit delivered', 'You only pay for approved work'].map((t, i) => (
            <Reveal key={t} delay={i * 0.06}><div className="flex items-center gap-3 font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50"><Check className="h-4 w-4" /></span>{t}</div></Reveal>
          ))}
        </div>
      </div>
      <div className="card p-6 md:p-8">
        {done ? (
          <div className="grid min-h-[24rem] place-items-center text-center">
            <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Check className="h-5 w-5" /></div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tightest">Brief received</h2><p className="mt-2 text-ink-muted">We’ll reply within 1 business day with a plan and quote.</p></div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-2xl font-semibold">Post a brief</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Your name</label><input className="input" required value={f.name} onChange={set('name')} /></div>
              <div><label className="label">Email</label><input className="input" type="email" required value={f.email} onChange={set('email')} /></div>
            </div>
            <div><label className="label">Company</label><input className="input" value={f.company} onChange={set('company')} /></div>
            <div><label className="label">What do you need done?</label><textarea className="input min-h-[120px]" required value={f.need} onChange={set('need')} placeholder="e.g. Get 100 market traders in Makola to try our POS app" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Budget</label><input className="input" value={f.budget} onChange={set('budget')} placeholder="₵2,000" /></div>
              <div><label className="label">Deadline</label><input className="input" value={f.deadline} onChange={set('deadline')} placeholder="End of month" /></div>
            </div>
            <button className="btn-brand w-full" disabled={busy}>{busy ? <Spinner /> : <>Send brief <ArrowRight className="h-4 w-4" /></>}</button>
          </form>
        )}
      </div>
    </div>
  )
}
