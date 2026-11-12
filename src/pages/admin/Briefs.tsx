import { ArrowRight, Briefcase, Calendar, ExternalLink, Mail, MapPin, MessageCircle, Paperclip, Phone, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GigFileList, type PendingFile } from '../../components/GigFiles'
import { Empty, Modal, Spinner, useToast } from '../../components/ui'
import { admin } from '../../lib/api'
import { TEMPLATES } from '../../lib/forms'
import { ago } from '../../lib/format'
import { GIG_TYPES, type ClientRequest, type GigType, type Listing, type ListingFile } from '../../lib/types'
import ListingForm from './ListingForm'

const STATUSES = ['new', 'contacted', 'converted', 'declined'] as const
const STATUS_STYLE: Record<string, string> = { new: 'bg-clay-50 text-clay-600', contacted: 'bg-[#e8eedd] text-[#46602c]', converted: 'bg-brand-50 text-brand-700', declined: 'bg-sand text-ink-soft' }
const typeOf = (r: ClientRequest): GigType => (r.work_type && r.work_type in GIG_TYPES ? (r.work_type as GigType) : 'other')
/** International format for WhatsApp/tel links; Ghana numbers like 024… become 23324… */
const intl = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.startsWith('0') && d.length === 10 ? '233' + d.slice(1) : d }

/** Fill a new gig from a brief: its kind of work (with that type's starter form), text, client, place and budget. */
function gigFromBrief(r: ClientRequest): Partial<Listing> {
  const type = typeOf(r), T = TEMPLATES[type]
  // first sentence of the first line (no regex lookbehind: older iPhones can't parse it)
  const firstLine = (r.need.split('\n')[0].match(/^[^.!?]*[.!?]?/)?.[0] ?? r.need).trim()
  const budget = Number((r.budget ?? '').replace(/[^\d.]/g, ''))
  return {
    type, title: firstLine.length > 80 ? firstLine.slice(0, 77).trimEnd() + '…' : firstLine,
    summary: r.need.replace(/\s+/g, ' ').slice(0, 160), description: r.need,
    client_name: r.company || r.name, location: r.location ?? '', is_remote: /remote|anywhere|online/i.test(r.location ?? ''),
    unit_label: T.unit, pay_model: T.pay, requirements: [...T.requirements],
    form_schema: T.fields, photo_rule: T.photo, photo_hint: T.photoHint,
    total_budget: budget > 0 ? budget : null, status: 'draft',
  }
}

export default function Briefs({ reqs, reload }: { reqs: ClientRequest[]; reload: () => void }) {
  const [open, setOpen] = useState<ClientRequest | null>(null)
  const [f, setF] = useState<'all' | (typeof STATUSES)[number]>('all')
  if (!reqs.length) return <Empty title="No briefs yet" body="When businesses post a brief on the “For businesses” page, it lands here. Turn the good ones into gigs." />
  const list = reqs.filter((r) => f === 'all' || r.status === f)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setF(s)} className={`rounded-full border px-4 py-2 text-sm font-medium capitalize ${f === s ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white'}`}>
            {s} ({s === 'all' ? reqs.length : reqs.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {list.map((r) => (
          <button key={r.id} onClick={() => setOpen(r)} className="card group p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="truncate font-semibold">{r.company || r.name}</div><div className="truncate text-xs text-ink-muted">{r.name} · {ago(r.created_at)}</div></div>
              <span className={`chip shrink-0 capitalize ${STATUS_STYLE[r.status] ?? 'bg-sand'}`}>{r.status}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{r.need}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {r.work_type && <span className="chip bg-white ring-1 ring-line">{GIG_TYPES[typeOf(r)].label}</span>}
              {r.budget && <span className="chip bg-brand-50 text-brand-700">{r.budget}</span>}
              {r.deadline && <span className="chip bg-sand">Due {r.deadline}</span>}
              <span className="ml-auto flex items-center gap-1 font-medium text-ink-muted group-hover:text-ink">Open <ArrowRight className="h-3.5 w-3.5" /></span>
            </div>
          </button>
        ))}
      </div>
      <BriefDetail r={open} onClose={() => setOpen(null)} onChanged={(patch) => { setOpen((x) => (x ? { ...x, ...patch } : x)); reload() }} />
    </div>
  )
}

