import { motion } from 'framer-motion'
import { ArrowRight, Camera, Check, FileSpreadsheet, MapPin, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BriefForm, { type BriefPreset } from '../components/BriefForm'
import FAQ from '../components/Faq'
import { Magnetic, SplitReveal } from '../components/motion'
import { Reveal, SectionHead } from '../components/ui'
import { HeroOlive, StackCards, StatStrip, ZoomPhoto } from '../components/v2'
import { IMG } from '../lib/images'
import { scrollToEl } from '../lib/scroll'
import type { GigType } from '../lib/types'

const EASE = [0.22, 1, 0.36, 1] as const

const GOALS: { tag: string; type: GigType; t: string; d: string; cta: string; bg: string; ui: ReactNode }[] = [
  { tag: 'Sales & customer acquisition', type: 'onboarding', t: 'Get customers signed up, in person.', bg: 'bg-white', cta: 'Start a sales brief',
    d: 'Customer and merchant sign-ups, lead lists, product sampling, store visits. You get verified contact details with a photo and GPS pin for every visit.',
    ui: <VisitMock /> },
  { tag: 'Market & field research', type: 'research', t: 'Surveys, price checks and shelf audits.', bg: 'bg-[#d6e4d9]', cta: 'Start a research brief',
    d: 'In person, by phone or online. Every answer lands in one spreadsheet, with photos and locations to back it up.',
    ui: <SheetMock /> },
  { tag: 'Purchase & product research', type: 'app_testing', t: 'See how people really buy.', bg: 'bg-brand-50', cta: 'Start a product brief',
    d: 'How people choose and pay, mystery shopping, app and website tests, feedback on new ideas. Structured answers from the people you want to reach.',
    ui: <BarsMock /> },
  { tag: 'Focus groups & user research', type: 'focus_group', t: 'The right people in the room.', bg: 'bg-[#c9d6c8]', cta: 'Start a focus group brief',
    d: 'Screen by age, gender, occupation and your own questions. You see every applicant and choose. We handle attendance, check-ins and payment.',
    ui: <ShortlistMock /> },
]

const QUALITY: [any, string, string][] = [
  [ShieldCheck, 'Verified people', 'ID and selfie checked before anyone can work. Students first, plus verified non-students when your brief needs them.'],
  [Camera, 'Proof for every result', 'Photos, GPS pins, contact details or answers to your questions. Duplicates are blocked.'],
  [Users, 'The right participants', 'Screening questions plus age, gender and occupation filters. You choose who takes part.'],
  [FileSpreadsheet, 'Data you can use', 'All results in one spreadsheet, ready for your team, your CRM or your report.'],
]

const STEPS = [
  { t: 'Send a brief', d: 'Who you want to reach, what you need, where and by when.' },
  { t: 'Get a plan and quote', d: 'Within 1 business day, including what counts as a valid result.' },
  { t: 'Verified people do the work', d: 'We write the gig, select people and collect proof as results come in.' },
  { t: 'Pay for approved results', d: 'Every result reviewed. You get a clean spreadsheet.' },
]

const PACKAGES = [
  { name: 'Pilot', label: 'Try us', tag: 'One small project to see how we work.', points: ['One location or audience', 'Up to about 50 results', 'Results within days'] },
  { name: 'Project', label: 'Most popular', tag: 'One-off campaigns of any size.', popular: true, points: ['Several areas or audiences', 'Screening and participant selection', 'Focus groups and multi-day studies', 'Progress updates as results come in'] },
  { name: 'Ongoing', label: 'Every month', tag: 'Research or sales support all year.', points: ['A dedicated Gigotter contact', 'Priority recruiting', 'Monthly reports'] },
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
      <HeroOlive>
        <div className="grid items-center gap-12 md:grid-cols-[1.05fr_.95fr] md:gap-16">
          <div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="eyebrow">For businesses, researchers and agencies</motion.div>
            <h1 className="mt-6 text-[clamp(2.5rem,5.6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
              <SplitReveal delay={0.1}>Real data and real customers, <span className="em">collected on the ground</span> in Ghana.</SplitReveal>
            </h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7, ease: EASE }} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted md:text-xl">
              Verified people who sign up your customers, run your surveys, check shelves and prices, and fill your focus groups, with proof for every result. You only pay for approved work.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap gap-3">
              <Magnetic><button type="button" onClick={() => toBrief()} className="btn-primary px-7 py-3.5">Post a brief <ArrowRight className="h-4 w-4" /></button></Magnetic>
              <button type="button" onClick={() => scrollToEl(document.getElementById('pricing'))} className="btn-ghost px-7 py-3.5">See pricing</button>
            </motion.div>
          </div>
          <div className="relative pb-6">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 1.1, ease: EASE }}>
              <ZoomPhoto src={IMG.business} alt="A founder reviewing results at her desk" eager className="aspect-[4/4.4] w-full" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
              className="absolute bottom-0 left-3 w-[min(290px,80%)] motion-safe:animate-float rounded-[22px] border border-line bg-white p-4 shadow-[0_18px_50px_-24px_rgba(16,41,31,.35)] md:-left-5">
              <div className="flex items-center justify-between text-sm"><b className="font-semibold">Price check · results</b><span className="chip bg-sand text-ink-muted">Example</span></div>
              <div className="mt-3 flex justify-between text-sm"><span className="text-ink-muted">Approved results</span><b className="tabular-nums">38</b></div>
              <div className="mt-1.5 flex justify-between text-sm"><span className="text-ink-muted">Pharmacies visited</span><b className="tabular-nums">41 of 50</b></div>
            </motion.div>
          </div>
        </div>
      </HeroOlive>

      <section className="container-x pt-14">
        <StatStrip items={[[1, ' day', 'To get your plan and quote'], [48, 'h', 'To start simple projects'], [100, '%', 'Of results reviewed by us'], [0, '', 'For results you reject', '₵']]} />
      </section>

      {/* ───────── GOALS ───────── */}
      <section className="container-x py-24 md:py-32">
        <Reveal><SectionHead eyebrow="What we do" title={<SplitReveal inView>What do you need to <span className="em">find out,</span> or get done?</SplitReveal>}
          body="Most projects mix a little of each. We shape every one around your brief." /></Reveal>
        <StackCards>
          {GOALS.map((g) => (
            <article key={g.tag} className={`grid items-center gap-8 rounded-[28px] border border-line p-6 md:grid-cols-2 md:gap-14 md:p-12 ${g.bg}`}>
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-line">{g.tag}</span>
                <h3 className="mt-4 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.035em]">{g.t}</h3>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-muted">{g.d}</p>
                <button type="button" onClick={() => toBrief({ work_type: g.type })} className="link-u mt-6 inline-flex items-center gap-2 font-medium">{g.cta} <ArrowRight className="h-4 w-4" /></button>
              </div>
              <div className="min-w-0 rounded-[22px] border border-line bg-white p-5 shadow-[0_18px_50px_-30px_rgba(16,41,31,.35)] md:justify-self-end md:w-full md:max-w-[420px]">{g.ui}</div>
            </article>
          ))}
        </StackCards>
      </section>

      {/* ───────── QUALITY ───────── */}
      <section className="mx-2 rounded-[clamp(28px,4vw,44px)] bg-brand-900 py-20 text-white md:mx-3 md:py-28">
        <div className="container-x">
          <Reveal>
            <div className="eyebrow !text-white/60 before:!bg-brand-200">Quality</div>
            <h2 className="mt-4 max-w-3xl text-[clamp(2.1rem,4.8vw,3.6rem)] leading-[1.04] tracking-[-0.035em] text-white">Every result is checked <span className="text-brand-200">before you pay.</span></h2>
            <p className="mt-5 max-w-xl text-lg text-white/65">Fieldwork is only useful if it’s real. Everything we do is built around checking it.</p>
          </Reveal>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUALITY.map(([I, t, d], i) => (
              <Reveal key={t} delay={i * 0.06} className="h-full">
                <div className="group flex h-full min-h-[240px] flex-col rounded-[22px] border border-white/15 p-6 transition-colors duration-500 hover:bg-white">
                  <I className="h-6 w-6 transition-colors duration-500 group-hover:text-brand-900" strokeWidth={1.6} />
                  <h3 className="mt-auto pt-10 text-xl tracking-[-0.02em] text-white transition-colors duration-500 group-hover:text-brand-900">{t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/60 transition-colors duration-500 group-hover:text-ink-muted">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── STEPS ───────── */}
      <section className="container-x py-24 md:py-32">
        <Reveal><SectionHead eyebrow="How it works" title={<SplitReveal inView>From brief to results in four steps.</SplitReveal>} /></Reveal>
        <div className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="absolute left-0 right-0 top-[5px] hidden h-0.5 bg-line lg:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.08} className="relative pt-9">
              <span className="absolute left-0 top-0 h-3 w-3 rounded-full bg-brand-700" />
              <div className="text-xs tracking-[0.08em] text-ink-muted">STEP {i + 1}</div>
              <h3 className="mt-2.5 text-xl tracking-[-0.02em]">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section id="pricing" className="container-x scroll-mt-24 pb-24 md:pb-32">
        <Reveal><SectionHead eyebrow="Pricing" title={<SplitReveal inView>Priced per approved result. <span className="em">Quoted for your brief.</span></SplitReveal>}
          body="You always get a price per approved result and a total budget cap, so you never pay for work that doesn’t meet the brief." /></Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {PACKAGES.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08} className="h-full">
              <div className={`flex h-full flex-col rounded-[28px] p-8 transition duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 ${p.popular ? 'bg-brand-900 text-white' : 'border border-line bg-white'}`}>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${p.popular ? 'bg-brand-200 text-brand-900' : 'bg-brand-50'}`}>{p.label}</span>
                <h3 className={`mt-5 text-[26px] tracking-[-0.03em] ${p.popular ? 'text-white' : ''}`}>{p.name}</h3>
                <p className={`mt-1.5 text-sm ${p.popular ? 'text-white/60' : 'text-ink-muted'}`}>{p.tag}</p>
                <div className={`mt-7 font-display text-[40px] font-semibold leading-none tracking-[-0.04em] ${p.popular ? 'text-white' : ''}`}>Contact us</div>
                <p className={`mt-1 text-sm ${p.popular ? 'text-white/60' : 'text-ink-muted'}`}>for a quote</p>
                <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                  {p.points.map((x) => <li key={x} className="flex gap-2.5"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.popular ? 'text-brand-200' : 'text-brand-600'}`} />{x}</li>)}
                </ul>
                <button type="button" onClick={() => toBrief({ package: p.name })} className={`btn mt-8 w-full py-3.5 ${p.popular ? 'bg-white text-ink hover:bg-brand-50' : 'border border-ink/15 hover:border-brand-700 hover:bg-brand-700 hover:text-white'}`}>Get a quote <ArrowRight className="h-4 w-4" /></button>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-ink-muted"><MapPin className="h-4 w-4" />Venue, refreshments, transport and samples are passed through at cost. Prefer to talk first? Email hello@gigotter.com.</p>
      </section>

      <FAQ items={QA} title="Questions from businesses." body="Anything else? Email hello@gigotter.com and we’ll get back to you within a business day." />

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

