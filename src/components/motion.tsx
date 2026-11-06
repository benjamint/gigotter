/**
 * Shared motion primitives. All respect the user's reduced-motion setting
 * (MotionConfig reducedMotion="user" in main.tsx + the checks below).
 */
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Children, isValidElement, useRef, type ReactNode, type MouseEvent as RME } from 'react'

export const EASE = [0.22, 1, 0.36, 1] as const
const fine = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

/** Headline that rises in word by word from behind a mask. Strings are split into words; elements (e.g. <span className="em">) are kept whole. */
export function SplitReveal({ children, delay = 0, stagger = 0.06, className = '', inView = false }: {
  children: ReactNode; delay?: number; stagger?: number; className?: string; inView?: boolean
}) {
  const reduce = useReducedMotion()
  const parts: ReactNode[] = []
  Children.forEach(children, (c) => {
    if (typeof c === 'string') c.split(/(\s+)/).forEach((w) => w && parts.push(w))
    else if (isValidElement(c) && typeof (c.props as any).children === 'string') {
      // split styled spans too, keeping their styling on each word
      ;((c.props as any).children as string).split(/(\s+)/).forEach((w) => w && parts.push(/^\s+$/.test(w) ? w : <c.type {...(c.props as any)} key={parts.length}>{w}</c.type>))
    } else parts.push(c)
  })
  let i = 0
  const trigger = inView ? { whileInView: 'show', viewport: { once: true, margin: '-60px' } } : { animate: 'show' }
  return (
    <motion.span className={className} initial={reduce ? false : 'hide'} {...trigger}
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}>
      {parts.map((p, k) => (typeof p === 'string' && /^\s+$/.test(p)) ? ' ' : (
        <span key={k} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span className="inline-block will-change-transform" custom={i++}
            variants={{ hide: { y: '110%', rotate: 2 }, show: { y: '0%', rotate: 0, transition: { duration: 0.9, ease: EASE } } }}>
            {p}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

/** Image (or anything) that wipes into view with a clip-path, settling from a slight zoom. */
export function ImageReveal({ children, className = '', delay = 0, from = 'bottom' }: { children: ReactNode; className?: string; delay?: number; from?: 'bottom' | 'left' }) {
  const reduce = useReducedMotion()
  const hidden = from === 'bottom' ? 'inset(100% 0% 0% 0% round 2rem)' : 'inset(0% 100% 0% 0% round 2rem)'
  return (
    <motion.div className={className} initial={reduce ? false : { clipPath: hidden }} whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 0rem)' }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1.1, delay, ease: EASE }}>
      <motion.div className="h-full w-full" initial={reduce ? false : { scale: 1.15 }} whileInView={{ scale: 1 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 1.6, delay, ease: EASE }}>
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Moves its child a little against the scroll for depth. */
export function Parallax({ children, className = '', amount = 40 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-amount, amount])
  return <div ref={ref} className={`overflow-hidden ${className}`}><motion.div style={{ y, scale: reduce ? 1 : 1.12 }} className="h-full w-full">{children}</motion.div></div>
}

/** Pulls gently toward the cursor (desktop only). Wrap a button/link. */
export function Magnetic({ children, strength = 0.25, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const x = useSpring(0, { stiffness: 250, damping: 18, mass: 0.4 })
  const y = useSpring(0, { stiffness: 250, damping: 18, mass: 0.4 })
  const move = (e: RME<HTMLDivElement>) => {
    if (!fine()) return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) * strength); y.set((e.clientY - r.top - r.height / 2) * strength)
  }
  const reset = () => { x.set(0); y.set(0) }
  return <motion.div className={`inline-block ${className}`} style={{ x, y }} onMouseMove={move} onMouseLeave={reset}>{children}</motion.div>
}

/** Soft light that follows the cursor across a surface. Put it inside a `relative` parent. */
export function useSpotlight(color = 'rgba(47,107,82,.10)', size = 320) {
  const mx = useMotionValue(-999), my = useMotionValue(-999)
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${mx}px ${my}px, ${color}, transparent 70%)`
  const onMouseMove = (e: RME<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); mx.set(e.clientX - r.left); my.set(e.clientY - r.top) }
  const onMouseLeave = () => { mx.set(-999); my.set(-999) }
  const layer = <motion.span aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
  return { handlers: { onMouseMove, onMouseLeave }, layer }
}

/** Subtle 3D tilt toward the cursor (desktop only). */
export function Tilt({ children, className = '', max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const rx = useSpring(0, { stiffness: 200, damping: 20 }), ry = useSpring(0, { stiffness: 200, damping: 20 })
  const move = (e: RME<HTMLDivElement>) => {
    if (!fine()) return
    const r = e.currentTarget.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2); rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2)
  }
  return (
    <motion.div className={className} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} onMouseMove={move} onMouseLeave={() => { rx.set(0); ry.set(0) }}>
      {children}
    </motion.div>
  )
}

/** Thin brand-coloured bar at the very top showing how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[55] h-[2px] origin-left bg-brand-500" style={{ scaleX }} />
}

/** A vertical line that draws itself as a section scrolls past. */
export function useDrawLine(): [React.RefObject<HTMLDivElement>, MotionValue<number>] {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 60%'] })
  return [ref, useSpring(scrollYProgress, { stiffness: 120, damping: 30 })]
}
