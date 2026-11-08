import { AnimatePresence, motion } from 'framer-motion'
import { Check, Mail, Receipt, Smartphone, Wallet } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Modal, Spinner, useToast } from '../../components/ui'
import { admin } from '../../lib/api'
import { ago, money } from '../../lib/format'
import { subTitle } from '../../lib/forms'
import type { Listing, Payment, Profile, Submission } from '../../lib/types'

const toLocal = (d = new Date()) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16) }

/** Shown when one student is selected on a gig's responses page: what's owed, record a payment, past receipts. */
export default function PaymentPanel({ student, subs, listing, onPaid }: { student: Profile; subs: Submission[]; listing: Listing; onPaid: () => void }) {
  const toast = useToast()
  const [history, setHistory] = useState<Payment[] | null>(null)
  const [open, setOpen] = useState(false)
  const [resending, setResending] = useState<string | null>(null)
  const owed = subs.filter((s) => s.status === 'approved' && !s.payment_id)
  const due = owed.reduce((a, s) => a + (s.amount ?? 0), 0)
  const load = () => admin.payments(student.id, listing.id).then(setHistory).catch(() => setHistory([]))
  useEffect(() => { setHistory(null); load() }, [student.id, listing.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalPaid = (history ?? []).reduce((a, p) => a + p.amount, 0)

  const resend = async (p: Payment) => {
    setResending(p.id)
    try { await admin.resendReceipt(p.id); toast(`Receipt ${p.receipt_no} sent again to ${student.email}`); load() }
    catch (e: any) { toast(e.message, 'err') } finally { setResending(null) }
  }

  return (
    <div className="card mb-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700"><Wallet className="h-5 w-5" /></span>
          <div>
            <div className="text-sm text-ink-muted">Owed to {student.full_name?.split(' ')[0] || 'this student'} on this gig</div>
            <div className="text-2xl font-semibold tabular-nums">{money(due, listing.currency)} <span className="text-sm font-normal text-ink-muted">· {owed.length} approved, unpaid</span></div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted"><Smartphone className="h-3.5 w-3.5" />{student.momo_provider || 'MoMo'} {student.momo_number || '— no number on file'}{student.momo_name ? ` · ${student.momo_name}` : ''}</div>
          </div>
        </div>
        <button onClick={() => setOpen(true)} disabled={!owed.length} className="btn-brand btn-sm" title={owed.length ? '' : 'Approve some work first'}><Receipt className="h-4 w-4" />Record payment</button>
      </div>

      {history && history.length > 0 && (
        <div className="border-t border-line bg-paper/60 px-5 py-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-muted"><span>Payments</span><span className="normal-case tracking-normal">{money(totalPaid, listing.currency)} paid in total</span></div>
          <ul className="divide-y divide-line">
            {history.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="font-mono font-semibold">{p.receipt_no}</span>
                <span className="font-semibold tabular-nums">{money(p.amount, p.currency)}</span>
                <span className="text-ink-muted">{p.items} item{p.items === 1 ? '' : 's'} · {new Date(p.paid_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{p.reference ? ` · ${p.reference}` : ''}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-ink-muted">{p.email_sent_at ? `Receipt emailed ${ago(p.email_sent_at)}` : 'Receipt not emailed'}</span>
                  <button onClick={() => resend(p)} disabled={resending === p.id} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">{resending === p.id ? <Spinner className="h-3 w-3" /> : <Mail className="h-3 w-3" />}Resend</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RecordPayment open={open} onClose={() => setOpen(false)} student={student} owed={owed} listing={listing}
        onDone={(p) => { setOpen(false); toast(`${money(p.amount, p.currency)} recorded · receipt ${p.receipt_no} emailed to ${student.full_name?.split(' ')[0] || 'the student'}`); load(); onPaid() }} />
    </div>
  )
}

function RecordPayment({ open, onClose, student, owed, listing, onDone }: {
  open: boolean; onClose: () => void; student: Profile; owed: Submission[]; listing: Listing; onDone: (p: Payment) => void
}) {
  const toast = useToast()
  const [picked, setPicked] = useState<string[]>([])
  const [amount, setAmount] = useState('')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const [when, setWhen] = useState(toLocal())
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const sum = (ids: string[]) => owed.filter((s) => ids.includes(s.id)).reduce((a, s) => a + (s.amount ?? 0), 0)
  useEffect(() => {
    if (!open) return
    const all = owed.map((s) => s.id)
    setPicked(all); setAmount(sum(all).toFixed(2)); setRef(''); setNote(''); setWhen(toLocal()); setConfirming(false)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) => { const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]; setPicked(next); setAmount(sum(next).toFixed(2)) }
  const amt = Number(amount), due = sum(picked)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!picked.length) return toast('Tick at least one submission', 'err')
    if (!(amt > 0)) return toast('Enter the amount you sent', 'err')
    if (!confirming) return setConfirming(true) // one extra look before an email goes out
    setBusy(true)
    try { onDone(await admin.recordPayment(student.id, picked, amt, ref, note, new Date(when).toISOString())) }
    catch (err: any) { toast(err.message, 'err'); setConfirming(false) } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Record payment</h2>
          <p className="mt-1 text-sm text-ink-muted">Send the money from your phone first, then record it here. {student.full_name?.split(' ')[0] || 'They'} will get an emailed receipt.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-paper p-4 text-sm">
          <Smartphone className="h-5 w-5 shrink-0 text-ink-muted" />
          <div><div className="font-semibold">{student.momo_provider || 'MoMo'} · {student.momo_number || 'no number on file'}</div><div className="text-ink-muted">{student.momo_name || student.full_name}</div></div>
        </div>

        <div>
          <div className="label">Submissions this pays for</div>
          <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
            {owed.map((s) => (
              <li key={s.id}><label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
                <span className="min-w-0 flex-1 truncate">{subTitle(s)}</span><span className="tabular-nums text-ink-muted">{money(s.amount, listing.currency)}</span>
              </label></li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Amount you sent</label>
            <input className="input text-lg font-semibold tabular-nums" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false) }} />
            {amt > 0 && Math.abs(amt - due) > 0.004 && <p className="mt-1.5 text-xs text-clay-600">{amt > due ? `${money(amt - due, listing.currency)} more` : `${money(due - amt, listing.currency)} less`} than the {money(due, listing.currency)} earned. Add a note to explain.</p>}
          </div>
          <div><label className="label">Date sent</label><input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        </div>
        <div><label className="label">MoMo transaction ID <span className="font-normal text-ink-muted">(recommended)</span></label><input className="input font-mono" maxLength={80} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="From your MoMo confirmation SMS" /></div>
        <div><label className="label">Note to the student <span className="font-normal text-ink-muted">(optional, shown on the receipt)</span></label><input className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Includes a ₵10 bonus. Thank you!" /></div>

        <AnimatePresence>
          {confirming && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
                Mark <b>{picked.length}</b> submission{picked.length === 1 ? '' : 's'} paid and email <b>{student.email}</b> a receipt for <b>{money(amt, listing.currency)}</b>?
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button className="btn-brand w-full" disabled={busy}>
          {busy ? <Spinner /> : confirming ? <><Check className="h-4 w-4" />Yes, record and send receipt</> : <>Record {money(amt || 0, listing.currency)} payment</>}
        </button>
      </form>
    </Modal>
  )
}
