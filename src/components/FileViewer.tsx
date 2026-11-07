import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Download, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadListingFile, listingFileUrl } from '../lib/api'
import { fileSize, friendlyError } from '../lib/security'
import type { ListingFile } from '../lib/types'
import { Spinner, useToast } from './ui'

export const canPreview = (mime: string) => mime === 'application/pdf' || mime.startsWith('image/')

/**
 * Full-screen, in-app preview for PDFs and images. PDFs are drawn page by page with pdf.js, so they display
 * the same on every phone, including Android Chrome and WhatsApp/Instagram's built-in browsers.
 */
export default function FileViewer({ file, onClose }: { file: ListingFile | null; onClose: () => void }) {
  useEffect(() => {
    if (!file) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [file, onClose])

  return createPortal(
    <AnimatePresence>
      {file && (
        <motion.div key={file.id} role="dialog" aria-modal="true" aria-label={file.name}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex flex-col bg-ink/95 backdrop-blur-sm">
          <Header file={file} onClose={onClose} />
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {file.mime === 'application/pdf' ? <PdfPages file={file} /> : <ImageView file={file} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Header({ file, onClose }: { file: ListingFile; onClose: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const dl = async () => { setBusy(true); try { await downloadListingFile(file) } catch (e: any) { toast(friendlyError(e.message), 'err') } finally { setBusy(false) } }
  return (
    <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 text-white sm:px-5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} aria-label="Close preview" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white/10"><X className="h-5 w-5" /></button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-white/50">{fileSize(file.size_bytes)}</div>
      </div>
      <button onClick={dl} disabled={busy} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-brand-50 disabled:opacity-60">
        {busy ? <Spinner /> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">Download</span>
      </button>
    </div>
  )
}

function Problem({ msg }: { msg: string }) {
  return (
    <div className="grid h-full min-h-[50vh] place-items-center px-6 text-center text-white/80">
      <div><AlertCircle className="mx-auto h-8 w-8 text-white/50" /><p className="mt-3 max-w-xs text-sm">{msg}</p><p className="mt-1 text-xs text-white/50">You can still download it with the button above.</p></div>
    </div>
  )
}

function ImageView({ file }: { file: ListingFile }) {
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { let on = true; listingFileUrl(file).then((u) => on && setUrl(u)).catch((e) => on && setErr(friendlyError(e.message))); return () => { on = false } }, [file])
  if (err) return <Problem msg={err} />
  if (!url) return <div className="grid h-full min-h-[50vh] place-items-center text-white/70"><Spinner className="h-6 w-6" /></div>
  return <div className="flex min-h-full items-center justify-center p-3 sm:p-6"><img src={url} alt={file.name} className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" /></div>
}

function PdfPages({ file }: { file: ListingFile }) {
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<{ pages: number; done: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let doc: any
    ;(async () => {
      try {
        // loaded only when someone opens a PDF, so the rest of the site stays light
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.min.mjs')
        const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
        pdfjs.GlobalWorkerOptions.workerSrc = worker
        const url = await listingFileUrl(file)
        // demo files live in the browser as data: URLs, which the site's security policy won't let pdf.js fetch
        const src = url.startsWith('data:') ? { data: Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0)) } : { url }
        doc = await pdfjs.getDocument({ ...src, isEvalSupported: false, enableXfa: false }).promise
        if (cancelled) return
        setState({ pages: doc.numPages, done: 0 })
        const host = box.current!
        const width = Math.min(host.clientWidth - 24, 900)
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        for (let n = 1; n <= doc.numPages && !cancelled; n++) {
          const page = await doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const vp = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height)
          canvas.style.width = `${Math.floor(vp.width / ratio)}px`; canvas.style.height = `${Math.floor(vp.height / ratio)}px`
          canvas.className = 'mx-auto block rounded-md bg-white shadow-2xl'
          canvas.setAttribute('aria-label', `Page ${n} of ${doc.numPages}`)
          const wrap = document.createElement('div'); wrap.className = 'mb-3'; wrap.appendChild(canvas)
          host.appendChild(wrap)
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise
          page.cleanup()
          if (!cancelled) setState({ pages: doc.numPages, done: n })
        }
      } catch (e: any) {
        if (!cancelled) setErr(/password/i.test(e?.message ?? '') ? 'This PDF is password-protected and can’t be previewed.' : 'We couldn’t preview this PDF.')
      }
    })()
    return () => { cancelled = true; doc?.destroy?.() }
  }, [file])

  if (err) return <Problem msg={err} />
  return (
    <>
      <div ref={box} className="px-3 py-4 sm:py-6" />
      {(!state || state.done < state.pages) && (
        <div className="flex items-center justify-center gap-2 pb-8 text-sm text-white/70">
          <Spinner />{state ? `Loading page ${state.done + 1} of ${state.pages}…` : 'Opening PDF…'}
        </div>
      )}
    </>
  )
}
