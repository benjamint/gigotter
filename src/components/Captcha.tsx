import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile "I'm human" check. Only shows when VITE_TURNSTILE_SITE_KEY is set.
 * The token is passed to Supabase, which verifies it server-side when CAPTCHA protection is on.
 */
export const CAPTCHA_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''
export const CAPTCHA_ON = !!CAPTCHA_SITE_KEY

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id: string) => void } }
}

let loader: Promise<void> | null = null
function loadScript() {
  if (window.turnstile) return Promise.resolve()
  loader ??= new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true; s.defer = true
    s.onload = () => res(); s.onerror = () => rej(new Error('captcha failed to load'))
    document.head.appendChild(s)
  })
  return loader
}

/** Renders the widget and reports a fresh token (or null when it expires). Change `resetKey` to force a new challenge. */
export default function Captcha({ onToken, resetKey = 0 }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const id = useRef<string | null>(null)
  useEffect(() => {
    if (!CAPTCHA_ON) return
    let alive = true
    loadScript().then(() => {
      if (!alive || !box.current || !window.turnstile) return
      if (id.current) window.turnstile.remove(id.current)
      id.current = window.turnstile.render(box.current, {
        sitekey: CAPTCHA_SITE_KEY, theme: 'light', appearance: 'interaction-only',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    }).catch(() => onToken(null))
    return () => { alive = false; if (id.current && window.turnstile) { window.turnstile.remove(id.current); id.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])
  if (!CAPTCHA_ON) return null
  return <div ref={box} className="min-h-[1px]" />
}
