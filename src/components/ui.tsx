import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { KycStatus, SubmissionStatus } from '../lib/types'

export function Reveal({ children, delay = 0, className = '', y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function CountUp({ to, prefix = '', suffix = '', className = '' }: { to: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const v = useMotionValue(0)
  const txt = useTransform(v, (x) => `${prefix}${Math.round(x).toLocaleString()}${suffix}`)
  useEffect(() => { if (inView) { const c = animate(v, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1] }); return c.stop } }, [inView, to, v])
  return <motion.span ref={ref} className={className}>{txt}</motion.span>
}

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => <Loader2 className={`animate-spin ${className}`} />

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <motion.div animate={{ rotate: 360, scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        className="h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#FF5C39,#FF3CAC,#7B5CFF)]" />
    </div>
  )
}

export function Empty({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink/20 p-10 text-center">
      <motion.div initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220 }} className="text-5xl">{emoji}</motion.div>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-sm text-ink/60">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

const KYC_STYLE: Record<KycStatus, [string, string]> = {
  unverified: ['bg-ink/5 text-ink/60', 'Not verified'],
  pending: ['bg-amber-100 text-amber-800', 'In review'],
  verified: ['bg-emerald-100 text-emerald-800', 'Verified'],
  rejected: ['bg-red-100 text-red-700', 'Needs fixing'],
}
export const KycPill = ({ s }: { s: KycStatus }) => <span className={`chip ${KYC_STYLE[s][0]}`}><Dot />{KYC_STYLE[s][1]}</span>

const SUB_STYLE: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800', approved: 'bg-sky-100 text-sky-800',
  rejected: 'bg-red-100 text-red-700', paid: 'bg-emerald-100 text-emerald-800',
}
export const SubPill = ({ s }: { s: SubmissionStatus }) => <span className={`chip capitalize ${SUB_STYLE[s]}`}><Dot />{s}</span>
const Dot = () => <span className="h-1.5 w-1.5 rounded-full bg-current" />

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border-2 border-ink bg-cream p-6 sm:rounded-[2rem] ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}>
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ─────────── toasts ───────────
type Toast = { id: number; msg: string; kind: 'ok' | 'err' }
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<Toast[]>([])
  const push = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    set((x) => [...x, { id, msg, kind }])
    setTimeout(() => set((x) => x.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ y: 30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto rounded-full border-2 border-ink px-5 py-3 text-sm font-semibold shadow-brutal ${t.kind === 'ok' ? 'bg-lime-300' : 'bg-red-100'}`}>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

export function Marquee({ items, className = '' }: { items: string[]; className?: string }) {
  const row = [...items, ...items]
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap py-3">
        {row.map((t, i) => <span key={i} className="flex items-center gap-8 font-display text-lg font-bold">{t}<span className="text-pop-500">✦</span></span>)}
      </div>
    </div>
  )
}

export function Progress({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-ink/10 ${className}`}>
      <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#FF5C39,#FF3CAC,#7B5CFF)]"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  )
}
