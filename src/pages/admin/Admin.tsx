import { motion } from 'framer-motion'
import { ArrowRight, Check, Download, Edit3, Inbox, LayoutGrid, Mail, MailWarning, Plus, QrCode, Quote, Trash2, Users, Wallet, X, Briefcase } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { CountUp, Empty, KycPill, Modal, PageLoader, Spinner, SubPill, useToast } from '../../components/ui'
import { admin, deleteListing, deleteTestimonial, fileUrl, listListings, listTestimonials, saveTestimonial } from '../../lib/api'
import Photo from '../../components/Photo'
import { ago, coverFor, money, payLine, spotsLeft, timeLeft, plural } from '../../lib/format'
import { useAsync, useSession } from '../../lib/session'
import { GENDERS, WORK_STATUSES, type KycStatus, type Listing, type Payment, type Profile, type Submission } from '../../lib/types'
import { accountOf, ageOf } from '../../lib/audience'
import ListingForm from './ListingForm'
import QrCodes from './QrCodes'
import Briefs from './Briefs'
import { subTitle } from '../../lib/forms'
import { csvCell } from '../../lib/security'

const TABS = [
  { k: 'overview', l: 'Overview', i: LayoutGrid },
  { k: 'students', l: 'Students', i: Users },
  { k: 'gigs', l: 'Gigs', i: Briefcase },
  { k: 'work', l: 'Work & payouts', i: Wallet },
  { k: 'briefs', l: 'Briefs', i: Inbox },
  { k: 'testimonials', l: 'Testimonials', i: Quote },
  { k: 'qr', l: 'QR codes', i: QrCode },
] as const
type Tab = (typeof TABS)[number]['k']

