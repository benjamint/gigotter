import { AnimatePresence, Reorder, motion } from 'framer-motion'
import { Eye, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { FieldInput, isWide } from '../../components/FormFields'
import { FIELD_TYPES, keyFor } from '../../lib/forms'
import type { FieldType, FormField, PhotoRule } from '../../lib/types'

type Row = FormField & { _id: string }
const rid = () => Math.random().toString(36).slice(2)
export const toRows = (fs: FormField[]): Row[] => fs.map((f) => ({ ...f, _id: rid() }))
/** Strip editor-only props and give new questions a stable key. */
export function toSchema(rows: Row[]): FormField[] {
  const taken: string[] = rows.map((r) => r.key).filter(Boolean)
  return rows.map(({ _id, ...f }) => {
    const key = f.key || keyFor(f.label, taken); if (!f.key) taken.push(key)
    const out: FormField = { key, label: f.label.trim(), type: f.type, required: f.required }
    if (f.hint?.trim()) out.hint = f.hint.trim()
    if (f.placeholder?.trim()) out.placeholder = f.placeholder.trim()
    if (f.type === 'choice' || f.type === 'multi') out.options = (f.options ?? []).map((o) => o.trim()).filter(Boolean)
    if (f.unique && ['text', 'phone', 'email', 'link'].includes(f.type)) out.unique = true
    return out
  })
}
export function schemaProblem(rows: Row[], photo: PhotoRule, what = 'question'): string | null {
  if (!rows.length && photo === 'none') return what === 'question' ? 'Add at least one question or ask for a photo' : `Add at least one ${what}`
  if (rows.length > 30) return 'Keep it to 30 questions or fewer'
  for (const r of rows) {
    if (!r.label.trim()) return 'Every question needs a label'
    if ((r.type === 'choice' || r.type === 'multi') && (r.options ?? []).filter((o) => o.trim()).length < 2) return `Give “${r.label}” at least two options`
  }
  if (rows.filter((r) => r.type === 'address').length > 1) return 'Use only one address question per gig'
  return null
}

const PHOTO: Record<PhotoRule, string> = { required: 'Required', optional: 'Optional', none: 'No photo' }

export default function FormBuilder({ rows, setRows, photo, setPhoto, photoHint, setPhotoHint, unit, hasResponses, heading, intro, noPhoto }: {
  rows: Row[]; setRows: (r: Row[]) => void; photo: PhotoRule; setPhoto: (p: PhotoRule) => void
  photoHint: string; setPhotoHint: (s: string) => void; unit: string; hasResponses: boolean
  /** reuse for other forms (e.g. application questions) */
  heading?: string; intro?: string; noPhoto?: boolean
}) {
  const [preview, setPreview] = useState(false)
  const [pv, setPv] = useState<Record<string, string>>({})
  const upd = (id: string, patch: Partial<Row>) => setRows(rows.map((r) => (r._id === id ? { ...r, ...patch } : r)))
  const add = () => setRows([...rows, { _id: rid(), key: '', label: '', type: 'text', required: true }])

  return (
    <div className="rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{heading ?? `What people submit for each ${unit || 'unit'}`}</div>
          <p className="text-sm text-ink-muted">{intro ?? 'Ask exactly what this gig needs. Drag to reorder.'}</p>
        </div>
        <button type="button" onClick={() => setPreview(!preview)} className="btn-ghost btn-sm"><Eye className="h-4 w-4" />{preview ? 'Edit questions' : 'Preview'}</button>
      </div>
      {hasResponses && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">This gig already has responses. Renaming or removing a question won’t change answers already submitted.</p>}

      {preview ? (
        <div className="mt-5 grid gap-5 rounded-2xl bg-paper p-4 sm:grid-cols-2">
          {toSchema(rows).map((f) => (
            <div key={f.key} className={isWide(f) ? 'sm:col-span-2' : ''}>
              <label className="label">{f.label}{!f.required && <span className="font-normal text-ink-muted"> (optional)</span>}</label>
              {/* preview only: never block the gig form from saving */}
              <FieldInput f={{ ...f, required: false }} form={pv} setForm={setPv} />
              {f.hint && <p className="mt-1.5 text-xs text-ink-muted">{f.hint}</p>}
            </div>
          ))}
          {!noPhoto && photo !== 'none' && <div className="sm:col-span-2 rounded-2xl border border-dashed border-line bg-white p-4 text-sm text-ink-muted">Photo proof{photo === 'optional' ? ' (optional)' : ''} — {photoHint || 'a clear photo or screenshot'}</div>}
        </div>
      ) : (
        <>
          <Reorder.Group axis="y" values={rows} onReorder={setRows} className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {rows.map((r, i) => (
                <Reorder.Item key={r._id} value={r} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-line bg-paper p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-3 h-4 w-4 shrink-0 cursor-grab text-ink-muted active:cursor-grabbing" aria-label="Drag to reorder" />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_170px]">
                      <input className="input bg-white py-2.5" value={r.label} onChange={(e) => upd(r._id, { label: e.target.value })} placeholder={`Question ${i + 1}`} aria-label="Question" />
                      <select className="input bg-white py-2.5" value={r.type} onChange={(e) => upd(r._id, { type: e.target.value as FieldType, options: e.target.value === 'choice' || e.target.value === 'multi' ? (r.options?.length ? r.options : ['', '']) : r.options })} aria-label="Answer type">
                        {Object.entries(FIELD_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      {(r.type === 'choice' || r.type === 'multi') && (
                        <input className="input bg-white py-2.5 sm:col-span-2" value={(r.options ?? []).join(', ')} placeholder="Options, separated by commas"
                          onChange={(e) => upd(r._id, { options: e.target.value.split(',').map((o) => o.trimStart()) })} aria-label="Options" />
                      )}
                      <input className="input bg-white py-2 text-sm sm:col-span-2" value={r.hint ?? ''} onChange={(e) => upd(r._id, { hint: e.target.value })} placeholder="Help text (optional) — e.g. “As it appears on the signboard”" aria-label="Help text" />
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm sm:col-span-2">
                        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={r.required} onChange={(e) => upd(r._id, { required: e.target.checked })} />Required</label>
                        {['text', 'phone', 'email', 'link'].includes(r.type) && (
                          <label className="flex items-center gap-2" title="Stops the same answer being submitted twice on this gig"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!r.unique} onChange={(e) => upd(r._id, { unique: e.target.checked })} />No duplicates</label>
                        )}
                        <span className="text-xs text-ink-muted">{FIELD_TYPES[r.type].hint}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setRows(rows.filter((x) => x._id !== r._id))} aria-label="Remove question" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-white hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
          <button type="button" onClick={add} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-medium text-ink-soft hover:border-ink/40 hover:text-ink"><Plus className="h-4 w-4" />Add question</button>
        </>
      )}

      {!noPhoto && <motion.div layout className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Photo proof">
          <span className="mr-1 self-center text-sm font-medium">Photo</span>
          {(Object.keys(PHOTO) as PhotoRule[]).map((p) => (
            <button type="button" role="radio" aria-checked={photo === p} key={p} onClick={() => setPhoto(p)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${photo === p ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{PHOTO[p]}</button>
          ))}
        </div>
        {photo !== 'none' && <input className="input py-2.5 text-sm" value={photoHint} onChange={(e) => setPhotoHint(e.target.value)} placeholder="What should the photo show? e.g. the shopfront" aria-label="Photo instructions" />}
      </motion.div>}
    </div>
  )
}
