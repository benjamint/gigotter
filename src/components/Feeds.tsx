import { BadgeCheck, Quote } from 'lucide-react'
import type { ReactNode } from 'react'
import { ago, money } from '../lib/format'
import type { PayoutItem, Testimonial } from '../lib/types'

/** Seamless, self-scrolling row. Pauses on hover/focus; static for reduced-motion users. */
function Marquee({ children, seconds, reverse = false }: { children: ReactNode; seconds: number; reverse?: boolean }) {
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div className={`flex w-max gap-4 py-2 motion-safe:animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] ${reverse ? '[animation-direction:reverse]' : ''}`}
        style={{ ['--d' as string]: `${seconds}s` }}>
        {children}
        <div aria-hidden className="flex gap-4">{children}</div>
      </div>
    </div>
  )
}

const initials = (n: string) => n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()

export function PayoutFeed({ items, title = 'Recently paid' }: { items: PayoutItem[]; title?: string }) {
  if (items.length < 3) return null // never show an almost-empty feed
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-soft">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-40" /><span className="relative h-2 w-2 rounded-full bg-brand-500" /></span>
        {title}
      </div>
      <Marquee seconds={Math.max(30, items.length * 6)}>
        <div className="flex gap-4">
          {items.map((p, i) => (
            <div key={i} className="flex w-[290px] shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{initials(p.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="shrink-0 font-display text-lg font-semibold leading-none text-brand-700">{money(p.amount, p.currency)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-muted">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <span className="truncate">Paid · {p.units} × {p.gig}</span>
                </div>
                <div className="truncate text-[11px] text-ink-muted/80">{p.school ? `${p.school} · ` : ''}{ago(p.paid_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Marquee>
    </section>
  )
}

export function TestimonialStrip({ items }: { items: Testimonial[] }) {
  if (!items.length) return null
  // one or two quotes sit still; a scrolling strip only once there are enough to fill it
  if (items.length < 3) return (
    <div className={`container-x grid gap-5 ${items.length === 2 ? 'md:grid-cols-2' : 'max-w-3xl'}`}>
      {items.map((t) => (
        <figure key={t.id} className={`flex flex-col rounded-3xl border border-line bg-white shadow-soft ${items.length === 1 ? 'p-8 text-center md:p-12' : 'p-7'}`}>
          <Quote className={`h-6 w-6 text-brand-200 ${items.length === 1 ? 'mx-auto' : ''}`} />
          <blockquote className={`mt-4 flex-1 font-display font-medium leading-snug tracking-tight text-ink ${items.length === 1 ? 'text-2xl md:text-3xl' : 'text-xl'}`}>“{t.quote}”</blockquote>
          <figcaption className="mt-6 text-sm"><b className="font-medium">{t.name}</b>{t.school && <span className="text-ink-muted"> · {t.school}</span>}</figcaption>
        </figure>
      ))}
    </div>
  )
  return (
    <Marquee seconds={Math.max(40, items.length * 12)} reverse>
      <div className="flex gap-5">
        {items.map((t) => (
          <figure key={t.id} className="flex w-[340px] shrink-0 flex-col rounded-3xl border border-line bg-white p-6 shadow-soft">
            <Quote className="h-5 w-5 text-brand-200" />
            <blockquote className="mt-3 flex-1 font-display text-xl font-medium leading-snug tracking-tight text-ink">“{t.quote}”</blockquote>
            <figcaption className="mt-5 text-sm"><b className="font-medium">{t.name}</b>{t.school && <span className="text-ink-muted"> · {t.school}</span>}</figcaption>
          </figure>
        ))}
      </div>
    </Marquee>
  )
}
