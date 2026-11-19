// Counts page visits for the admin Insights tab. No names, no IP addresses: a random id per browser
// (shared with QR scan counting), a random id per visit, the page, phone/computer, and where the visit came from.
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { DEMO, deviceType, logView } from './api'

const VISITOR_KEY = 'gigotter-visitor', SESSION_KEY = 'gigotter-visit'
const IDLE = 30 * 60 * 1000 // a visit ends after 30 minutes without a page change

/** Readable names for the referring sites we see most. */
const HOSTS: [RegExp, string][] = [
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'facebook'], [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'], [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)google\./, 'google'], [/(^|\.)bing\.com$/, 'bing'], [/(^|\.)snapchat\.com$/, 'snapchat'],
  [/(^|\.)telegram\.(org|me)$|^t\.me$/, 'telegram'], [/(^|\.)reddit\.com$/, 'reddit'],
]
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9.:_-]/g, '').slice(0, 60)

/** Where this page load came from: a share link, a QR code, a campaign tag, another website, or nothing (direct). */
function landingSource(url: URL, referrer: string): string | null {
  const s = url.searchParams.get('s')
  if (s && ['wa', 'x', 'li', 'fb', 'link'].includes(s)) return `share-${s}`
  const qr = url.pathname.match(/^\/s\/([a-z0-9-]{2,24})$/i)
  if (qr) return `qr:${clean(qr[1])}`
  const utm = url.searchParams.get('utm_source')
  if (utm) return `utm:${clean(utm)}`.slice(0, 60)
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase()
    if (!host || host === location.hostname.replace(/^www\./, '') || /(^|\.)gigotter\.com$|vercel\.app$/.test(host)) return null
    return HOSTS.find(([re]) => re.test(host))?.[1] ?? clean(host)
  } catch { return null }
}

// worked out once per page load, before the app tidies the address bar (e.g. removes ?s=)
const LANDING = typeof window === 'undefined' ? null : landingSource(new URL(window.location.href), document.referrer)

const LOAD_ID = typeof performance === 'undefined' ? '0' : String(performance.timeOrigin) // one id per page load

const isBot = () => /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom/i.test(navigator.userAgent) || (!DEMO && navigator.webdriver)

function ids(): { visitor: string | null; session: string | null; source: string } {
  let visitor: string | null = null, session: string | null = null, source = 'direct'
  try {
    visitor = localStorage.getItem(VISITOR_KEY) || crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, visitor)
    const prev = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as { id: string; at: number; source: string; landed?: string } | null
    const fresh = !prev || Date.now() - prev.at > IDLE
    // a new arrival from somewhere (share link, QR, another site) starts a new visit; it's only counted once per page load
    const arrived = LANDING && prev?.landed !== LOAD_ID
    if (fresh || arrived) { session = crypto.randomUUID(); source = LANDING ?? 'direct' }
    else { session = prev!.id; source = prev!.source }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: session, at: Date.now(), source, landed: LANDING ? LOAD_ID : prev?.landed }))
  } catch { /* storage blocked: still count the view, without ids */ }
  return { visitor, session, source }
}

/** Logs a view whenever the page (path) changes. Admin pages and bots are skipped. */
export function useTrackViews() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (/^\/(admin|s\/)/i.test(pathname) || isBot()) return
    const t = setTimeout(() => { void logView({ path: pathname, device: deviceType(), ...ids() }) }, 300)
    return () => clearTimeout(t) // StrictMode double run and instant redirects count once
  }, [pathname])
}
