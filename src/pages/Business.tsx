import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, BarChart3, Camera, Check, ClipboardCheck, FileSpreadsheet, Handshake, ListChecks, MapPin, MessagesSquare, Repeat, Rocket, ShieldCheck, ShoppingCart, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import BriefForm, { type BriefPreset } from '../components/BriefForm'
import FAQ from '../components/Faq'
import { Magnetic, SplitReveal, useSpotlight } from '../components/motion'
import { Reveal, SectionHead } from '../components/ui'
import { scrollToEl } from '../lib/scroll'
import type { GigType } from '../lib/types'

const EASE = [0.22, 1, 0.36, 1] as const

const GOALS: { I: any; t: string; type: GigType; what: string[]; get: string; eg: string }[] = [
  { I: Handshake, t: 'Sales & customer acquisition', type: 'onboarding',
    what: ['Customer and merchant sign-ups', 'Lead lists of shops, salons, chefs…', 'Product sampling and demos', 'Flyer drops and store visits'],
    get: 'Verified contacts and business details, with a photo and GPS pin for every visit.',
    eg: 'Onboard 100 market traders onto your POS app.' },
  { I: BarChart3, t: 'Market & field research', type: 'research',
    what: ['Surveys in person, by phone or online', 'Price checks and shelf audits', 'Retail and distribution checks', 'Competitor and location scouting'],
    get: 'Every answer in a spreadsheet, with photos and locations to back it up.',
    eg: 'Price checks on 10 products at 50 pharmacies in Accra.' },
  { I: ShoppingCart, t: 'Purchase & product research', type: 'app_testing',
    what: ['How people buy, pay and choose', 'Mystery shopping', 'App and website testing', 'Feedback on new ideas and packaging'],
    get: 'Structured feedback, ratings and screenshots from the people you want to reach.',
    eg: '40 people test your checkout and say where they get stuck.' },
  { I: MessagesSquare, t: 'Focus groups & user research', type: 'focus_group',
    what: ['Recruiting by age, gender, occupation and screening questions', 'In-person sessions and workshops', 'Multi-day studies with daily check-ins', 'Interviews and diary studies'],
    get: 'A screened shortlist you approve, then attendance proof and notes from every session.',
    eg: 'Recruit 12 online shoppers for a design thinking session in Osu.' },
]

const STEPS = [
  { t: 'Send a brief', d: 'Tell us what you need, who you want to reach, where and by when. Attach anything useful.' },
  { t: 'Get a plan and quote', d: 'We call or WhatsApp you within 1 business day with a plan, what counts as a valid result, and a price.' },
  { t: 'Verified people do the work', d: 'We write the gig, select the right people and collect proof for every result as it comes in.' },
  { t: 'Get results, pay for approved work', d: 'Every result is reviewed. You get a clean spreadsheet and only pay for results that meet the brief.' },
]

const WHY: [any, string, string][] = [
  [BadgeCheck, 'Real, verified people', 'Everyone is ID and selfie checked before they can work. Students first, plus verified non-students when your brief needs them.'],
  [Camera, 'Proof for every result', 'Photos, GPS pins, contact details or answers to your questions, set per project, with duplicates blocked.'],
  [Users, 'The right participants', 'Screening questions plus age, gender and occupation filters. For focus groups, you see applicants and choose.'],
  [ClipboardCheck, 'Reviewed before you pay', 'We check every result against the brief. Anything that doesn’t meet it is redone or not charged.'],
  [FileSpreadsheet, 'Data you can use', 'All results in one spreadsheet, ready for your team, your CRM or your report.'],
  [MapPin, 'On the ground in Ghana', 'Accra first, with Kumasi, Tema and other cities on request. Remote work like phone surveys and app tests too.'],
]

const PACKAGES = [
  { I: Rocket, name: 'Pilot', tag: 'Try us on one project', points: ['One location or audience', 'Up to about 50 results', 'Results within days', 'Ideal for a first campaign or test'] },
  { I: ListChecks, name: 'Project', tag: 'One-off campaigns, any size', popular: true, points: ['Several areas or audiences', 'Screening and participant selection', 'Focus groups and multi-day studies', 'Set deadlines and progress updates'] },
  { I: Repeat, name: 'Ongoing', tag: 'Research or sales support every month', points: ['A dedicated Gigotter contact', 'Priority recruiting', 'Regular data collection', 'Monthly reports'] },
]

