import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, ChevronDown, MapPin, Send, Users, Wallet } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { applyToListing } from '../lib/api'
import { eligibilityText } from '../lib/audience'
import { money, maxEarn } from '../lib/format'
import { validateAnswers } from '../lib/forms'
import { friendlyError } from '../lib/security'
import { formatDay, sessionsOf, timeRange } from '../lib/sessions'
import type { FormField, Listing } from '../lib/types'
import { FieldInput } from './FormFields'
import { Modal, Spinner, useToast } from './ui'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Application for a gig where people apply and are selected.
 * Bottom sheet on phones: fixed header and Send bar, questions scroll in between.
 * Answers are kept if the sheet is closed by accident, and cleared only after a successful send.
 */
export default function ApplyForm({ listing, open, onClose, onApplied }: { listing: Listing; open: boolean; onClose: () => void; onApplied: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<{ key: string; msg: string } | null>(null)
  const [why, setWhy] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const qs: FormField[] = listing.application_schema ?? []
  const looking = eligibilityText(listing.eligibility)
  const answered = qs.filter((f) => (form[f.key] ?? '').trim()).length

  // a fixed answer clears its error straight away
  useEffect(() => { if (error && !validateAnswers(qs.filter((f) => f.key === error.key), form)) setError(null) }, [form]) // eslint-disable-line react-hooks/exhaustive-deps
  // reopening after a successful send starts fresh
  useEffect(() => { if (open && sent) { setSent(false); setForm({}) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    // find the first question that needs attention and take the person to it
    for (const f of qs) {
      const msg = validateAnswers([f], form)
      if (msg) {
        setError({ key: f.key, msg })
        const el = body.current?.querySelector<HTMLElement>(`[data-q="${CSS.escape(f.key)}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
    setBusy(true)
    try { await applyToListing(listing.id, form); setSent(true); onApplied() }
    catch (err: any) { toast(friendlyError(err.message), 'err') } finally { setBusy(false) }
  }

  const s = sessionsOf(listing)[0]
  const facts: [any, string][] = [
    ...(s ? [[CalendarDays, `${formatDay(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}${timeRange(s) ? ` · ${timeRange(s)}` : ''}`] as [any, string]] : []),
    [MapPin, listing.is_remote ? 'Remote' : listing.location || 'Location shared after selection'],
    [Wallet, money(maxEarn(listing), listing.currency)],
    [Users, 'Selected people only'],
  ]

  return (
    <Modal open={open} onClose={onClose} sheet>
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
            className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center sm:px-10">
            <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="grid h-16 w-16 place-items-center rounded-full bg-[#1f7a4d] text-white"><Check className="h-7 w-7" /></motion.span>
            <h2 className="mt-6 text-3xl tracking-[-0.03em]">Application sent</h2>
            <p className="mt-3 max-w-sm text-ink-muted">Thanks for applying to <b className="font-medium text-ink">{listing.title}</b>.</p>
            <ol className="mt-8 w-full max-w-sm space-y-3 text-left text-sm">
              {['We review every application and choose who takes part.', 'If you’re selected, we’ll email you and the gig appears on your dashboard.', 'You’re paid to your MoMo once you’ve taken part and it’s approved.'].map((t, i) => (
                <li key={t} className="flex gap-3 rounded-2xl bg-sand p-3.5"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold">{i + 1}</span>{t}</li>
              ))}
            </ol>
            <button type="button" onClick={onClose} className="btn-primary mt-8 w-full max-w-sm py-3.5">Done</button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col">
            {/* header */}
            <div className="border-b border-line px-6 pb-4 pt-5 sm:px-8 sm:pt-7">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
              <div className="eyebrow">Apply</div>
              <h2 className="mt-2 pr-10 text-[22px] leading-tight tracking-[-0.03em] sm:text-2xl">{listing.title}</h2>
            </div>

            {/* questions */}
            <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
              <div className="flex flex-wrap gap-2">
                {facts.map(([I, t]) => <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-ink-soft"><I className="h-3.5 w-3.5" />{t}</span>)}
              </div>
              {looking && <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm"><b className="font-medium">Looking for:</b> {looking}</p>}

              {qs.length > 0 ? (
                <ol className="mt-7 space-y-7">
                  {qs.map((f, i) => {
                    const bad = error?.key === f.key
                    return (
                      <li key={f.key} data-q={f.key} className={`scroll-mt-6 rounded-2xl transition-[background-color,box-shadow] duration-300 ${bad ? 'bg-red-50/60 p-4 ring-1 ring-red-300' : ''}`}>
                        <div className="mb-3 flex gap-3">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                          <div>
                            <div className="font-medium leading-snug">{f.label}{!f.required && <span className="font-normal text-ink-muted"> (optional)</span>}</div>
                            {f.hint && <p className="mt-1 text-sm text-ink-muted">{f.hint}</p>}
                          </div>
                        </div>
                        <div className="pl-9"><FieldInput f={f} form={form} setForm={setForm} /></div>
                        {bad && <p role="alert" className="mt-2.5 pl-9 text-sm font-medium text-red-700">{error!.msg}</p>}
                      </li>
                    )
                  })}
                </ol>
              ) : <p className="mt-7 text-ink-muted">No questions for this gig. Send your application and we’ll be in touch.</p>}

              <div className="mt-8 border-t border-line pt-4 text-sm text-ink-muted">
                <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="inline-flex items-center gap-1.5 hover:text-ink">
                  Only the Gigotter team sees your answers. <span className="font-medium text-ink underline underline-offset-2">How we use this</span>
                  <ChevronDown className={`h-4 w-4 transition ${why ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {why && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                      <span className="block pt-3 leading-relaxed">Your answers and basic profile (age, gender, and your school or occupation) are shared only with the Gigotter team to choose who takes part. If you’re selected, we’ll email you and the gig will appear on your dashboard. You’re paid once you’ve taken part and it’s approved.</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* send bar, always visible */}
            <div className="flex items-center gap-4 border-t border-line bg-white px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
              {qs.length > 0 && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-ink-muted"><b className="font-semibold text-ink tabular-nums">{answered}</b> of {qs.length} answered</div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand"><motion.div className="h-full rounded-full bg-brand-600" animate={{ width: `${(answered / qs.length) * 100}%` }} transition={{ duration: 0.4, ease: EASE }} /></div>
                </div>
              )}
              <button className={`btn-primary shrink-0 py-3.5 ${qs.length ? '' : 'w-full'}`} disabled={busy}>{busy ? <Spinner /> : <>Send application <Send className="h-4 w-4" /></>}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  )
}
