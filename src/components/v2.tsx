/**
 * v2 design building blocks: olive hero with soft shapes, stacking cards, scroll-zoom photos, stat strip.
 * Purely visual; all respect the reduced-motion setting.
 */
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { CountUp, Reveal } from './ui'

/** Near-white olive band behind the floating header, with two faint drifting shapes. */
export function HeroOlive({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const a = useTransform(scrollY, [0, 900], [0, reduce ? 0 : -110])
  const b = useTransform(scrollY, [0, 900], [0, reduce ? 0 : 70])
  return (
    // pulls up under the 76px floating header so the olive runs to the top of the page
    <section className={`hero-olive -mt-[76px] pb-16 pt-[calc(76px+2.5rem)] md:pb-24 md:pt-[calc(76px+4.5rem)] ${className}`}>
      <motion.span aria-hidden style={{ y: a }} className="leaf -right-12 top-28 h-[150px] w-[150px] md:right-[3%] md:top-32 md:h-[230px] md:w-[230px]" />
      <motion.span aria-hidden style={{ y: b }} className="leaf leaf-b -left-12 bottom-6 h-[130px] w-[130px] md:h-[170px] md:w-[170px]" />
      <div className="container-x relative z-10">{children}</div>
    </section>
  )
}

/** Photo inside a rounded frame that eases from slightly zoomed to natural size as it scrolls into view. */
export function ZoomPhoto({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 0.6], [reduce ? 1 : 1.14, 1])
  const [ok, setOk] = useState(true)
  return (
    <div ref={ref} className={`relative overflow-hidden rounded-[28px] bg-sand ${className}`}>
      {ok && <motion.img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setOk(false)} style={{ scale }}
        className="absolute inset-0 h-full w-full origin-[50%_40%] object-cover" />}
    </div>
  )
}

/**
 * Cards that pin as you scroll; each new card slides over the last and the ones behind
 * shrink a little and dim, like a deck. Falls back to a plain list with reduced motion.
 */
export function StackCards({ children, top = 96 }: { children: ReactNode; top?: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const items = Children.toArray(children)
  useEffect(() => {
    if (reduce || !ref.current) return
    const cards = Array.from(ref.current.querySelectorAll<HTMLElement>(':scope > [data-stack-card]'))
    let raf = 0
    const tick = () => {
      raf = 0
      cards.forEach((c, i) => {
        const next = cards[i + 1]
        if (!next) { c.style.transform = ''; c.style.filter = ''; return }
        const r = c.getBoundingClientRect(), rn = next.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, 1 - (rn.top - r.top) / Math.max(r.height, 1)))
        const depth = cards.length - 1 - i
        c.style.transform = `scale(${1 - p * (0.04 + depth * 0.01)})`
        c.style.filter = p > 0.01 ? `brightness(${1 - p * 0.08})` : ''
      })
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    tick()
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [reduce, items.length])
  return (
    <div ref={ref} className="mt-14 grid gap-5">
      {items.map((child, i) => (
        <div key={i} data-stack-card className={reduce ? 'relative' : 'sticky origin-top will-change-transform'}
          style={reduce ? undefined : { top: `calc(${top}px + ${i * 16}px)` }}>
          {child}
        </div>
      ))}
    </div>
  )
}

/** Four big numbers with hairline dividers. */
export function StatStrip({ items }: { items: [number, string, string, string?][] }) {
  return (
    <div className="grid grid-cols-2 border-t border-line md:grid-cols-4">
      {items.map(([n, suffix, label, prefix], i) => (
        <Reveal key={label} delay={i * 0.05} className={`py-7 pr-3 md:py-8 ${i ? 'md:border-l md:border-line md:pl-6' : ''} ${i < 2 ? 'border-b border-line md:border-b-0' : ''}`}>
          <div className="font-display text-[clamp(2.4rem,4.6vw,3.75rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums"><CountUp to={n} prefix={prefix ?? ''} suffix={suffix} /></div>
          <div className="mt-2.5 text-[15px] text-ink-muted">{label}</div>
        </Reveal>
      ))}
    </div>
  )
}