const QA: [string, string][] = [
  ['How quickly can you start?', 'We reply to every brief within 1 business day. Simple projects like surveys or sign-ups can usually start within 48 hours of your go-ahead; focus groups need a few days to recruit and screen.'],
  ['Where do you work?', 'Mainly Accra, with Kumasi, Tema and other cities on request. Phone surveys, online research and app testing can be done from anywhere in Ghana.'],
  ['Who does the work?', 'Verified students from universities across Ghana, plus verified non-students when a project needs a wider audience, for example working adults or parents. Everyone is ID and selfie checked.'],
  ['How do you make sure the data is real?', 'Each project sets what proof is needed: photos, GPS pins, contact details, answers to your questions. Duplicate answers are blocked, and our team reviews every result before it counts.'],
  ['What if a result isn’t good enough?', 'We agree what counts as a valid result before we start. Anything that doesn’t meet it is redone or not charged. You only pay for approved results.'],
  ['How does pricing and payment work?', 'Every quote is per approved result, with a total budget cap, so you never pay more than agreed. New clients usually pay upfront for a pilot; repeat clients can pay part on approval.'],
  ['Can you sign an NDA or data agreement?', 'Yes. Mention it in your brief and we’ll sign before the project starts. Participants only see what they need to do the work.'],
]

