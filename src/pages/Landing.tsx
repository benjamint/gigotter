import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { ArrowRight, BadgeCheck, Check, ClipboardList, Handshake, MessagesSquare, Package, Search, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import GigCard from '../components/GigCard'
import { Reveal, SectionHead } from '../components/ui'
import { PayoutFeed, TestimonialStrip } from '../components/Feeds'
import FAQ from '../components/Faq'
import { HeroOlive, StackCards, StatStrip, ZoomPhoto } from '../components/v2'
import { listListings, listTestimonials, payoutFeed } from '../lib/api'
import { isOpen } from '../lib/format'
import { IMG } from '../lib/images'
import { useAsync, useSession } from '../lib/session'
import { Magnetic, SplitReveal, useSpotlight } from '../components/motion'

const EASE = [0.22, 1, 0.36, 1] as const

export default function Landing() {
  const { user } = useSession()
  const gigs = useAsync(() => listListings(), [])
  const live = (gigs.data ?? []).filter(isOpen)
  const paid = useAsync(() => payoutFeed(20), [])
  const quotes = useAsync(() => listTestimonials(), [])
  const cta = user ? '/gigs' : '/signup'

  return (
    <>
      {/* ───────── HERO ───────── */}
      <HeroOlive>
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_.95fr] md:gap-16">
          <div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-ink/[.07] bg-white/80 px-3 py-1.5 text-xs font-medium text-ink-soft backdrop-blur">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-40" /><span className="relative h-2 w-2 rounded-full bg-brand-500" /></span>
              {live.length ? `${live.length} paid gig${live.length === 1 ? '' : 's'} open now` : 'Paid gigs for students in Ghana'}
            </motion.div>
            <h1 className="mt-6 text-[clamp(2.75rem,7vw,5.75rem)] font-semibold leading-[.98] tracking-[-0.045em]">
              <SplitReveal delay={0.1}>Real work. Real pay. <span className="em">Straight to MoMo.</span></SplitReveal>
            </h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
              className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-muted md:text-xl">
              Pick a paid gig from a real business, do the work between lectures or around your job, and get paid to your mobile money. Onboarding, surveys, focus groups and field research.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap gap-3">
              <Magnetic><Link to={cta} className="btn-primary px-7 py-3.5">Find paid work <ArrowRight className="h-4 w-4" /></Link></Magnetic>
              <Link to="/business" className="btn-ghost px-7 py-3.5">Hire verified people</Link>
            </motion.div>
            {!user && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-4 text-sm text-ink-muted">
              Not a student? <Link to="/signup?type=general" className="link-u font-medium text-ink">You can join too</Link>
            </motion.p>}
            <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 0.8 } } }} className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-muted">
              {[[ShieldCheck, 'ID and selfie verified'], [Wallet, 'Paid to MoMo'], [BadgeCheck, 'No fees to join']].map(([I, t]: any) => (
                <motion.span key={t} variants={{ h: { opacity: 0, y: 6 }, s: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} className="flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{t}</motion.span>
              ))}
            </motion.div>
          </div>

          <div className="relative pb-9">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 1.1, ease: EASE }}>
              <ZoomPhoto src={IMG.hero} alt="Students in Accra, smiling, phones in hand" eager className="aspect-[4/5] max-h-[640px] w-full" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8, ease: EASE }}
              className="absolute bottom-0 left-3 w-[min(300px,82%)] motion-safe:animate-float rounded-[22px] border border-line bg-white p-4 shadow-[0_18px_50px_-24px_rgba(16,41,31,.35)] md:-left-8">
              <div className="flex items-center gap-3">
                <img src="/images/mtn.jpg" alt="MTN MoMo" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                <div><div className="text-xs text-ink-muted">Payment sent · MTN MoMo</div><div className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]"><Ticker to={450} delay={1.2} decimals={2} /></div></div>
              </div>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-xs text-ink-muted"><span>9 salons onboarded</span><span>Example payout</span></div>
            </motion.div>
          </div>
        </div>
      </HeroOlive>

      {/* ───────── STATS ───────── */}
      <section className="container-x pt-14">
        <StatStrip items={[[24, 'h', 'Typical review time'], [100, '%', 'Paid to mobile money'], [0, '', 'Fees to join', '₵'], [5, ' min', 'To get verified']]} />
      </section>

      {/* ───────── OPEN GIGS ───────── */}
      <section id="gigs" className="mt-16 scroll-mt-24 bg-sand py-20 md:py-24">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead eyebrow={live.length ? `${live.length} open now` : 'Open now'} title={<SplitReveal inView>Gigs you can start this week.</SplitReveal>} />
            <Link to="/gigs" className="group inline-flex items-center gap-2 text-sm font-medium">See all gigs <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
          </Reveal>
          {gigs.loading && !gigs.data ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {[0, 1, 2].map((i) => <div key={i} className={`h-80 animate-pulse rounded-3xl bg-white/70 ${i ? 'hidden sm:block' : ''}`} />)}
            </div>
          ) : live.length ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {live.slice(0, 6).map((l, i) => <div key={l.id} className={i >= 3 ? 'hidden sm:block' : ''}><GigCard l={l} i={i} /></div>)}
            </div>
          ) : (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-white p-6 md:p-8">
              <p className="text-ink-muted">New gigs are added every week. Sign up to be first to hear about them.</p>
              <Link to={cta} className="btn-primary">{user ? 'Browse gigs' : 'Sign up free'} <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
          {(paid.data?.length ?? 0) >= 3 && <div className="mt-12"><PayoutFeed items={paid.data!} /></div>}
        </div>
      </section>

      {/* ───────── TWO SIDES ───────── */}
      <section className="container-x py-24 md:py-32">
        <Reveal><SectionHead eyebrow="Two sides, one platform" title={<SplitReveal inView>Earn on your schedule. Or get work done on the ground.</SplitReveal>} /></Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Audience to={cta} tone="bg-[#c9d6c8]" tag="For students and everyone earning" title="Paid work that fits around your day."
            points={['Verify once with your student ID or Ghana Card, plus a selfie', 'Every gig shows the pay, the steps and the proof needed', 'Approved work is paid to your MoMo']}
            cta="Find paid work" img={IMG.auth} alt="Students on campus" />
          <Audience to="/business" tone="bg-brand-50" tag="For businesses and researchers" title="Verified people for sales, research and focus groups."
            points={['Customer sign-ups, surveys, price checks, focus groups', 'Photo, GPS and answers as proof for every result', 'Pay only for results that meet your brief']}
            cta="Post a brief" img={IMG.business} alt="A founder at work" delay={0.08} />
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="container-x pb-24 md:pb-32">
        <Reveal><SectionHead eyebrow="How it works" title={<SplitReveal inView>Three steps to your <span className="em">first payout.</span></SplitReveal>} /></Reveal>
        <StackCards>
          {STEPS.map((s, i) => (
            <article key={s.t} className={`grid items-center gap-8 rounded-[28px] border border-line p-6 md:grid-cols-2 md:gap-14 md:p-12 ${['bg-white', 'bg-[#c9d6c8]', 'bg-brand-50'][i]}`}>
              <div>
                <div className="text-sm font-medium tracking-[0.08em] text-ink-muted">Step {i + 1} of 3</div>
                <h3 className="mt-4 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.035em]">{s.t}</h3>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-muted">{s.d}</p>
              </div>
              <div className="relative w-full md:max-w-[460px] md:justify-self-end">
                <ZoomPhoto src={s.img} alt={s.alt} className="aspect-[4/3.2] w-full !rounded-[20px]" />
                <Reveal delay={0.2} className="absolute bottom-3.5 left-3.5 max-w-[calc(100%-28px)]">
                  <div className="glass-tag">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.tagBg}`}>{s.icon}</span>
                    <span><b className="block font-display text-[15px] font-semibold leading-tight tracking-[-0.01em]">{s.tag}</b><span className="mt-0.5 block text-xs text-ink-muted">{s.sub}</span></span>
                  </div>
                </Reveal>
              </div>
            </article>
          ))}
        </StackCards>
      </section>

      {/* ───────── KINDS OF WORK ───────── */}
      <section className="container-x pb-24 md:pb-32">
        <Reveal><SectionHead eyebrow="The work" title={<SplitReveal inView>Flexible work that builds <span className="em">real experience.</span></SplitReveal>}
          body="Every gig is paid, clearly scoped and done on your own schedule: between lectures, on weekends or from home. And it all goes on your Gigotter record." /></Reveal>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {[
            [Handshake, 'Customer onboarding', 'Introduce businesses to a product and help them sign up.', 'bg-[#c9d6c8]'],
            [MessagesSquare, 'Focus groups', 'Share your view in a room with others, paid for your time.', 'bg-[#d6e4d9]'],
            [Search, 'Field research', 'Visit shops and markets to collect prices, photos and insight.', 'bg-brand-50'],
            [ClipboardList, 'Surveys', 'Gather genuine answers from people who match the brief.', 'bg-[#dce8df]'],
            [Smartphone, 'App testing', 'Try new apps and websites and say honestly what works.', 'bg-brand-200'],
            [Package, 'Errands', 'Deliveries, drop-offs and quick checks around town.', 'bg-[#c9d6c8]'],
          ].map(([I, t, d, bg]: any, i) => <WorkTile key={t} I={I} t={t} d={d} bg={bg} i={i} />)}
        </div>
      </section>

      {(quotes.data?.length ?? 0) >= 1 && (
        <section className="pb-24 md:pb-32">
          <Reveal className="container-x"><SectionHead eyebrow="From students" title={<>In their <span className="em">own words.</span></>} /></Reveal>
          <div className="mt-10"><TestimonialStrip items={quotes.data!} /></div>
        </section>
      )}

      <FAQ items={QA} />

      {/* ───────── CTA ───────── */}
      <section className="mx-2 rounded-[clamp(28px,4vw,44px)] bg-brand-900 px-4 py-20 text-center text-white md:mx-3 md:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-4xl text-[clamp(2.5rem,6.4vw,5.25rem)] leading-[1] tracking-[-0.045em] text-white"><SplitReveal inView stagger={0.08}>Your next payout <span className="text-brand-200">starts today.</span></SplitReveal></h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-white/65">Sign up in two minutes. Get verified. Pick your first gig.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Magnetic strength={0.35}><Link to={cta} className="btn bg-white px-8 py-4 text-ink hover:bg-brand-50">Start earning <ArrowRight className="h-4 w-4" /></Link></Magnetic>
            <Link to="/business" className="btn border border-white/20 px-8 py-4 text-white hover:bg-white/10">I'm a business</Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}

function Audience({ to, tone, tag, title, points, cta, img, alt, delay = 0 }: {
  to: string; tone: string; tag: string; title: string; points: string[]; cta: string; img: string; alt: string; delay?: number
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <Link to={to} className={`group flex h-full flex-col rounded-[28px] p-7 transition duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 md:p-12 ${tone}`}>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium">{tag}</span>
        <h3 className="mt-5 text-[clamp(1.75rem,3.2vw,2.6rem)] leading-[1.05] tracking-[-0.035em]">{title}</h3>
        <ul className="mt-6 grid gap-2.5 text-[15px]">
          {points.map((p) => <li key={p} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0" />{p}</li>)}
        </ul>
        <span className="btn-primary mt-8 w-fit">{cta} <ArrowRight className="h-4 w-4" /></span>
        <ZoomPhoto src={img} alt={alt} className="mt-8 h-56 !rounded-[20px] md:h-60" />
      </Link>
    </Reveal>
  )
}

const QA: [string, string][] = [
  ['Who can join?', 'Gigotter is built for students at universities, polytechnics and colleges: you’ll verify with your student ID, a national ID and a selfie. Not a student? You can join too and verify with your Ghana Card and a selfie, then take part in gigs that are open to everyone.'],
  ['How do gigs that need an application work?', 'Some gigs, like focus groups, look for particular people. You apply with a few answers, the Gigotter team selects who takes part, and you’re paid once you’ve taken part.'],
  ['Why do you need my ID and a selfie?', 'We pay out real money and represent real businesses, so every account must belong to a real, verified person. Your documents are stored privately and seen only by our verification team.'],
  ['When do I get paid?', 'Work is usually reviewed within 24 hours. Approved earnings are sent to your mobile money account in the weekly payout.'],
  ['Can I take more than one gig?', 'Yes. Take on as many as you can manage. If you can’t complete one, withdraw from your dashboard so someone else can take the spot.'],
  ['What counts as completed work?', 'Each gig lists exactly what to submit, usually the business name, contact and a photo. We only pay for work that meets the brief.'],
]

/** Number that rolls to its value (₵ formatted). */
function Ticker({ to, duration = 1.2, delay = 0, decimals = 0 }: { to: number; duration?: number; delay?: number; decimals?: number }) {
  const reduce = useReducedMotion()
  const v = useMotionValue(reduce ? to : 0)
  const txt = useTransform(v, (x) => `₵${x.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`)
  useEffect(() => { if (reduce) { v.set(to); return } const c = animate(v, to, { duration, delay, ease: EASE }); return c.stop }, [to, duration, delay, v, reduce])
  return <motion.span className="tabular-nums">{txt}</motion.span>
}

const STEPS = [
  { img: IMG.step1, alt: 'Student taking a selfie for verification', t: 'Get verified once.', d: 'Add your student ID, a national ID and a quick selfie, plus the MoMo number you want paid to. Not a student? Join with your Ghana Card.',
    tag: 'Verified', sub: 'ID, selfie and MoMo added', tagBg: 'bg-[#1f7a4d] text-white', icon: <Check className="h-4 w-4" /> },
  { img: IMG.step2, alt: 'Student talking with a shop owner', t: 'Pick work that fits.', d: 'Browse open gigs near you or remote. Each one says exactly what to do, what proof to collect and how much it pays.',
    tag: 'Clear pay, clear steps', sub: 'Before you join any gig', tagBg: 'bg-[#c9d6c8]', icon: <MessagesSquare className="h-4 w-4" /> },
  { img: IMG.step3, alt: 'Student checking a mobile money payment', t: 'Submit, then get paid.', d: 'Log each piece of work with a photo. Once it’s approved, the money goes to your MoMo and you get a receipt by email.',
    tag: 'Paid to MoMo', sub: 'With an emailed receipt', tagBg: 'overflow-hidden', icon: <img src="/images/mtn.jpg" alt="MTN MoMo" className="h-full w-full object-cover" /> },
]

function WorkTile({ I, t, d, bg, i }: { I: any; t: string; d: string; bg: string; i: number }) {
  const spot = useSpotlight('rgba(255,255,255,.06)')
  return (
    <Reveal delay={(i % 3) * 0.06} className="h-full">
      <div {...spot.handlers} className="group relative flex h-full min-h-[220px] flex-col overflow-hidden bg-white p-7 transition-colors duration-500 hover:bg-brand-900">
        {spot.layer}
        <span className={`relative z-10 grid h-12 w-12 place-items-center rounded-2xl text-ink transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105 ${bg}`}>
          <I className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <h3 className="relative z-10 mt-auto pt-10 text-xl tracking-[-0.02em] transition-colors duration-500 group-hover:text-white">{t}</h3>
        <p className="relative z-10 mt-2 text-[15px] leading-relaxed text-ink-muted transition-colors duration-500 group-hover:text-white/65">{d}</p>
      </div>
    </Reveal>
  )
}
