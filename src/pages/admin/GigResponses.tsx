import { motion } from 'framer-motion'
import { ArrowLeft, Check, Download, ImageIcon, Inbox, MapPin, Phone, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { mapsUrl } from '../../components/AddressField'
import Photo from '../../components/Photo'
import { Empty, Modal, PageLoader, Spinner, SubPill, useToast } from '../../components/ui'
import { admin, fileUrl, getListing } from '../../lib/api'
import { ago, coverFor, money, payLine, timeLeft } from '../../lib/format'
import { csvCell } from '../../lib/security'
import { useAsync, useSession } from '../../lib/session'
import { displayValue, labelFor, schemaOf, subTitle } from '../../lib/forms'
import { type Listing, type Profile, type Submission, type SubmissionStatus } from '../../lib/types'

const STATUSES: (SubmissionStatus | 'all')[] = ['all', 'pending', 'approved', 'paid', 'rejected']
const initials = (n?: string | null) => (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

export default function GigResponses() {
  const { id } = useParams()
  const { profile, loading } = useSession()
  const toast = useToast()
  const data = useAsync(async () => {
    const [listing, subs, claims, profiles] = await Promise.all([getListing(id!), admin.submissions(), admin.claims(), admin.profiles()])
    return { listing, subs: subs.filter((s) => s.listing_id === id), claims: claims.filter((c) => c.listing_id === id), profiles }
  }, [id])
  const [student, setStudent] = useState<string | 'all'>('all')
  const [status, setStatus] = useState<SubmissionStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [proof, setProof] = useState<string | null>(null)

  const d = data.data
  const people = useMemo(() => {
    if (!d) return []
    const ids = new Set([...d.claims.map((c) => c.student_id), ...d.subs.map((s) => s.student_id)])
    return [...ids].map((sid) => {
      const p = d.profiles.find((x) => x.id === sid)
      const mine = d.subs.filter((s) => s.student_id === sid)
      const claim = d.claims.find((c) => c.student_id === sid)
      return { id: sid, p, total: mine.length, pending: mine.filter((s) => s.status === 'pending').length, claimStatus: claim?.status }
    }).sort((a, b) => b.pending - a.pending || b.total - a.total)
  }, [d])

  if (loading || data.loading) return <PageLoader />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  if (!d?.listing) return <div className="container-x max-w-xl py-20"><Empty title="Gig not found" action={<Link to="/admin?tab=gigs" className="btn-primary">Back to gigs</Link>} /></div>
  const l = d.listing

  const list = d.subs.filter((s) =>
    (student === 'all' || s.student_id === student) &&
    (status === 'all' || s.status === status) &&
    (!q || JSON.stringify(s.data).toLowerCase().includes(q.toLowerCase()) || (s.student?.full_name ?? '').toLowerCase().includes(q.toLowerCase())))
  const count = (st: SubmissionStatus) => d.subs.filter((s) => s.status === st).length
  const used = d.subs.filter((s) => s.status !== 'rejected').reduce((a, s) => a + (s.amount ?? 0), 0)
  const budget = l.total_budget ?? (l.pay_model === 'per_unit' ? l.rate * (l.units_per_student ?? 0) * l.slots : l.rate * l.slots)
  const t = timeLeft(l.expires_at)
  const pendingShown = list.filter((s) => s.status === 'pending')

  const review = async (ids: string[], st: SubmissionStatus, note?: string) => {
    await admin.review(ids, st, note ? { admin_note: note } : {})
    toast(`${ids.length} ${ids.length === 1 ? 'response' : 'responses'} ${st} — student${ids.length === 1 ? '' : 's'} emailed`)
    data.reload()
  }

  const exportCsv = () => {
    const schema = schemaOf(l)
    const fields = [...new Set([...schema.map((f) => f.key), ...d.subs.flatMap((s) => Object.keys(s.data))])]
    const header = ['submitted_at', 'student', 'status', 'amount', ...fields.map((k) => labelFor(schema, k)), 'map_link']
    const rows = list.map((s) => [
      new Date(s.created_at).toISOString(), s.student?.full_name ?? '', s.status, s.amount ?? '',
      ...fields.map((f) => s.data[f] ?? ''), mapsUrl(s.data.gps, addrOf(schema, s.data)) ?? '',
    ])
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = `${l.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-responses.csv`
    a.click()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/admin?tab=gigs" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All gigs</Link>

      {/* header */}
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Photo src={coverFor(l)} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
          <div>
            <div className="eyebrow">Responses</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tightest md:text-3xl">{l.title}</h1>
            <div className="mt-1 text-sm text-ink-muted">{l.client_name && `${l.client_name} · `}{payLine(l)} · {t.expired ? 'Closed' : t.label}</div>
          </div>
        </div>
        <button onClick={exportCsv} disabled={!list.length} className="btn-ghost btn-sm self-start md:self-auto"><Download className="h-4 w-4" />Export {list.length} to spreadsheet</button>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Students joined', `${d.claims.filter((c) => c.status !== 'withdrawn').length} / ${l.slots}`],
          ['Responses', d.subs.length],
          ['To review', count('pending')],
          ['Approved', count('approved')],
          ['Paid', count('paid')],
          ['Budget used', `${money(used, l.currency)} / ${money(budget, l.currency)}`],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-white px-4 py-4"><div className="text-xs text-ink-muted">{k}</div><div className="figure mt-1 text-2xl leading-tight">{v}</div></div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* students */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Students</div>
            <div className="max-h-[60vh] overflow-y-auto">
              <StudentRow active={student === 'all'} onClick={() => setStudent('all')} name="All students" sub={`${people.length} joined`} total={d.subs.length} pending={count('pending')} />
              {people.map((x) => (
                <StudentRow key={x.id} active={student === x.id} onClick={() => setStudent(x.id)} name={x.p?.full_name || x.p?.email || 'Unknown'}
                  sub={[x.p?.school, x.claimStatus === 'withdrawn' ? 'withdrew' : null].filter(Boolean).join(' · ') || '—'} total={x.total} pending={x.pending} avatar={initials(x.p?.full_name)} />
              ))}
              {!people.length && <p className="px-4 py-6 text-sm text-ink-muted">No one has joined yet.</p>}
            </div>
          </div>
        </aside>

        {/* responses */}
        <section>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const n = s === 'all' ? d.subs.length : count(s)
                return <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1.5 text-sm capitalize ${status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30'}`}>{s === 'pending' ? 'To review' : s} ({n})</button>
              })}
            </div>
            <div className="relative md:w-64">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input className="input py-2 pl-10 text-sm" placeholder="Search responses…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {pendingShown.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{pendingShown.length} responses here are waiting for review.</span>
              <button onClick={() => { if (confirm(`Approve all ${pendingShown.length} responses shown?`)) review(pendingShown.map((s) => s.id), 'approved') }} className="btn btn-sm bg-brand-600 px-4 text-white hover:bg-brand-700"><Check className="h-4 w-4" />Approve all {pendingShown.length}</button>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {list.map((s, i) => <ResponseCard key={s.id} s={s} l={l} i={i} onReview={review} onProof={setProof} />)}
            {!list.length && <Empty icon={<Inbox className="h-5 w-5" />} title={d.subs.length ? 'No responses match' : 'No responses yet'} body={d.subs.length ? 'Try another filter or search.' : 'When students submit work for this gig, it will appear here.'} />}
          </div>
        </section>
      </div>

      <Modal open={!!proof} onClose={() => setProof(null)} wide>{proof && <img src={proof} alt="Proof" className="mt-6 max-h-[75vh] w-full rounded-2xl object-contain" />}</Modal>
    </div>
  )
}