/* ── example screens on the goal cards (clearly marked as examples) ── */
const Head = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between gap-3 text-sm"><b className="font-semibold">{title}</b><span className="chip shrink-0 bg-sand text-ink-muted">Example</span></div>
)

function VisitMock() {
  return (
    <>
      <Head title="Visit · salon onboarding" />
      <div className="relative mt-3 h-32 overflow-hidden rounded-2xl bg-sand">
        <img src={IMG.step2} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs"><MapPin className="h-3.5 w-3.5" />GPS pin · ±8 m</span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-ink-muted">Salon</dt><dd className="text-right font-medium">Adwoa’s Beauty Place</dd>
        <dt className="text-ink-muted">Owner</dt><dd className="text-right font-medium">Adwoa M.</dd>
        <dt className="text-ink-muted">Phone</dt><dd className="text-right font-medium">020 ••• 1188</dd>
      </dl>
    </>
  )
}

function SheetMock() {
  const rows = [['Ernest Chemists', 'Osu', '₵12.00'], ['Bedita Pharmacy', 'Osu', '₵10.50'], ['Medi-Life', 'Labone', '₵11.00'], ['Top-Up Chemist', 'Cantonments', '₵13.20']]
  return (
    <>
      <Head title="Price check · results" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[13px] tabular-nums">
          <thead><tr className="text-left text-ink-muted"><th className="border-b border-line py-2 pr-3 font-medium">Pharmacy</th><th className="border-b border-line py-2 pr-3 font-medium">Area</th><th className="border-b border-line py-2 font-medium">Price</th></tr></thead>
          <tbody>
            {rows.map(([a, b, c], i) => (
              <motion.tr key={a} initial={{ opacity: 0, y: -8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: EASE }}>
                <td className="whitespace-nowrap border-b border-line py-2.5 pr-3">{a}</td><td className="border-b border-line py-2.5 pr-3">{b}</td><td className="border-b border-line py-2.5">{c}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BarsMock() {
  const bars: [string, number][] = [['Delivery fee was a surprise', 46], ['MoMo payment failed', 28], ['Couldn’t find my size', 18], ['Something else', 8]]
  return (
    <>
      <Head title="Where did checkout go wrong?" />
      <div className="mt-4 grid gap-3.5">
        {bars.map(([t, v], i) => (
          <div key={t} className="text-sm">
            <div className="flex justify-between gap-3"><span>{t}</span><b className="tabular-nums">{v}%</b></div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand">
              <motion.div className="h-full origin-left rounded-full bg-brand-700" style={{ width: `${v}%` }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 1.1, ease: EASE }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ShortlistMock() {
  const people: [string, string, string, string][] = [['EA', 'Efua A.', '29 · Product designer', 'Selected'], ['KM', 'Kofi M.', '21 · Student, UG', 'Selected'], ['NB', 'Naa B.', '34 · Trader', 'Shortlisted'], ['YO', 'Yaw O.', '25 · Nurse', 'Applied']]
  return (
    <>
      <Head title="Applicants · choose 12" />
      <div className="mt-2">
        {people.map(([i, n, s, st], k) => (
          <motion.div key={n} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + k * 0.12, duration: 0.6, ease: EASE }}
            className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-0">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[11px] font-semibold ${['bg-[#c9d6c8]', 'bg-[#efdcc6]', 'bg-brand-50', 'bg-[#d6e4d9]'][k]}`}>{i}</span>
            <div className="min-w-0 flex-1"><b className="block font-semibold">{n}</b><span className="text-xs text-ink-muted">{s}</span></div>
            <span className={`chip shrink-0 ${st === 'Selected' ? 'bg-brand-700 text-white' : 'bg-sand text-ink'}`}>{st}</span>
          </motion.div>
        ))}
      </div>
    </>
  )
}
