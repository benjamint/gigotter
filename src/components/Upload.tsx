import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, ImageUp, RefreshCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function FileDrop({ label, hint, file, onFile, previewUrl, capture }: {
  label: string; hint?: string; file: File | null; onFile: (f: File) => void; previewUrl?: string | null; capture?: 'user' | 'environment'
}) {
  const [drag, setDrag] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { if (!file) return setUrl(null); const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u) }, [file])
  const shown = url ?? previewUrl
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      className={`relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed p-4 text-center transition ${drag ? 'border-brand-600 bg-brand-50' : shown ? 'border-ink bg-white' : 'border-line bg-white hover:border-ink'}`}>
      <input type="file" accept="image/*" capture={capture} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      {shown ? (
        <>
          <img src={shown} alt={label} className="max-h-48 rounded-2xl object-contain" />
          <span className="chip absolute right-3 top-3 bg-brand-50"><Check className="h-3 w-3" />Added</span>
          <span className="mt-2 text-xs text-ink-muted">Tap to replace</span>
        </>
      ) : (
        <>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="grid h-12 w-12 place-items-center rounded-2xl bg-sand"><ImageUp /></motion.div>
          <div className="mt-3 font-semibold">{label}</div>
          {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
        </>
      )}
    </label>
  )
}

/** Live camera selfie, falls back to the phone's front camera file picker */
export function SelfieCam({ file, onFile, previewUrl }: { file: File | null; onFile: (f: File) => void; previewUrl?: string | null }) {
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [shot, setShot] = useState<string | null>(null)

  useEffect(() => { if (!file) return setShot(null); const u = URL.createObjectURL(file); setShot(u); return () => URL.revokeObjectURL(u) }, [file])
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream])

  const start = async () => {
    setErr(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 720, height: 720 } })
      setStream(s)
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = s; video.current.play() } })
    } catch { setErr('Camera blocked — use the upload button instead.') }
  }
  const snap = () => {
    const v = video.current!
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0)
    setFlash(true); setTimeout(() => setFlash(false), 250)
    c.toBlob((b) => {
      if (b) onFile(new File([b], 'selfie.jpg', { type: 'image/jpeg' }))
      stream?.getTracks().forEach((t) => t.stop()); setStream(null)
    }, 'image/jpeg', 0.9)
  }
  const shown = shot ?? previewUrl

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-64 max-w-full overflow-hidden rounded-full border border-line bg-sand shadow-soft">
        {stream ? <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          : shown ? <img src={shown} alt="Your selfie" className="h-full w-full object-cover" />
          : <div className="grid h-full place-items-center text-ink-muted"><Camera className="h-10 w-10" strokeWidth={1.25} /></div>}
        {stream && <motion.div className="pointer-events-none absolute inset-6 rounded-full border border-dashed border-white/80" animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} />}
        <AnimatePresence>{flash && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} />}</AnimatePresence>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {stream ? (
          <button type="button" onClick={snap} className="btn-brand"><Camera className="h-5 w-5" />Snap it</button>
        ) : (
          <button type="button" onClick={start} className="btn-primary">{shown ? <><RefreshCcw className="h-4 w-4" />Retake</> : <><Camera className="h-4 w-4" />Open camera</>}</button>
        )}
        <label className="btn-ghost cursor-pointer">
          Upload instead
          <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        </label>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <p className="mt-3 max-w-xs text-center text-xs text-ink-muted">Good light, no sunglasses, face in the circle. We match it to your ID.</p>
    </div>
  )
}
