import { Nfc } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CountUp } from './ui'

export type Finish = 'green' | 'black'
const FINISH_KEY = 'gigotter-otter-card-finish'

// Two quiet finishes; yellow only as a hint (the chip and a fine line)
const FINISHES: Record<Finish, { label: string; swatch: string; bg: string; tone: string }> = {
  green: { label: 'Green', swatch: '#1F4A3A', bg: 'linear-gradient(135deg,#24503F 0%,#173A2D 46%,#0D241B 100%)', tone: 'rgba(255,255,255,.045)' },
  black: { label: 'Black', swatch: '#141615', bg: 'linear-gradient(135deg,#34383A 0%,#1A1C1C 46%,#080909 100%)', tone: 'rgba(255,255,255,.04)' },
}
const INK = '#ECE9DF'                    // warm silver, like foil print
const SOFT = 'rgba(236,233,223,.6)'
const EMBOSS = '0 1px 0 rgba(0,0,0,.45), 0 -1px 0 rgba(255,255,255,.12)'

function readFinish(): Finish {
  try {
    const f = localStorage.getItem(FINISH_KEY)
    if (f === 'green' || f === 'black') return f
    if (f === 'charcoal') return 'black'  // earlier finish names
  } catch { /* storage blocked */ }
  return 'green'
}

/** Gold contact chip, the card's hint of yellow. */
const Chip = () => (
  <svg aria-hidden viewBox="0 0 50 38" style={{ width: '11.5cqw', height: 'auto', display: 'block' }}>
    <defs>
      <linearGradient id="otter-chip" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F6DE8F" /><stop offset=".45" stopColor="#D9B04A" /><stop offset=".7" stopColor="#F2D57A" /><stop offset="1" stopColor="#B98F2E" />
      </linearGradient>
    </defs>
    <rect x=".5" y=".5" width="49" height="37" rx="6.5" fill="url(#otter-chip)" stroke="#8C6A1E" strokeOpacity=".45" />
    <g fill="none" stroke="#7A5B16" strokeOpacity=".55" strokeWidth="1.1">
      <path d="M0 13h15c3 0 4 2 4 5v2c0 3-1 5-4 5H0M50 13H35c-3 0-4 2-4 5v2c0 3 1 5 4 5h15M19 0v10M31 0v10M19 38V28M31 38V28" />
      <rect x="19" y="10" width="12" height="18" rx="3" />
    </g>
  </svg>
)

