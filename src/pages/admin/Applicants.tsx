import { Check, Search, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Empty, PageLoader, Spinner, useToast } from '../../components/ui'
import { admin } from '../../lib/api'
import { accountOf, ageOf, eligibilityMisses, eligibilityText } from '../../lib/audience'
import { ago } from '../../lib/format'
import { displayValue } from '../../lib/forms'
import { useAsync } from '../../lib/session'
import { GENDERS, WORK_STATUSES, type Application, type ApplicationStatus, type Listing } from '../../lib/types'

const TABS: { k: ApplicationStatus | 'all'; label: string }[] = [
  { k: 'applied', label: 'New' }, { k: 'shortlisted', label: 'Shortlisted' }, { k: 'accepted', label: 'Selected' }, { k: 'declined', label: 'Declined' }, { k: 'all', label: 'All' },
]
const STYLE: Record<ApplicationStatus, string> = { applied: 'bg-sand text-ink-soft', shortlisted: 'bg-amber-50 text-amber-800', accepted: 'bg-brand-50 text-brand-700', declined: 'bg-red-50 text-red-700', withdrawn: 'bg-sand text-ink-muted' }
const LABEL: Record<ApplicationStatus, string> = { applied: 'New', shortlisted: 'Shortlisted', accepted: 'Selected', declined: 'Declined', withdrawn: 'Withdrew' }

/** Applicants for an apply-and-select gig: review profiles and answers, then shortlist, select or decline. */
export default function Applicants({ listing, onChanged }: { listing: Listing; onChanged: () => void }) {
  const toast = useToast()
  const data = useAsync(() => admin.applications(listing.id), [listing.id])
  const [tab, setTab] = useState<ApplicationStatus | 'all'>('applied')
  const [q, setQ] = useState('')
  const [matchOnly, setMatchOnly] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const apps = data.data ?? []
  const qs = listing.application_schema ?? []
  const selected = apps.filter((a) => a.status === 'accepted').length
  const criteria = eligibilityText(listing.eligibility)

  const list = useMemo(() => apps.filter((a) => {
    if (a.status === 'withdrawn' && tab !== 'all') return false
    if (tab !== 'all' && a.status !== tab) return false
    if (matchOnly && a.applicant && eligibilityMisses(listing.eligibility, a.applicant).length) return false
    if (q) { const hay = `${a.applicant?.full_name} ${a.applicant?.school} ${a.applicant?.occupation} ${a.applicant?.city} ${Object.values(a.answers).join(' ')}`.toLowerCase(); if (!hay.includes(q.toLowerCase())) return false }
    return true
  }), [apps, tab, q, matchOnly, listing.eligibility])

  const decide = async (ids: string[], status: ApplicationStatus) => {
    let note: string | undefined
    if (status === 'declined') { const n = prompt('Optional message to include in the email (leave blank for none):'); if (n === null) return; note = n }
    if (status === 'accepted') { const n = prompt('Optional details to include in their “You’re selected” email (date, time, place):'); if (n === null) return; note = n }
    setBusy(true)
    try {
      const n = await admin.decideApplications(ids, status, note)
      toast(status === 'accepted' ? `${n} selected and emailed. They can now open the gig` : status === 'declined' ? `${n} declined and emailed` : `${n} ${LABEL[status].toLowerCase()}`)
      setPicked([]); data.reload(); onChanged()
    } catch (e: any) { toast(e.message, 'err') } finally { setBusy(false) }
  }

  if (data.loading && !data.data) return <PageLoader />
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const n = t.k === 'all' ? apps.length : apps.filter((a) => a.status === t.k).length
            return <button key={t.k} onClick={() => { setTab(t.k); setPicked([]) }} className={`rounded-full border px-3 py-1.5 text-sm ${tab === t.k ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30'}`}>{t.label} ({n})</button>
          })}
        </div>
        <div className="text-sm text-ink-muted"><b className="text-ink">{selected}</b> of {listing.slots} places filled</div>
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" /><input className="input py-2 pl-10 text-sm" placeholder="Search names, answers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {criteria && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={matchOnly} onChange={(e) => setMatchOnly(e.target.checked)} />Only people who match: <span className="text-ink-muted">{criteria}</span></label>}
        {picked.length > 0 && (
          <div className="flex flex-wrap gap-2 md:ml-auto">
            <button disabled={busy} onClick={() => decide(picked, 'shortlisted')} className="btn-ghost btn-sm"><Star className="h-4 w-4" />Shortlist {picked.length}</button>
            <button disabled={busy} onClick={() => decide(picked, 'declined')} className="btn-ghost btn-sm"><X className="h-4 w-4" />Decline {picked.length}</button>
            <button disabled={busy} onClick={() => decide(picked, 'accepted')} className="btn-brand btn-sm">{busy ? <Spinner /> : <Check className="h-4 w-4" />}Select {picked.length}</button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {!list.length && <Empty title={apps.length ? 'No one here' : 'No applications yet'} body={apps.length ? 'Try another tab or filter.' : 'When people apply to this gig, they’ll appear here for you to choose from.'} />}
        {list.map((a) => <ApplicantCard key={a.id} a={a} listing={listing} qs={qs} picked={picked.includes(a.id)} busy={busy}
          onPick={(on) => setPicked(on ? [...picked, a.id] : picked.filter((x) => x !== a.id))} onDecide={(st) => decide([a.id], st)} />)}
      </div>
    </div>
  )
}

