import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, BadgeCheck, ClipboardList, Handshake, MessagesSquare, Plus, Package, Search, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import GigCard from '../components/GigCard'
import Photo from '../components/Photo'
import { CountUp, Reveal, SectionHead } from '../components/ui'
import { PayoutFeed, TestimonialStrip } from '../components/Feeds'
import { listListings, listTestimonials, payoutFeed } from '../lib/api'
import { isOpen } from '../lib/format'
import { IMG } from '../lib/images'
import { useAsync, useSession } from '../lib/session'
import { ImageReveal, Magnetic, Parallax, SplitReveal, useDrawLine, useSpotlight } from '../components/motion'

const EASE = [0.22, 1, 0.36, 1] as const

export default function Landing() {
  const { user } = useSession()
  const gigs = useAsync(() => listListings(), [])
  const live = (gigs.data ?? []).filter(isOpen)
  const paid = useAsync(() => payoutFeed(20), [])
  const quotes = useAsync(() => listTestimonials(), [])
  const cta = user ? '/gigs' : '/signup'
  const hero = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 60])

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section ref={hero} className="container-x grid items-center gap-12 pb-20 pt-10 md:grid-cols-[1.05fr_.95fr] md:gap-16 md:pt-16">
        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-40" /><span className="relative h-2 w-2 rounded-full bg-brand-500" /></span>
            {live.length ? `${live.length} paid gig${live.length === 1 ? "" : "s"} open now` : 'Now live in Accra'}
          </motion.div>
          <h1 className="mt-6 text-[clamp(2.6rem,6.2vw,4.75rem)] font-semibold leading-[1.02] tracking-tightest">
            <SplitReveal delay={0.1}>Get paid to do <span className="em text-brand-600">real work</span> for real businesses.</SplitReveal>
          </h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
            className="mt-6 max-w-[30rem] text-lg leading-relaxed text-ink-muted">
            Gigotter connects verified students with companies that need people on the ground — signing up customers, running focus groups and gathering research. Pick a gig, do the work, get paid to mobile money.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap gap-3">
            <Magnetic><Link to={cta} className="btn-primary px-7 py-3.5">Start earning <ArrowRight className="h-4 w-4" /></Link></Magnetic>
            <a href="#gigs" className="btn-ghost px-7 py-3.5">Browse open gigs</a>
          </motion.div>
          {!user && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-4 text-sm text-ink-muted">
            Not a student? <Link to="/signup?type=general" className="link-u font-medium text-ink">You can join too</Link>
          </motion.p>}
          <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 0.8 } } }} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-muted">
            {[[ShieldCheck, 'ID-verified students'], [Wallet, 'Paid to MoMo'], [BadgeCheck, 'No fees, ever']].map(([I, t]: any) => (
              <motion.span key={t} variants={{ h: { opacity: 0, y: 6 }, s: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} className="flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{t}</motion.span>
            ))}
          </motion.div>
        </div>

        <div className="relative">
          <motion.div style={{ y }}>
            <motion.div initial={{ clipPath: 'inset(12% 12% 12% 12% round 2rem)', opacity: 0 }} animate={{ clipPath: 'inset(0% 0% 0% 0% round 2rem)', opacity: 1 }}
              transition={{ delay: 0.15, duration: 1.3, ease: EASE }} className="overflow-hidden rounded-4xl">
              <motion.div initial={{ scale: 1.18 }} animate={{ scale: 1 }} transition={{ delay: 0.15, duration: 1.8, ease: EASE }}>
                <Photo src={IMG.hero} alt="Student working in the city" label="hero.jpg" className="aspect-[4/5] w-full" />
              </motion.div>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8, ease: EASE }}
            className="absolute -left-4 bottom-10 w-60 motion-safe:animate-float rounded-2xl border border-line bg-white/95 p-4 shadow-lift backdrop-blur md:-left-10">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600"><Smartphone className="h-4 w-4" /></span>
              <div><div className="text-xs text-ink-muted">Payment sent</div><div className="font-display text-lg font-semibold"><Ticker to={450} delay={1.3} decimals={2} /></div></div>
            </div>
            <div className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">9 salons onboarded · MTN MoMo</div>
          </motion.div>
        </div>
      </section>

      {/* ───────── OPEN GIGS (the main event, straight after the hero) ───────── */}
      <section id="gigs" className="scroll-mt-20 bg-sand/60 py-16">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead eyebrow={live.length ? `${live.length} open now` : 'Open now'} title="Gigs you can start this week" />
            <Link to="/gigs" className="group inline-flex items-center gap-2 text-sm font-medium">View all gigs <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
          </Reveal>
          {gigs.loading && !gigs.data ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {[0, 1, 2].map((i) => <div key={i} className={`h-72 animate-pulse rounded-3xl bg-white/60 ${i ? 'hidden sm:block' : ''}`} />)}
            </div>
          ) : live.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {live.slice(0, 6).map((l, i) => <div key={l.id} className={i >= 3 ? 'hidden sm:block' : ''}><GigCard l={l} i={i} /></div>)}
            </div>
          ) : (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-white p-6 md:p-8">
              <p className="text-ink-muted">New gigs are added every week. Sign up to be first to hear about them.</p>
              <Link to={cta} className="btn-primary">{user ? 'Browse gigs' : 'Sign up free'} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="container-x">
        <div className="grid grid-cols-2 divide-line border-y border-line md:grid-cols-4 md:divide-x">
          {[[24, 'h', 'Typical review time'], [100, '%', 'Paid to mobile money'], [0, '', 'Fees for students'], [5, ' min', 'To get verified']].map(([n, s, l], i) => (
            <Reveal key={l as string} delay={i * 0.05} className="px-2 py-8 md:px-8">
              <div className="font-display text-4xl font-semibold tracking-tight"><CountUp to={n as number} suffix={s as string} /></div>
              <div className="mt-1 text-sm text-ink-muted">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {(paid.data?.length ?? 0) >= 3 && (
        <section className="container-x pt-12"><PayoutFeed items={paid.data!} /></section>
      )}

      {/* ───────── HOW ───────── */}
      <section className="container-x py-28">
        <Reveal><SectionHead eyebrow="How it works" title={<SplitReveal inView>Three steps between you and your <span className="em">first payout.</span></SplitReveal>} /></Reveal>
        <Steps />
      </section>

      {/* ───────── KINDS OF WORK ───────── */}
      <section className="container-x grid gap-14 py-28 md:grid-cols-[.9fr_1.1fr]">
        <Reveal>
          <SectionHead eyebrow="The work" title={<SplitReveal inView>Flexible work that <span className="em">builds</span> real experience.</SplitReveal>}
            body="Every gig is paid, clearly scoped and done on your own schedule — between lectures, on weekends or from home. And it all goes on your Gigotter record." />
          <Magnetic className="mt-8"><Link to={cta} className="btn-primary">Create your profile <ArrowRight className="h-4 w-4" /></Link></Magnetic>
        </Reveal>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
          {[
            [Handshake, 'Customer onboarding', 'Introduce businesses to a product and help them sign up.'],
            [MessagesSquare, 'Focus groups', 'Bring the right people into a room and keep the conversation flowing.'],
            [Search, 'Field research', 'Visit shops and markets to collect prices, photos and insight.'],
            [ClipboardList, 'Surveys', 'Gather genuine responses from people who match the brief.'],
            [Smartphone, 'App testing', 'Try new apps and websites and say honestly what works.'],
            [Package, 'Errands', 'Deliveries, drop-offs and quick checks around town.'],
          ].map(([I, t, d]: any, i) => <WorkTile key={t} I={I} t={t} d={d} i={i} />)}
        </div>
      </section>

      {(quotes.data?.length ?? 0) >= 1 && (
        <section className="py-24">
          <Reveal className="container-x"><SectionHead eyebrow="From students" title={<>In their <span className="em">own words.</span></>} /></Reveal>
          <div className="mt-10"><TestimonialStrip items={quotes.data!} /></div>
        </section>
      )}

      <Calculator />

      {/* ───────── FOR BUSINESSES ───────── */}
      <section className="container-x py-28">
        <Reveal>
          <div className="grid overflow-hidden rounded-4xl bg-brand-900 text-white md:grid-cols-2">
            <div className="flex flex-col justify-center p-10 md:p-16">
              <div className="eyebrow text-brand-200">For businesses</div>
              <h2 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tightest text-white md:text-[2.6rem]"><SplitReveal inView>Need people on the ground? <span className="em text-brand-200">Send in the otters.</span></SplitReveal></h2>
              <p className="mt-5 max-w-md leading-relaxed text-white/65">Tell us what you need — customer sign-ups, market research, product sampling. We scope it, match verified students and you only pay for approved results.</p>
              <div className="mt-8"><Magnetic><Link to="/brief" className="btn bg-white px-7 py-3.5 text-ink hover:bg-brand-50">Post a brief <ArrowRight className="h-4 w-4" /></Link></Magnetic></div>
            </div>
            <Parallax className="min-h-[22rem] md:min-h-full" amount={30}><Photo src={IMG.business} alt="Founder at work" label="business.jpg" tone="dark" className="h-full min-h-[22rem] w-full" /></Parallax>
          </div>
        </Reveal>
      </section>

      <FAQ />

      {/* ───────── CTA ───────── */}
      <section className="container-x pt-8 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-[clamp(2.4rem,5.5vw,4.25rem)] font-semibold leading-[1.04] tracking-tightest"><SplitReveal inView stagger={0.08}>Your next payout starts <span className="em text-brand-600">today.</span></SplitReveal></h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-ink-muted">Sign up in two minutes. Get verified. Pick your first gig.</p>
          <div className="mt-9 flex justify-center gap-3"><Magnetic strength={0.35}><Link to={cta} className="btn-primary px-8 py-4">Get started <ArrowRight className="h-4 w-4" /></Link></Magnetic></div>
        </Reveal>
      </section>
    </>
  )
}

function Calculator() {
  const [n, setN] = useState(12)
  const pct = ((n - 1) / 29) * 100
  return (
    <section className="container-x">
      <Reveal>
        <div className="card grid items-center gap-10 p-8 md:grid-cols-[1.2fr_1fr] md:p-14">
          <div>
            <div className="eyebrow">Earnings estimate</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tightest">What could a month look like?</h2>
            <p className="mt-2 text-ink-muted">Based on an onboarding gig paying ₵50 per business.</p>
            <input type="range" min={1} max={30} value={n} onChange={(e) => setN(+e.target.value)} aria-label="Businesses onboarded"
              style={{ background: `linear-gradient(to right, #245A44 ${pct}%, #EFECE4 ${pct}%)` }}
              className="mt-10 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand-600" />
            <div className="mt-3 flex justify-between text-sm text-ink-muted"><span><b className="font-semibold text-ink">{n}</b> business{n > 1 ? 'es' : ''} onboarded</span><span>30</span></div>
          </div>
          <div className="rounded-3xl bg-paper p-8 text-center md:text-left">
            <div className="text-sm text-ink-muted">Estimated earnings</div>
            <div className="mt-1 font-display text-6xl font-semibold tracking-tightest"><Ticker to={n * 50} duration={0.5} /></div>
            <div className="mt-2 text-sm text-ink-muted">About {Math.ceil(n / 4)} afternoon{n > 4 ? 's' : ''} of work</div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const QA = [
  ['Who can join?', 'Gigotter is built for students at universities, polytechnics and colleges: you’ll verify with your student ID, a national ID and a selfie. Not a student? You can join too and verify with your Ghana Card and a selfie, then take part in gigs that are open to everyone.'],
  ['How do gigs that need an application work?', 'Some gigs, like focus groups, look for particular people. You apply with a few answers, the Gigotter team selects who takes part, and you’re paid once you’ve taken part.'],
  ['Why do you need my ID and a selfie?', 'We pay out real money and represent real businesses, so every account must belong to a real, verified student. Your documents are stored privately and seen only by our verification team.'],
  ['When do I get paid?', 'Work is usually reviewed within 24 hours. Approved earnings are sent to your mobile money account in the weekly payout.'],
  ['Can I take more than one gig?', 'Yes — take on as many as you can manage. If you can’t complete one, withdraw from your dashboard so another student can take the spot.'],
  ['What counts as completed work?', 'Each gig lists exactly what to submit — usually the business name, contact and a photo. We only pay for work that meets the brief.'],
]
function FAQ() {
  const [o, setO] = useState<number | null>(0)
  return (
    <section className="container-x grid gap-12 pb-28 md:grid-cols-[.8fr_1.2fr]">
      <Reveal><SectionHead eyebrow="FAQ" title="Questions, answered." body="Can’t find what you need? Email hello@gigotter.com." /></Reveal>
      <div className="border-t border-line">
        {QA.map(([q, a], i) => (
          <div key={q} className="border-b border-line">
            <button onClick={() => setO(o === i ? null : i)} aria-expanded={o === i} className="group flex w-full items-center justify-between gap-6 py-6 text-left">
              <span className="text-[17px] font-medium transition-transform duration-300 group-hover:translate-x-1">{q}</span>
              <motion.span animate={{ rotate: o === i ? 135 : 0 }} transition={{ duration: 0.4, ease: EASE }}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${o === i ? 'border-ink bg-ink text-white' : 'border-line text-ink-muted group-hover:border-ink/40'}`}>
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {o === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                  <p className="max-w-xl pb-6 leading-relaxed text-ink-muted">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Number that rolls to its new value (₵ formatted). */
function Ticker({ to, duration = 1.2, delay = 0, decimals = 0 }: { to: number; duration?: number; delay?: number; decimals?: number }) {
  const reduce = useReducedMotion()
  const v = useMotionValue(reduce ? to : 0)
  const txt = useTransform(v, (x) => `₵${x.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`)
  useEffect(() => { if (reduce) { v.set(to); return } const c = animate(v, to, { duration, delay, ease: EASE }); return c.stop }, [to, duration, delay, v, reduce])
  return <motion.span className="tabular-nums">{txt}</motion.span>
}

const STEPS = [
            { img: IMG.step1, n: '01', t: 'Get verified once', d: 'Add your student ID, national ID and a quick selfie, plus the mobile money number you want paid to. Most people are approved within a day.' },
            { img: IMG.step2, n: '02', t: 'Pick work that fits', d: 'Browse open gigs near you or remote. Each one tells you exactly what to do, what proof to collect and how much it pays.' },
            { img: IMG.step3, n: '03', t: 'Submit and get paid', d: 'Log each completed unit with a photo. Once we approve it, the money goes straight to your MoMo in the weekly payout.' },
]

function Steps() {
  const [ref, progress] = useDrawLine()
  return (
    <div ref={ref} className="relative mt-14">
      {/* line that draws across the three steps as you scroll (desktop) */}
      <div aria-hidden className="absolute inset-x-0 top-0 hidden md:block">
        <div className="h-px w-full bg-line" />
        <motion.div className="absolute inset-x-0 top-0 h-px origin-left bg-brand-500" style={{ scaleX: progress }} />
      </div>
      <div className="grid gap-12 pt-0 md:grid-cols-3 md:gap-8 md:pt-10">
        {STEPS.map((s, i) => (
          <div key={s.n} className="group relative">
            <motion.span aria-hidden initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 300, damping: 18 }}
              className="absolute -top-10 left-0 hidden h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-500 ring-4 ring-paper md:block" />
            <ImageReveal delay={i * 0.12} className="overflow-hidden rounded-3xl">
              <Photo src={s.img} alt={s.t} label={s.img.split('/').pop()} className="aspect-[4/3] w-full transition duration-700 group-hover:scale-[1.04]" />
            </ImageReveal>
            <Reveal delay={0.15 + i * 0.12}>
              <div className="mt-6 flex items-baseline gap-3"><span className="font-display text-sm font-semibold text-brand-600">{s.n}</span><h3 className="text-xl font-semibold">{s.t}</h3></div>
              <p className="mt-2 leading-relaxed text-ink-muted">{s.d}</p>
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkTile({ I, t, d, i }: { I: any; t: string; d: string; i: number }) {
  const spot = useSpotlight()
  return (
    <Reveal delay={i * 0.06} className="h-full">
      <div {...spot.handlers} className="group relative h-full overflow-hidden bg-white p-7">
        {spot.layer}
        <div className="relative z-10">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
            <I className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <h3 className="mt-5 font-semibold">{t}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{d}</p>
        </div>
      </div>
    </Reveal>
  )
}

