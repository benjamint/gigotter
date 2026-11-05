import { GIG_COVERS } from './images'
import { CURRENCIES, type Listing } from './types'

export const coverFor = (l: Pick<Listing, 'cover_url' | 'type'>) => l.cover_url || GIG_COVERS[l.type]

export const money = (n: number | null | undefined, cur = 'GHS') =>
  `${CURRENCIES[cur] ?? cur + ' '}${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return { label: 'Expired', urgent: true, expired: true }
  const h = Math.floor(ms / 36e5)
  if (h < 24) return { label: `${h}h left`, urgent: true, expired: false }
  const d = Math.floor(h / 24)
  return { label: `${d}d left`, urgent: d <= 3, expired: false }
}

/** What one student can earn from a gig at most */
export function maxEarn(l: Listing) {
  if (l.pay_model === 'fixed') return l.rate
  return l.units_per_student ? l.rate * l.units_per_student : l.rate
}
export const payLine = (l: Listing) =>
  l.pay_model === 'per_unit' ? `${money(l.rate, l.currency)} / ${l.unit_label}` : `${money(l.rate, l.currency)} flat`

export const spotsLeft = (l: Listing) => Math.max(0, l.slots - (l.taken ?? 0))
export const isOpen = (l: Listing) => l.status === 'live' && !timeLeft(l.expires_at).expired && spotsLeft(l) > 0

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const ACCENTS = {
  glow: { bg: 'bg-glow-100', solid: 'bg-glow-500', text: 'text-glow-600', ring: 'ring-glow-300' },
  pop: { bg: 'bg-pop-300/40', solid: 'bg-pop-500', text: 'text-pop-600', ring: 'ring-pop-300' },
  grape: { bg: 'bg-grape-300/40', solid: 'bg-grape-500', text: 'text-grape-700', ring: 'ring-grape-300' },
  lime: { bg: 'bg-lime-300', solid: 'bg-lime-400', text: 'text-ink', ring: 'ring-lime-400' },
} as const