function ApplicantCard({ a, listing, qs, picked, busy, onPick, onDecide }: {
  a: Application; listing: Listing; qs: Listing['application_schema']; picked: boolean; busy: boolean; onPick: (on: boolean) => void; onDecide: (s: ApplicationStatus) => void
}) {
  const p = a.applicant
  const age = ageOf(p?.date_of_birth)
  const misses = p ? eligibilityMisses(listing.eligibility, p) : []
  const general = accountOf(p) === 'general'
  const facts = [age != null ? `${age} yrs` : null, p?.gender ? GENDERS[p.gender] : null,
    general ? [p?.occupation, p?.work_status && WORK_STATUSES[p.work_status]].filter(Boolean).join(', ') : [p?.school, p?.programme].filter(Boolean).join(', '), p?.city].filter(Boolean)
  return (
    <article className={`card p-5 ${picked ? 'ring-2 ring-brand-500' : ''}`}>
      <div className="flex flex-wrap items-start gap-3">
        {a.status !== 'withdrawn' && <input type="checkbox" className="mt-1.5 h-4 w-4 accent-brand-600" checked={picked} onChange={(e) => onPick(e.target.checked)} aria-label={`Select ${p?.full_name}`} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{p?.full_name || 'Unknown'}</h3>
            <span className={`chip ${STYLE[a.status]}`}>{LABEL[a.status]}</span>
            <span className={`chip ${general ? 'bg-[#e8eedd] text-[#46602c]' : 'bg-white ring-1 ring-line'}`}>{general ? 'Non-student' : 'Student'}</span>
            {misses.length > 0 && <span className="chip bg-amber-50 text-amber-800">Outside criteria: {misses.join(', ')}</span>}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{facts.join(' · ') || '—'} · applied {ago(a.created_at)}</p>
        </div>
        {a.status !== 'withdrawn' && (
          <div className="flex gap-1.5">
            {a.status !== 'shortlisted' && a.status !== 'accepted' && <button disabled={busy} onClick={() => onDecide('shortlisted')} className="btn-ghost btn-sm" title="Shortlist"><Star className="h-4 w-4" /></button>}
            {a.status !== 'declined' && <button disabled={busy} onClick={() => onDecide('declined')} className="btn-ghost btn-sm">Decline</button>}
            {a.status !== 'accepted' && <button disabled={busy} onClick={() => onDecide('accepted')} className="btn-brand btn-sm">Select</button>}
          </div>
        )}
      </div>
      {(qs ?? []).length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-2xl bg-paper p-4 text-sm sm:grid-cols-2">
          {(qs ?? []).map((f) => (
            <div key={f.key} className={f.type === 'long' ? 'sm:col-span-2' : ''}>
              <dt className="text-xs text-ink-muted">{f.label}</dt>
              <dd className="mt-0.5 whitespace-pre-line break-words font-medium">{displayValue(f, a.answers[f.key]) || <span className="font-normal text-ink-muted">—</span>}</dd>
            </div>
          ))}
        </dl>
      )}
      {a.admin_note && <p className="mt-3 text-xs text-ink-muted">Note sent: {a.admin_note}</p>}
    </article>
  )
}
