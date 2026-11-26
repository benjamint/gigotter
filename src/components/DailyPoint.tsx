import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { claimDailyPoint, ghanaDay } from '../lib/api'
import { points } from '../lib/format'
import { useSession } from '../lib/session'

/** Fired when the member's points change outside the page they're on, so cards can refresh. */
export const POINTS_EVENT = 'gigotter:points'

const seenKey = (uid: string) => `gigotter-daily:${uid}:${ghanaDay()}`
const seen = (uid: string) => { try { return localStorage.getItem(seenKey(uid)) === '1' } catch { return false } }
const markSeen = (uid: string) => { try { localStorage.setItem(seenKey(uid), '1') } catch { /* storage blocked */ } }

/** Once a day, a verified member who opens Gigotter gets a point, and a note saying so. */
export default function DailyPoint() {
  const { user, profile } = useSession()
  const [won, setWon] = useState<{ points: number; balance: number } | null>(null)
  const eligible = !!user && profile?.kyc_status === 'verified' && profile.role !== 'admin'

  const check = useCallback(async () => {
    if (!eligible || !user || seen(user.id)) return
    markSeen(user.id)   // one try per day per device; the server decides whether a point is due
    const r = await claimDailyPoint()
    if (r.awarded) { setWon({ points: r.points, balance: r.balance }); window.dispatchEvent(new Event(POINTS_EVENT)) }
  }, [eligible, user])

  useEffect(() => {
    check()
    // a tab left open overnight gets the next day's point when they come back to it
    const back = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [check])

  return (
    <AnimatePresence>
      {won && <Note won={won} onClose={() => setWon(null)} />}
    </AnimatePresence>
  )
}

function Note({ won, onClose }: { won: { points: number; balance: number }; onClose: () => void }) {
  const still = useReducedMotion()
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <motion.div role="status" aria-live="polite"
      initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-sm overflow-hidden rounded-[24px] bg-white p-4 shadow-[0_24px_60px_-20px_rgba(16,41,31,.45)] ring-1 ring-line sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[22rem]">
      <div className="flex gap-4">
        <Coin still={!!still} amount={won.points} />
        <div className="min-w-0 flex-1 pr-6">
          <div className="text-[15px] font-semibold leading-snug">Congratulations, you just won {won.points === 1 ? 'a point' : `${won.points} points`}!</div>
          <p className="mt-1 text-sm text-ink-muted">Log in every day to keep growing your Otter Card.</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm">Balance <b className="font-semibold tabular-nums">{points(won.balance)}</b></span>
            <Link to="/me" onClick={onClose} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">See my card <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss" className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-sand hover:text-ink"><X className="h-4 w-4" /></button>
    </motion.div>
  )
}

/** A gold coin with "+1" that pops in, with a small burst of sparks. */
function Coin({ still, amount }: { still: boolean; amount: number }) {
  return (
    <div className="relative h-14 w-14 shrink-0">
      {!still && [0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return <motion.span key={i} aria-hidden className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#F9C93A]"
          initial={{ x: -3, y: -3, opacity: 0, scale: 0.4 }} animate={{ x: Math.cos(a) * 34 - 3, y: Math.sin(a) * 34 - 3, opacity: [0, 1, 0], scale: 1 }}
          transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }} />
      })}
      <motion.div initial={still ? false : { rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
        className="grid h-14 w-14 place-items-center rounded-full font-display text-lg font-semibold text-[#5B4310] shadow-[inset_0_-3px_0_rgba(0,0,0,.12),0_6px_14px_-6px_rgba(185,143,46,.8)]"
        style={{ background: 'radial-gradient(circle at 35% 30%, #FBE7A1, #F2C94C 55%, #C99A2E)' }}>
        +{amount}
      </motion.div>
    </div>
  )
}
