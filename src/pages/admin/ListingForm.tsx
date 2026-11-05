import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Spinner, useToast } from '../../components/ui'
import { saveListing } from '../../lib/api'
import { ACCENTS, money } from '../../lib/format'
import { CURRENCIES, GIG_TYPES, PROOF_FIELDS, type Accent, type Listing } from '../../lib/types'

const toLocal = (iso?: string) => { const d = iso ? new Date(iso) : new Date(Date.now() + 14 * 864e5); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const EMOJIS = ['💅', '✂️', '🧵', '🗣️', '📋', '🔎', '🍲', '🛍️', '📱', '🎬', '💄', '✨']

export default function ListingForm({ initial, onSaved }: { initial: Partial<Listing>; onSaved: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [l, setL] = useState<Partial<Listing>>({
    type: 'onboarding', pay_model: 'per_unit', rate: 50, unit_label: 'business', units_per_student: 10, slots: 5, currency: 'GHS',
    status: 'live', accent: 'glow', emoji: '✨', requirements: [], is_remote: false, client_name: '',
    proof_fields: ['business_name', 'owner_name', 'owner_phone', 'location'], ...initial,
  })
  const [exp, setExp] = useState(toLocal(initial.expires_at))
  const [req, setReq] = useState('')
  const set = <K extends keyof Listing>(k: K, v: Listing[K]) => setL((x) => ({ ...x, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const perStudent = l.pay_model === 'per_unit' ? (l.rate ?? 0) * (l.units_per_student ?? 0) : (l.rate ?? 0)
  const maxSpend = perStudent * (l.slots ?? 1)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!l.title) return toast('Give it a title', 'err')
    setBusy(true)
    try { await saveListing({ ...l, expires_at: new Date(exp).toISOString() }); onSaved() }
    catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-2xl font-extrabold">{initial.id ? 'Edit gig' : 'New gig'}</h2>
      <div className="flex flex-wrap gap-2">
        {Object.entries(GIG_TYPES).map(([k, v]) => (
          <button type="button" key={k} onClick={() => set('type', k as any)} className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${l.type === k ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`}>{v.emoji} {v.label}</button>
        ))}
      </div>
      <div><label className="label">Title</label><input className="input" value={l.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Onboard 30 women-owned salons" /></div>
      <div><label className="label">One-liner <span className="font-normal text-ink/40">(shows on the card)</span></label><input className="input" value={l.summary ?? ''} onChange={(e) => set('summary', e.target.value)} placeholder="Walk in, pitch Glowy in 2 mins, get paid." /></div>
      <div><label className="label">Full brief</label><textarea className="input min-h-[90px]" value={l.description ?? ''} onChange={(e) => set('description', e.target.value)} /></div>

      <div>
        <label className="label">Requirements / targeting</label>
        <div className="flex gap-2"><input className="input" value={req} onChange={(e) => setReq(e.target.value)} placeholder="Must have a female founder"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (req.trim()) { set('requirements', [...(l.requirements ?? []), req.trim()]); setReq('') } } }} />
          <button type="button" className="btn-ghost btn-sm" onClick={() => { if (req.trim()) { set('requirements', [...(l.requirements ?? []), req.trim()]); setReq('') } }}><Plus className="h-4 w-4" /></button></div>
        <div className="mt-2 flex flex-wrap gap-2">{l.requirements?.map((r, i) => <span key={i} className="chip bg-white py-1.5 text-sm">{r}<button type="button" onClick={() => set('requirements', l.requirements!.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button></span>)}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Area</label><input className="input" disabled={l.is_remote} value={l.is_remote ? 'Remote' : l.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="Accra — East Legon, or Anywhere" /></div>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-ink" checked={!!l.is_remote} onChange={(e) => set('is_remote', e.target.checked)} />Remote / anywhere</label>
      </div>

      <div className="rounded-3xl border-2 border-ink/10 bg-white p-4">
        <div className="mb-3 flex gap-2">
          {(['per_unit', 'fixed'] as const).map((m) => <button type="button" key={m} onClick={() => set('pay_model', m)} className={`flex-1 rounded-2xl border-2 p-3 text-left text-sm ${l.pay_model === m ? 'border-ink bg-lime-300' : 'border-ink/10'}`}><b>{m === 'per_unit' ? 'Pay per unit' : 'Fixed per student'}</b><div className="text-xs text-ink/60">{m === 'per_unit' ? 'e.g. ₵50 per salon' : 'e.g. ₵300 for the whole job'}</div></button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className="label">Currency</label><select className="input" value={l.currency} onChange={(e) => set('currency', e.target.value)}>{Object.keys(CURRENCIES).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">{l.pay_model === 'per_unit' ? 'Rate / unit' : 'Pay / student'}</label><input className="input" type="number" min={0} step="0.01" value={l.rate ?? ''} onChange={(e) => set('rate', Number(e.target.value))} /></div>
          <div><label className="label">Unit name</label><input className="input" value={l.unit_label ?? ''} onChange={(e) => set('unit_label', e.target.value)} placeholder="salon" /></div>
          <div><label className="label">Units / student</label><input className="input" type="number" min={1} value={l.units_per_student ?? ''} onChange={(e) => set('units_per_student', num(e.target.value))} placeholder="∞" /></div>
          <div><label className="label">Students needed</label><input className="input" type="number" min={1} value={l.slots ?? 1} onChange={(e) => set('slots', Number(e.target.value))} /></div>
          <div><label className="label">Budget cap</label><input className="input" type="number" min={0} value={l.total_budget ?? ''} onChange={(e) => set('total_budget', num(e.target.value))} placeholder="optional" /></div>
          <div className="sm:col-span-2"><label className="label">Expires</label><input className="input" type="datetime-local" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
        </div>
        <p className="mt-3 text-sm text-ink/60">Each student earns up to <b className="text-ink">{money(perStudent, l.currency)}</b>. Max spend if every spot completes: <b className="text-ink">{money(l.total_budget ? Math.min(l.total_budget, maxSpend) : maxSpend, l.currency)}</b>{l.total_budget && l.total_budget < maxSpend ? ' (capped)' : ''}.</p>
      </div>

      <div>
        <label className="label">Proof students must submit (+ a photo)</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROOF_FIELDS).map(([k, v]) => {
            const on = l.proof_fields?.includes(k)
            return <button type="button" key={k} onClick={() => set('proof_fields', on ? l.proof_fields!.filter((x) => x !== k) : [...(l.proof_fields ?? []), k])} className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`}>{v.label}</button>
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">Emoji</label><div className="flex flex-wrap gap-1">{EMOJIS.map((e) => <button type="button" key={e} onClick={() => set('emoji', e)} className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${l.emoji === e ? 'bg-ink/10 ring-2 ring-ink' : ''}`}>{e}</button>)}</div></div>
        <div><label className="label">Colour</label><div className="flex gap-2">{(Object.keys(ACCENTS) as Accent[]).map((a) => <button type="button" key={a} onClick={() => set('accent', a)} className={`h-9 w-9 rounded-full ${ACCENTS[a].solid} ${l.accent === a ? 'ring-2 ring-ink ring-offset-2' : ''}`} aria-label={a} />)}</div></div>
        <div><label className="label">Status</label><select className="input" value={l.status} onChange={(e) => set('status', e.target.value as any)}>{['draft', 'live', 'paused', 'closed'].map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div><label className="label">Client <span className="font-normal text-ink/40">(who the work is for)</span></label><input className="input" value={l.client_name ?? ''} onChange={(e) => set('client_name', e.target.value)} /></div>
      <button className="btn-glow w-full" disabled={busy}>{busy ? <Spinner /> : initial.id ? 'Save changes' : 'Publish gig'}</button>
    </form>
  )
}