export default function Business({ toForm = false }: { toForm?: boolean }) {
  const loc = useLocation()
  const form = useRef<HTMLDivElement>(null)
  const [preset, setPreset] = useState<BriefPreset>({ n: 0 })
  const toBrief = (p?: Omit<BriefPreset, 'n'>) => {
    if (p) setPreset((x) => ({ ...p, n: x.n + 1 }))
    scrollToEl(form.current)
  }
  // /brief and /business#brief open at the form (after the layout's scroll-to-top on navigation)
  useEffect(() => {
    if (!toForm && loc.hash !== '#brief' && loc.hash !== '#pricing') return
    const t = setTimeout(() => scrollToEl(loc.hash === '#pricing' ? document.getElementById('pricing') : form.current), 350)
    return () => clearTimeout(t)
  }, [toForm, loc.hash])

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section className="container-x pb-16 pt-10 md:pt-16">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="chip bg-brand-50 text-brand-700">For businesses, researchers & agencies</motion.div>
        <h1 className="mt-6 max-w-4xl text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-tightest">
          <SplitReveal delay={0.1}>Real data and real customers, <span className="em text-brand-600">collected on the ground</span> in Ghana.</SplitReveal>
        </h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7, ease: EASE }} className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Verified people who sign up your customers, run your surveys, check shelves and prices, and fill your focus groups, with proof for every result. You only pay for approved work.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap gap-3">
          <Magnetic><button type="button" onClick={() => toBrief()} className="btn-primary px-7 py-3.5">Post a brief <ArrowRight className="h-4 w-4" /></button></Magnetic>
          <button type="button" onClick={() => scrollToEl(document.getElementById('pricing'))} className="btn-ghost px-7 py-3.5">See pricing</button>
        </motion.div>
        <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 0.75 } } }} className="mt-10 grid gap-3 text-sm text-ink-muted sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-x-8">
          {[[ShieldCheck, 'ID-verified people'], [Camera, 'Proof for every result'], [ClipboardCheck, 'Pay only for approved work'], [FileSpreadsheet, 'Results in a spreadsheet']].map(([I, t]: any) => (
            <motion.span key={t} variants={{ h: { opacity: 0, y: 6 }, s: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} className="flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{t}</motion.span>
          ))}
        </motion.div>
      </section>

      {/* ───────── GOALS ───────── */}
      <section className="bg-sand/60 py-20 md:py-24">
        <div className="container-x">
          <Reveal><SectionHead eyebrow="What we do" title={<SplitReveal inView>What do you need to <span className="em">find out</span>, or get done?</SplitReveal>}
            body="Pick the closest fit. Most projects mix a little of each, and we shape every one around your brief." /></Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {GOALS.map((g, i) => <GoalCard key={g.t} g={g} i={i} onStart={() => toBrief({ work_type: g.type })} />)}
          </div>
        </div>
      </section>

      {/* ───────── HOW ───────── */}
      <section className="container-x py-20 md:py-28">
        <Reveal><SectionHead eyebrow="How it works" title={<SplitReveal inView>From brief to <span className="em">results</span> in four steps.</SplitReveal>} /></Reveal>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.07} className="h-full">
              <li className="h-full bg-white p-7">
                <span className="font-display text-sm font-semibold text-brand-600">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ───────── WHY ───────── */}
      <section className="container-x grid gap-12 pb-20 md:grid-cols-[.8fr_1.2fr] md:pb-28">
        <Reveal><SectionHead eyebrow="Why Gigotter" title={<>Data you can <span className="em">trust</span>, from people you can trust.</>}
          body="Fieldwork is only useful if it’s real. Everything we do is built around checking it." /></Reveal>
        <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
          {WHY.map(([I, t, d], i) => (
            <Reveal key={t} delay={i * 0.05}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><I className="h-5 w-5" strokeWidth={1.6} /></span>
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section id="pricing" className="scroll-mt-20 bg-brand-900 py-20 text-white md:py-28">
        <div className="container-x">
          <Reveal className="max-w-2xl">
            <div className="eyebrow text-brand-200">Pricing</div>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tightest text-white md:text-[2.75rem]">Priced per approved result. <span className="em text-brand-200">Quoted for your brief.</span></h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/65">Every project is different, so we quote each one. You always get a price per approved result and a total budget cap, so you never pay for work that doesn’t meet the brief.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PACKAGES.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.08} className="h-full">
                <div className={`relative flex h-full flex-col rounded-3xl p-7 md:p-8 ${p.popular ? 'bg-white text-ink shadow-lift' : 'border border-white/15 bg-white/[.04]'}`}>
                  {p.popular && <span className="absolute right-6 top-6 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Most popular</span>}
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${p.popular ? 'bg-brand-50 text-brand-600' : 'bg-white/10 text-brand-200'}`}><p.I className="h-5 w-5" strokeWidth={1.6} /></span>
                  <h3 className={`mt-5 text-2xl font-semibold ${p.popular ? "" : "text-white"}`}>{p.name}</h3>
                  <p className={`mt-1 text-sm ${p.popular ? 'text-ink-muted' : 'text-white/60'}`}>{p.tag}</p>
                  <div className={`mt-6 font-display text-3xl font-semibold tracking-tight ${p.popular ? '' : 'text-white'}`}>Contact us</div>
                  <p className={`text-sm ${p.popular ? 'text-ink-muted' : 'text-white/50'}`}>for a quote</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {p.points.map((x) => (
                      <li key={x} className="flex gap-3"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.popular ? 'text-brand-600' : 'text-brand-200'}`} />{x}</li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => toBrief({ package: p.name })}
                    className={`btn mt-8 w-full py-3.5 ${p.popular ? 'bg-ink text-white hover:bg-ink/90' : 'bg-white text-ink hover:bg-brand-50'}`}>Get a quote <ArrowRight className="h-4 w-4" /></button>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-sm text-white/55">Venue, refreshments, transport and samples are passed through at cost. Prefer to talk first? Email <a href="mailto:hello@gigotter.com" className="link-u text-white">hello@gigotter.com</a>.</p>
        </div>
      </section>

      <div className="pt-20 md:pt-28"><FAQ items={QA} title="Questions from businesses." body="Anything else? Email hello@gigotter.com and we’ll get back to you within a business day." /></div>

      {/* ───────── BRIEF ───────── */}
      <section className="container-x grid gap-10 pb-8 lg:grid-cols-[.85fr_1.15fr]">
        <Reveal>
          <SectionHead eyebrow="Get started" title={<>Tell us what you <span className="em">need.</span></>}
            body="Share as much or as little as you have. We’ll call or WhatsApp you within 1 business day with a plan and a quote. No commitment until you say go." />
          <ul className="mt-8 space-y-3">
            {['A plan and what counts as a valid result', 'A price per result and a total budget cap', 'A timeline you can hold us to'].map((t) => (
              <li key={t} className="flex items-center gap-3 font-medium"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Check className="h-4 w-4" /></span>{t}</li>
            ))}
          </ul>
        </Reveal>
        <div id="brief" ref={form} className="scroll-mt-24"><BriefForm preset={preset} /></div>
      </section>
    </>
  )
}

function GoalCard({ g, i, onStart }: { g: (typeof GOALS)[number]; i: number; onStart: () => void }) {
  const spot = useSpotlight()
  return (
    <Reveal delay={i * 0.06} className="h-full">
      <div {...spot.handlers} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-7 md:p-8">
        {spot.layer}
        <div className="relative z-10 flex h-full flex-col">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white">
            <g.I className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <h3 className="mt-5 text-xl font-semibold">{g.t}</h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            {g.what.map((w) => <li key={w} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{w}</li>)}
          </ul>
          <p className="mt-5 rounded-2xl bg-paper p-4 text-sm leading-relaxed"><b className="font-semibold">You get: </b><span className="text-ink-muted">{g.get}</span></p>
          <p className="mt-4 flex-1 text-sm italic text-ink-muted">e.g. “{g.eg}”</p>
          <button type="button" onClick={onStart} className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-brand-700">Start a brief <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button>
        </div>
      </div>
    </Reveal>
  )
}
