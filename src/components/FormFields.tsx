import { Star } from 'lucide-react'
import { splitMulti } from '../lib/forms'
import type { FormField } from '../lib/types'
import AddressField from './AddressField'

type Vals = Record<string, string>

/** One question on a gig's submission form, rendered for its type. */
export function FieldInput({ f, form, setForm }: { f: FormField; form: Vals; setForm: (v: Vals) => void }) {
  const v = form[f.key] ?? ''
  const set = (x: string) => setForm({ ...form, [f.key]: x })
  const pill = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-medium transition ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`

  switch (f.type) {
    case 'address':
      return (
        <AddressField value={v} gps={form.gps} accuracy={form.gps_accuracy} placeholder={f.placeholder || 'Building, street, area, city — and a landmark'} required={f.required}
          onChange={set}
          onGps={(gps, acc) => { const n = { ...form }; if (gps) { n.gps = gps; n.gps_accuracy = acc ?? '' } else { delete n.gps; delete n.gps_accuracy } setForm(n) }} />
      )
    case 'long':
      return <textarea className="input min-h-[96px]" maxLength={1500} required={f.required} value={v} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} />
    case 'yes_no':
      return (
        <div role="radiogroup" aria-label={f.label} className="flex gap-2">
          {['Yes', 'No'].map((o) => <button type="button" role="radio" aria-checked={v === o} key={o} onClick={() => set(o)} className={pill(v === o)}>{o}</button>)}
        </div>
      )
    case 'choice': {
      const opts = f.options ?? []
      return opts.length > 6 ? (
        <select className="input" required={f.required} value={v} onChange={(e) => set(e.target.value)}>
          <option value="">Choose one…</option>
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-2">
          {opts.map((o) => <button type="button" role="radio" aria-checked={v === o} key={o} onClick={() => set(v === o && !f.required ? '' : o)} className={pill(v === o)}>{o}</button>)}
        </div>
      )
    }
    case 'multi': {
      const opts = f.options ?? []
      const picked = splitMulti(v)
      // keep the options' own order so answers read the same for everyone
      const toggle = (o: string) => set(opts.filter((x) => (x === o ? !picked.includes(o) : picked.includes(x))).join(', '))
      return (
        <div>
          <div role="group" aria-label={f.label} className="flex flex-wrap gap-2">
            {opts.map((o) => <button type="button" role="checkbox" aria-checked={picked.includes(o)} key={o} onClick={() => toggle(o)} className={pill(picked.includes(o))}>{o}</button>)}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Tick all that apply{picked.length ? ` · ${picked.length} selected` : ''}</p>
        </div>
      )
    }
    case 'rating':
      return (
        <div role="radiogroup" aria-label={f.label} className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" role="radio" aria-checked={v === String(n)} aria-label={`${n} out of 5`} key={n} onClick={() => set(String(n))}
              className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-sand">
              <Star className={`h-6 w-6 transition ${Number(v) >= n ? 'fill-clay-500 text-clay-500' : 'text-line'}`} strokeWidth={1.5} />
            </button>
          ))}
          {v && <span className="ml-2 text-sm text-ink-muted">{v}/5</span>}
        </div>
      )
    default: {
      const type = f.type === 'phone' ? 'tel' : f.type === 'link' ? 'url' : f.type === 'text' ? 'text' : f.type
      return (
        <input className="input" maxLength={300} required={f.required} type={type} value={v} onChange={(e) => set(e.target.value)}
          inputMode={f.type === 'number' ? 'decimal' : f.type === 'phone' ? 'tel' : undefined}
          placeholder={f.placeholder || (f.type === 'link' ? 'https://' : f.type === 'phone' ? '024 123 4567' : '')} />
      )
    }
  }
}

/** Is this question a wide one (full row)? */
export const isWide = (f: FormField) => ['long', 'address', 'choice', 'multi', 'rating'].includes(f.type)
