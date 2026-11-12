import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { KycStatus, SubmissionStatus } from '../lib/types'

const EASE = [0.22, 1, 0.36, 1] as const

export function Reveal({ children, delay = 0, className = '', y = 16 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  )
}

export function CountUp({ to, prefix = '', suffix = '', className = '' }: { to: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const v = useMotionValue(reduce ? to : 0)
  const txt = useTransform(v, (x) => `${prefix}${Math.round(x).toLocaleString()}${suffix}`)
  useEffect(() => { if (reduce) { v.set(to); return } if (inView) { const c = animate(v, to, { duration: 1.2, ease: EASE }); return c.stop } }, [inView, to, v, reduce])
  return <motion.span ref={ref} className={`tabular-nums ${className}`}>{txt}</motion.span>
}

export const Spinner = ({ className = 'h-4 w-4' }: { className?: string }) => <Loader2 className={`animate-spin ${className}`} />

export function PageLoader() {
  return <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-6 w-6 text-ink-muted" /></div>
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sand text-ink-soft">{icon}</div>}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

const KYC_STYLE: Record<KycStatus, [string, string]> = {
  unverified: ['bg-sand text-ink-soft', 'Not verified'],
  pending: ['bg-amber-50 text-amber-800', 'In review'],
  verified: ['bg-brand-50 text-brand-700', 'Verified'],
  rejected: ['bg-red-50 text-red-700', 'Needs attention'],
}
export const KycPill = ({ s }: { s: KycStatus }) => <span className={`chip ${KYC_STYLE[s][0]}`}><Dot />{KYC_STYLE[s][1]}</span>

const SUB_STYLE: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-50 text-amber-800', approved: 'bg-sky-50 text-sky-800',
  rejected: 'bg-red-50 text-red-700', paid: 'bg-brand-50 text-brand-700',
}
export const SubPill = ({ s }: { s: SubmissionStatus }) => <span className={`chip capitalize ${SUB_STYLE[s]}`}><Dot />{s}</span>
const Dot = () => <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />

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
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl sm:p-8 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}>
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand hover:text-ink"><X className="h-5 w-5" /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

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
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: 8 }}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium shadow-lift ${t.kind === 'ok' ? 'bg-ink text-white' : 'bg-red-600 text-white'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${t.kind === 'ok' ? 'bg-brand-200' : 'bg-white'}`} />{t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

export function Progress({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-sand ${className}`}>
      <motion.div className="h-full rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: EASE }} />
    </div>
  )
}

export const SectionHead = ({ eyebrow, title, body, className = '' }: { eyebrow?: string; title: ReactNode; body?: string; className?: string }) => (
  <div className={className}>
    {eyebrow && <div className="eyebrow">{eyebrow}</div>}
    <h2 className="mt-4 text-[clamp(2.1rem,4.8vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.035em]">{title}</h2>
    {body && <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted md:text-lg">{body}</p>}
  </div>
)
