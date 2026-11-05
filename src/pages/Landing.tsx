import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, BadgeCheck, Plus, Smartphone, Wallet, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import GigCard from '../components/GigCard'
import { CountUp, Marquee, Reveal } from '../components/ui'
import { listListings } from '../lib/api'
import { isOpen } from '../lib/format'
import { useAsync, useSession } from '../lib/session'

const WORDS = ['rent', 'data', 'jollof', 'the weekend', 'your fees', 'new kicks']

export default function Landing() {
  const { user } = useSession()
  const gigs = useAsync(() => listListings(), [])
  const [w, setW] = useState(0)
  useEffect(() => { const t = setInterval(() => setW((x) => (x + 1) % WORDS.length), 2000); return () => clearInterval(t) }, [])
  const hero = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const yPhone = useTransform(scrollYProgress, [0, 1], [0, 120])
  const rot = useTransform(scrollYProgress, [0, 1], [-6, 6])
  const live = (gigs.data ?? []).filter(isOpen)
  const cta = user ? '/gigs' : '/signup'

  return (
    <>
      {/* ─────────── HERO ─────────── */}
      <section ref={hero} className="noise relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 animate-blob rounded-full bg-glow-300 opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-40 h-96 w-96 animate-blob rounded-full bg-pop-300 opacity-50 blur-3xl [animation-delay:-5s]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 animate-blob rounded-full bg-grape-300 opacity-50 blur-3xl [animation-delay:-9s]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 md:grid-cols-[1.15fr_.85fr] md:pt-20">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip border-2 border-ink bg-white py-1.5 shadow-brutal">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              {live.length || 'New'} gigs live right now
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-[clamp(2.75rem,8vw,5.5rem)] font-extrabold leading-[0.92]">
              Want to make<br />some <span className="text-gradient">money?</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6 max-w-md text-lg text-ink/70">
              Real gigs for students. Onboard businesses, run focus groups, collect research — and get paid for{' '}
              <span className="relative inline-block min-w-[6.5rem] font-bold text-ink">
                <AnimatePresence mode="wait">
                  <motion.span key={w} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="inline-block">{WORDS[w]}.</motion.span>
                </AnimatePresence>
              </span>
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 flex flex-wrap gap-3">
              <Link to={cta} className="btn-glow text-base">Get started — it’s free <ArrowRight className="h-5 w-5" /></Link>
              <Link to="/gigs" className="btn-ghost">See the gigs</Link>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex items-center gap-3 text-sm text-ink/60">
              <div className="flex -space-x-2">
                {['🧑🏾‍🎓', '👩🏿‍🎓', '🧑🏽‍🎓', '👩🏾‍🎓'].map((e, i) => <span key={i} className="grid h-9 w-9 place-items-center rounded-full border-2 border-cream bg-white text-lg">{e}</span>)}
              </div>
              Paid straight to your MoMo. No CV. No interview.
            </motion.div>
          </div>

          {/* phone mock */}
          <motion.div style={{ y: yPhone, rotate: rot }} className="relative mx-auto w-full max-w-[19rem]">
            <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', damping: 16 }}
              className="relative rounded-[2.75rem] border-[3px] border-ink bg-ink p-2.5 shadow-[12px_12px_0_0_#FF3CAC]">
              <div className="overflow-hidden rounded-[2.2rem] bg-cream">
                <div className="flex justify-center pt-2"><div className="h-5 w-20 rounded-full bg-ink" /></div>
                <div className="space-y-3 p-4">
                  <div className="text-xs font-semibold text-ink/50">Your balance</div>
                  <div className="font-display text-4xl font-extrabold">₵<CountUp to={1250} /></div>
                  <div className="rounded-2xl bg-[linear-gradient(135deg,#FF5C39,#FF3CAC,#7B5CFF)] p-4 text-white">
                    <div className="text-xs opacity-80">Salon onboarding</div>
                    <div className="mt-1 font-display text-lg font-bold">18 / 30 salons</div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/30"><motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ delay: 0.8, duration: 1.2 }} /></div>
                  </div>
                  {[['💅', 'Ama’s Glam Studio', '+₵50'], ['✂️', 'Kinky Coils Bar', '+₵50'], ['🧵', 'Efua Couture', '+₵50']].map(([e, n, a], i) => (
                    <motion.div key={n} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1 + i * 0.15 }}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3">
                      <span className="text-xl">{e}</span><span className="flex-1 truncate text-sm font-semibold">{n}</span><span className="text-sm font-bold text-emerald-600">{a}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: 'spring' }}
              className="absolute -left-8 top-24 rotate-[-8deg] rounded-2xl border-2 border-ink bg-lime-300 px-4 py-2 font-display font-bold shadow-brutal">
              MoMo sent ✓
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7, type: 'spring' }}
              className="absolute -right-6 bottom-16 rotate-[6deg] rounded-2xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold shadow-brutal">
              🔥 3-day streak
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="-rotate-1 border-y-2 border-ink bg-lime-300">
        <Marquee items={['Paid to MoMo', 'Work your own hours', 'Back local businesses', 'No CV needed', 'Weekly payouts', 'Campus to city']} />
      </div>

      {/* ─────────── HOW ─────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal><h2 className="text-4xl font-extrabold md:text-6xl">Three steps.<br /><span className="text-ink/30">That’s literally it.</span></h2></Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: BadgeCheck, n: '01', t: 'Get verified', d: 'Student ID, a quick selfie, your MoMo number. Two minutes, tops.', c: 'bg-glow-100' },
            { icon: Zap, n: '02', t: 'Grab a gig', d: 'Pick what fits your vibe. Onboard salons, run a focus group, collect survey answers.', c: 'bg-pop-300/40' },
            { icon: Wallet, n: '03', t: 'Get paid', d: 'Submit proof, we check it, cash lands on your MoMo. Every unit counts.', c: 'bg-grape-300/40' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <motion.div whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }} className={`card h-full p-7 ${s.c}`}>
                <div className="flex items-center justify-between">
                  <s.icon className="h-8 w-8" />
                  <span className="font-display text-5xl font-extrabold text-ink/10">{s.n}</span>
                </div>
                <h3 className="mt-8 text-2xl font-bold">{s.t}</h3>
                <p className="mt-2 text-ink/70">{s.d}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────── LIVE GIGS ─────────── */}
      <section className="mx-auto max-w-6xl px-4">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="chip bg-ink text-white">Hot right now</div>
            <h2 className="mt-3 text-4xl font-extrabold md:text-5xl">Fresh gigs</h2>
          </div>
          <Link to="/gigs" className="btn-ghost btn-sm">View all <ArrowRight className="h-4 w-4" /></Link>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {live.slice(0, 3).map((l, i) => <GigCard key={l.id} l={l} i={i} />)}
        </div>
      </section>

      {/* ─────────── CALC ─────────── */}
      <Calculator />

      {/* ─────────── WHY ─────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="card h-full bg-ink p-8 text-white">
              <Smartphone className="h-8 w-8 text-lime-300" />
              <h3 className="mt-6 text-3xl font-bold">Why this matters</h3>
              <p className="mt-3 text-white/70">Businesses need real people on the ground — to sign up customers, test ideas and hear what the market actually thinks. Students know the streets, the campus and the culture. <b className="text-white">We move between the two.</b></p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card grid h-full grid-cols-2 gap-6 p-8">
              {[[500, '+', 'businesses to reach'], [24, 'h', 'avg review time'], [0, '', 'fees, ever'], [100, '%', 'paid to MoMo']].map(([n, s, l]) => (
                <div key={l as string}><div className="font-display text-4xl font-extrabold"><CountUp to={n as number} suffix={s as string} /></div><div className="text-sm text-ink/60">{l}</div></div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <FAQ />

      {/* ─────────── CTA ─────────── */}
      <section className="mx-auto max-w-6xl px-4">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[2.5rem] border-2 border-ink bg-[linear-gradient(120deg,#FF5C39,#FF3CAC_50%,#7B5CFF)] px-6 py-16 text-center text-white shadow-brutal-lg md:py-24">
            <h2 className="text-5xl font-extrabold md:text-7xl">Your first ₵ is<br />one tap away.</h2>
            <p className="mx-auto mt-4 max-w-md text-white/85">Sign up, get verified, grab a gig. Your bank balance will thank you.</p>
            <Link to={cta} className="btn mt-8 border-2 border-ink bg-white px-8 py-4 text-lg text-ink shadow-brutal hover:-translate-y-1">Let’s move <ArrowRight /></Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}

function Calculator() {
  const [n, setN] = useState(15)
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <Reveal>
        <div className="card grid items-center gap-8 overflow-hidden p-8 md:grid-cols-2 md:p-12">
          <div>
            <div className="chip bg-glow-100 text-glow-600">Do the maths</div>
            <h2 className="mt-3 text-4xl font-extrabold">How much could you make?</h2>
            <p className="mt-2 text-ink/60">Salon gig pays ₵50 per founder you onboard. Slide it.</p>
            <input type="range" min={1} max={30} value={n} onChange={(e) => setN(+e.target.value)} aria-label="Salons onboarded"
              className="mt-8 h-3 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-pop-500" />
            <div className="mt-2 flex justify-between text-sm font-semibold"><span>{n} salon{n > 1 ? 's' : ''}</span><span className="text-ink/40">30 max</span></div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-sm font-semibold text-ink/50">You’d earn</div>
            <motion.div key={n} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-7xl font-extrabold md:text-8xl">
              <span className="text-gradient">₵{(n * 50).toLocaleString()}</span>
            </motion.div>
            <div className="mt-2 text-sm text-ink/50">≈ {Math.ceil(n / 4)} afternoon{n > 4 ? 's' : ''} of work</div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const QA = [
  ['Who can sign up?', 'Any student currently enrolled at a university, polytechnic or college. You’ll need a valid student ID.'],
  ['Why do you need my ID and a selfie?', 'To keep it real. We pay out real money, so we make sure every account is an actual student. Your docs are stored privately and only our team sees them.'],
  ['When do I get paid?', 'Once we approve your work (usually within 24hrs), payouts go to your MoMo in the next weekly batch.'],
  ['Can I do more than one gig?', 'Yes. Stack as many as you can handle — just don’t ghost a gig after joining, it takes a spot from someone else.'],
  ['What counts as “done”?', 'Every gig lists what proof we need — usually the business name, owner contact and a photo. If the founder signs up with your referral code, even better.'],
]
function FAQ() {
  const [o, setO] = useState<number | null>(0)
  return (
    <section className="mx-auto max-w-3xl px-4 py-24">
      <Reveal><h2 className="text-center text-4xl font-extrabold md:text-5xl">Questions? Fair.</h2></Reveal>
      <div className="mt-10 space-y-3">
        {QA.map(([q, a], i) => (
          <Reveal key={q} delay={i * 0.05}>
            <div className="card overflow-hidden">
              <button onClick={() => setO(o === i ? null : i)} className="flex w-full items-center justify-between gap-4 p-5 text-left font-display text-lg font-bold">
                {q}
                <motion.span animate={{ rotate: o === i ? 45 : 0 }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/5"><Plus className="h-4 w-4" /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {o === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <p className="px-5 pb-5 text-ink/70">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
