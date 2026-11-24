import { Nfc } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CountUp } from './ui'

export type Finish = 'forest' | 'lemon' | 'charcoal'
const FINISH_KEY = 'gigotter-otter-card-finish'

const FINISHES: Record<Finish, { label: string; swatch: string; bg: string; ink: string; soft: string; disc: string; arch: string; dot: string; grain: number }> = {
  forest: { label: 'Forest', swatch: '#245A44', bg: 'linear-gradient(140deg,#2A6650 0%,#1A4535 45%,#10291F 100%)', ink: '#F6F4EC', soft: 'rgba(246,244,236,.72)', disc: '#F9C93A', arch: 'rgba(183,205,190,.22)', dot: '#B7CDBE', grain: 0.09 },
  lemon: { label: 'Lemon', swatch: '#F9C93A', bg: 'linear-gradient(140deg,#FDE9A6 0%,#F9C93A 50%,#E9B11C 100%)', ink: '#10291F', soft: 'rgba(16,41,31,.68)', disc: '#245A44', arch: 'rgba(255,255,255,.38)', dot: '#10291F', grain: 0.07 },
  charcoal: { label: 'Charcoal', swatch: '#1F2321', bg: 'linear-gradient(140deg,#3A3F3C 0%,#232725 50%,#121514 100%)', ink: '#F6F4EC', soft: 'rgba(246,244,236,.66)', disc: '#F9C93A', arch: 'rgba(36,90,68,.55)', dot: '#B7CDBE', grain: 0.1 },
}

function readFinish(): Finish {
  try { const f = localStorage.getItem(FINISH_KEY); if (f && f in FINISHES) return f as Finish } catch { /* storage blocked */ }
  return 'forest'
}

/** The Otter Card: where a member's Gigotter points live. Digital for now; drawn at credit-card proportions. */
export default function OtterCard({ name, code, balance, active = true, size = 'lg', picker = true }: {
  name: string; code: string; balance: number; active?: boolean; size?: 'sm' | 'lg'; picker?: boolean
}) {
  const [finish, setFinish] = useState<Finish>(readFinish)
  const choose = (f: Finish) => { setFinish(f); try { localStorage.setItem(FINISH_KEY, f) } catch { /* ignore */ } }
  // keep cards on the same page in step when the finish changes
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
    card.current.style.transform = `rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`
    card.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`); card.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`)
  }
  const reset = () => { if (card.current) card.current.style.transform = '' }

  return (
    <div className={size === 'sm' ? 'w-full max-w-[22rem]' : 'w-full max-w-[30rem]'}>
      <div style={{ perspective: '1200px' }} onPointerMove={tilt} onPointerLeave={reset}>
        <div ref={card} role="img" aria-label={`Otter Card for ${name}, ${balance.toLocaleString()} points${active ? '' : ', not active yet'}`}
          className={`otter-card relative w-full select-none overflow-hidden transition-transform duration-300 ease-out ${active ? '' : 'otter-card--off'}`}
          style={{ aspectRatio: '85.6 / 54', containerType: 'inline-size', borderRadius: '5.5cqw', background: f.bg, color: f.ink,
            boxShadow: '0 1px 0 rgba(255,255,255,.18) inset, 0 30px 60px -28px rgba(16,41,31,.55), 0 12px 24px -16px rgba(16,41,31,.4)' }}>
          {/* shapes */}
          <svg aria-hidden viewBox="0 0 856 540" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <circle cx="700" cy="120" r="210" fill={f.disc} opacity={finish === 'lemon' ? 0.9 : 0.95} />
            <path d="M520 560 V400 a110 110 0 0 1 220 0 V560 Z" fill={f.arch} />
            <circle cx="470" cy="150" r="26" fill={f.dot} opacity=".85" />
          </svg>
          {/* grain */}
          <svg aria-hidden className="absolute inset-0 h-full w-full mix-blend-overlay" style={{ opacity: f.grain }}>
            <filter id="otter-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#otter-grain)" />
          </svg>
          {/* light that follows the pointer + a sweeping shine */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at var(--gx,30%) var(--gy,20%), rgba(255,255,255,.16), transparent 45%)' }} />
          <div aria-hidden className="otter-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" />

          {/* content */}
          <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '6cqw 6.5cqw 5.5cqw' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center font-display font-semibold" style={{ gap: '1.8cqw', fontSize: '4cqw' }}>
                <img src="/logo-mark.png" alt="" style={{ width: '7.4cqw', height: '7.4cqw' }} />Gigotter
              </div>
              <Nfc aria-hidden style={{ width: '5.6cqw', height: '5.6cqw', opacity: 0.85, color: finish === 'lemon' ? f.ink : f.ink }} />
            </div>
            <div style={{ marginTop: '-2cqw' }}>
              <div className="font-display font-semibold leading-[0.92]" style={{ fontSize: '9cqw', letterSpacing: '-0.04em' }}>Otter Card.</div>
              <div style={{ fontSize: '3cqw', color: f.soft, marginTop: '1.2cqw' }}>Your points. One card.</div>
            </div>
            <div className="flex items-end justify-between" style={{ gap: '3cqw' }}>
              <div className="min-w-0">
                <div className="truncate font-semibold uppercase" style={{ fontSize: '3.3cqw', letterSpacing: '.12em' }}>{name}</div>
                <div className="font-mono" style={{ fontSize: '2.7cqw', color: f.soft, letterSpacing: '.14em', marginTop: '.8cqw' }}>{code}</div>
              </div>
              <div className="shrink-0 text-right">
                <div style={{ fontSize: '2.5cqw', color: f.soft, letterSpacing: '.14em' }} className="uppercase">Points</div>
                <div className="font-display font-semibold leading-none" style={{ fontSize: '8.4cqw', letterSpacing: '-0.03em' }}>
                  <CountUp to={balance} /><span style={{ fontSize: '3.4cqw', marginLeft: '.8cqw', letterSpacing: 0 }}>pts</span>
                </div>
              </div>
            </div>
          </div>
          {!active && (
            <div className="absolute inset-0 bg-[#10291F]/30">
              <span className="absolute rounded-full bg-white/95 font-semibold text-ink shadow-sm" style={{ top: '5.4cqw', right: '6cqw', fontSize: '3cqw', padding: '1.3cqw 3.2cqw' }}>Not active yet</span>
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
