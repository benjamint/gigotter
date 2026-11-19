import { Check, Copy, Link2, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { coverFor, maxEarn, money, payLine } from '../lib/format'
import { sessionsOf } from '../lib/sessions'
import { GIG_TYPES, type Listing } from '../lib/types'
import { audienceOf } from '../lib/audience'
import Photo from './Photo'
import { Modal, useToast } from './ui'

type Channel = 'wa' | 'x' | 'li' | 'fb' | 'link'
/** gigotter.com/g/<id>: shows a rich preview on social apps, then opens the gig page. ?s= tags which channel it came from. */
export const shareUrl = (id: string, s: Channel) => `${location.origin}/g/${id}?s=${s}`

const dayFmt = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** Plain, factual pay/place/date words used in the message and the preview. */
export function gigFacts(l: Listing) {
  const n = sessionsOf(l).length
  const pay = n ? `${money(l.pay_model === 'per_unit' ? l.rate * n : l.rate, l.currency)} for ${n > 1 ? `${n} sessions` : 'the session'}`
    : l.pay_model === 'per_unit' && (l.units_per_student ?? 0) > 1 ? `${payLine(l)}, up to ${money(maxEarn(l), l.currency)}` : payLine(l)
  const where = l.is_remote ? 'from home' : `in ${l.location || 'Ghana'}`
  const s = sessionsOf(l)
  const when = s.length ? `${dayFmt(s[0].date)}${s.length > 1 ? `–${dayFmt(s[s.length - 1].date)}` : ''}` : `closes ${dayFmt(l.expires_at)}`
  const who = audienceOf(l) === 'everyone' ? 'Open to everyone' : audienceOf(l) === 'general' ? 'Open to non-students' : 'For students'
  return { pay, where, when, who }
}

const HOOK: Record<string, string> = {
  onboarding: 'Get paid to sign up businesses', focus_group: 'Get paid to share your opinion', research: 'Get paid for field research',
  survey: 'Get paid to answer a few questions', app_testing: 'Get paid to test an app', errand: 'Get paid to run an errand',
  content: 'Get paid to create content', other: 'Paid gig alert',
}
const TYPE_TAG: Record<string, string> = {
  onboarding: '#SalesJobs', focus_group: '#FocusGroup', research: '#Research', survey: '#PaidSurveys',
  app_testing: '#AppTesting', errand: '#Errands', content: '#ContentCreator', other: '#PaidGigs',
}
const CITY_TAGS: [RegExp, string][] = [[/kumasi/i, '#Kumasi'], [/takoradi/i, '#Takoradi'], [/cape coast/i, '#CapeCoast'], [/tamale/i, '#Tamale']]

/** Up to 5 hashtags: brand, place, type of work, who it's for, Ghana jobs. */
export function hashtags(l: Listing) {
  const city = l.is_remote ? '#RemoteWork' : CITY_TAGS.find(([re]) => re.test(l.location || ''))?.[1] ?? '#Accra'
  const who = audienceOf(l) === 'students' ? '#StudentJobs' : '#SideHustle'
  return ['#Gigotter', city, TYPE_TAG[l.type] ?? '#PaidGigs', who, '#GhanaJobs'].filter((t, i, a) => a.indexOf(t) === i).slice(0, 5).join(' ')
}

const cap = (t: string) => t[0].toUpperCase() + t.slice(1)

/** Ready-to-post message: hook, title, one fact per line, call to action and hashtags. The link goes in before the hashtags. */
export function defaultMessage(l: Listing) {
  const f = gigFacts(l)
  return [
    `🔥 ${HOOK[l.type] ?? HOOK.other}!`,
    '',
    l.title.trim(),
    '',
    `💰 ${cap(f.pay)}`,
    `📍 ${l.is_remote ? 'Remote, from home' : l.location || 'Ghana'}`,
    `📅 ${cap(f.when)}`,
    `👥 ${f.who}`,
    '',
    'Verified gig, paid straight to MoMo. Apply here 👇',
    '',
    hashtags(l),
  ].join('\n')
}

/** Put the link in the message: before a trailing block of hashtags if there is one, otherwise at the end. */
export function compose(msg: string, url: string) {
  const lines = msg.trimEnd().split('\n')
  let i = lines.length
  while (i > 0 && /^\s*(#\w+\s*)+$/.test(lines[i - 1])) i--
  if (i === lines.length || i === 0) return `${msg.trimEnd()}\n${url}`
  const body = lines.slice(0, i).join('\n').trimEnd()
  return `${body}\n${url}\n\n${lines.slice(i).join('\n')}`
}

/** Length as X counts it: links are 23, emoji and other wide characters 2. */
export function xLength(text: string) {
  const noUrls = text.replace(/https?:\/\/\S+/g, '')
  const urls = (text.match(/https?:\/\/\S+/g) ?? []).length
  let n = 0
  for (const ch of noUrls) n += ch.codePointAt(0)! > 0x10ff ? 2 : 1
  return n + urls * 23
}

/** X allows 280 characters: if the full message is too long, post a shorter version for X only. */
function forX(l: Listing, msg: string, url: string) {
  const full = compose(msg, url)
  if (xLength(full) <= 280) return full
  const f = gigFacts(l), tags = hashtags(l).split(' ').slice(0, 3).join(' ')
  let title = l.title.trim()
  const make = () => `🔥 ${title}\n\n💰 ${cap(f.pay)}\n📍 ${l.is_remote ? 'Remote' : l.location || 'Ghana'}\n📅 ${cap(f.when)}\n\nApply 👇\n${url}\n\n${tags}`
  while (xLength(make()) > 280 && title.length > 20) title = title.slice(0, -4).trimEnd() + '…'
  return make()
}

function intent(ch: Exclude<Channel, 'link'>, text: string, url: string) {
  const e = encodeURIComponent
  if (ch === 'wa') return `https://wa.me/?text=${e(text)}`
  if (ch === 'x') return `https://twitter.com/intent/tweet?text=${e(text)}`
  if (ch === 'li') return `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`
  return `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`
}

const CHANNELS: { k: Exclude<Channel, 'link'>; label: string; bg: string; icon: JSX.Element }[] = [
  { k: 'wa', label: 'WhatsApp', bg: 'bg-[#25D366] text-white', icon: <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm4.4 12.6c-.2.5-1.1 1-1.6 1.1-.4 0-.9.1-2.8-.6a9.8 9.8 0 0 1-3.8-3.4 4.4 4.4 0 0 1-.9-2.3c0-1.1.6-1.6.8-1.9.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4l.7 1.6c.1.1.1.3 0 .4l-.3.5-.3.3c-.1.1-.2.3-.1.5a7 7 0 0 0 1.3 1.6 6 6 0 0 0 1.8 1.1c.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.5-.1.9z" fill="currentColor" /> },
  { k: 'x', label: 'X', bg: 'bg-ink text-white', icon: <path d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2.2 3h6.2l4.3 5.7zm-1 16.2h1.7L7.3 4.7H5.5z" fill="currentColor" /> },
  { k: 'li', label: 'LinkedIn', bg: 'bg-[#0A66C2] text-white', icon: <path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zm6 0h2.9v1.7c.4-.8 1.4-1.9 3.3-1.9 3 0 3.8 2 3.8 4.6V21h-3v-6.1c0-1.5-.3-2.6-1.8-2.6s-2.2 1.1-2.2 2.6V21H9z" fill="currentColor" /> },
  { k: 'fb', label: 'Facebook', bg: 'bg-[#1877F2] text-white', icon: <path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v1.9H8v3.2h2.6V21H14v-9.3h2.6l.4-3.2z" fill="currentColor" /> },
]

/** Share sheet for one gig: preview card, copy link, editable message, and one-tap channel buttons. */
export default function ShareGig({ listing: l, open, onClose }: { listing: Listing; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [msg, setMsg] = useState(() => defaultMessage(l))
  const [copied, setCopied] = useState<'link' | 'msg' | null>(null)
  useEffect(() => { if (open) { setMsg(defaultMessage(l)); setCopied(null) } }, [open, l])
  const f = useMemo(() => gigFacts(l), [l])
  const canNative = typeof navigator !== 'undefined' && 'share' in navigator && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

  const copy = async (text: string, what: 'link' | 'msg') => {
    try { await navigator.clipboard.writeText(text); setCopied(what); toast(what === 'link' ? 'Link copied' : 'Message and link copied') }
    catch { toast('Couldn’t copy. Press and hold the text to copy it instead', 'err') }
  }
  const native = async () => {
    try { await navigator.share({ title: l.title, text: compose(msg, shareUrl(l.id, 'link')) }) } catch { /* cancelled */ }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="eyebrow">Share this gig</div>
      <h2 className="mt-2 pr-10 text-2xl tracking-[-0.03em]">Spread the word</h2>
      <p className="mt-1.5 text-sm text-ink-muted">Anyone who opens the link sees a preview and lands on this gig.</p>

      {/* preview, like the card social apps show */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <Photo src={coverFor(l)} alt="" className="aspect-[1.91/1] w-full" />
        <div className="border-t border-line bg-sand/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-muted">gigotter.com · {GIG_TYPES[l.type].label}</div>
          <div className="mt-0.5 line-clamp-2 font-display text-[15px] font-semibold leading-snug">{l.title}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{f.pay} · {l.is_remote ? 'Remote' : l.location || 'Ghana'} · {f.who} · {f.when}</div>
        </div>
      </div>

      <label className="label mt-5" htmlFor="share-link">Link</label>
      <div className="flex gap-2">
        <input id="share-link" readOnly value={shareUrl(l.id, 'link')} onFocus={(e) => e.target.select()} className="input min-w-0 flex-1 py-2.5 text-sm" />
        <button type="button" onClick={() => copy(shareUrl(l.id, 'link'), 'link')} className="btn-primary btn-sm shrink-0">
          {copied === 'link' ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <label className="label mt-4" htmlFor="share-msg">Message <span className="font-normal text-ink-muted">(edit it if you like; the link goes in above the hashtags)</span></label>
      <textarea id="share-msg" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={500} rows={14} className="input min-h-[260px] text-sm leading-relaxed" />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CHANNELS.map((c) => (
          <a key={c.k} href={intent(c.k, c.k === 'x' ? forX(l, msg, shareUrl(l.id, c.k)) : compose(msg, shareUrl(l.id, c.k)), shareUrl(l.id, c.k))} target="_blank" rel="noopener noreferrer"
            onClick={() => { if (c.k === 'li' || c.k === 'fb') void navigator.clipboard?.writeText(compose(msg, shareUrl(l.id, c.k))).catch(() => {}) }}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition hover:opacity-90 ${c.bg}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>{c.icon}</svg>{c.label}
          </a>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">LinkedIn and Facebook only take the link: your message is copied, so paste it into the post. X gets a shorter version if the message is over 280 characters.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(compose(msg, shareUrl(l.id, 'link')), 'msg')} className="btn-ghost btn-sm">
          {copied === 'msg' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}Copy message + link
        </button>
        {canNative && <button type="button" onClick={native} className="btn-ghost btn-sm"><Share2 className="h-4 w-4" />More apps</button>}
      </div>
    </Modal>
  )
}