/** The Otter Card: where a member's Gigotter points live. Digital for now; drawn like a real card (85.6 × 54 mm). */
export default function OtterCard({ name, code, balance, active = true, size = 'lg', picker = true }: {
  name: string; code: string; balance: number; active?: boolean; size?: 'sm' | 'lg'; picker?: boolean
}) {
  const [finish, setFinish] = useState<Finish>(readFinish)
  const choose = (f: Finish) => { setFinish(f); try { localStorage.setItem(FINISH_KEY, f) } catch { /* ignore */ } }
  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === FINISH_KEY) setFinish(readFinish()) }
    window.addEventListener('storage', on); return () => window.removeEventListener('storage', on)
  }, [])
  const f = FINISHES[finish]

  // gentle 3D tilt that follows the pointer (off when the person prefers less motion)
  const card = useRef<HTMLDivElement>(null)
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (still || !card.current) return
    const r = card.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    card.current.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 11).toFixed(2)}deg)`
    card.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`); card.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
  }
  const reset = () => { if (card.current) card.current.style.transform = '' }

  return (
    <div className={size === 'sm' ? 'mx-auto w-[84%] max-w-[22rem] sm:mx-0 sm:w-full' : 'mx-auto w-[84%] max-w-[30rem] sm:mx-0 sm:w-full'}>
      <div style={{ perspective: '1200px' }} onPointerMove={tilt} onPointerLeave={reset}>
        <div ref={card} role="img" aria-label={`Otter Card for ${name}, ${balance.toLocaleString()} points${active ? '' : ', not active yet'}`}
          className={`otter-card relative w-full select-none overflow-hidden transition-transform duration-300 ease-out ${active ? '' : 'otter-card--off'}`}
          style={{ aspectRatio: '85.6 / 54', containerType: 'inline-size', borderRadius: '15px', background: f.bg, color: INK,
            fontFamily: "'Inter Tight', Arial, sans-serif",
            boxShadow: '0 0 0 1px rgba(255,255,255,.07) inset, 0 1px 0 rgba(255,255,255,.14) inset, 0 28px 50px -26px rgba(8,20,15,.6), 0 10px 20px -14px rgba(8,20,15,.45)' }}>
          {/* quiet tone-on-tone shapes and one fine yellow line */}
          <svg aria-hidden viewBox="0 0 856 540" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <circle cx="760" cy="40" r="330" fill={f.tone} />
            <circle cx="760" cy="40" r="230" fill={f.tone} />
            <path d="M856 300 C 700 330, 610 430, 590 540" fill="none" stroke="#F9C93A" strokeOpacity=".55" strokeWidth="1.6" />
          </svg>
          {/* brushed finish + grain */}
          <div aria-hidden className="absolute inset-0" style={{ background: 'repeating-linear-gradient(100deg, rgba(255,255,255,.018) 0 1px, transparent 1px 3px)' }} />
          <svg aria-hidden className="absolute inset-0 h-full w-full mix-blend-overlay" style={{ opacity: 0.08 }}>
            <filter id="otter-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#otter-grain)" />
          </svg>
          {/* light that follows the pointer + a sweeping shine */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at var(--gx,25%) var(--gy,15%), rgba(255,255,255,.11), transparent 50%)' }} />
          <div aria-hidden className="otter-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" />

          {/* content */}
          <div className="absolute inset-0" style={{ padding: '5.6cqw 6.2cqw' }}>
            {/* top: icon only, card name on the right */}
            <div className="flex items-start justify-between">
              <img src="/logo-mark.png" alt="" style={{ width: '8cqw', height: '8cqw', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' }} />
              <div className="text-right">
                <div style={{ fontSize: '4.6cqw', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1, textShadow: EMBOSS }}>Otter Card</div>
                <div style={{ fontSize: '2.3cqw', color: SOFT, letterSpacing: '.16em', marginTop: '1.3cqw' }} className="uppercase">Your points. One card.</div>
              </div>
            </div>
            {/* chip + contactless */}
            <div className="flex items-center" style={{ gap: '2.4cqw', marginTop: '6.5cqw' }}>
              <Chip />
              <Nfc aria-hidden style={{ width: '5.2cqw', height: '5.2cqw', color: SOFT }} />
            </div>
            {/* bottom: name and code, points */}
            <div className="absolute flex items-end justify-between" style={{ left: '6.2cqw', right: '6.2cqw', bottom: '5.4cqw', gap: '3cqw' }}>
              <div className="min-w-0">
                <div style={{ fontSize: '2.2cqw', color: SOFT, letterSpacing: '.18em', marginBottom: '1cqw' }} className="uppercase">Member</div>
                <div className="truncate uppercase" style={{ fontSize: '3.6cqw', fontWeight: 500, letterSpacing: '.14em', textShadow: EMBOSS }}>{name}</div>
                <div style={{ fontSize: '2.6cqw', color: SOFT, letterSpacing: '.22em', marginTop: '1cqw', fontVariantNumeric: 'tabular-nums' }}>{code}</div>
              </div>
              <div className="shrink-0 text-right">
                <div style={{ fontSize: '2.2cqw', color: SOFT, letterSpacing: '.18em', marginBottom: '0.6cqw' }} className="uppercase">Points</div>
                <div className="leading-none" style={{ fontSize: '8cqw', fontWeight: 500, letterSpacing: '-0.02em', textShadow: EMBOSS }}>
                  <CountUp to={balance} /><span style={{ fontSize: '3cqw', marginLeft: '.9cqw', letterSpacing: '.04em', color: SOFT }}>pts</span>
                </div>
              </div>
            </div>
          </div>
          {!active && (
            <div className="absolute inset-0 bg-[#0B1E17]/30">
              <span className="absolute rounded-full bg-white/95 font-semibold text-ink shadow-sm" style={{ top: '16cqw', right: '6.2cqw', fontSize: '2.8cqw', padding: '1.2cqw 3cqw' }}>Not active yet</span>
            </div>
          )}
        </div>
      </div>
      {picker && (
        <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <span className="mr-1">Finish</span>
          {(Object.keys(FINISHES) as Finish[]).map((k) => (
            <button key={k} type="button" onClick={() => choose(k)} aria-pressed={finish === k}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${finish === k ? 'border-ink bg-white font-medium text-ink' : 'border-line bg-white/60 hover:border-ink/40'}`}>
              <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: FINISHES[k].swatch }} />{FINISHES[k].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
