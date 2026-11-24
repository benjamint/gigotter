import { Check, Gift, Package, Plus, Edit3, Smartphone, X, Coins } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Empty, Modal, PageLoader, Spinner, useToast } from '../../components/ui'
import { FileDrop } from '../../components/Upload'
import { admin, uploadCover } from '../../lib/api'
import { ago, points } from '../../lib/format'
import { useAsync } from '../../lib/session'
import { REWARD_CATEGORIES, type Profile, type Redemption, type RewardCategory, type RewardItem } from '../../lib/types'

/** Admin: reward items, reward requests to send, and points balances. */
export default function Rewards({ profiles }: { profiles: Profile[] }) {
  const data = useAsync(async () => {
    const [items, reqs, ledger] = await Promise.all([admin.rewardItems(), admin.redemptions(), admin.pointsLedger()])
    return { items, reqs, ledger }
  }, [])
  const [editing, setEditing] = useState<Partial<RewardItem> | null>(null)
  const [adjust, setAdjust] = useState(false)
  if (data.error) return <div className="card p-6 text-sm text-ink-soft">Rewards aren’t set up yet: run migration <b>0018_points_rewards.sql</b> in the Supabase SQL editor, then refresh. <span className="text-ink-muted">({data.error})</span></div>
  if (!data.data) return <PageLoader />
  const { items, reqs, ledger } = data.data
  const open = reqs.filter((r) => r.status === 'requested')
  const balances = new Map<string, number>()
  ledger.forEach((e) => balances.set(e.student_id, (balances.get(e.student_id) ?? 0) + e.delta))
  const held = [...balances.values()].reduce((a, b) => a + b, 0)
  const earned = ledger.filter((e) => e.kind === 'earned' || e.kind === 'reversed').reduce((a, e) => a + e.delta, 0)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile k="Requests to send" v={String(open.length)} sub={`${reqs.length} all-time`} bg="bg-[#efdcc6]" />
        <Tile k="Points held by students" v={points(held)} sub={`${points(earned)} earned from gigs`} bg="bg-brand-50" />
        <Tile k="Rewards on offer" v={String(items.filter((i) => i.active).length)} sub={`${items.length} in total`} bg="bg-[#d6e4d9]" />
      </div>

      <section>
        <h2 className="text-xl font-semibold">Reward requests</h2>
        <p className="mt-1 text-sm text-ink-muted">Points were taken when the student asked. Send the item, then mark it sent (they get an email). Cancelling refunds the points.</p>
        <div className="mt-4 space-y-3">
          {reqs.length === 0 ? <Empty icon={<Gift className="h-6 w-6" />} title="No reward requests yet" body="They appear here when students spend their points." />
            : reqs.map((r) => <RequestRow key={r.id} r={r} reload={data.reload} />)}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Rewards</h2><p className="mt-1 text-sm text-ink-muted">What students can spend points on. Switch an item off to hide it.</p></div>
          <button className="btn-brand btn-sm" onClick={() => setEditing({ category: 'airtime', active: true, stock: null })}><Plus className="h-4 w-4" />Add a reward</button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><Empty icon={<Package className="h-6 w-6" />} title="No rewards yet" body="Add airtime, data or products for students to redeem." /></div>}
          {items.map((it) => (
            <div key={it.id} className={`card flex gap-4 p-4 ${it.active ? '' : 'opacity-60'}`}>
              <ItemThumb it={it} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate font-semibold">{it.name}</div><div className="truncate text-xs text-ink-muted">{it.vendor || '—'} · {REWARD_CATEGORIES[it.category]}</div></div>
                  <button className="btn-ghost btn-sm shrink-0 !px-3" onClick={() => setEditing(it)} aria-label={`Edit ${it.name}`}><Edit3 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="chip bg-[#F9C93A]/30 font-semibold text-ink">{points(it.points_cost)}</span>
                  <span className="chip bg-sand text-ink-soft">{it.stock == null ? 'Unlimited' : `${it.stock} left`}</span>
                  {!it.active && <span className="chip bg-sand text-ink-muted">Off</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Points balances</h2><p className="mt-1 text-sm text-ink-muted">Everyone with points. Add a bonus or correct a balance with a reason.</p></div>
          <button className="btn-ghost btn-sm" onClick={() => setAdjust(true)}><Coins className="h-4 w-4" />Adjust points</button>
        </div>
        <Balances balances={balances} profiles={profiles} />
      </section>

      <ItemEditor item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); data.reload() }} />
      <AdjustPoints open={adjust} profiles={profiles} balances={balances} onClose={() => setAdjust(false)} onSaved={() => { setAdjust(false); data.reload() }} />
    </div>
  )
}