function BriefDetail({ r, onClose, onChanged }: { r: ClientRequest | null; onClose: () => void; onChanged: (patch: Partial<ClientRequest>) => void }) {
  const toast = useToast()
  const [files, setFiles] = useState<ListingFile[] | null>(null)
  const [note, setNote] = useState('')
  const [converting, setConverting] = useState<PendingFile[] | null>(null)
  const [preparing, setPreparing] = useState(false)
  useEffect(() => {
    if (!r) return
    setNote(r.admin_note ?? ''); setFiles(null); setConverting(null)
    admin.briefFiles(r.id).then(setFiles).catch(() => setFiles([]))
  }, [r?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r) return <Modal open={false} onClose={onClose}>{null}</Modal>
  const update = async (patch: Partial<ClientRequest>, msg?: string) => {
    try { await admin.updateBrief(r.id, patch); onChanged(patch); if (msg) toast(msg) } catch (e: any) { toast(e.message, 'err') }
  }
  const startConvert = async () => {
    setPreparing(true)
    try {
      // bring the business's files along as "Joined only" attachments (the admin can remove or make them public)
      const copies = await Promise.all((files ?? []).map(async (f) => ({ key: f.id, file: await admin.fileAsUpload(f), visibility: 'joined' as const })))
      setConverting(copies)
    } catch { toast('Couldn’t copy the attachments. You can add them on the gig yourself.', 'err'); setConverting([]) }
    finally { setPreparing(false) }
  }
  const phone = r.phone ?? ''

  return (
    <Modal open onClose={onClose} wide>
      {converting ? (
        <ListingForm initial={gigFromBrief(r)} initialFiles={converting} heading={`New gig from ${r.company || r.name}’s brief`}
          onSaved={async (gig) => { await update({ listing_id: gig.id, status: 'converted' }, 'Draft gig created from the brief. Review it in Gigs, then set it live.'); setConverting(null) }} />
      ) : (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3 pr-10">
            <div>
              <div className="eyebrow">Business brief</div>
              <h2 className="mt-1 text-2xl font-semibold">{r.company || r.name}</h2>
              <p className="text-sm text-ink-muted">{r.name} · sent {ago(r.created_at)} · {new Date(r.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <select value={r.status} onChange={(e) => update({ status: e.target.value }, 'Status updated')} aria-label="Status"
              className={`rounded-full border-0 px-4 py-2 text-sm font-semibold capitalize ring-1 ring-line ${STATUS_STYLE[r.status] ?? ''}`}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="btn-ghost btn-sm"><Phone className="h-4 w-4" />{phone}</a>}
            {phone && <a href={`https://wa.me/${intl(phone)}?text=${encodeURIComponent(`Hi ${r.name.split(' ')[0]}, this is Gigotter about the brief you sent us.`)}`} target="_blank" rel="noreferrer noopener" className="btn-ghost btn-sm"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            <a href={`mailto:${r.email}?subject=${encodeURIComponent('Your Gigotter brief')}`} className="btn-ghost btn-sm"><Mail className="h-4 w-4" />{r.email}</a>
          </div>

          <dl className="mt-5 grid gap-2 sm:grid-cols-4">
            {([[Briefcase, 'Kind of work', r.work_type ? GIG_TYPES[typeOf(r)].label : '—'], [MapPin, 'Where', r.location || '—'], [Wallet, 'Budget', r.budget || '—'], [Calendar, 'Deadline', r.deadline || '—']] as const).map(([I, k, v]) => (
              <div key={k} className="rounded-xl bg-paper px-3 py-2.5"><dt className="flex items-center gap-1.5 text-xs text-ink-muted"><I className="h-3.5 w-3.5" />{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
            ))}
          </dl>

          <div className="mt-5"><h3 className="text-sm font-semibold">What they need</h3><p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{r.need}</p></div>

          <div className="mt-6">
            {files === null ? <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner />Checking for attachments…</div>
              : files.length ? <GigFileList files={files} title="Attachments" />
              : <p className="flex items-center gap-2 text-sm text-ink-muted"><Paperclip className="h-4 w-4" />No attachments</p>}
          </div>

          <div className="mt-6">
            <label className="label">Private notes <span className="font-normal text-ink-muted">(only admins see this)</span></label>
            <textarea className="input min-h-[80px]" maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== (r.admin_note ?? '') && update({ admin_note: note }, 'Note saved')} placeholder="e.g. Called Tue, wants 50 sign-ups in Osu, quote ₵2,500" />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
            {r.listing_id && <Link to={`/admin/gigs/${r.listing_id}`} onClick={onClose} className="btn-ghost btn-sm"><ExternalLink className="h-4 w-4" />View the gig</Link>}
            <button onClick={startConvert} disabled={preparing || files === null} className="btn-primary btn-sm">
              {preparing ? <><Spinner />Preparing…</> : <>{r.listing_id ? 'Make another gig from this' : 'Turn into gig'}<ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
