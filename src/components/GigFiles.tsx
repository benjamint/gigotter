import { AnimatePresence, motion } from 'framer-motion'
import { Download, Eye, FileImage, FileSpreadsheet, FileText, Globe, Lock, Paperclip, Presentation, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { deleteListingFile, openListingFile, setListingFileVisibility } from '../lib/api'
import { checkDoc, fileSize, friendlyError } from '../lib/security'
import type { ListingFile } from '../lib/types'
import { Spinner, useToast } from './ui'

function Icon({ mime, className = 'h-5 w-5' }: { mime: string; className?: string }) {
  if (mime.startsWith('image/')) return <FileImage className={className} />
  if (mime.includes('spreadsheet') || mime === 'text/csv') return <FileSpreadsheet className={className} />
  if (mime.includes('presentation')) return <Presentation className={className} />
  return <FileText className={className} />
}
const kind = (mime: string) => mime === 'application/pdf' ? 'PDF' : mime.startsWith('image/') ? 'Image' : mime.includes('word') ? 'Word' : mime.includes('presentation') ? 'PowerPoint' : mime.includes('sheet') ? 'Excel' : mime === 'text/csv' ? 'CSV' : 'Text'
const opensInline = (mime: string) => mime === 'application/pdf' || mime.startsWith('image/')

/** Read-only list for students: tap to open or download. */
export function GigFileList({ files, title = 'Resources', note }: { files: ListingFile[]; title?: string; note?: string }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  if (!files.length) return null
  const open = async (f: ListingFile) => {
    setBusy(f.id)
    try { await openListingFile(f) } catch (e: any) { toast(friendlyError(e.message), 'err') } finally { setBusy(null) }
  }
  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Paperclip className="h-5 w-5 text-ink-muted" />{title}</h2>
      {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {files.map((f) => (
          <li key={f.id}>
            <button onClick={() => open(f)} disabled={busy === f.id}
              className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-soft">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon mime={f.mime} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="block text-xs text-ink-muted">{kind(f.mime)} · {fileSize(f.size_bytes)}</span>
              </span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition group-hover:bg-sand group-hover:text-ink">
                {busy === f.id ? <Spinner /> : opensInline(f.mime) ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export interface PendingFile { key: string; file: File; visibility: ListingFile['visibility'] }

/** Admin editor: saved files change immediately; new files are uploaded when the gig is saved. */
export function AttachmentsEditor({ saved, setSaved, pending, setPending }: {
  saved: ListingFile[]; setSaved: (f: ListingFile[]) => void; pending: PendingFile[]; setPending: (p: PendingFile[]) => void
}) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const add = (list: FileList | null) => {
    const next = [...pending]
    for (const file of Array.from(list ?? [])) {
      try { checkDoc(file); next.push({ key: Math.random().toString(36).slice(2), file, visibility: 'joined' }) }
      catch (e: any) { toast(e.message, 'err') }
    }
    if (saved.length + next.length > 10) return toast('Keep it to 10 files per gig', 'err')
    setPending(next)
  }
  const vis = (v: ListingFile['visibility'], onChange: (v: ListingFile['visibility']) => void) => (
    <div className="flex shrink-0 rounded-full border border-line bg-white p-0.5 text-xs font-medium" role="radiogroup" aria-label="Who can see this file">
      {(['public', 'joined'] as const).map((x) => (
        <button type="button" role="radio" aria-checked={v === x} key={x} onClick={() => onChange(x)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition ${v === x ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'}`}>
          {x === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{x === 'public' ? 'Everyone' : 'Joined only'}
        </button>
      ))}
    </div>
  )
  const row = (key: string, name: string, mime: string, size: number, badge: string | null, v: ListingFile['visibility'], onVis: (v: ListingFile['visibility']) => void, onRemove: () => void) => (
    <motion.li key={key} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700"><Icon mime={mime} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block text-xs text-ink-muted">{kind(mime)} · {fileSize(size)}{badge && <span className="ml-1.5 text-clay-600">· {badge}</span>}</span>
      </span>
      {vis(v, onVis)}
      <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-white hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
    </motion.li>
  )

  return (
    <div className="rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="font-semibold">Attachments</div>
      <p className="text-sm text-ink-muted">Manuals, onboarding guides, brochures, scripts. <b className="font-medium text-ink-soft">Everyone</b> shows on the public gig page; <b className="font-medium text-ink-soft">Joined only</b> is just for students who took the gig.</p>
      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {saved.map((f) => row(f.id, f.name, f.mime, f.size_bytes, null, f.visibility,
            async (v) => { try { await setListingFileVisibility(f.id, v); setSaved(saved.map((x) => (x.id === f.id ? { ...x, visibility: v } : x))) } catch (e: any) { toast(friendlyError(e.message), 'err') } },
            async () => { if (!confirm(`Delete “${f.name}”? Students won’t be able to open it any more.`)) return; try { await deleteListingFile(f); setSaved(saved.filter((x) => x.id !== f.id)); toast('File deleted') } catch (e: any) { toast(friendlyError(e.message), 'err') } }))}
          {pending.map((p) => row(p.key, p.file.name, checkDoc(p.file)[1], p.file.size, 'uploads when you save', p.visibility,
            (v) => setPending(pending.map((x) => (x.key === p.key ? { ...x, visibility: v } : x))),
            () => setPending(pending.filter((x) => x.key !== p.key))))}
        </AnimatePresence>
      </ul>
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
        className={`mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed py-5 text-sm transition ${drag ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-ink/40'}`}>
        <span className="flex items-center gap-2 font-medium text-ink-soft"><Upload className="h-4 w-4" />Add files</span>
        <span className="text-xs text-ink-muted">PDF, Word, PowerPoint, Excel or images · up to 25 MB each</span>
      </button>
      <input ref={input} type="file" multiple hidden accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
    </div>
  )
}
