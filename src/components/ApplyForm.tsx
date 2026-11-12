import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { applyToListing } from '../lib/api'
import { eligibilityText } from '../lib/audience'
import { validateAnswers } from '../lib/forms'
import { friendlyError } from '../lib/security'
import type { Listing } from '../lib/types'
import { FieldInput, isWide } from './FormFields'
import { Modal, Spinner, useToast } from './ui'

/** Application for a gig where people apply and are selected. */
export default function ApplyForm({ listing, open, onClose, onApplied }: { listing: Listing; open: boolean; onClose: () => void; onApplied: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const qs = listing.application_schema ?? []
  const looking = eligibilityText(listing.eligibility)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const problem = validateAnswers(qs, form)
    if (problem) return toast(problem, 'err')
    setBusy(true)
    try { await applyToListing(listing.id, form); toast('Application sent. We’ll email you when a decision is made'); setForm({}); onApplied() }
    catch (err: any) { toast(friendlyError(err.message), 'err') } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <div className="eyebrow">Apply</div>
          <h2 className="mt-1 text-2xl font-semibold">{listing.title}</h2>
          {looking && <p className="mt-2 text-sm text-ink-muted"><b className="font-medium text-ink">Looking for:</b> {looking}</p>}
        </div>
        {qs.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {qs.map((f) => (
              <div key={f.key} className={isWide(f) ? 'sm:col-span-2' : ''}>
                <label className="label">{f.label}{!f.required && <span className="font-normal text-ink-muted"> (optional)</span>}</label>
                <FieldInput f={f} form={form} setForm={setForm} />
                {f.hint && <p className="mt-1.5 text-xs text-ink-muted">{f.hint}</p>}
              </div>
            ))}
          </div>
        )}
        <p className="rounded-2xl bg-paper p-4 text-xs leading-relaxed text-ink-muted">
          Your answers and basic profile (age, gender, and your school or occupation) are shared only with the Gigotter team to choose who takes part. If you’re selected, we’ll email you and the gig will appear on your dashboard. You’re paid once you’ve taken part and it’s approved.
        </p>
        <button className="btn-brand w-full" disabled={busy}>{busy ? <Spinner /> : <>Send application <Send className="h-4 w-4" /></>}</button>
      </form>
    </Modal>
  )
}
