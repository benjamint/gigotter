import { Plus, X } from 'lucide-react'
import Photo from '../../components/Photo'
import { FileDrop } from '../../components/Upload'
import { useEffect, useState, type FormEvent } from 'react'
import { AttachmentsEditor, type PendingFile } from '../../components/GigFiles'
import { Spinner, useToast } from '../../components/ui'
import { listingFiles, saveListing, uploadCover, uploadListingFile } from '../../lib/api'
import { coverFor, money } from '../../lib/format'
import { Calendar, Trash2 } from 'lucide-react'
import { formatDay, todayGhana } from '../../lib/sessions'
import { AUDIENCES, CURRENCIES, GENDERS, GIG_TYPES, WORK_STATUSES, type Audience, type Eligibility, type Gender, type GigType, type JoinMode, type Listing, type ListingFile, type PhotoRule, type SessionDay, type WorkStatus } from '../../lib/types'
import { TEMPLATES, keyFor, photoRuleOf, schemaOf } from '../../lib/forms'
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
  // who can take part, and whether people join straight away or apply and get selected
  const [audience, setAudience] = useState<Audience>(initial.audience ?? 'students')
  const [joinMode, setJoinMode] = useState<JoinMode>(initial.join_mode ?? (initial.id ? 'open' : startT.apply ? 'apply' : 'open'))
  const [appRows, setAppRows] = useState(() => toRows(initial.id ? initial.application_schema ?? [] : startT.apply ?? []))
  const [elig, setElig] = useState<Eligibility>(initial.eligibility ?? {})
  const [files, setFiles] = useState<ListingFile[]>([])
  const [pending, setPending] = useState<PendingFile[]>(initialFiles)
  useEffect(() => { if (initialFiles.length) setPending(initialFiles) }, [initialFiles])
  useEffect(() => { if (initial.id) listingFiles(initial.id).then(setFiles).catch(() => {}) }, [initial.id])
  const editRows: typeof setRows = (r) => { setTouched(true); setRows(r) }
  /** Load a type's starter form, unit name, pay model and photo rule. */
  const applyTemplate = (t: GigType) => {
    const T = TEMPLATES[t]
    setRows(toRows(T.fields)); setPhoto(T.photo); setPhotoHint(T.photoHint); setTouched(false)
    if (!initial.id) { setJoinMode(T.apply ? 'apply' : 'open'); setAppRows(toRows(T.apply ?? [])) }
    setL((x) => ({ ...x, type: t, unit_label: T.unit, pay_model: T.pay, requirements: x.requirements?.length && touched ? x.requirements : [...T.requirements],
      ...(T.pay === 'fixed' && !x.id ? { units_per_student: 1 } : {}) }))
  }
  const pickType = (t: GigType) => {
    if (!initial.id && !touched) return applyTemplate(t)
    set('type', t)
  }
  const [exp, setExp] = useState(toLocal(initial.expires_at))
  // scheduled sessions: one check-in per day, each open only on its date
  const [days, setDays] = useState<SessionDay[]>(initial.sessions ?? [])
  const scheduled = days.length > 0
  const nextDate = (after?: string) => { const d = new Date((after ?? todayGhana()) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + (after ? 1 : 7)); return d.toISOString().slice(0, 10) }
  const syncDays = (next: SessionDay[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date))
    setDays(sorted)
    if (sorted.length) {
      setL((x) => ({ ...x, units_per_student: sorted.length }))
      const last = new Date(sorted[sorted.length - 1].date + 'T23:59:00'); last.setDate(last.getDate() + 1)
      setExp(toLocal(last.toISOString()))
    }
  }
  const turnOnSessions = () => {
    syncDays([{ date: nextDate() }])
    set('unit_label', 'day')
    // default daily check-in: a photo + short report, unless the questions were already customised
    if (!touched) {
      setRows(toRows([{ key: keyFor('Brief report of today’s session'), label: 'Brief report of today’s session', type: 'long', required: true, placeholder: 'What happened, what you did, anything notable' }]))
      setPhoto('required'); setPhotoHint('A photo from today’s session')
    }
  }
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
    if (joinMode === 'apply') { const p2 = schemaProblem(appRows, 'none', 'application question'); if (p2) return toast(p2, 'err') }
    if (elig.min_age && elig.max_age && elig.min_age > elig.max_age) return toast('The minimum age is higher than the maximum', 'err')
    if (scheduled && days.some((d) => !d.date)) return toast('Pick a date for every session day', 'err')
    if (scheduled && new Set(days.map((d) => d.date)).size !== days.length) return toast('Two session days have the same date', 'err')
    setBusy(true)
    try {
      const cover_url = cover ? await uploadCover(cover) : l.cover_url ?? null
      const form_schema = toSchema(rows)
      const saved = await saveListing({ ...l, cover_url, form_schema, photo_rule: photo, photo_hint: photo === 'none' ? null : photoHint.trim() || null,
        proof_fields: form_schema.map((f) => f.key), expires_at: new Date(exp).toISOString(),
        audience, join_mode: joinMode, application_schema: joinMode === 'apply' ? toSchema(appRows) : [],
        sessions: days.map((d) => ({ date: d.date, ...(d.label?.trim() ? { label: d.label.trim() } : {}), ...(d.start ? { start: d.start } : {}), ...(d.end ? { end: d.end } : {}) })),
        ...(scheduled ? { units_per_student: days.length } : {}),
        eligibility: Object.fromEntries(Object.entries(elig).filter(([, v]) => (Array.isArray(v) ? v.length : v != null && v !== ''))) })
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

      <div className="rounded-3xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4 text-ink-muted" />Scheduled sessions</div>
            <p className="text-sm text-ink-muted">For gigs on set dates. Each day gets its own check-in that opens only on that date.</p>
          </div>
          <button type="button" role="switch" aria-checked={scheduled} aria-label="Scheduled sessions" onClick={() => (scheduled ? syncDays([]) : turnOnSessions())}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${scheduled ? 'bg-brand-600' : 'bg-line'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${scheduled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {scheduled && (
          <div className="mt-4 space-y-2">
            {days.map((d, i) => (
              <div key={i} className="grid items-center gap-2 rounded-2xl bg-paper p-3 sm:grid-cols-[70px_1fr_1fr_auto_auto_auto]">
                <span className="text-sm font-semibold">Day {i + 1}</span>
                <input className="input bg-white py-2" type="date" required value={d.date} onChange={(e) => syncDays(days.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} aria-label={`Day ${i + 1} date`} />
                <input className="input bg-white py-2" value={d.label ?? ''} maxLength={40} placeholder={`Label (optional), e.g. Prototype day`} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label={`Day ${i + 1} label`} />
                <input className="input bg-white py-2" type="time" value={d.start ?? ''} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} aria-label={`Day ${i + 1} start time`} />
                <input className="input bg-white py-2" type="time" value={d.end ?? ''} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} aria-label={`Day ${i + 1} end time`} />
                <button type="button" onClick={() => syncDays(days.filter((_, j) => j !== i))} aria-label={`Remove day ${i + 1}`} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-white hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => syncDays([...days, { date: nextDate(days[days.length - 1]?.date) }])} disabled={days.length >= 30}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-2.5 text-sm font-medium text-ink-soft hover:border-ink/40">+ Add a day</button>
            <p className="text-xs text-ink-muted">{days.length} day{days.length === 1 ? '' : 's'}: {days.map((d) => formatDay(d.date)).join(', ')}. Each person checks in once per day; pay is per approved day.</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-line bg-white p-4">
        <div className="mb-3 flex gap-2">
          {(['per_unit', 'fixed'] as const).map((m) => <button type="button" key={m} onClick={() => set('pay_model', m)} className={`flex-1 rounded-2xl border p-3 text-left text-sm ${l.pay_model === m ? 'border-ink bg-brand-50' : 'border-line'}`}><b>{scheduled ? (m === 'per_unit' ? 'Pay per day' : 'Total for all days') : m === 'per_unit' ? `Pay per ${l.unit_label || 'unit'}` : 'Fixed per person'}</b><div className="text-xs text-ink-muted">{scheduled ? (m === 'per_unit' ? 'e.g. ₵60 for each day attended' : 'Split equally across the days; each approved day is paid') : m === 'per_unit' ? `e.g. ₵50 per ${l.unit_label || 'salon'}` : 'e.g. ₵80 to attend, ₵300 for the whole job'}</div></button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className="label">Currency</label><select className="input" value={l.currency} onChange={(e) => set('currency', e.target.value)}>{Object.keys(CURRENCIES).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">{scheduled ? (l.pay_model === 'per_unit' ? 'Pay per day' : 'Total pay') : l.pay_model === 'per_unit' ? 'Rate / unit' : 'Pay / person'}</label><input className="input" type="number" min={0} step="0.01" value={l.rate ?? ''} onChange={(e) => set('rate', Number(e.target.value))} /></div>
          <div><label className="label">Unit name</label><input className="input" value={l.unit_label ?? ''} onChange={(e) => set('unit_label', e.target.value)} placeholder="salon, session, test…" /></div>
          <div><label className="label">{scheduled ? 'Days' : 'Units / person'}</label><input className="input" type="number" min={1} disabled={scheduled} value={scheduled ? days.length : l.units_per_student ?? ''} onChange={(e) => set('units_per_student', num(e.target.value))} placeholder="∞" title={scheduled ? 'Set by the number of session days' : undefined} /></div>
          <div><label className="label">Students needed</label><input className="input" type="number" min={1} value={l.slots ?? 1} onChange={(e) => set('slots', Number(e.target.value))} /></div>
          <div><label className="label">Budget cap</label><input className="input" type="number" min={0} value={l.total_budget ?? ''} onChange={(e) => set('total_budget', num(e.target.value))} placeholder="optional" /></div>
          <div className="sm:col-span-2"><label className="label">Expires</label><input className="input" type="datetime-local" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
        </div>
        <p className="mt-3 text-sm text-ink-muted">Each student earns up to <b className="text-ink">{money(perStudent, l.currency)}</b>. Max spend if every spot completes: <b className="text-ink">{money(l.total_budget ? Math.min(l.total_budget, maxSpend) : maxSpend, l.currency)}</b>{l.total_budget && l.total_budget < maxSpend ? ' (capped)' : ''}.</p>
      </div>

      <div className="rounded-3xl border border-line bg-white p-4 sm:p-5">
        <div className="font-semibold">Who can take part</div>
        <p className="text-sm text-ink-muted">Everyone can see the gig, but only these people can join or apply.</p>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Who can take part">
          {(Object.keys(AUDIENCES) as Audience[]).map((a) => (
            <button type="button" role="radio" aria-checked={audience === a} key={a} onClick={() => setAudience(a)}
              className={`rounded-2xl border px-3 py-2.5 text-sm font-medium ${audience === a ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`}>{AUDIENCES[a].label}</button>
          ))}
        </div>
        <div className="mt-5 font-semibold">How people join</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="How people join">
          {([['open', 'First come, first served', 'Anyone eligible joins straight away and starts the work.'], ['apply', 'Apply, and you select', 'People apply with their details and answers. You choose who takes part.']] as const).map(([k, t, d]) => (
            <button type="button" role="radio" aria-checked={joinMode === k} key={k} onClick={() => setJoinMode(k)}
              className={`rounded-2xl border p-3 text-left text-sm ${joinMode === k ? 'border-ink bg-brand-50' : 'border-line hover:border-ink/40'}`}><b>{t}</b><div className="text-xs text-ink-muted">{d}</div></button>
          ))}
        </div>
        {joinMode === 'apply' && (
          <div className="mt-5 space-y-3 rounded-2xl bg-paper p-4">
            <div className="text-sm font-semibold">Who you’re looking for <span className="font-normal text-ink-muted">(optional, shown to applicants and used to filter)</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm"><span className="w-12 shrink-0 text-ink-muted">Age</span>
                <input className="input bg-white py-2" type="number" min={16} max={99} placeholder="min" value={elig.min_age ?? ''} onChange={(e) => setElig({ ...elig, min_age: e.target.value ? Number(e.target.value) : null })} aria-label="Minimum age" />
                <span className="text-ink-muted">to</span>
                <input className="input bg-white py-2" type="number" min={16} max={99} placeholder="max" value={elig.max_age ?? ''} onChange={(e) => setElig({ ...elig, max_age: e.target.value ? Number(e.target.value) : null })} aria-label="Maximum age" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-sm"><span className="mr-1 text-ink-muted">Gender</span>
                {(['female', 'male'] as Gender[]).map((g) => {
                  const on = elig.genders?.includes(g)
                  return <button type="button" key={g} onClick={() => setElig({ ...elig, genders: on ? elig.genders!.filter((x) => x !== g) : [...(elig.genders ?? []), g] })}
                    className={`rounded-full border px-3 py-1.5 ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{GENDERS[g]}</button>
                })}
                <span className="text-xs text-ink-muted">(none = anyone)</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm"><span className="mr-1 text-ink-muted">Work</span>
              {(Object.keys(WORK_STATUSES) as WorkStatus[]).map((w) => {
                const on = elig.work_statuses?.includes(w)
                return <button type="button" key={w} onClick={() => setElig({ ...elig, work_statuses: on ? elig.work_statuses!.filter((x) => x !== w) : [...(elig.work_statuses ?? []), w] })}
                  className={`rounded-full border px-3 py-1.5 ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{WORK_STATUSES[w]}</button>
              })}
            </div>
          </div>
        )}
      </div>

      {joinMode === 'apply' && (
        <FormBuilder rows={appRows} setRows={setAppRows} photo="none" setPhoto={() => {}} photoHint="" setPhotoHint={() => {}} unit={l.unit_label ?? ''} hasResponses={false} noPhoto
          heading="Application questions" intro="What you want to know before choosing someone. Their age, gender, school or occupation is included automatically." />
      )}

      <FormBuilder rows={rows} setRows={editRows} photo={photo} setPhoto={(p) => { setTouched(true); setPhoto(p) }} photoHint={photoHint} setPhotoHint={setPhotoHint}
        unit={l.unit_label ?? ''} hasResponses={hasResponses}
        {...(scheduled ? { heading: 'Daily check-in', intro: 'What each person submits on every session day. Each day’s check-in opens only on its date.' } : {})} />

      <AttachmentsEditor saved={files} setSaved={setFiles} pending={pending} setPending={setPending} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">Status</label><select className="input" value={l.status} onChange={(e) => set('status', e.target.value as any)}>{['draft', 'live', 'paused', 'closed'].map((s) => <option key={s}>{s}</option>)}</select></div>
      </div>
      <div><label className="label">Client <span className="font-normal text-ink-muted">(who the work is for)</span></label><input className="input" value={l.client_name ?? ''} onChange={(e) => set('client_name', e.target.value)} /></div>
      <button className="btn-brand w-full" disabled={busy}>{busy ? <><Spinner />{pending.length ? 'Uploading files…' : 'Saving…'}</> : l.id ? 'Save changes' : 'Publish gig'}</button>
    </form>
  )
}
