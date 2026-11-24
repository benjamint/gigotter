import { motion } from 'framer-motion'
import { ArrowRight, Check, Gift } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Empty, Modal, PageLoader, Spinner, useToast } from '../components/ui'
import { listRewardItems, myPoints, redeemItem } from '../lib/api'
import { points } from '../lib/format'
import { useAsync, useSession } from '../lib/session'
import { friendlyError } from '../lib/security'
import { REWARD_CATEGORIES, WELCOME_POINTS, type RewardCategory, type RewardItem } from '../lib/types'
import { ItemThumb } from './admin/Rewards'
import OtterCard from '../components/OtterCard'

/** Rewards: spend Gigotter points (earned on points gigs) on airtime, data and products. */
export default function Rewards() {
  const { user, profile } = useSession()
  const items = useAsync(() => listRewardItems(), [])
  const bal = useAsync(() => (user ? myPoints() : Promise.resolve(null)), [user?.id])
  const [cat, setCat] = useState<RewardCategory | 'all'>('all')
  const [pick, setPick] = useState<RewardItem | null>(null)
  const all = items.data ?? []
  const cats = (['all', ...Object.keys(REWARD_CATEGORIES)] as (RewardCategory | 'all')[]).filter((c) => c === 'all' || all.some((i) => i.category === c))
  const list = useMemo(() => all.filter((i) => cat === 'all' || i.category === cat), [all, cat])
  const balance = bal.data?.balance ?? 0
  const verified = profile?.kyc_status === 'verified'
  const entries = bal.data?.entries ?? []
  const welcomeOnly = entries.length === 1 && entries[0].kind === 'welcome'

  return (
    <div className="container-x pb-16 pt-10 md:pt-16">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="grid gap-6 md:grid-cols-[1fr,auto] md:items-end">
        <div>
          <div className="eyebrow">Rewards</div>
          <h1 className="mt-5 text-[clamp(2.6rem,6vw,4.75rem)] font-semibold leading-[1] tracking-[-0.045em]">Spend your <span className="em">points.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-ink-muted md:text-xl">Earn Gigotter points on quick gigs, then swap them for airtime, data and goodies from our partners.</p>
        </div>
        {user ? (
          <div className="w-full md:w-[22rem]">
            {bal.loading ? <div className="aspect-[85.6/54] w-full animate-pulse rounded-[24px] bg-brand-50" />
              : <OtterCard size="sm" picker={false} name={profile?.full_name || 'Gigotter member'} code={`OTTER · ${(profile?.referral_code || user.id.slice(0, 6)).toUpperCase()}`} balance={balance} active={verified} />}
            {welcomeOnly && <div className="mt-3 text-sm text-ink-soft">🎁 Your {WELCOME_POINTS}-point welcome bonus is on your card. Pick a reward below!</div>}
            <Link to="/gigs" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-2 hover:underline">Earn more on points gigs <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#F9C93A]/30 p-6 md:max-w-xs">
            <div className="font-semibold">Join to start earning points</div>
            <p className="mt-1 text-sm text-ink-muted">Sign up, get verified, and take points gigs.</p>
            <div className="mt-3 flex gap-2"><Link to="/signup" className="btn-primary btn-sm">Sign up</Link><Link to="/login?next=/rewards" className="btn-ghost btn-sm">Log in</Link></div>
          </div>
        )}
      </motion.div>

      {cats.length > 2 && (
        <div className="-mx-4 mt-10 flex gap-1 overflow-x-auto border-y border-line px-4 py-4 md:mx-0">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`relative shrink-0 rounded-full px-4 py-2 text-sm transition ${cat === c ? 'font-medium text-white' : 'text-ink-muted hover:text-ink'}`}>
              {cat === c && <motion.span layoutId="reward-pill" className="absolute inset-0 rounded-full bg-brand-700" transition={{ duration: 0.3 }} />}
              <span className="relative">{c === 'all' ? 'All' : REWARD_CATEGORIES[c]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {items.loading ? <PageLoader /> : list.length === 0 ? <Empty icon={<Gift className="h-6 w-6" />} title="New rewards are on the way" body="Check back soon. Meanwhile, keep earning points on gigs." action={<Link to="/gigs" className="btn-brand">Find gigs</Link>} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((it, i) => {
              const out = it.stock != null && it.stock < 1
              const short = Math.max(0, it.points_cost - balance)
              return (
                <motion.div key={it.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="card flex flex-col p-4">
                  <ItemThumb it={it} className="aspect-[16/9] h-auto w-full" />
                  <div className="mt-4 flex-1">
                    <div className="text-xs font-medium text-ink-muted">{it.vendor || REWARD_CATEGORIES[it.category]}</div>
                    <h3 className="mt-0.5 text-lg font-semibold leading-snug">{it.name}</h3>
                    {it.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{it.description}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                    <div>
                      <div className="font-display text-2xl font-semibold tracking-tight">{points(it.points_cost)}</div>
                      <div className="text-xs text-ink-muted">{out ? 'Out of stock' : it.stock != null && it.stock <= 5 ? `Only ${it.stock} left` : ' '}</div>
                    </div>
                    {!user ? <Link to="/login?next=/rewards" className="btn-brand btn-sm">Redeem</Link>
                      : out ? <span className="chip bg-sand text-ink-muted">Out of stock</span>
                      : short > 0 ? <span className="chip bg-sand text-ink-soft">{points(short)} to go</span>
                      : <button className="btn-brand btn-sm" onClick={() => setPick(it)}>Redeem</button>}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
      <RedeemSheet item={pick} balance={balance} verified={verified} phone={profile?.momo_number || profile?.phone || ''} onClose={() => setPick(null)} onDone={() => { setPick(null); bal.reload(); items.reload() }} />
    </div>
  )
}

function RedeemSheet({ item, balance, verified, phone: defPhone, onClose, onDone }: { item: RewardItem | null; balance: number; verified: boolean; phone: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [phone, setPhone] = useState(defPhone)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [key, setKey] = useState<RewardItem | null>(null)
  if (item !== key) { setKey(item); setPhone(defPhone); setNote(''); setDone(false) }
  const airtime = item?.category === 'airtime'
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!item) return
    setBusy(true)
    try { await redeemItem(item.id, phone, note); setDone(true) }
    catch (e: any) { toast(friendlyError(e.message), 'err') } finally { setBusy(false) }
  }
  return (
    <Modal open={!!item} onClose={done ? onDone : onClose}>
      {item && (done ? (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700"><Check className="h-7 w-7" /></span>
          <h3 className="mt-4 text-xl font-semibold">Request sent!</h3>
          <p className="mt-2 text-sm text-ink-muted">We’ve taken {points(item.points_cost)} from your balance. We’ll send <b className="text-ink">{item.name}</b> {airtime ? `to ${phone}` : 'and contact you on ' + phone} and email you when it’s on its way.</p>
          <button className="btn-brand mt-6 w-full" onClick={onDone}>Done</button>
        </div>
      ) : !verified ? (
        <div>
          <h3 className="pr-10 text-xl font-semibold">Verify your account first</h3>
          <p className="mt-2 text-sm text-ink-muted">To keep rewards safe, only verified members can redeem. It takes about 2 minutes.</p>
          <Link to="/verify" className="btn-brand mt-6 w-full">Verify now</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-4 pr-10">
            <ItemThumb it={item} className="h-16 w-16" />
            <div className="min-w-0"><h3 className="text-xl font-semibold leading-snug">{item.name}</h3><div className="text-sm text-ink-muted">{points(item.points_cost)} · you’ll have {points(balance - item.points_cost)} left</div></div>
          </div>
          <div><label className="label">{airtime ? 'Phone number for the airtime' : 'Phone number we can reach you on'}</label><input className="input" type="tel" required inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" /></div>
          <div><label className="label">{airtime ? 'Network (optional)' : 'Delivery or pickup note'}</label><input className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={airtime ? 'MTN, Telecel, AT…' : 'Hall and room, or where you’d like to pick it up'} /></div>
          <p className="text-xs text-ink-muted">Points are taken when you confirm. If we can’t send it, we’ll cancel the request and refund your points.</p>
          <button className="btn-brand w-full" disabled={busy}>{busy && <Spinner />}Confirm · {points(item.points_cost)}</button>
        </form>
      ))}
    </Modal>
  )
}