function StudentRow({ active, onClick, name, sub, total, pending, avatar }: { active: boolean; onClick: () => void; name: string; sub: string; total: number; pending: number; avatar?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 ${active ? 'bg-brand-50' : 'hover:bg-paper'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatar ? 'bg-sand text-ink-soft' : 'bg-ink text-white'}`}>{avatar ?? <Inbox className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{name}</span><span className="block truncate text-xs text-ink-muted">{sub}</span></span>
      <span className="text-right text-xs"><span className="block font-semibold">{total}</span>{pending > 0 && <span className="block text-amber-700">{pending} new</span>}</span>
    </button>
  )
}

function ResponseCard({ s, l, i, onReview, onProof }: { s: Submission; l: Listing; i: number; onReview: (ids: string[], st: SubmissionStatus, note?: string) => Promise<void>; onProof: (url: string) => void }) {
  const [thumb, setThumb] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { let on = true; if (s.proof_path) fileUrl('proofs', s.proof_path).then((u) => on && setThumb(u)); return () => { on = false } }, [s.proof_path])

  const schema = schemaOf(l)
  const addrKey = schema.find((f) => f.type === 'address')?.key
  const fields = [...new Set([...schema.map((f) => f.key), ...Object.keys(s.data)])].filter((k) => !['gps', 'gps_accuracy', addrKey].includes(k))
  const title = subTitle(s, schema, `Response ${i + 1}`)
  const addr = addrOf(schema, s.data)
  const map = mapsUrl(s.data.gps, addr)
  const act = async (st: SubmissionStatus, n?: string) => { setBusy(true); try { await onReview([s.id], st, n) } finally { setBusy(false) } }

  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">by <b className="font-medium text-ink">{s.student?.full_name || 'Unknown student'}</b> · {ago(s.created_at)} · {new Date(s.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex items-center gap-3"><span className="font-semibold">{money(s.amount, l.currency)}</span><SubPill s={s.status} /></div>
      </header>

      <div className="grid gap-5 p-5 md:grid-cols-[1fr_180px]">
        <div className="space-y-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {fields.map((k) => (
              <div key={k} className={schema.find((f) => f.key === k)?.type === 'long' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs text-ink-muted">{labelFor(schema, k)}</dt>
                <dd className="mt-0.5 whitespace-pre-line break-words font-medium">
                  {(() => {
                    const f = schema.find((x) => x.key === k), v = s.data[k]
                    if (!v) return <span className="font-normal text-ink-muted">—</span>
                    if (f?.type === 'phone') return <a href={`tel:${v.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-brand-600"><Phone className="h-3.5 w-3.5" />{v}</a>
                    if (f?.type === 'email') return <a href={`mailto:${v}`} className="hover:text-brand-600">{v}</a>
                    if (f?.type === 'link' && /^https?:\/\//i.test(v)) return <a href={v} target="_blank" rel="noreferrer noopener" className="text-brand-600 underline underline-offset-2">{v}</a>
                    return displayValue(f, v)
                  })()}
                </dd>
              </div>
            ))}
          </dl>
          {(addr || s.data.gps) && (
            <div className="rounded-xl bg-paper p-4 text-sm">
              <div className="flex items-center gap-1.5 text-xs text-ink-muted"><MapPin className="h-3.5 w-3.5" />Address</div>
              <p className="mt-1 whitespace-pre-line font-medium">{addr || '—'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {s.data.gps ? <span className="text-brand-700">GPS pin {s.data.gps}{s.data.gps_accuracy ? ` (±${s.data.gps_accuracy} m)` : ''}</span> : <span className="text-ink-muted">No GPS pin — address only</span>}
                {map && <a href={map} target="_blank" rel="noreferrer" className="font-medium text-brand-600 underline underline-offset-2">Open in Google Maps</a>}
              </div>
            </div>
          )}
          {s.admin_note && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><b className="font-medium">Note to student:</b> {s.admin_note}</p>}
          {s.payout_ref && <p className="text-xs text-ink-muted">Payout reference: {s.payout_ref}</p>}
        </div>
        <button onClick={() => thumb && onProof(thumb)} disabled={!thumb} className="group relative aspect-square overflow-hidden rounded-xl bg-sand md:aspect-[4/5]">
          {thumb ? <img src={thumb} alt="Proof" className="h-full w-full object-cover transition group-hover:scale-105" />
            : <span className="grid h-full place-items-center text-xs text-ink-muted">{s.proof_path ? <Spinner /> : <span className="flex flex-col items-center gap-1"><ImageIcon className="h-5 w-5" />No photo</span>}</span>}
          {thumb && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium">Tap to enlarge</span>}
        </button>
      </div>

      {s.status === 'pending' && (
        <footer className="border-t border-line bg-paper/60 px-5 py-3">
          {rejecting ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input autoFocus className="input py-2 text-sm" maxLength={300} placeholder="Why? The student will see this (e.g. phone number doesn’t work)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="btn-ghost btn-sm">Cancel</button>
                <button onClick={() => act('rejected', note.trim() || undefined)} disabled={busy} className="btn btn-sm bg-red-600 px-4 text-white hover:bg-red-700">{busy ? <Spinner /> : 'Reject'}</button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejecting(true)} className="btn-ghost btn-sm"><X className="h-4 w-4" />Reject</button>
              <button onClick={() => act('approved')} disabled={busy} className="btn btn-sm bg-brand-600 px-5 text-white hover:bg-brand-700">{busy ? <Spinner /> : <><Check className="h-4 w-4" />Approve</>}</button>
            </div>
          )}
        </footer>
      )}
    </motion.article>
  )
}

/** The answer to the gig's address question, if it has one. */
const addrOf = (schema: { key: string; type: string }[], data: Record<string, string>) => { const k = schema.find((f) => f.type === 'address')?.key; return k ? data[k] : data.location }
