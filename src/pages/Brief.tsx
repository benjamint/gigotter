import { motion } from 'framer-motion'
import { ArrowRight, Check, FileText, Paperclip, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Reveal, Spinner, useToast } from '../components/ui'
import { createRequest } from '../lib/api'
import { useScrollIntoViewOn } from '../lib/scroll'
import { checkDoc, cooldownLeft, fileSize, friendlyError, startCooldown } from '../lib/security'
import { GIG_TYPES, type GigType } from '../lib/types'

export default function Brief() {
  const toast = useToast()
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', need: '', budget: '', deadline: '', location: '', work_type: '' })
  const [files, setFiles] = useState<File[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const picker = useRef<HTMLInputElement>(null)
  const addFiles = (list: FileList | null) => {
    const next = [...files]
    for (const file of Array.from(list ?? [])) { try { checkDoc(file, 10); if (next.length < 5) next.push(file); else toast('You can attach up to 5 files', 'err') } catch (e: any) { toast(e.message, 'err') } }
    setFiles(next)
  }
  const [trap, setTrap] = useState('') // hidden field: real people never fill it in
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const cardRef = useScrollIntoViewOn<HTMLDivElement>([done])
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (trap) { setDone(true); return } // bot: pretend it worked
    const wait = cooldownLeft('brief'); if (wait) return toast(`Please wait ${wait}s before sending another brief`, 'err')
    if (f.need.trim().length < 10) return toast('Tell us a little more about what you need', 'err')
    if (!/^\d{7,15}$/.test(f.phone.replace(/\D/g, ''))) return toast('Add a phone number we can reach you on', 'err')
    setBusy(true)
    try {
      const bad = await createRequest({ ...f, phone: f.phone.trim(), company: f.company || null, budget: f.budget || null, deadline: f.deadline || null, location: f.location || null, work_type: f.work_type || null }, files)
      setFailed(bad); startCooldown('brief', 120); setDone(true)
    }
    catch (err: any) { toast(friendlyError(err.message), 'err') } finally { setBusy(false) }
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
      <div ref={cardRef} className="card p-6 md:p-8">
        {done ? (
          <div className="grid min-h-[24rem] place-items-center text-center">
            <div><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Check className="h-5 w-5" /></div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tightest">Brief received</h2><p className="mt-2 text-ink-muted">We’ll call or WhatsApp you within 1 business day with a plan and quote.</p>
              {failed.length > 0 && <p className="mx-auto mt-4 max-w-sm rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Your brief was sent, but {failed.length === 1 ? 'one file' : `${failed.length} files`} didn’t upload. Please email {failed.length === 1 ? 'it' : 'them'} to hello@gigotter.com.</p>}</div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-2xl font-semibold">Post a brief</h2>
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Website <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Your name</label><input className="input" required maxLength={120} value={f.name} onChange={set('name')} /></div>
              <div><label className="label">Email</label><input className="input" type="email" required maxLength={200} value={f.email} onChange={set('email')} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Phone / WhatsApp</label><input className="input" type="tel" inputMode="tel" required maxLength={40} value={f.phone} onChange={set('phone')} placeholder="024 123 4567" /></div>
              <div><label className="label">Company</label><input className="input" maxLength={160} value={f.company} onChange={set('company')} /></div>
            </div>
            <div>
              <label className="label">Kind of work <span className="font-normal text-ink-muted">(optional)</span></label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GIG_TYPES) as GigType[]).map((k) => (
                  <button type="button" key={k} onClick={() => setF({ ...f, work_type: f.work_type === k ? '' : k })}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${f.work_type === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`}>{GIG_TYPES[k].label}</button>
                ))}
              </div>
            </div>
            <div><label className="label">What do you need done?</label><textarea className="input min-h-[120px]" required minLength={10} maxLength={4000} value={f.need} onChange={set('need')} placeholder="e.g. Get 100 market traders in Makola to try our POS app" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Budget</label><input className="input" maxLength={80} value={f.budget} onChange={set('budget')} placeholder="₵2,000" /></div>
              <div><label className="label">Deadline</label><input className="input" maxLength={80} value={f.deadline} onChange={set('deadline')} placeholder="End of month" /></div>
            </div>
            <div><label className="label">Where <span className="font-normal text-ink-muted">(optional)</span></label><input className="input" maxLength={160} value={f.location} onChange={set('location')} placeholder="Accra — Osu and East Legon, or remote" /></div>
            <div>
              <label className="label">Attachments <span className="font-normal text-ink-muted">(optional: a brief, deck, product sheet…)</span></label>
              {files.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-ink-muted" /><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-xs text-ink-muted">{fileSize(file.size)}</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${file.name}`} className="grid h-7 w-7 place-items-center rounded-full text-ink-muted hover:bg-white hover:text-red-600"><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {files.length < 5 && (
                <button type="button" onClick={() => picker.current?.click()} className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-line px-4 py-3 text-sm font-medium text-ink-soft hover:border-ink/40 hover:text-ink">
                  <span className="flex items-center gap-2"><Paperclip className="h-4 w-4" />Attach files</span>
                  <span className="text-xs font-normal text-ink-muted">PDF, Word, PowerPoint, Excel or images · up to 5 files, 10 MB each</span>
                </button>
              )}
              <input ref={picker} type="file" multiple hidden accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </div>
            <button className="btn-brand w-full" disabled={busy}>{busy ? <><Spinner />{files.length ? 'Sending files…' : 'Sending…'}</> : <>Send brief <ArrowRight className="h-4 w-4" /></>}</button>
          </form>
        )}
      </div>
    </div>
  )
}