export default function Admin() {
  const { profile, loading } = useSession()
  const [sp, setSp] = useSearchParams()
  const tab = (TABS.some((t) => t.k === sp.get('tab')) ? sp.get('tab') : 'overview') as Tab
  const setTab = (t: Tab) => setSp(t === 'overview' ? {} : { tab: t }, { replace: true })
  const data = useAsync(async () => {
    const [profiles, listings, subs, requests, claims, payments] = await Promise.all([admin.profiles(), listListings({ all: true }), admin.submissions(), admin.requests(), admin.claims(), admin.allPayments()])
    return { profiles: profiles.filter((p) => p.role !== 'admin'), listings, subs, requests, claims, payments }
  }, [])
  if (loading) return <PageLoader />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  const d = data.data
  const badge: Partial<Record<Tab, number>> = d ? {
    students: d.profiles.filter((p) => p.kyc_status === 'pending').length,
    work: d.subs.filter((s) => s.status === 'pending').length,
    briefs: d.requests.filter((r) => r.status === 'new').length,
  } : {}

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 md:pt-14 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="eyebrow">Admin</div><h1 className="mt-4 text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.04em]">Control <span className="em">room</span></h1></div>
      </div>
      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${tab === t.k ? 'border-brand-700 text-white' : 'border-line bg-white hover:border-ink'}`}>
            {tab === t.k && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-brand-700" />}
            <t.i className="relative h-4 w-4" /><span className="relative">{t.l}</span>
            {!!badge[t.k] && <span className="relative grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-brand-600 px-1 text-[11px] text-white">{badge[t.k]}</span>}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {!d ? <PageLoader /> : (
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'overview' && <Overview d={d} go={setTab} />}
            {tab === 'students' && <Students profiles={d.profiles} reload={data.reload} />}
            {tab === 'gigs' && <Gigs listings={d.listings} subs={d.subs} reload={data.reload} />}
            {tab === 'work' && <Work subs={d.subs} reload={data.reload} />}
            {tab === 'briefs' && <Briefs reqs={d.requests} reload={data.reload} />}
            {tab === 'testimonials' && <Testimonials />}
            {tab === 'qr' && <QrCodes />}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ═════════════ overview ═════════════
function Overview({ d, go }: { d: any; go: (t: Tab) => void }) {
  const p: Profile[] = d.profiles, subs: Submission[] = d.subs, ls: Listing[] = d.listings
  const days = 14
  const series = useMemo(() => Array.from({ length: days }, (_, i) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (days - 1 - i))
    const next = new Date(day); next.setDate(day.getDate() + 1)
    return { day, n: p.filter((x) => { const c = new Date(x.created_at); return c >= day && c < next }).length }
  }), [p])
  const peak = Math.max(1, ...series.map((s) => s.n))
  const week = series.slice(-7).reduce((a, s) => a + s.n, 0)
  const owed = subs.filter((s) => s.status === 'approved')
  const paid = subs.filter((s) => s.status === 'paid')
  const total = (rows: { currency: string; amount: number }[]) => Object.entries(rows.reduce<Record<string, number>>((a, r) => { a[r.currency] = (a[r.currency] ?? 0) + r.amount; return a }, {}))
    .map(([c, v]) => money(v, c)).join(' · ') || money(0)
  const byCur = (xs: Submission[]) => total(xs.map((s) => ({ currency: s.listing?.currency ?? 'GHS', amount: Number(s.amount ?? 0) })))
  // Paid out = what you actually sent: recorded payments (which can include bonuses or part-payments),
  // plus work marked paid the old way, without a receipt (counted at its submission value)
  const payments: Payment[] = d.payments ?? []
  const paidOut = total([...payments.map((x) => ({ currency: x.currency, amount: Number(x.amount) })),
    ...paid.filter((s) => !s.payment_id).map((s) => ({ currency: s.listing?.currency ?? 'GHS', amount: Number(s.amount ?? 0) }))])

  const tiles = [
    { k: 'Total sign-ups', v: p.length, sub: `+${week} this week`, t: 'students' as Tab, bg: 'bg-[#c9d6c8]' },
    { k: 'Awaiting verification', v: p.filter((x) => x.kyc_status === 'pending').length, sub: 'review now', t: 'students' as Tab, bg: 'bg-[#efdcc6]' },
    { k: 'Verified students', v: p.filter((x) => x.kyc_status === 'verified').length, sub: `${Math.round((p.filter((x) => x.kyc_status === 'verified').length / Math.max(p.length, 1)) * 100)}% of sign-ups`, t: 'students' as Tab, bg: 'bg-brand-50' },
    { k: 'Live gigs', v: ls.filter((l) => l.status === 'live' && !timeLeft(l.expires_at).expired).length, sub: `${ls.length} total`, t: 'gigs' as Tab, bg: 'bg-[#d6e4d9]' },
    { k: 'Work to review', v: subs.filter((s) => s.status === 'pending').length, sub: `${subs.length} submitted all-time`, t: 'work' as Tab, bg: 'bg-[#dce8df]' },
    { k: 'Units approved', v: owed.length + paid.length, sub: `${paid.length} paid`, t: 'work' as Tab, bg: 'bg-brand-50' },
  ]
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((x, i) => (
          <motion.button key={x.k} onClick={() => go(x.t)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-3xl p-6 text-left transition duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 ${x.bg ?? ''}`}>
            <div className="text-sm font-medium text-ink-muted">{x.k}</div>
            <div className="figure mt-1 text-5xl leading-none"><CountUp to={x.v} /></div>
            <div className="mt-1 text-xs text-ink-muted">{x.sub}</div>
          </motion.button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between"><h3 className="text-lg font-semibold">Sign-ups, last 14 days</h3><span className="text-sm text-ink-muted">peak {peak}/day</span></div>
          <div className="mt-6 flex h-40 items-end gap-1.5">
            {series.map((s, i) => (
              <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                <motion.div initial={{ height: 0 }} animate={{ height: `${(s.n / peak) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.6 }}
                  className="min-h-[3px] rounded-t-md bg-brand-500" />
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">{s.n}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-muted"><span>{series[0].day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><span>Today</span></div>
        </div>
        <div className="card space-y-4 p-5">
          <div><div className="text-sm font-medium text-ink-muted">Owed (approved, unpaid)</div><div className="font-display text-2xl font-semibold">{byCur(owed)}</div></div>
          <div><div className="text-sm font-medium text-ink-muted">Paid out</div><div className="font-display text-2xl font-semibold">{paidOut}</div>{payments.length > 0 && <div className="text-xs text-ink-muted">{payments.length} payment{payments.length === 1 ? '' : 's'} recorded</div>}</div>
          <div><div className="text-sm font-medium text-ink-muted">Students on gigs</div><div className="font-display text-2xl font-semibold">{new Set(d.claims.filter((c: any) => c.status === 'active').map((c: any) => c.student_id)).size}</div></div>
          <button onClick={() => go('work')} className="btn-primary btn-sm w-full">Run payouts</button>
        </div>
      </div>
      <div className="card p-5">
        <h3 className="text-lg font-semibold">Newest students</h3>
        <div className="mt-3 divide-y divide-line">
          {p.slice(0, 6).map((x) => (
            <div key={x.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><div className="truncate font-semibold">{x.full_name || x.email}</div><div className="truncate text-xs text-ink-muted">{x.school ?? '—'} · {ago(x.created_at)}</div></div><KycPill s={x.kyc_status} /></div>
          ))}
          {!p.length && <p className="py-4 text-sm text-ink-muted">No sign-ups yet. Share the link!</p>}
        </div>
      </div>
    </div>
  )
}

// ═════════════ students / KYC ═════════════
function Students({ profiles, reload }: { profiles: Profile[]; reload: () => void }) {
  const [f, setF] = useState<KycStatus | 'all'>('pending')
  const [t, setT] = useState<'all' | 'student' | 'general'>('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Profile | null>(null)
  const list = profiles.filter((p) => (f === 'all' || p.kyc_status === f) && (t === 'all' || accountOf(p) === t) && (!q || `${p.full_name} ${p.email} ${p.school} ${p.phone}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        <input className="input md:max-w-xs" placeholder="Search name, school, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={t} onChange={(e) => setT(e.target.value as any)} aria-label="Account type" className="input md:w-44">
          <option value="all">All account types</option><option value="student">Students</option><option value="general">Non-students</option>
        </select>
        <div className="flex flex-wrap gap-2">
          {(['pending', 'verified', 'rejected', 'unverified', 'all'] as const).map((s) => (
            <button key={s} onClick={() => setF(s)} className={`rounded-full border px-4 py-2 text-sm font-medium capitalize ${f === s ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}`}>{s} ({s === 'all' ? profiles.length : profiles.filter((p) => p.kyc_status === s).length})</button>
          ))}
        </div>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b-2 border-line text-left text-xs uppercase tracking-wider text-ink-muted"><tr><th className="p-4">Student</th><th>School / work</th><th>MoMo</th><th>Joined</th><th>Status</th><th className="p-4" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-paper">
                <td className="p-4"><div className="flex items-center gap-2 font-semibold">{p.full_name || '—'}{accountOf(p) === 'general' && <span className="chip bg-[#e8eedd] py-0.5 text-[11px] text-[#46602c]">Non-student</span>}</div><div className="text-xs text-ink-muted">{p.email}</div></td>
                <td>{accountOf(p) === 'general'
                  ? <><div>{p.occupation || '—'}</div><div className="text-xs text-ink-muted">{[p.work_status && WORK_STATUSES[p.work_status], p.city].filter(Boolean).join(' · ')}</div></>
                  : <><div>{p.school ?? '—'}</div><div className="text-xs text-ink-muted">{p.programme} {p.study_year}</div></>}</td>
                <td><div>{p.momo_number ?? '—'}</div><div className="text-xs text-ink-muted">{p.momo_provider}</div></td>
                <td className="text-ink-muted">{ago(p.created_at)}</td>
                <td><KycPill s={p.kyc_status} />{(p.kyc_status === 'verified' || p.kyc_status === 'rejected') && <EmailNote at={p.kyc_email_sent_at} />}</td>
                <td className="p-4 text-right"><button onClick={() => setSel(p)} className="btn-ghost btn-sm">{p.kyc_status === 'pending' ? 'Review' : 'View'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="p-8"><Empty title="All clear" body="Nobody in this bucket." /></div>}
      </div>
      <KycReview p={sel} onClose={() => setSel(null)} onDone={() => { setSel(null); reload() }} onEmailed={(at) => { setSel((x) => (x ? { ...x, kyc_email_sent_at: at } : x)); reload() }} />
    </div>
  )
}

function EmailNote({ at }: { at?: string | null }) {
  return at
    ? <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted"><Mail className="h-3 w-3" />Emailed {ago(at)}</div>
    : <div className="mt-1 flex items-center gap-1 text-xs font-medium text-clay-600"><MailWarning className="h-3 w-3" />Not emailed</div>
}

function KycReview({ p, onClose, onDone, onEmailed }: { p: Profile | null; onClose: () => void; onDone: () => void; onEmailed: (at: string) => void }) {
  const toast = useToast()
  const [sending, setSending] = useState(false)
  const [img, setImg] = useState<{ id?: string | null; student?: string | null; selfie?: string | null }>({})
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!p) return
    setNote(p.kyc_note ?? ''); setImg({})
    Promise.all([fileUrl('kyc', p.id_card_path), fileUrl('kyc', p.student_card_path), fileUrl('kyc', p.selfie_path)]).then(([id, student, selfie]) => setImg({ id, student, selfie }))
  }, [p])
  if (!p) return <Modal open={false} onClose={onClose}>{null}</Modal>
  const act = async (s: KycStatus) => {
    if (s === 'rejected' && !note.trim()) return toast('Add a note so they know what to fix', 'err')
    await admin.setKyc(p.id, s, s === 'rejected' ? note : null)
    toast(s === 'verified' ? `${p.full_name} verified — we’ve emailed them` : 'Sent back for fixes — we’ve emailed them the note')
    onDone()
  }
  const emailable = p.kyc_status === 'verified' || p.kyc_status === 'rejected'
  const resend = async () => {
    if (sending) return
    setSending(true)
    try { const at = await admin.resendKycEmail(p.id); toast(`${p.kyc_status === 'verified' ? 'Verification' : 'Fix-it'} email sent to ${p.email}`); onEmailed(at) }
    catch (e: any) { toast(e.message, 'err') } finally { setSending(false) }
  }
  const general = accountOf(p) === 'general'
  const nameMismatch = p.momo_name && p.full_name && p.momo_name.trim().toLowerCase() !== p.full_name.trim().toLowerCase()
  return (
    <Modal open={!!p} onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{p.full_name}</h2><KycPill s={p.kyc_status} /><span className={`chip ${general ? 'bg-[#e8eedd] text-[#46602c]' : 'bg-brand-50 text-brand-700'}`}>{general ? 'Non-student' : 'Student'}</span></div>
      <p className="text-sm text-ink-muted">{p.email} · {p.phone}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(general ? [['Selfie', img.selfie], ['Ghana Card', img.id]] as const : [['Selfie', img.selfie], ['ID card', img.id], ['Student card', img.student]] as const).map(([k, u]) => (
          <div key={k}><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{k}</div>
            <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-line bg-white">
              {u ? <a href={u} target="_blank" rel="noreferrer" className="h-full w-full"><img src={u} alt={k} className="h-full w-full object-contain" /></a> : <span className="text-sm text-ink-muted">Not uploaded</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-x-6 gap-y-2 rounded-2xl bg-white p-4 text-sm sm:grid-cols-2">
        {[...(general ? [['Occupation', p.occupation], ['Work', p.work_status ? WORK_STATUSES[p.work_status] : null]] : [['School', p.school], ['Programme', `${p.programme ?? ''} ${p.study_year ?? ''}`], ['Student ID #', p.student_id_number]]),
          ['Age', ageOf(p.date_of_birth) != null ? `${ageOf(p.date_of_birth)} (born ${new Date(p.date_of_birth + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })})` : null],
          ['Gender', p.gender ? GENDERS[p.gender] : null], ['City', p.city], ['MoMo', `${p.momo_provider ?? ''} ${p.momo_number ?? ''}`], ['Name on MoMo', p.momo_name], ['Referral code', p.referral_code], ['Submitted', p.kyc_submitted_at ? ago(p.kyc_submitted_at) : '—']].map(([k, v]) => (
          <div key={k as string} className="flex justify-between gap-3 border-b border-line py-1"><span className="text-ink-muted">{k}</span><span className="text-right font-semibold">{v || '—'}</span></div>
        ))}
      </div>
      {nameMismatch && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">MoMo account name “{p.momo_name}” doesn’t match ID name “{p.full_name}”.</p>}
      <div className="mt-4 rounded-2xl bg-sand p-3 text-xs text-ink-muted"><b>Checklist:</b> {general
        ? 'face in selfie matches the Ghana Card photo · name and date of birth match the Ghana Card · names match on MoMo · Ghana Card not expired · images aren’t screenshots of screens.'
        : 'face in selfie matches ID photo · names match across ID, student card & MoMo · student card not expired · images aren’t screenshots of screens.'}</div>
      <textarea className="input mt-4" placeholder="Note to student (required if rejecting) — e.g. ‘Student ID is blurry, please retake’" value={note} onChange={(e) => setNote(e.target.value)} />
      {emailable && (
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${p.kyc_email_sent_at ? 'bg-paper' : 'bg-clay-50'}`}>
          <div className="text-sm">
            <div className="font-medium">{p.kyc_status === 'verified' ? 'Verification email' : 'Fix-it email'}</div>
            <div className="text-ink-muted">{p.kyc_email_sent_at
              ? `Last sent ${ago(p.kyc_email_sent_at)} · ${new Date(p.kyc_email_sent_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : p.kyc_status === 'verified' ? 'No email on record — likely verified before emails were switched on.' : 'No email on record.'}</div>
          </div>
          <button onClick={resend} disabled={sending} className="btn-ghost btn-sm">{sending ? <Spinner /> : <Mail className="h-4 w-4" />}{p.kyc_email_sent_at ? 'Send again' : p.kyc_status === 'verified' ? 'Send verification email' : 'Send fix-it email'}</button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {p.kyc_status !== 'rejected' && <button onClick={() => act('rejected')} className="btn-ghost btn-sm"><X className="h-4 w-4" />{p.kyc_status === 'verified' ? 'Revoke — needs fixing' : 'Needs fixing'}</button>}
        {p.kyc_status !== 'verified' && <button onClick={() => act('verified')} className="btn btn-sm bg-brand-600 px-5 text-white hover:bg-brand-700"><Check className="h-4 w-4" />Approve</button>}
      </div>
    </Modal>
  )
}

// ═════════════ gigs ═════════════
function Gigs({ listings, subs, reload }: { listings: Listing[]; subs: Submission[]; reload: () => void }) {
  const toast = useToast()
  const [edit, setEdit] = useState<Partial<Listing> | null>(null)
  return (
    <div>
      <div className="flex justify-end"><button onClick={() => setEdit({})} className="btn-brand btn-sm"><Plus className="h-4 w-4" />New gig</button></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {listings.map((l) => {
          const t = timeLeft(l.expires_at)
          const budget = l.total_budget ?? (l.pay_model === 'per_unit' ? l.rate * (l.units_per_student ?? 0) * l.slots : l.rate * l.slots)
          return (
            <div key={l.id} className="card p-5">
              <div className="flex items-start gap-3">
                <Photo src={coverFor(l)} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1"><h3 className="font-semibold leading-tight">{l.title}</h3><div className="mt-1 flex flex-wrap gap-1.5"><span className="chip bg-sand capitalize">{l.status}</span><span className={`chip ${t.urgent ? 'bg-red-100 text-red-700' : 'bg-sand'}`}>{t.label}</span><span className="chip bg-sand">{payLine(l)}</span></div></div>
                <button onClick={() => setEdit(l)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand" aria-label="Edit"><Edit3 className="h-4 w-4" /></button>
                <button onClick={async () => { if (confirm(`Delete “${l.title}”? This also removes its submissions.`)) { await deleteListing(l.id); toast('Deleted'); reload() } }} className="grid h-9 w-9 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-sand p-2"><div className="font-semibold">{l.taken ?? 0}/{l.slots}</div><div className="text-xs text-ink-muted">students</div></div>
                <div className="rounded-xl bg-sand p-2"><div className="font-semibold">{l.approved_units ?? 0}</div><div className="text-xs text-ink-muted">{plural(l.unit_label)} approved</div></div>
                <div className="rounded-xl bg-sand p-2"><div className="font-semibold">{money(l.committed, l.currency)}</div><div className="text-xs text-ink-muted">of {money(budget, l.currency)}</div></div>
              </div>
              {spotsLeft(l) === 0 && <p className="mt-2 text-xs font-semibold text-ink-muted">All spots filled</p>}
              {(() => {
                const mine = subs.filter((s) => s.listing_id === l.id)
                const waiting = mine.filter((s) => s.status === 'pending').length
                return (
                  <Link to={`/admin/gigs/${l.id}`} className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-medium transition hover:border-ink/30 hover:bg-paper">
                    <span>View responses <span className="text-ink-muted">({mine.length})</span></span>
                    <span className="flex items-center gap-2">{waiting > 0 && <span className="chip bg-amber-50 text-amber-800">{waiting} to review</span>}<ArrowRight className="h-4 w-4" /></span>
                  </Link>
                )
              })()}
            </div>
          )
        })}
      </div>
      {!listings.length && <Empty title="No gigs yet" action={<button onClick={() => setEdit({})} className="btn-brand">Post the first one</button>} />}
      <Modal open={!!edit} onClose={() => setEdit(null)} wide>
        {edit && <ListingForm initial={edit} hasResponses={!!edit.id && subs.some((s: any) => s.listing_id === edit.id)} onSaved={() => { setEdit(null); reload(); toast('Gig saved') }} />}
      </Modal>
    </div>
  )
}

// ═════════════ work + payouts ═════════════
function Work({ subs, reload }: { subs: Submission[]; reload: () => void }) {
  const toast = useToast()
  const [f, setF] = useState<Submission['status']>('pending')
  const [picked, setPicked] = useState<string[]>([])
  const [proof, setProof] = useState<string | null>(null)
  const list = subs.filter((s) => s.status === f)
  useEffect(() => setPicked([]), [f])
  const act = async (ids: string[], status: Submission['status'], extra = {}) => { await admin.review(ids, status, extra); toast(`${ids.length} marked ${status}${status === 'pending' ? '' : ' — students emailed'}`); setPicked([]); reload() }

  const exportCsv = () => {
    const rows = subs.filter((s) => s.status === 'approved')
    const by = new Map<string, { name: string; provider: string; number: string; acct: string; amount: number; cur: string; n: number }>()
    rows.forEach((s) => {
      const k = `${s.student_id}-${s.listing?.currency}`
      const e = by.get(k) ?? { name: s.student?.full_name ?? '', provider: s.student?.momo_provider ?? '', number: s.student?.momo_number ?? '', acct: s.student?.momo_name ?? '', amount: 0, cur: s.listing?.currency ?? '', n: 0 }
      e.amount += s.amount ?? 0; e.n++; by.set(k, e)
    })
    const csv = ['name,momo_provider,momo_number,momo_account_name,currency,units,amount', ...[...by.values()].map((e) => [e.name, e.provider, e.number, e.acct, e.cur, e.n, e.amount].map(csvCell).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `gigotter-payouts-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['pending', 'approved', 'paid', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setF(s)} className={`rounded-full border px-4 py-2 text-sm font-medium capitalize ${f === s ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}`}>{s} ({subs.filter((x) => x.status === s).length})</button>
          ))}
        </div>
        <div className="flex gap-2">
          {f === 'approved' && <button onClick={exportCsv} className="btn-ghost btn-sm"><Download className="h-4 w-4" />Payout CSV</button>}
          {picked.length > 0 && f === 'pending' && <><button onClick={() => act(picked, 'rejected')} className="btn-ghost btn-sm">Reject {picked.length}</button><button onClick={() => act(picked, 'approved')} className="btn-primary btn-sm">Approve {picked.length}</button></>}
          {picked.length > 0 && f === 'approved' && <button onClick={() => { const ref = prompt('MoMo batch / transaction reference?') ?? ''; act(picked, 'paid', { payout_ref: ref }) }} className="btn-primary btn-sm" title="Sends the simple 'you’ve been paid' email. For a receipt, use Record payment on the gig’s responses page.">Mark {picked.length} paid (no receipt)</button>}
        </div>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b-2 border-line text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="w-10 p-4"><input type="checkbox" className="accent-brand-600" checked={!!list.length && picked.length === list.length} onChange={(e) => setPicked(e.target.checked ? list.map((s) => s.id) : [])} /></th><th>Submitted</th><th>Gig</th><th>Student</th><th>Amount</th><th>Proof</th><th className="p-4" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((s) => (
              <tr key={s.id} className="align-top hover:bg-paper">
                <td className="p-4"><input type="checkbox" className="accent-brand-600" checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} /></td>
                <td className="py-4 pr-3"><div className="font-semibold">{subTitle(s)}</div><div className="max-w-xs truncate text-xs text-ink-muted">{Object.entries(s.data).filter(([k, v]) => !['gps', 'gps_accuracy'].includes(k) && v !== subTitle(s)).map(([, v]) => v).filter(Boolean).join(' · ')}</div><div className="text-xs text-ink-muted">{ago(s.created_at)}</div></td>
                <td className="py-4 pr-3"><Link to={`/admin/gigs/${s.listing_id}`} className="underline-offset-2 hover:underline">{s.listing?.title}</Link></td>
                <td className="py-4 pr-3"><div>{s.student?.full_name}</div><div className="text-xs text-ink-muted">{s.student?.momo_number}</div></td>
                <td className="py-4 pr-3 font-semibold">{money(s.amount, s.listing?.currency)}{s.payout_ref && <div className="text-xs font-normal text-ink-muted">ref {s.payout_ref}</div>}</td>
                <td className="py-4 pr-3">{s.proof_path ? <button onClick={async () => setProof(await fileUrl('proofs', s.proof_path))} className="font-semibold underline">View</button> : '—'}</td>
                <td className="p-4 text-right">
                  {s.status === 'pending' && <div className="flex justify-end gap-1"><button onClick={() => { const n = prompt('Reason (shown to student)?'); if (n !== null) act([s.id], 'rejected', { admin_note: n }) }} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-red-500 hover:text-red-600" aria-label="Reject"><X className="h-4 w-4" /></button><button onClick={() => act([s.id], 'approved')} className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-white" aria-label="Approve"><Check className="h-4 w-4" /></button></div>}
                  {s.status !== 'pending' && <SubPill s={s.status} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="p-8"><Empty title="Nothing here" /></div>}
      </div>
      <Modal open={!!proof} onClose={() => setProof(null)}>{proof && <img src={proof} alt="Proof" className="mt-6 w-full rounded-2xl" />}</Modal>
    </div>
  )
}

// ═════════════ briefs ═════════════
// ═════════════ testimonials ═════════════
function Testimonials() {
  const toast = useToast()
  const list = useAsync(() => listTestimonials(true), [])
  const blank = { name: '', school: '', quote: '', consent: false, published: true }
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.consent) return toast('Tick the permission box first', 'err')
    setBusy(true)
    try { await saveTestimonial(f); setF(blank); toast(f.published ? 'Published' : 'Saved as draft'); list.reload() }
    catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={add} className="card space-y-4 self-start p-6">
        <div><h3 className="font-semibold">Add a testimonial</h3><p className="mt-1 text-sm text-ink-muted">Real words from a real student. The landing page shows these once there are at least two.</p></div>
        <div><label className="label">Student name</label><input className="input" required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Abena O." /><p className="mt-1 text-xs text-ink-muted">First name and last initial is usually best.</p></div>
        <div><label className="label">School <span className="font-normal text-ink-muted">(optional)</span></label><input className="input" maxLength={120} value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} placeholder="University of Ghana" /></div>
        <div><label className="label">Quote</label><textarea className="input min-h-[110px]" required minLength={10} maxLength={400} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} placeholder="What they told you, in their words" /><p className="mt-1 text-right text-xs text-ink-muted">{f.quote.length}/400</p></div>
        <label className="flex items-start gap-3 rounded-xl bg-paper p-3 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /><span>I have this student’s permission to publish their name and quote on Gigotter.</span></label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} />Publish now</label>
        <button className="btn-brand w-full" disabled={busy}>{busy ? <Spinner /> : 'Save testimonial'}</button>
      </form>
      <div className="space-y-3">
        {(list.data ?? []).map((t) => (
          <div key={t.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium leading-snug">“{t.quote}”</p>
              <p className="mt-2 text-sm"><b className="font-medium">{t.name}</b>{t.school && <span className="text-ink-muted"> · {t.school}</span>}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={async () => { try { await saveTestimonial({ ...t, published: !t.published }); list.reload() } catch (e: any) { toast(e.message, 'err') } }}
                className={`chip px-3 py-1.5 ${t.published ? 'bg-brand-50 text-brand-700' : 'bg-sand text-ink-soft'}`}>{t.published ? 'Published' : 'Draft'}</button>
              <button onClick={async () => { if (confirm('Delete this testimonial?')) { await deleteTestimonial(t.id); list.reload() } }} className="grid h-9 w-9 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!list.loading && !(list.data ?? []).length && <Empty icon={<Quote className="h-5 w-5" />} title="No testimonials yet" body="Ask a few students who’ve been paid how it went — add their words here with their permission." />}
      </div>
    </div>
  )
}
