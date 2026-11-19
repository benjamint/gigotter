import { ArrowDownRight, ArrowUpRight, Lightbulb, Minus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { siteInsights } from '../../lib/api'
import { useAsync } from '../../lib/session'
import type { Insights as Data } from '../../lib/types'
import { CountUp, Empty, PageLoader } from '../../components/ui'

const RANGES = [7, 30, 90] as const
const nf = (n: number) => n.toLocaleString('en-GB')
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
const pctText = (a: number, b: number) => (b > 0 ? `${pct(a, b)}%` : '–')
const dayFmt = (d: string, long = false) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' })

const SHARE: Record<string, string> = { wa: 'WhatsApp', x: 'X', li: 'LinkedIn', fb: 'Facebook', link: 'copied link' }
const SITES: Record<string, string> = {
  x: 'X (Twitter)', facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', tiktok: 'TikTok',
  youtube: 'YouTube', google: 'Google search', bing: 'Bing search', snapchat: 'Snapchat', telegram: 'Telegram', reddit: 'Reddit',
}
/** Plain-English name for a traffic source code. */
export function sourceName(s: string) {
  if (s === 'direct') return 'Direct (typed or bookmarked)'
  if (s === 'unknown') return 'Not known (signed up before tracking)'
  if (s.startsWith('share-')) return `Gig share: ${SHARE[s.slice(6)] ?? s.slice(6)}`
  if (s.startsWith('qr:')) return `QR code: ${s.slice(3)}`
  if (s.startsWith('utm:')) return `Campaign: ${s.slice(4)}`
  return SITES[s] ?? s
}
const PAGES: Record<string, string> = {
  '/': 'Home', '/gigs': 'Gigs list', '/gigs/:id': 'Gig pages', '/signup': 'Sign up', '/login': 'Log in', '/me': 'My account',
  '/me/gig/:id': 'My gig (doing the work)', '/business': 'For businesses', '/brief': 'Business brief form', '/verify': 'Verify email',
  '/reset-password': 'Reset password', '/privacy': 'Privacy', '/terms': 'Terms',
}
const DEVICES: Record<string, string> = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer', other: 'Other' }

export default function Insights() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(() => {
    try { const v = Number(localStorage.getItem('gigotter-insights-days')); return (RANGES as readonly number[]).includes(v) ? (v as 7 | 30 | 90) : 30 } catch { return 30 }
  })
  useEffect(() => { try { localStorage.setItem('gigotter-insights-days', String(days)) } catch { /* ignore */ } }, [days])
  const q = useAsync(() => siteInsights(days), [days])
  const d = q.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Insights</h2>
          <p className="mt-1 text-sm text-ink-muted">Who visits, where they come from, and how many go on to sign up, work and get paid.</p>
        </div>
        <div role="radiogroup" aria-label="Time range" className="flex rounded-full border border-line bg-white p-1">
          {RANGES.map((r) => (
            <button key={r} role="radio" aria-checked={days === r} onClick={() => setDays(r)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${days === r ? 'bg-brand-700 text-white' : 'text-ink-muted hover:text-ink'}`}>
              {r} days
            </button>
          ))}
        </div>
      </div>
      {q.error ? <Empty title="Couldn’t load insights" body={/site_insights|function/i.test(String(q.error)) ? 'Run migration 0017 (site insights) in the Supabase SQL editor, then reload this page.' : String(q.error)} />
        : !d ? <PageLoader /> : <Body d={d} />}
    </div>
  )
}

function Body({ d }: { d: Data }) {
  const conv = pct(d.signups, d.totals.visitors), prevConv = pct(d.prev_signups, d.prev.visitors)
  const tiles = [
    { k: 'Visitors', v: d.totals.visitors, prev: d.prev.visitors, sub: `${nf(d.returning)} came back on another day` },
    { k: 'Page views', v: d.totals.views, prev: d.prev.views, sub: `${d.totals.sessions ? (d.totals.views / d.totals.sessions).toFixed(1) : '0'} pages per visit` },
    { k: 'Sign-ups', v: d.signups, prev: d.prev_signups, sub: `${nf(d.funnel.verified)} verified so far` },
    { k: 'Visitors who signed up', v: conv, prev: prevConv, sub: 'sign-ups ÷ visitors', suffix: '%' },
  ]
  return (
    <>
      {!d.first_view && (
        <div className="rounded-2xl border border-line bg-sand px-5 py-4 text-sm text-ink-soft">
          Visit counting is on. Numbers fill in as people use the site; sign-ups, gigs and payments below already include your history.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="card p-4 sm:p-5">
            <div className="text-sm font-medium text-ink-muted">{t.k}</div>
            <div className="figure mt-1 text-3xl leading-none sm:text-4xl"><CountUp to={t.v} suffix={t.suffix ?? ''} /></div>
            <Delta now={t.v} prev={t.prev} days={d.days} />
            <div className="mt-1 text-xs text-ink-muted">{t.sub}</div>
          </div>
        ))}
      </div>
      <Takeaways d={d} />
      <div className="card p-5">
        <VisitorsChart daily={d.daily} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Funnel f={d.funnel} />
        <Sources d={d} />
      </div>
      <Gigs d={d} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Pages d={d} />
        <Devices d={d} />
      </div>
      <p className="text-xs text-ink-muted">
        Counted since {d.first_view ? new Date(d.first_view).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'today'}. Admins’ own visits and link-preview bots aren’t counted.
        A visitor is one browser; a visit ends after 30 minutes without a page change. The sign-up funnel follows people who signed up in this period.
      </p>
    </>
  )
}

function Delta({ now, prev, days }: { now: number; prev: number; days: number }) {
  if (!prev && !now) return <div className="mt-2 flex items-center gap-1 text-xs text-ink-muted"><Minus className="h-3.5 w-3.5" />No change vs previous {days} days</div>
  if (!prev) return <div className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-700"><ArrowUpRight className="h-3.5 w-3.5" />New vs previous {days} days</div>
  const ch = Math.round(((now - prev) / prev) * 100)
  const up = ch > 0, flat = ch === 0
  return (
    <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${flat ? 'text-ink-muted' : up ? 'text-brand-700' : 'text-[#B42318]'}`}>
      {flat ? <Minus className="h-3.5 w-3.5" /> : up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {flat ? 'Same' : `${up ? '+' : ''}${ch}%`} vs previous {days} days
    </div>
  )
}

/** A few plain sentences pointing at what to act on. */
function Takeaways({ d }: { d: Data }) {
  const notes = useMemo(() => {
    const out: string[] = []
    if (!d.totals.visitors) return out
    const named = d.sources.filter((s) => s.source !== 'direct' && s.source !== 'unknown' && s.visitors > 0)
    if (named[0]) out.push(`${sourceName(named[0].source)} brought the most visitors: ${nf(named[0].visitors)} ${named[0].visitors === 1 ? 'person' : 'people'}${named[0].signups ? `, ${nf(named[0].signups)} signed up` : ''}.`)
    const best = d.sources.filter((s) => s.visitors >= 10 && s.signups > 0).sort((a, b) => b.signups / b.visitors - a.signups / a.visitors)[0]
    if (best && best.source !== named[0]?.source) out.push(`${sourceName(best.source)} turns visitors into sign-ups best (${pctText(best.signups, best.visitors)}). Worth doing more of.`)
    const f = d.funnel
    const steps: [string, number, number][] = [['visitors who signed up', f.signups, f.visitors], ['new sign-ups who got verified', f.verified, f.signups], ['verified people who applied or joined a gig', f.took_part, f.verified], ['people on a gig who finished approved work', f.completed, f.took_part]]
    const worst = steps.filter(([, a, b]) => b >= 5).sort((x, y) => x[1] / x[2] - y[1] / y[2])[0]
    if (worst) out.push(`Biggest drop-off: only ${pctText(worst[1], worst[2])} of ${worst[0]}. That step is where to look first.`)
    const weak = d.gigs.filter((g) => g.visitors >= 15 && (g.applied + g.joined) / g.visitors < 0.05)[0]
    if (weak) out.push(`“${weak.title}” was viewed by ${nf(weak.visitors)} people but only ${nf(weak.applied + weak.joined)} applied or joined. Check its pay, title, photo or requirements.`)
    const phones = d.devices.filter((x) => x.device === 'mobile' || x.device === 'tablet').reduce((a, x) => a + x.visitors, 0)
    const allDev = d.devices.reduce((a, x) => a + x.visitors, 0)
    if (allDev >= 10) out.push(`${pctText(phones, allDev)} of visitors are on a phone or tablet, so test every change on a phone first.`)
    return out.slice(0, 5)
  }, [d])
  if (!notes.length) return null
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="h-5 w-5 text-brand-600" />What stands out</h3>
      <ul className="mt-3 space-y-2 text-sm text-ink-soft">
        {notes.map((n) => <li key={n} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />{n}</li>)}
      </ul>
    </div>
  )
}

/** Visitors per day: one line, recessive grid, crosshair + tooltip on hover, table view for screen readers and exact numbers. */
function VisitorsChart({ daily }: { daily: Data['daily'] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width))); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = 220, L = 36, R = 12, T = 12, B = 26
  const max = Math.max(4, ...daily.map((x) => x.visitors))
  const nice = (() => { const step = Math.pow(10, Math.floor(Math.log10(max))); for (const m of [1, 2, 2.5, 5, 10]) if (m * step * 4 >= max) return m * step * 4; return max })()
  const x = (i: number) => L + (daily.length > 1 ? (i / (daily.length - 1)) * (w - L - R) : (w - L - R) / 2)
  const y = (v: number) => T + (1 - v / nice) * (H - T - B)
  const line = daily.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.visitors).toFixed(1)}`).join('')
  const area = `${line}L${x(daily.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(nice * f))
  const labelIdx = daily.length <= 8 ? daily.map((_, i) => i) : [0, Math.round((daily.length - 1) / 2), daily.length - 1]
  const h = hover != null ? daily[hover] : null
  const total = daily.reduce((a, p) => a + p.visitors, 0)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">Visitors per day</h3>
        <button onClick={() => setTable((t) => !t)} className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline">{table ? 'Show chart' : 'Show as table'}</button>
      </div>
      {table ? (
        <div className="mt-4 max-h-72 overflow-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sand text-left text-ink-muted"><tr><th className="px-4 py-2 font-medium">Day</th><th className="px-4 py-2 text-right font-medium">Visitors</th><th className="px-4 py-2 text-right font-medium">Page views</th><th className="px-4 py-2 text-right font-medium">Sign-ups</th></tr></thead>
            <tbody>{[...daily].reverse().map((p) => <tr key={p.day} className="border-t border-line"><td className="px-4 py-2">{dayFmt(p.day, true)}</td><td className="px-4 py-2 text-right tabular-nums">{nf(p.visitors)}</td><td className="px-4 py-2 text-right tabular-nums">{nf(p.views)}</td><td className="px-4 py-2 text-right tabular-nums">{nf(p.signups)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative mt-4" onMouseLeave={() => setHover(null)}>
          <svg width={w} height={H} role="img" aria-label={`Visitors per day: ${nf(total)} visitor-days over ${daily.length} days`} className="block">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={w - R} y1={y(t)} y2={y(t)} stroke="#E3E9E4" strokeWidth={1} />
                <text x={L - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#5C625E">{nf(t)}</text>
              </g>
            ))}
            {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 6} fontSize={11} fill="#5C625E" textAnchor={i === 0 ? 'start' : i === daily.length - 1 ? 'end' : 'middle'}>{i === daily.length - 1 ? 'Today' : dayFmt(daily[i].day)}</text>)}
            <path d={area} fill="#245A44" opacity={0.08} />
            <path d={line} fill="none" stroke="#245A44" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover != null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} stroke="#131317" strokeOpacity={0.25} strokeWidth={1} />
                <circle cx={x(hover)} cy={y(daily[hover].visitors)} r={5} fill="#245A44" stroke="#fff" strokeWidth={2} />
              </g>
            )}
            {daily.map((_, i) => {
              const half = daily.length > 1 ? (w - L - R) / (daily.length - 1) / 2 : (w - L - R) / 2
              return <rect key={i} x={x(i) - half} y={0} width={half * 2} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            })}
          </svg>
          {h && hover != null && (
            <div className="pointer-events-none absolute top-0 z-10 w-44 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: Math.min(Math.max(x(hover) - 88, 0), w - 176) }}>
              <div className="font-medium text-ink">{dayFmt(h.day, true)}</div>
              <div className="mt-1 flex justify-between text-ink-soft"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-600" />Visitors</span><b className="font-semibold text-ink">{nf(h.visitors)}</b></div>
              <div className="flex justify-between text-ink-soft"><span>Page views</span><span>{nf(h.views)}</span></div>
              <div className="flex justify-between text-ink-soft"><span>Sign-ups</span><span>{nf(h.signups)}</span></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Horizontal bar with a rounded end, sized against the largest value in its list. */
const Bar = ({ v, max, label }: { v: number; max: number; label: string }) => (
  <div className="h-2.5 w-full rounded-full bg-sand" role="presentation" title={label}>
    <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${max ? Math.max(v ? 1.5 : 0, (v / max) * 100) : 0}%` }} />
  </div>
)

function Funnel({ f }: { f: Data['funnel'] }) {
  const steps = [
    { k: 'Visitors', v: f.visitors, note: 'people who opened the site' },
    { k: 'Signed up', v: f.signups },
    { k: 'Verified', v: f.verified },
    { k: 'Applied or joined a gig', v: f.took_part },
    { k: 'Finished approved work', v: f.completed },
    { k: 'Got paid', v: f.paid },
  ]
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold">From visit to payout</h3>
      <p className="mt-1 text-sm text-ink-muted">How far people who signed up in this period have got.</p>
      <ol className="mt-5 space-y-4">
        {steps.map((s, i) => (
          <li key={s.k}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{s.k}</span>
              <span className="tabular-nums"><b className="font-semibold">{nf(s.v)}</b>{i > 0 && steps[i - 1].v > 0 && <span className="ml-2 text-xs text-ink-muted">{pctText(s.v, steps[i - 1].v)} of previous</span>}</span>
            </div>
            <div className="mt-1.5"><Bar v={s.v} max={steps[0].v || Math.max(...steps.map((x) => x.v))} label={`${s.k}: ${s.v}`} /></div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Sources({ d }: { d: Data }) {
  const rows = d.sources.slice(0, 12)
  const max = Math.max(1, ...rows.map((r) => r.visitors))
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold">Where people come from</h3>
      <p className="mt-1 text-sm text-ink-muted">By the first page of each visit. Sign-ups are credited to where that person first came from.</p>
      {!rows.length ? <p className="mt-6 text-sm text-ink-muted">No visits yet in this period.</p> : (
        <div className="mt-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-line pb-2 text-xs font-medium text-ink-muted"><span>Source</span><span className="w-16 text-right">Visitors</span><span className="w-16 text-right">Sign-ups</span></div>
          {rows.map((r) => (
            <div key={r.source} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-line py-2.5 text-sm last:border-0">
              <div className="min-w-0">
                <div className="truncate">{sourceName(r.source)}</div>
                <div className="mt-1.5"><Bar v={r.visitors} max={max} label={`${sourceName(r.source)}: ${r.visitors} visitors`} /></div>
              </div>
              <span className="w-16 text-right tabular-nums">{nf(r.visitors)}</span>
              <span className="w-16 text-right tabular-nums">{nf(r.signups)}{r.visitors > 0 && r.signups > 0 && <span className="block text-[11px] text-ink-muted">{pctText(r.signups, r.visitors)}</span>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Gigs({ d }: { d: Data }) {
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold">Gig performance</h3>
      <p className="mt-1 text-sm text-ink-muted">People who opened each gig in this period, and how many applied or joined. A low rate with lots of viewers usually means the pay, title, photo or requirements need a look.</p>
      {!d.gigs.length ? <p className="mt-6 text-sm text-ink-muted">No gig views yet in this period.</p> : (
        <div className="-mx-5 mt-4 overflow-x-auto px-5">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-ink-muted">
              <tr className="border-b border-line"><th className="py-2 pr-3 font-medium">Gig</th><th className="px-3 py-2 text-right font-medium">Viewed by</th><th className="px-3 py-2 text-right font-medium">Views</th><th className="px-3 py-2 text-right font-medium">Applied / joined</th><th className="py-2 pl-3 text-right font-medium">Rate</th></tr>
            </thead>
            <tbody>
              {d.gigs.map((g) => {
                const took = g.applied + g.joined, low = g.visitors >= 15 && took / g.visitors < 0.05
                const open = g.status === 'live' && new Date(g.expires_at) > new Date()
                return (
                  <tr key={g.id} className="border-b border-line last:border-0">
                    <td className="max-w-[280px] py-2.5 pr-3">
                      <Link to={`/admin/gigs/${g.id}`} className="line-clamp-1 font-medium hover:underline">{g.title}</Link>
                      <span className="text-xs text-ink-muted">{open ? 'Live' : g.status === 'live' ? 'Closed' : g.status[0].toUpperCase() + g.status.slice(1)} · {g.join_mode === 'apply' ? 'apply' : 'join'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{nf(g.visitors)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{nf(g.views)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{nf(took)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums">
                      {pctText(took, g.visitors)}
                      {low && <span className="ml-2 rounded-full bg-[#FEF0C7] px-2 py-0.5 text-[11px] font-medium text-[#93370D]">Low</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Pages({ d }: { d: Data }) {
  const max = Math.max(1, ...d.pages.map((p) => p.views))
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold">Most viewed pages</h3>
      {!d.pages.length ? <p className="mt-6 text-sm text-ink-muted">No visits yet in this period.</p> : (
        <ul className="mt-4 space-y-3">
          {d.pages.map((p) => (
            <li key={p.path} className="text-sm">
              <div className="flex justify-between gap-3"><span className="truncate">{PAGES[p.path] ?? p.path}</span><span className="shrink-0 tabular-nums"><b className="font-semibold">{nf(p.views)}</b><span className="ml-2 text-xs text-ink-muted">{nf(p.visitors)} people</span></span></div>
              <div className="mt-1.5"><Bar v={p.views} max={max} label={`${p.path}: ${p.views} views`} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Devices({ d }: { d: Data }) {
  const all = d.devices.reduce((a, x) => a + x.visitors, 0)
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold">Devices</h3>
      {!all ? <p className="mt-6 text-sm text-ink-muted">No visits yet in this period.</p> : (
        <ul className="mt-4 space-y-3">
          {d.devices.map((x) => (
            <li key={x.device} className="text-sm">
              <div className="flex justify-between"><span>{DEVICES[x.device] ?? x.device}</span><span className="tabular-nums"><b className="font-semibold">{pctText(x.visitors, all)}</b><span className="ml-2 text-xs text-ink-muted">{nf(x.visitors)} people</span></span></div>
              <div className="mt-1.5"><Bar v={x.visitors} max={all} label={`${x.device}: ${x.visitors}`} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