const Tile = ({ k, v, sub, bg }: { k: string; v: string; sub: string; bg: string }) => (
  <div className={`rounded-3xl p-6 ${bg}`}>
    <div className="text-sm font-medium text-ink-muted">{k}</div>
    <div className="figure mt-1 text-4xl leading-none">{v}</div>
    <div className="mt-1 text-xs text-ink-muted">{sub}</div>
  </div>
)

export function ItemThumb({ it, className = 'h-20 w-20' }: { it: Pick<RewardItem, 'image_url' | 'category' | 'name'>; className?: string }) {
  if (it.image_url) return <img src={it.image_url} alt={it.name} className={`${className} shrink-0 rounded-2xl object-cover`} />
  const Icon = it.category === 'airtime' ? Smartphone : it.category === 'product' ? Package : Gift
  return <div className={`${className} grid shrink-0 place-items-center rounded-2xl bg-[#F9C93A]/25 text-brand-700`}><Icon className="h-8 w-8" /></div>
}

const STATUS: Record<Redemption['status'], string> = { requested: 'bg-[#efdcc6] text-ink', sent: 'bg-brand-50 text-brand-700', cancelled: 'bg-sand text-ink-muted' }

function RequestRow({ r, reload }: { r: Redemption; reload: () => void }) {
  const toast = useToast()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'' | 'sent' | 'cancelled'>('')
  const act = async (status: 'sent' | 'cancelled') => {
    if (status === 'cancelled' && !confirm(`Cancel this request and refund ${points(r.points)} to ${r.student?.full_name ?? 'the student'}?`)) return
    setBusy(status)
    try { await admin.handleRedemption(r.id, status, note); toast(status === 'sent' ? 'Marked sent. The student has been emailed' : 'Cancelled and points refunded'); reload() }
    catch (e: any) { toast(e.message, 'err') } finally { setBusy('') }
  }
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{r.item_name} <span className="font-normal text-ink-muted">· {points(r.points)}</span></div>
          <div className="mt-0.5 text-sm text-ink-soft">{r.student?.full_name ?? 'Student'}{r.student?.school ? ` · ${r.student.school}` : ''}{r.student?.email ? ` · ${r.student.email}` : ''}</div>
        </div>
        <span className={`chip capitalize ${STATUS[r.status]}`}>{r.status}</span>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[auto,1fr]">
        <span className="text-ink-muted">Phone</span><a className="font-medium underline-offset-2 hover:underline" href={`tel:${r.phone.replace(/\s/g, '')}`}>{r.phone}</a>
        {r.delivery_note && <><span className="text-ink-muted">Delivery</span><span>{r.delivery_note}</span></>}
        <span className="text-ink-muted">Asked</span><span>{ago(r.created_at)}</span>
        {r.admin_note && <><span className="text-ink-muted">Your note</span><span>{r.admin_note}</span></>}
      </div>
      {r.status === 'requested' && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="input sm:flex-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note for the student (optional), e.g. airtime reference" />
          <div className="flex gap-2">
            <button className="btn-brand btn-sm flex-1 sm:flex-none" disabled={!!busy} onClick={() => act('sent')}>{busy === 'sent' ? <Spinner /> : <Check className="h-4 w-4" />}Mark sent</button>
            <button className="btn-ghost btn-sm flex-1 sm:flex-none" disabled={!!busy} onClick={() => act('cancelled')}>{busy === 'cancelled' ? <Spinner /> : <X className="h-4 w-4" />}Cancel &amp; refund</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemEditor({ item, onClose, onSaved }: { item: Partial<RewardItem> | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState<Partial<RewardItem>>({})
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState<Partial<RewardItem> | null>(null)
  if (item !== key) { setKey(item); setF(item ?? {}); setPhoto(null) }
  const set = <K extends keyof RewardItem>(k: K, v: RewardItem[K]) => setF((x) => ({ ...x, [k]: v }))
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      const image_url = photo ? await uploadCover(photo) : f.image_url ?? null
      await admin.saveRewardItem({ ...f, image_url, name: f.name ?? '', points_cost: Number(f.points_cost) })
      toast(f.id ? 'Reward updated' : 'Reward added'); onSaved()
    } catch (e: any) { toast(e.message, 'err') } finally { setBusy(false) }
  }
  return (
    <Modal open={!!item} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h3 className="pr-10 text-xl font-semibold">{f.id ? 'Edit reward' : 'Add a reward'}</h3>
        <FileDrop label="Photo (optional)" hint="Square works best" file={photo} onFile={setPhoto} previewUrl={f.image_url ?? null} />
        <div><label className="label">Name</label><input className="input" required minLength={2} maxLength={120} value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="GHS 10 airtime" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Vendor</label><input className="input" maxLength={120} value={f.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} placeholder="Any network, shop name…" /></div>
          <div><label className="label">Category</label><select className="input" value={f.category ?? 'product'} onChange={(e) => set('category', e.target.value as RewardCategory)}>{Object.entries(REWARD_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label">Points needed</label><input className="input" type="number" required min={1} step={1} value={f.points_cost ?? ''} onChange={(e) => set('points_cost', Number(e.target.value))} placeholder="100" /></div>
          <div><label className="label">Stock</label><input className="input" type="number" min={0} step={1} value={f.stock ?? ''} onChange={(e) => set('stock', e.target.value === '' ? null : Number(e.target.value))} placeholder="Unlimited" /></div>
        </div>
        <div><label className="label">Description</label><textarea className="input min-h-[5rem]" maxLength={1000} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="What they get and how it reaches them" /></div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={f.active ?? true} onChange={(e) => set('active', e.target.checked)} />Show to students</label>
        <button className="btn-brand w-full" disabled={busy}>{busy && <Spinner />}{f.id ? 'Save changes' : 'Add reward'}</button>
      </form>
    </Modal>
  )
}

function Balances({ balances, profiles }: { balances: Map<string, number>; profiles: Profile[] }) {
  const rows = useMemo(() => [...balances.entries()].filter(([, b]) => b !== 0)
    .map(([id, b]) => ({ p: profiles.find((x) => x.id === id), b })).sort((a, b) => b.b - a.b), [balances, profiles])
  if (!rows.length) return <div className="mt-4"><Empty icon={<Coins className="h-6 w-6" />} title="Nobody has points yet" body="Points appear when you approve work on a points gig." /></div>
  return (
    <div className="card mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-ink-muted"><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">School</th><th className="px-4 py-3 text-right font-medium">Balance</th></tr></thead>
        <tbody>{rows.map(({ p, b }, i) => (
          <tr key={p?.id ?? i} className="border-b border-line last:border-0"><td className="px-4 py-3"><div className="font-medium">{p?.full_name ?? 'Unknown'}</div><div className="text-xs text-ink-muted">{p?.email}</div></td><td className="px-4 py-3 text-ink-soft">{p?.school ?? '—'}</td><td className={`px-4 py-3 text-right font-semibold ${b < 0 ? 'text-red-700' : ''}`}>{points(b)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function AdjustPoints({ open, profiles, balances, onClose, onSaved }: { open: boolean; profiles: Profile[]; balances: Map<string, number>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [who, setWho] = useState('')
  const [delta, setDelta] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const found = q.trim().length < 2 ? [] : profiles.filter((p) => `${p.full_name} ${p.email}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
  const picked = profiles.find((p) => p.id === who)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!who) return toast('Pick a student', 'err')
    setBusy(true)
    try { await admin.adjustPoints(who, Number(delta), note); toast('Points updated'); setQ(''); setWho(''); setDelta(''); setNote(''); onSaved() }
    catch (e: any) { toast(e.message, 'err') } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <h3 className="pr-10 text-xl font-semibold">Adjust points</h3>
        {picked ? (
          <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 text-sm"><div><b>{picked.full_name}</b><div className="text-ink-muted">Balance {points(balances.get(picked.id) ?? 0)}</div></div><button type="button" className="text-ink-muted underline" onClick={() => setWho('')}>Change</button></div>
        ) : (
          <div><label className="label">Student</label><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" />
            {found.length > 0 && <div className="mt-2 divide-y divide-line rounded-2xl border border-line">{found.map((p) => <button type="button" key={p.id} onClick={() => setWho(p.id)} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-sand"><b>{p.full_name}</b> <span className="text-ink-muted">{p.email}</span></button>)}</div>}
          </div>
        )}
        <div><label className="label">Points (use a minus sign to remove)</label><input className="input" type="number" step={1} required value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="50 or -20" /></div>
        <div><label className="label">Reason</label><input className="input" required minLength={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Welcome bonus, correction…" /></div>
        <button className="btn-brand w-full" disabled={busy}>{busy && <Spinner />}Save</button>
      </form>
    </Modal>
  )
}
