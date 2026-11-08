import { Plus, X } from 'lucide-react'
import Photo from '../../components/Photo'
import { FileDrop } from '../../components/Upload'
import { useEffect, useState, type FormEvent } from 'react'
import { AttachmentsEditor, type PendingFile } from '../../components/GigFiles'
import { Spinner, useToast } from '../../components/ui'
import { listingFiles, saveListing, uploadCover, uploadListingFile } from '../../lib/api'
import { coverFor, money } from '../../lib/format'
import { CURRENCIES, GIG_TYPES, type GigType, type Listing, type ListingFile, type PhotoRule } from '../../lib/types'
import { TEMPLATES, photoRuleOf, schemaOf } from '../../lib/forms'
import FormBuilder, { schemaProblem, toRows, toSchema } from './FormBuilder'

const toLocal = (iso?: string) => { const d = iso ? new Date(iso) : new Date(Date.now() + 14 * 864e5); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

export default function ListingForm({ initial, onSaved, hasResponses = false, initialFiles = [], heading }: {
  initial: Partial<Listing>; onSaved: (saved: Listing) => void; hasResponses?: boolean
  /** files to attach on save (e.g. from a business brief) */
  initialFiles?: PendingFile[]; heading?: string
}) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [l, setL] = useState<Partial<Listing>>({
    type: 'onboarding', pay_model: 'per_unit', rate: 50, unit_label: 'business', units_per_student: 10, slots: 5, currency: 'GHS',
    status: 'live', requirements: [...TEMPLATES.onboarding.requirements], is_remote: false, client_name: '', ...initial,
  })
  const startT = TEMPLATES[(initial.type ?? 'onboarding') as GigType]
  const [rows, setRows] = useState(() => toRows(initial.id ? schemaOf({ form_schema: initial.form_schema ?? [], proof_fields: initial.proof_fields ?? [] }) : startT.fields))
  const [photo, setPhoto] = useState<PhotoRule>(initial.id ? photoRuleOf({ photo_rule: initial.photo_rule as PhotoRule }) : startT.photo)
  const [photoHint, setPhotoHint] = useState(initial.id ? initial.photo_hint ?? '' : startT.photoHint)
  const [touched, setTouched] = useState(false)
  const [files, setFiles] = useState<ListingFile[]>([])
  const [pending, setPending] = useState<PendingFile[]>(initialFiles)
  useEffect(() => { if (initialFiles.length) setPending(initialFiles) }, [initialFiles])
  useEffect(() => { if (initial.id) listingFiles(initial.id).then(setFiles).catch(() => {}) }, [initial.id])
  const editRows: typeof setRows = (r) => { setTouched(true); setRows(r) }
  /** Load a type's starter form, unit name, pay model and photo rule. */
  const applyTemplate = (t: GigType) => {
    const T = TEMPLATES[t]
    setRows(toRows(T.fields)); setPhoto(T.photo); setPhotoHint(T.photoHint); setTouched(false)
    setL((x) => ({ ...x, type: t, unit_label: T.unit, pay_model: T.pay, requirements: x.requirements?.length && touched ? x.requirements : [...T.requirements],
      ...(T.pay === 'fixed' && !x.id ? { units_per_student: 1 } : {}) }))
  }
  const pickType = (t: GigType) => {
    if (!initial.id && !touched) return applyTemplate(t)
    set('type', t)
  }
  const [exp, setExp] = useState(toLocal(initial.expires_at))
  const [req, setReq] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const set = <K extends keyof Listing>(k: K, v: Listing[K]) => setL((x) => ({ ...x, [k]: v }))
  const num = (v: string) => (v === '' ? null : Number(v))

  const perStudent = l.pay_model === 'per_unit' ? (l.rate ?? 0) * (l.units_per_student ?? 0) : (l.rate ?? 0)
  const maxSpend = perStudent * (l.slots ?? 1)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!l.title) return toast('Give it a title', 'err')
    const problem = schemaProblem(rows, photo)
    if (problem) return toast(problem, 'err')
    setBusy(true)
    try {
      const cover_url = cover ? await uploadCover(cover) : l.cover_url ?? null
      const form_schema = toSchema(rows)
      const saved = await saveListing({ ...l, cover_url, form_schema, photo_rule: photo, photo_hint: photo === 'none' ? null : photoHint.trim() || null,
        proof_fields: form_schema.map((f) => f.key), expires_at: new Date(exp).toISOString() })
      // the gig exists now, so its files can be attached
      const failed: string[] = []
      for (const p of pending) { try { await uploadListingFile(saved.id, p.file, p.visibility) } catch (e: any) { failed.push(`${p.file.name}: ${e.message}`) } }
      if (failed.length) { setL(saved); setPending([]); listingFiles(saved.id).then(setFiles); return toast(`Gig saved, but ${failed.length} file(s) didn’t upload — ${failed[0]}`, 'err') }
      onSaved(saved)
    }
    catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-2xl font-semibold tracking-tight">{heading ?? (initial.id ? 'Edit gig' : 'New gig')}</h2>
      <div>
        <label className="label">Cover photo <span className="font-normal text-ink-muted">(optional — a default is used per gig type)</span></label>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <FileDrop label="Upload a cover photo" hint="Landscape works best, ~1600px wide" file={cover} onFile={setCover} />
          {!cover && <Photo src={coverFor({ cover_url: l.cover_url ?? null, type: l.type ?? 'onboarding' })} alt="Current cover" label="Default cover" className="hidden min-h-[11rem] rounded-2xl sm:block" />}
        </div>
      </div>
      <div>
        <label className="label">Kind of work</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GIG_TYPES).map(([k, v]) => (
            <button type="button" key={k} onClick={() => pickType(k as GigType)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${l.type === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`}>{v.label}</button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          {TEMPLATES[(l.type ?? 'other') as GigType].blurb}{' '}
          {(initial.id || touched) && <button type="button" onClick={() => { if (confirm('Replace the questions below with the starter form for this kind of work?')) applyTemplate(l.type as GigType) }} className="font-medium text-brand-600 underline underline-offset-2">Use the {GIG_TYPES[l.type as GigType].label.toLowerCase()} starter form</button>}
        </p>
      </div>
      <div><label className="label">Title</label><input className="input" value={l.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Onboard 30 women-owned salons" /></div>
      <div><label className="label">One-liner <span className="font-normal text-ink-muted">(shows on the card)</span></label><input className="input" value={l.summary ?? ''} onChange={(e) => set('summary', e.target.value)} placeholder="Walk in, pitch Glowy in 2 mins, get paid." /></div>
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
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!l.is_remote} onChange={(e) => set('is_remote', e.target.checked)} />Remote / anywhere</label>
      </div>

      <div className="rounded-3xl border border-line bg-white p-4">
        <div className="mb-3 flex gap-2">
          {(['per_unit', 'fixed'] as const).map((m) => <button type="button" key={m} onClick={() => set('pay_model', m)} className={`flex-1 rounded-2xl border p-3 text-left text-sm ${l.pay_model === m ? 'border-ink bg-brand-50' : 'border-line'}`}><b>{m === 'per_unit' ? `Pay per ${l.unit_label || 'unit'}` : 'Fixed per student'}</b><div className="text-xs text-ink-muted">{m === 'per_unit' ? `e.g. ₵50 per ${l.unit_label || 'salon'}` : 'e.g. ₵80 to attend, ₵300 for the whole job'}</div></button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className="label">Currency</label><select className="input" value={l.currency} onChange={(e) => set('currency', e.target.value)}>{Object.keys(CURRENCIES).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">{l.pay_model === 'per_unit' ? 'Rate / unit' : 'Pay / student'}</label><input className="input" type="number" min={0} step="0.01" value={l.rate ?? ''} onChange={(e) => set('rate', Number(e.target.value))} /></div>
          <div><label className="label">Unit name</label><input className="input" value={l.unit_label ?? ''} onChange={(e) => set('unit_label', e.target.value)} placeholder="salon, session, test…" /></div>
          <div><label className="label">Units / student</label><input className="input" type="number" min={1} value={l.units_per_student ?? ''} onChange={(e) => set('units_per_student', num(e.target.value))} placeholder="∞" /></div>
          <div><label className="label">Students needed</label><input className="input" type="number" min={1} value={l.slots ?? 1} onChange={(e) => set('slots', Number(e.target.value))} /></div>
          <div><label className="label">Budget cap</label><input className="input" type="number" min={0} value={l.total_budget ?? ''} onChange={(e) => set('total_budget', num(e.target.value))} placeholder="optional" /></div>
          <div className="sm:col-span-2"><label className="label">Expires</label><input className="input" type="datetime-local" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
        </div>
        <p className="mt-3 text-sm text-ink-muted">Each student earns up to <b className="text-ink">{money(perStudent, l.currency)}</b>. Max spend if every spot completes: <b className="text-ink">{money(l.total_budget ? Math.min(l.total_budget, maxSpend) : maxSpend, l.currency)}</b>{l.total_budget && l.total_budget < maxSpend ? ' (capped)' : ''}.</p>
      </div>

      <FormBuilder rows={rows} setRows={editRows} photo={photo} setPhoto={(p) => { setTouched(true); setPhoto(p) }} photoHint={photoHint} setPhotoHint={setPhotoHint}
        unit={l.unit_label ?? ''} hasResponses={hasResponses} />

      <AttachmentsEditor saved={files} setSaved={setFiles} pending={pending} setPending={setPending} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">Status</label><select className="input" value={l.status} onChange={(e) => set('status', e.target.value as any)}>{['draft', 'live', 'paused', 'closed'].map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div><label className="label">Client <span className="font-normal text-ink-muted">(who the work is for)</span></label><input className="input" value={l.client_name ?? ''} onChange={(e) => set('client_name', e.target.value)} /></div>
      <button className="btn-brand w-full" disabled={busy}>{busy ? <><Spinner />{pending.length ? 'Uploading files…' : 'Saving…'}</> : l.id ? 'Save changes' : 'Publish gig'}</button>
    </form>
  )
}
