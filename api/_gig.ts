// Shared helpers for the share-link functions (files starting with _ are not routes on Vercel).
// Reads only public data: live gigs, with the public anon key (row-level security still applies).

export type Gig = {
  id: string; title: string; summary: string | null; type: string; status: string; expires_at: string
  rate: number; currency: string; pay_model: 'per_unit' | 'fixed'; unit_label: string; units_per_student: number | null
  location: string | null; is_remote: boolean; audience: string | null; join_mode: string | null
  sessions: { date: string; start?: string; end?: string }[] | null; cover_url: string | null; client_name: string | null
}

const COLS = 'id,title,summary,type,status,expires_at,rate,currency,pay_model,unit_label,units_per_student,location,is_remote,audience,join_mode,sessions,cover_url,client_name'
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The gig if it exists and is open right now; otherwise null (drafts and closed gigs never leak). */
export async function liveGig(id: string | null): Promise<Gig | null> {
  if (!id || !UUID.test(id)) return null
  const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const r = await fetch(`${url}/rest/v1/listings?select=${COLS}&id=eq.${id}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!r.ok) return null
    const [g] = (await r.json()) as Gig[]
    if (!g || g.status !== 'live' || new Date(g.expires_at).getTime() < Date.now()) return null
    return g
  } catch { return null }
}

export const TYPE_LABEL: Record<string, string> = {
  onboarding: 'Customer onboarding', focus_group: 'Focus group', research: 'Field research', survey: 'Survey',
  app_testing: 'App testing', errand: 'Errand', content: 'Content', other: 'Paid gig',
}
export const COVER: Record<string, string> = {
  onboarding: '/images/gig-onboarding.jpg', focus_group: '/images/gig-focus-group.jpg', research: '/images/gig-research.jpg',
  survey: '/images/gig-survey.jpg', app_testing: '/images/gig-survey.jpg', errand: '/images/gig-other.jpg', content: '/images/gig-content.jpg', other: '/images/gig-other.jpg',
}

export function money(n: number, cur = 'GHS') {
  if (cur === 'PTS') return `${Math.round(n).toLocaleString('en-GB')} points`
  const sym = cur === 'GHS' ? '₵' : cur === 'NGN' ? '₦' : cur === 'USD' ? '$' : `${cur} `
  return sym + (Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
}
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' })

/** Pay in plain words, e.g. "₵5.60 per salon · up to ₵168" or "₵80 for 2 sessions". */
export function payWords(g: Gig): { big: string; small: string } {
  const n = g.sessions?.length ?? 0
  if (n > 0) {
    const total = g.pay_model === 'per_unit' ? g.rate * n : g.rate
    return { big: money(total, g.currency), small: n > 1 ? `for ${n} sessions` : 'for the session' }
  }
  if (g.pay_model === 'fixed') return { big: money(g.rate, g.currency), small: 'for the gig' }
  if (g.units_per_student && g.units_per_student > 1) return { big: `Up to ${money(g.rate * g.units_per_student, g.currency)}`, small: `${money(g.rate, g.currency)} per ${g.unit_label}` }
  return { big: money(g.rate, g.currency), small: `per ${g.unit_label}` }
}
export function whereWords(g: Gig) { return g.is_remote ? 'Remote' : (g.location || 'Ghana') }
export function whenWords(g: Gig) {
  const s = g.sessions?.[0]
  if (s) return `${fmtDate(s.date)}${g.sessions!.length > 1 ? ` to ${fmtDate(g.sessions![g.sessions!.length - 1].date)}` : ''}`
  return `Closes ${fmtDate(g.expires_at)}`
}
export function whoWords(g: Gig) { return g.audience === 'everyone' ? 'Open to everyone' : g.audience === 'general' ? 'Non-students' : 'Students' }

/** One-line description used in link previews. */
export function describe(g: Gig) {
  const p = payWords(g)
  return [`${p.big} ${p.small}`.replace(/^Up to (.+) (₵.+ per .+)$/, '$2, up to $1'), whereWords(g), whoWords(g), whenWords(g)].join(' · ')
    + (g.currency === 'PTS' ? '. Earn Gigotter points, redeem for airtime and more.' : '. Verified, paid to mobile money.')
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
