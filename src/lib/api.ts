import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AccountType, AdminInvite, AdminInviteInfo, Application, Insights, ApplicationStatus, Claim, ClientRequest, KycStatus, Listing, ListingFile, Payment, PointsEntry, QrCode, QrStat, PayoutItem, Profile, Redemption, RewardItem, Submission, SubmissionStatus, Testimonial } from './types'
import { DAILY_POINTS, POINTS, WELCOME_POINTS } from './types'
import { seedListings } from './seed'
import { photoRuleOf, schemaOf, subTitle, validateAnswers } from './forms'
import { accountOf, audienceAllows, audienceMessage, audienceOf } from './audience'
import { dayLabel, sessionsOf, todayGhana } from './sessions'
import { checkDoc, checkImage, safeExt } from './security'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
/** Demo mode (browser-only fake data) is only allowed in local dev or when explicitly switched on. */
export const DEMO = (!URL || !KEY) && (import.meta.env.DEV || import.meta.env.VITE_DEMO === 'true')
/** Production build without Supabase settings: show a maintenance message instead of a fake demo. */
export const MISCONFIGURED = (!URL || !KEY) && !DEMO
export const sb: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null

export type Bucket = 'kyc' | 'proofs'
export interface AuthUser { id: string; email: string }

// ═══════════════════════════ demo store (browser only) ═══════════════════════════
interface DemoDB {
  users: { id: string; email: string; password: string }[]
  session: string | null
  profiles: Profile[]
  listings: Listing[]
  claims: Claim[]
  submissions: Submission[]
  requests: ClientRequest[]
  testimonials?: Testimonial[]
  qrCodes?: QrCode[]
  briefMeta?: Record<string, { size: number; mime: string }>
  payments?: Payment[]
  applications?: Application[]
  qrScans?: { code: string; visitor: string | null; device: string; scanned_at: string }[]
  pageViews?: { path: string; gig_id: string | null; visitor: string | null; session: string | null; source: string; device: string; user_id: string | null; viewed_at: string }[]
  files: Record<string, string>
  listingFiles?: ListingFile[]
  rewardItems?: RewardItem[]
  redemptions?: Redemption[]
  pointsLedger?: PointsEntry[]
  adminInvites?: (AdminInvite & { token: string })[]
}
const KEY_DB = 'gigotter-demo-v2'
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const listeners = new Set<() => void>()

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(KEY_DB)
    if (raw) return JSON.parse(raw)
  } catch { /* storage blocked */ }
  const adminId = uid()
  const db: DemoDB = {
    users: [{ id: adminId, email: 'admin@gigotter.com', password: 'gigotteradmin' }],
    session: null,
    profiles: [blankProfile(adminId, 'admin@gigotter.com', 'Gigotter Admin', 'admin')],
    listings: seedListings(),
    claims: [], submissions: [], requests: [], files: {},
    qrCodes: [{ code: 'brochure', label: 'A4 brochure', target: '/', archived: false, created_at: now() }, { code: 'card', label: 'QR card / poster', target: '/', archived: false, created_at: now() }, { code: 'tiktok', label: 'TikTok', target: '/', archived: false, created_at: now() }],
  }
  save(db)
  return db
}
let memo: DemoDB | null = null
const db = () => (memo ??= load())
function save(d: DemoDB = db()) {
  try { localStorage.setItem(KEY_DB, JSON.stringify(d)) } catch { /* quota or blocked */ }
  listeners.forEach((l) => l())
}
function blankProfile(id: string, email: string, name: string, role: 'student' | 'admin' = 'student'): Profile {
  return {
    id, email, full_name: name, phone: null, school: null, programme: null, study_year: null,
    student_id_number: null, city: null, role, kyc_status: role === 'admin' ? 'verified' : 'unverified',
    kyc_note: null, kyc_submitted_at: null, id_card_path: null, student_card_path: null, selfie_path: null,
    momo_provider: null, momo_number: null, momo_name: null,
    referral_code: Math.random().toString(36).slice(2, 8).toUpperCase(), created_at: now(),
  }
}
const demoUser = (): AuthUser | null => {
  const u = db().users.find((x) => x.id === db().session)
  return u ? { id: u.id, email: u.email } : null
}
const must = <T,>(v: T | null | undefined, msg: string): T => { if (v == null) throw new Error(msg); return v }
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

function withStats(l: Listing): Listing {
  const d = db()
  return {
    ...l,
    taken: d.claims.filter((c) => c.listing_id === l.id && ['active', 'completed'].includes(c.status)).length,
    approved_units: d.submissions.filter((s) => s.listing_id === l.id && ['approved', 'paid'].includes(s.status)).length,
    committed: d.submissions.filter((s) => s.listing_id === l.id && s.status !== 'rejected').reduce((a, s) => a + (s.amount ?? 0), 0),
  }
}

// downscale images so demo storage stays small
async function toDataUrl(file: File, max = 900): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file) })
  }
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.72)
}

// ═══════════════════════════ auth ═══════════════════════════
export const auth = {
  async user(): Promise<AuthUser | null> {
    if (DEMO) return demoUser()
    const { data } = await sb!.auth.getSession()
    const u = data.session?.user
    return u ? { id: u.id, email: u.email ?? '' } : null
  },
  onChange(cb: () => void): () => void {
    if (DEMO) { listeners.add(cb); return () => listeners.delete(cb) }
    const { data } = sb!.auth.onAuthStateChange(() => cb())
    return () => data.subscription.unsubscribe()
  },
  async signUp(email: string, password: string, full_name: string, captchaToken?: string, account_type: AccountType = 'student') {
    email = email.trim().toLowerCase()
    if (DEMO) {
      const d = db()
      if (d.users.some((u) => u.email === email)) throw new Error('That email already has an account — log in instead.')
      const id = uid()
      d.users.push({ id, email, password })
      d.profiles.push({ ...blankProfile(id, email, full_name), signup_source: scanSource(), account_type })
      d.session = id
      return save()
    }
    const signup_source = scanSource() ?? undefined
    const { data, error } = await sb!.auth.signUp({ email, password, options: { data: { full_name: full_name.trim().slice(0, 120), signup_source, account_type }, emailRedirectTo: `${location.origin}/verify`, captchaToken } })
    fail(error)
    if (!data.session) throw new Error('CHECK_EMAIL')
  },
  async signIn(email: string, password: string, captchaToken?: string) {
    email = email.trim().toLowerCase()
    if (DEMO) {
      const u = db().users.find((x) => x.email === email && x.password === password)
      if (!u) throw new Error('Wrong email or password.')
      db().session = u.id
      return save()
    }
    const { error } = await sb!.auth.signInWithPassword({ email, password, options: { captchaToken } })
    fail(error)
  },
  async resetPassword(email: string, captchaToken?: string) {
    if (DEMO) return
    const { error } = await sb!.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${location.origin}/reset-password`, captchaToken })
    fail(error)
  },
  /** Re-send the sign-up confirmation email. */
  async resendSignup(email: string, captchaToken?: string) {
    if (DEMO) return
    const { error } = await sb!.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: `${location.origin}/verify`, captchaToken } })
    fail(error)
  },
  /** Set a new password for the signed-in user (after opening a reset link). */
  async updatePassword(password: string) {
    if (DEMO) return
    const { error } = await sb!.auth.updateUser({ password })
    fail(error)
  },
  async signOut() {
    if (DEMO) { db().session = null; return save() }
    await sb!.auth.signOut()
  },
}

// ═══════════════════════════ files ═══════════════════════════
export async function uploadFile(bucket: Bucket, file: File, name: string): Promise<string> {
  const u = must(await auth.user(), 'Sign in first')
  const bad = checkImage(file); if (bad) throw new Error(bad)
  const path = `${u.id}/${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt(file)}`
  if (DEMO) { db().files[`${bucket}/${path}`] = await toDataUrl(file); save(); return path }
  const { error } = await sb!.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' })
  fail(error)
  return path
}
/** Public cover image for a gig (admin only). Returns a URL usable in <img>. */
export async function uploadCover(file: File): Promise<string> {
  const bad = checkImage(file, 8); if (bad) throw new Error(bad)
  if (DEMO) return toDataUrl(file, 1600)
  const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt(file)}`
  const { error } = await sb!.storage.from('covers').upload(path, file, { contentType: file.type || 'image/jpeg' })
  fail(error)
  return sb!.storage.from('covers').getPublicUrl(path).data.publicUrl
}
export async function fileUrl(bucket: Bucket, path: string | null): Promise<string | null> {
  if (!path) return null
  if (DEMO) return db().files[`${bucket}/${path}`] ?? null
  const { data } = await sb!.storage.from(bucket).createSignedUrl(path, 60 * 10)
  return data?.signedUrl ?? null
}

// ═══════════════════════════ gig attachments ═══════════════════════════
/** Files on a gig that the current viewer is allowed to see (the database decides). */
export async function listingFiles(listingId: string): Promise<ListingFile[]> {
  if (DEMO) {
    const d = db(), u = demoUser(), me = u && d.profiles.find((p) => p.id === u.id)
    const joined = !!u && d.claims.some((c) => c.listing_id === listingId && c.student_id === u.id && c.status !== 'withdrawn' && c.status !== 'removed')
    return (d.listingFiles ?? []).filter((f) => f.listing_id === listingId && (f.visibility === 'public' || joined || me?.role === 'admin'))
  }
  const { data, error } = await sb!.from('listing_files').select('*').eq('listing_id', listingId).order('created_at')
  fail(error)
  return data ?? []
}
export async function uploadListingFile(listingId: string, file: File, visibility: ListingFile['visibility']): Promise<ListingFile> {
  const [ext, mime] = checkDoc(file, DEMO ? 2 : undefined)
  const path = `${listingId}/${uid()}.${ext}`
  const name = file.name.slice(0, 120)
  if (DEMO) {
    const d = db(); d.files[`gig-files/${path}`] = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file) })
    const f: ListingFile = { id: uid(), listing_id: listingId, name, path, size_bytes: file.size, mime, visibility, created_at: now() }
    ;(d.listingFiles ??= []).push(f); save(); return f
  }
  const up = await sb!.storage.from('gig-files').upload(path, file, { upsert: false, contentType: mime })
  fail(up.error)
  const { data, error } = await sb!.from('listing_files').insert({ listing_id: listingId, name, path, size_bytes: file.size, mime, visibility }).select().single()
  if (error) { await sb!.storage.from('gig-files').remove([path]); fail(error) }
  return data!
}
export async function setListingFileVisibility(id: string, visibility: ListingFile['visibility']) {
  if (DEMO) { const f = (db().listingFiles ?? []).find((x) => x.id === id); if (f) f.visibility = visibility; return save() }
  const { error } = await sb!.from('listing_files').update({ visibility }).eq('id', id)
  fail(error)
}
export async function deleteListingFile(f: ListingFile) {
  if (DEMO) { const d = db(); d.listingFiles = (d.listingFiles ?? []).filter((x) => x.id !== f.id); delete d.files[`gig-files/${f.path}`]; return save() }
  const { error } = await sb!.from('listing_files').delete().eq('id', f.id)
  fail(error)
  await sb!.storage.from('gig-files').remove([f.path])
}
/** A 10-minute link to an attachment; `download` makes the browser save it under its real name. */
export async function listingFileUrl(f: ListingFile, download = false): Promise<string> {
  const bucket = f.bucket ?? 'gig-files'
  if (DEMO) return db().files[`${bucket}/${f.path}`] ?? ''
  const { data, error } = await sb!.storage.from(bucket).createSignedUrl(f.path, 600, download ? { download: f.name } : undefined)
  if (error || !data) fail(error ?? new Error('Could not open this file'))
  return data!.signedUrl
}
/** Saves an attachment to the device (works in in-app browsers, unlike opening a new tab). */
export async function downloadListingFile(f: ListingFile) {
  const a = document.createElement('a'); a.href = await listingFileUrl(f, true); a.download = f.name; a.rel = 'noopener'
  document.body.appendChild(a); a.click(); a.remove()
}
/** The signed-in student's payment receipts. */
export async function myPayments(): Promise<Payment[]> {
  const u = await auth.user(); if (!u) return []
  if (DEMO) return (db().payments ?? []).filter((p) => p.student_id === u.id).reverse()
  const { data, error } = await sb!.from('payments').select('*').eq('student_id', u.id).order('paid_at', { ascending: false })
  if (error) return []
  return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }))
}

// ═══════════════════════════ applications (apply-and-select gigs) ═══════════════════════════
/** Apply to a gig that selects people. Answers are checked against the gig's application questions. */
export async function applyToListing(listingId: string, answers: Record<string, string>): Promise<Application> {
  if (DEMO) {
    const u = must(demoUser(), 'Sign in first'), d = db()
    const p = must(d.profiles.find((x) => x.id === u.id), 'No profile')
    if (p.kyc_status !== 'verified') throw new Error('Complete verification before applying')
    const l = must(d.listings.find((x) => x.id === listingId), 'Gig not found')
    if (l.status !== 'live' || new Date(l.expires_at) < new Date()) throw new Error('This gig isn’t taking applications')
    if (l.join_mode !== 'apply') throw new Error('This gig doesn’t need an application. Just join it')
    if (!audienceAllows(audienceOf(l), accountOf(p))) throw new Error(audienceMessage(audienceOf(l)))
    const problem = validateAnswers(l.application_schema ?? [], answers); if (problem) throw new Error(problem)
    const clean: Record<string, string> = {}; for (const f of l.application_schema ?? []) { const v = (answers[f.key] ?? '').trim(); if (v) clean[f.key] = v }
    d.applications ??= []
    const ex = d.applications.find((a) => a.listing_id === listingId && a.applicant_id === u.id)
    if (ex && ex.status !== 'withdrawn') throw new Error('You’ve already applied to this gig')
    if (ex) { Object.assign(ex, { answers: clean, status: 'applied', admin_note: null, decided_at: null, created_at: now() }); save(); return ex }
    const a: Application = { id: uid(), listing_id: listingId, applicant_id: u.id, answers: clean, status: 'applied', admin_note: null, created_at: now(), decided_at: null }
    d.applications.push(a); save(); return a
  }
  const { data, error } = await sb!.rpc('apply_to_listing', { p_listing: listingId, p_answers: answers })
  fail(error); return data as Application
}
/** The signed-in person's applications, newest first, with the gig attached. */
export async function myApplications(): Promise<Application[]> {
  const u = await auth.user(); if (!u) return []
  let apps: Application[]
  if (DEMO) apps = (db().applications ?? []).filter((a) => a.applicant_id === u.id)
  else { const { data, error } = await sb!.from('applications').select('*').eq('applicant_id', u.id); if (error) return []; apps = data ?? [] }
  const ls = await listListings({ all: true })
  return apps.map((a) => ({ ...a, listing: ls.find((l) => l.id === a.listing_id) })).sort((a, b) => b.created_at.localeCompare(a.created_at))
}
export async function withdrawApplication(id: string) {
  if (DEMO) {
    const u = must(demoUser(), 'Sign in first'), a = (db().applications ?? []).find((x) => x.id === id && x.applicant_id === u.id)
    if (!a || !['applied', 'shortlisted'].includes(a.status)) throw new Error('This application can’t be withdrawn')
    a.status = 'withdrawn'; a.decided_at = now(); return save()
  }
  const { error } = await sb!.rpc('withdraw_application', { p_application: id }); fail(error)
}

// ═══════════════════════════ QR codes ═══════════════════════════
const SRC_KEY = 'gigotter-src', VISITOR_KEY = 'gigotter-visitor'
/** The QR code this browser arrived through in the last 30 days, if any (credited at sign-up). */
export function scanSource(): string | null {
  try { const s = JSON.parse(localStorage.getItem(SRC_KEY) || 'null'); return s && Date.now() - s.at < 30 * 864e5 ? s.code : null } catch { return null }
}
export const deviceType = () => { const ua = navigator.userAgent; return /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop' }
/** Records a scan of gigotter.com/s/<code> and returns the page to continue to. Never throws. */
export async function logScan(code: string): Promise<string> {
  code = code.toLowerCase().trim()
  let visitor: string | null = null
  try { visitor = localStorage.getItem(VISITOR_KEY) || crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, visitor) } catch { /* storage blocked */ }
  try {
    let target = '/'
    if (DEMO) {
      const d = db(), c = (d.qrCodes ?? []).find((x) => x.code === code)
      // same rules as log_scan: archived codes and the same browser within 30 minutes aren't counted
      const recent = (d.qrScans ?? []).some((s) => s.code === code && visitor && s.visitor === visitor && Date.now() - +new Date(s.scanned_at) < 30 * 60000)
      if (c) { target = c.target; if (!c.archived && !recent) { (d.qrScans ??= []).push({ code, visitor, device: deviceType(), scanned_at: now() }); save() } }
    } else {
      const { data } = await sb!.rpc('log_scan', { p_code: code, p_visitor: visitor, p_device: deviceType() })
      if (typeof data === 'string') target = data
    }
    // remembered for 30 days so a later sign-up is credited to this code (the database ignores unknown codes)
    try { localStorage.setItem(SRC_KEY, JSON.stringify({ code, at: Date.now() })) } catch { /* ignore */ }
    return /^\/[A-Za-z0-9/_-]*$/.test(target) ? target : '/'
  } catch { return '/' }
}
// ═══════════════════════════ site visits & insights ═══════════════════════════
/** Records one page view (see log_view in migration 0017). Never throws, never blocks the page. */
export async function logView(v: { path: string; visitor: string | null; session: string | null; source: string; device: string }) {
  try {
    if (DEMO) {
      const d = db(), u = demoUser()
      if (u && d.profiles.find((p) => p.id === u.id)?.role === 'admin') return
      if (/^\/(admin|s\/)/i.test(v.path)) return
      const m = v.path.match(/^\/gigs\/([0-9a-f-]{36})$/i)
      const path = v.path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      const views = (d.pageViews ??= [])
      if (views.some((x) => x.visitor === v.visitor && x.path === path && Date.now() - +new Date(x.viewed_at) < 10000)) return
      views.push({ path, gig_id: m && d.listings.some((l) => l.id === m[1]) ? m[1] : null, visitor: v.visitor, session: v.session, source: v.source, device: v.device, user_id: u?.id ?? null, viewed_at: now() })
      if (views.length > 5000) views.splice(0, views.length - 5000)
      try { localStorage.setItem(KEY_DB, JSON.stringify(d)) } catch { /* ignore */ } // no listeners: a view shouldn't re-render the app
      return
    }
    await sb!.rpc('log_view', { p_path: v.path, p_visitor: v.visitor, p_session: v.session, p_source: v.source, p_device: v.device })
  } catch { /* never let tracking break the site */ }
}

export async function siteInsights(days: number): Promise<Insights> {
  if (!DEMO) {
    const { data, error } = await sb!.rpc('site_insights', { p_days: days })
    fail(error)
    return data as Insights
  }
  // demo: the same numbers as site_insights(), worked out in the browser
  const d = db(), DAY = 864e5
  const t0 = new Date(); t0.setUTCHours(0, 0, 0, 0); t0.setTime(+t0 - (days - 1) * DAY)
  const tp = new Date(+t0 - days * DAY)
  const all = [...(d.pageViews ?? [])].sort((a, b) => a.viewed_at.localeCompare(b.viewed_at))
  const v = all.filter((x) => new Date(x.viewed_at) >= t0), pv = all.filter((x) => new Date(x.viewed_at) >= tp && new Date(x.viewed_at) < t0)
  const uniq = <T,>(xs: T[]) => new Set(xs.filter((x) => x != null)).size
  const tot = (xs: typeof v) => ({ views: xs.length, visitors: uniq(xs.map((x) => x.visitor)), sessions: uniq(xs.map((x) => x.session)) })
  const firstSrc = new Map<string, string>(), acct = new Map<string, string>()
  for (const x of all) { if (x.visitor && !firstSrc.has(x.visitor)) firstSrc.set(x.visitor, x.source); if (x.user_id && x.visitor && !acct.has(x.user_id)) acct.set(x.user_id, x.visitor) }
  const people = d.profiles.filter((p) => p.role !== 'admin')
  const su = people.filter((p) => new Date(p.created_at) >= t0).map((p) => ({ ...p, src: firstSrc.get(acct.get(p.id) ?? '') ?? 'unknown' }))
  const dayKey = (t: string | Date) => new Date(t).toISOString().slice(0, 10)
  const daily = Array.from({ length: days }, (_, i) => {
    const k = dayKey(new Date(+t0 + i * DAY)), dv = v.filter((x) => dayKey(x.viewed_at) === k)
    return { day: k, views: dv.length, visitors: uniq(dv.map((x) => x.visitor)), signups: people.filter((p) => dayKey(p.created_at) === k).length }
  })
  const sess = new Map<string, (typeof v)[number]>(); for (const x of v) if (x.session && !sess.has(x.session)) sess.set(x.session, x)
  const srcNames = new Set([...[...sess.values()].map((x) => x.source), ...su.map((s) => s.src)])
  const sources = [...srcNames].map((source) => {
    const ss = [...sess.values()].filter((x) => x.source === source)
    return { source, sessions: ss.length, visitors: uniq(ss.map((x) => x.visitor)), signups: su.filter((s) => s.src === source).length }
  }).sort((a, b) => b.visitors - a.visitors || b.signups - a.signups)
  const byPath = new Map<string, typeof v>(); for (const x of v) byPath.set(x.path, [...(byPath.get(x.path) ?? []), x])
  const pages = [...byPath].map(([path, xs]) => ({ path, views: xs.length, visitors: uniq(xs.map((x) => x.visitor)) })).sort((a, b) => b.views - a.views).slice(0, 12)
  const devs = new Map<string, Set<string>>(); for (const x of v) { if (!devs.has(x.device)) devs.set(x.device, new Set()); if (x.visitor) devs.get(x.device)!.add(x.visitor) }
  const byDay = new Map<string, Set<string>>(); for (const x of v) if (x.visitor) { if (!byDay.has(x.visitor)) byDay.set(x.visitor, new Set()); byDay.get(x.visitor)!.add(dayKey(x.viewed_at)) }
  const apps = d.applications ?? [], subs = d.submissions, pays = d.payments ?? []
  const gigs = d.listings.map((l) => {
    const gv = v.filter((x) => x.gig_id === l.id)
    return { id: l.id, title: l.title, status: l.status, join_mode: l.join_mode ?? 'open', expires_at: l.expires_at, views: gv.length, visitors: uniq(gv.map((x) => x.visitor)),
      applied: apps.filter((a) => a.listing_id === l.id && new Date(a.created_at) >= t0).length, joined: d.claims.filter((c) => c.listing_id === l.id && new Date(c.created_at) >= t0).length }
  }).filter((g) => g.views > 0 || (g.status === 'live' && new Date(g.expires_at) > new Date())).sort((a, b) => b.visitors - a.visitors || b.views - a.views).slice(0, 25)
  const tookPart = (id: string) => apps.some((a) => a.applicant_id === id) || d.claims.some((c) => c.student_id === id)
  return {
    days, since: t0.toISOString(), first_view: all[0]?.viewed_at ?? null, totals: tot(v), prev: tot(pv),
    signups: su.length, prev_signups: people.filter((p) => new Date(p.created_at) >= tp && new Date(p.created_at) < t0).length,
    returning: [...byDay.values()].filter((s) => s.size > 1).length, daily, sources, pages,
    devices: [...devs].map(([device, s]) => ({ device, visitors: s.size })).sort((a, b) => b.visitors - a.visitors), gigs,
    funnel: {
      visitors: uniq(v.map((x) => x.visitor)), signups: su.length, verified: su.filter((s) => s.kyc_status === 'verified').length,
      took_part: su.filter((s) => tookPart(s.id)).length,
      completed: su.filter((s) => subs.some((x) => x.student_id === s.id && ['approved', 'paid'].includes(x.status)) || d.claims.some((c) => c.student_id === s.id && c.status === 'completed')).length,
      paid: su.filter((s) => subs.some((x) => x.student_id === s.id && x.status === 'paid') || pays.some((y) => y.student_id === s.id)).length,
    },
  }
}

export const qr = {
  async stats(): Promise<QrStat[]> {
    if (DEMO) {
      const d = db(), scans = d.qrScans ?? [], day = (t: string) => new Date(t).toDateString()
      return (d.qrCodes ?? []).map((c) => {
        const mine = scans.filter((s) => s.code === c.code)
        const daily = Array.from({ length: 14 }, (_, i) => { const dd = new Date(Date.now() - (13 - i) * 864e5).toDateString(); return mine.filter((s) => day(s.scanned_at) === dd).length })
        const signed = d.profiles.filter((p) => p.signup_source === c.code)
        return { ...c, scans: mine.length, people: new Set(mine.map((s, i) => s.visitor ?? String(i))).size, scans_7d: mine.filter((s) => Date.now() - +new Date(s.scanned_at) < 7 * 864e5).length,
          mobile: mine.filter((s) => s.device === 'mobile' || s.device === 'tablet').length, last_scan: mine.length ? mine[mine.length - 1].scanned_at : null,
          signups: signed.length, verified: signed.filter((p) => p.kyc_status === 'verified').length, daily }
      })
    }
    const { data, error } = await sb!.rpc('qr_stats')
    fail(error)
    return ((data ?? []) as QrStat[]).map((r) => ({ ...r, scans: +r.scans, people: +r.people, scans_7d: +r.scans_7d, mobile: +r.mobile, signups: +r.signups, verified: +r.verified, daily: r.daily ?? [] }))
  },
  async save(c: Pick<QrCode, 'code' | 'label' | 'target'> & { archived?: boolean }, isNew: boolean) {
    const row = { code: c.code.toLowerCase().trim(), label: c.label.trim(), target: c.target, ...(c.archived != null ? { archived: c.archived } : {}) }
    if (!/^[a-z0-9][a-z0-9-]{1,23}$/.test(row.code)) throw new Error('Use 2–24 lowercase letters, numbers or dashes for the code, e.g. legon-posters')
    if (!row.label) throw new Error('Give it a name, e.g. “Legon campus posters”')
    if (DEMO) {
      const d = db(); d.qrCodes ??= []
      const ex = d.qrCodes.find((x) => x.code === row.code)
      if (isNew && ex) throw new Error('That code is already used — pick another')
      if (ex) Object.assign(ex, row); else d.qrCodes.push({ archived: false, created_at: now(), ...row })
      return save()
    }
    const { error } = isNew ? await sb!.from('qr_codes').insert(row) : await sb!.from('qr_codes').update(row).eq('code', row.code)
    if (error?.code === '23505') throw new Error('That code is already used — pick another')
    fail(error)
  },
}

/**
 * Retries a save without columns the database doesn't have yet (Supabase error PGRST204), so a newer website
 * keeps working against an older database until its migration is run. Only optional new fields are ever dropped.
 */
async function withoutMissingColumns<T extends { error: { code?: string; message: string } | null }>(row: Record<string, unknown>, run: (row: Record<string, unknown>) => PromiseLike<T>): Promise<T> {
  let r = { ...row }
  for (let i = 0; i < 12; i++) {
    const res = await run(r)
    const col = res.error?.code === 'PGRST204' ? /'([^']+)' column/.exec(res.error.message)?.[1] : undefined
    if (!col || !(col in r)) return res
    const { [col]: _dropped, ...rest } = r; r = rest
  }
  return run(r)
}

// ═══════════════════════════ profile ═══════════════════════════
export async function myProfile(): Promise<Profile | null> {
  const u = await auth.user()
  if (!u) return null
  if (DEMO) return db().profiles.find((p) => p.id === u.id) ?? null
  const { data, error } = await sb!.from('profiles').select('*').eq('id', u.id).maybeSingle()
  fail(error)
  return data
}
export async function updateMyProfile(patch: Partial<Profile>) {
  const u = must(await auth.user(), 'Sign in first')
  const { role, referral_code, kyc_note, ...safe } = patch
  if (DEMO) {
    const p = must(db().profiles.find((x) => x.id === u.id), 'No profile')
    Object.assign(p, safe)
    return save()
  }
  const { error } = await withoutMissingColumns(safe, (row) => sb!.from('profiles').update(row).eq('id', u.id))
  fail(error)
}

// ═══════════════════════════ listings ═══════════════════════════
export async function listListings(opts: { all?: boolean } = {}): Promise<Listing[]> {
  if (DEMO) {
    return db().listings.filter((l) => opts.all || l.status !== 'draft').map(withStats)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const [{ data, error }, { data: stats }] = await Promise.all([
    sb!.from('listings').select('*').order('created_at', { ascending: false }),
    sb!.from('listing_stats').select('*'),
  ])
  fail(error)
  const m = new Map((stats ?? []).map((s: any) => [s.listing_id, s]))
  return (data ?? []).filter((l) => opts.all || l.status !== 'draft')
    .map((l) => ({ ...l, ...(m.get(l.id) ?? { taken: 0, approved_units: 0, committed: 0 }) }))
}
export async function getListing(id: string): Promise<Listing | null> {
  return (await listListings({ all: true })).find((l) => l.id === id) ?? null
}
/** Columns that actually exist on the listings table — anything else (e.g. joined stats) is dropped before saving. */
const LISTING_COLUMNS = ['id', 'title', 'type', 'summary', 'description', 'requirements', 'location', 'is_remote', 'pay_model', 'rate',
  'unit_label', 'units_per_student', 'total_budget', 'currency', 'slots', 'proof_fields', 'form_schema', 'photo_rule', 'photo_hint', 'audience', 'join_mode', 'application_schema', 'eligibility', 'sessions', 'expires_at', 'status', 'accent', 'emoji',
  'client_name', 'cover_url'] as const
export async function saveListing(l: Partial<Listing>): Promise<Listing> {
  const row = Object.fromEntries(LISTING_COLUMNS.filter((k) => k in l).map((k) => [k, (l as any)[k]])) as Partial<Listing>
  if (DEMO) {
    const d = db()
    if (row.id) {
      const ex = must(d.listings.find((x) => x.id === row.id), 'Listing not found')
      Object.assign(ex, row); save(); return ex
    }
    const created = { ...row, id: uid(), created_at: now() } as Listing
    d.listings.push(created); save(); return created
  }
  const u = await auth.user()
  const { data, error } = await withoutMissingColumns(row as Record<string, unknown>, (r) => row.id
    ? sb!.from('listings').update(r).eq('id', row.id).select().single()
    : sb!.from('listings').insert({ ...r, created_by: u?.id }).select().single())
  fail(error)
  return data
}
export async function deleteListing(id: string) {
  if (DEMO) { const d = db(); d.listings = d.listings.filter((l) => l.id !== id); return save() }
  const { error } = await sb!.from('listings').delete().eq('id', id)
  fail(error)
}

// ═══════════════════════════ claims + work ═══════════════════════════
export async function claimListing(listingId: string): Promise<Claim> {
  if (DEMO) {
    const u = must(demoUser(), 'Sign in first')
    const d = db()
    const p = d.profiles.find((x) => x.id === u.id)!
    if (p.kyc_status !== 'verified') throw new Error('Complete verification before joining gigs')
    const l = withStats(must(d.listings.find((x) => x.id === listingId), 'Gig not found'))
    if (l.status !== 'live') throw new Error('This gig is not open')
    if (new Date(l.expires_at) < new Date()) throw new Error('This gig has expired')
    if (!audienceAllows(audienceOf(l), accountOf(p))) throw new Error(audienceMessage(audienceOf(l)))
    if (l.join_mode === 'apply') throw new Error('This gig takes applications. Apply and we’ll let you know if you’re selected')
    const ex = d.claims.find((c) => c.listing_id === listingId && c.student_id === u.id)
    if (ex && ex.status === 'active') return ex
    if ((l.taken ?? 0) >= l.slots) throw new Error('All spots are taken')
    if (ex) { ex.status = 'active'; save(); return ex }
    const c: Claim = { id: uid(), listing_id: listingId, student_id: u.id, status: 'active', created_at: now() }
    d.claims.push(c); save(); return c
  }
  const { data, error } = await sb!.rpc('claim_listing', { p_listing: listingId })
  fail(error)
  return data
}
export async function withdrawClaim(claimId: string) {
  if (DEMO) { const c = db().claims.find((x) => x.id === claimId); if (c) c.status = 'withdrawn'; return save() }
  const { error } = await sb!.rpc('withdraw_claim', { p_claim: claimId })
  fail(error)
}
export async function myClaims(): Promise<(Claim & { listing: Listing; subs: Submission[] })[]> {
  const u = must(await auth.user(), 'Sign in first')
  const listings = await listListings({ all: true })
  let claims: Claim[], subs: Submission[]
  if (DEMO) {
    claims = db().claims.filter((c) => c.student_id === u.id)
    subs = db().submissions.filter((s) => s.student_id === u.id)
  } else {
    const [a, b] = await Promise.all([
      sb!.from('claims').select('*').eq('student_id', u.id).order('created_at', { ascending: false }),
      sb!.from('submissions').select('*').eq('student_id', u.id).order('created_at', { ascending: false }),
    ])
    fail(a.error); fail(b.error)
    claims = a.data ?? []; subs = b.data ?? []
  }
  return claims
    .map((c) => ({ ...c, listing: listings.find((l) => l.id === c.listing_id)!, subs: subs.filter((s) => s.claim_id === c.id) }))
    .filter((c) => c.listing)
}
export async function submitWork(claimId: string, data: Record<string, string>, proof: File | null): Promise<Submission> {
  const proofPath = proof ? await uploadFile('proofs', proof, 'proof') : null
  if (DEMO) {
    const u = must(demoUser(), 'Sign in first')
    const d = db()
    const c = must(d.claims.find((x) => x.id === claimId && x.student_id === u.id), 'Gig not active')
    const l = must(d.listings.find((x) => x.id === c.listing_id), 'Gig gone')
    if (new Date(l.expires_at) < new Date()) throw new Error('This gig has expired')
    if (sessionsOf(l).length) throw new Error('This gig uses daily check-ins. Use the check-in for today')
    const mine = d.submissions.filter((s) => s.claim_id === c.id && s.status !== 'rejected')
    if (l.units_per_student && mine.length >= l.units_per_student) throw new Error('You’ve reached the limit for this gig')
    const amount = l.pay_model === 'per_unit' ? l.rate : Math.round((l.rate / Math.max(l.units_per_student ?? 1, 1)) * 100) / 100
    const spent = d.submissions.filter((s) => s.listing_id === l.id && s.status !== 'rejected').reduce((a, s) => a + (s.amount ?? 0), 0)
    if (l.total_budget && spent + amount > l.total_budget) throw new Error('Budget for this gig is used up')
    // same rules as submit_work on the server
    const schema = schemaOf(l)
    const problem = validateAnswers(schema, data)
    if (problem) throw new Error(problem)
    if (photoRuleOf(l) === 'required' && !proofPath) throw new Error('Add a photo as proof')
    const clean: Record<string, string> = {}
    for (const f of schema) { const v = (data[f.key] ?? '').trim(); if (v) clean[f.key] = v }
    if (schema.some((f) => f.type === 'address') && data.gps) { clean.gps = data.gps; if (data.gps_accuracy) clean.gps_accuracy = data.gps_accuracy }
    const norm = (v = '') => v.toLowerCase().replace(/[^a-z0-9@./]/g, '')
    const uq = schema.find((f) => f.unique && clean[f.key])
    if (uq && d.submissions.some((s) => s.listing_id === l.id && s.status !== 'rejected' && norm(s.data[uq.key]) === norm(clean[uq.key]))) {
      throw new Error('This has already been submitted on this gig')
    }
    const s: Submission = {
      id: uid(), claim_id: c.id, listing_id: l.id, student_id: u.id, data: clean, proof_path: proofPath, status: 'pending',
      summary: subTitle({ data: clean }, schema, l.unit_label),
      amount, admin_note: null, reviewed_at: null, paid_at: null, payout_ref: null, created_at: now(),
    }
    d.submissions.push(s); save(); return s
  }
  const { data: s, error } = await sb!.rpc('submit_work', { p_claim: claimId, p_data: data, p_proof: proofPath })
  fail(error)
  return s
}

/** Check in for one day of a scheduled gig. Only works on that day (Ghana time). */
export async function submitCheckin(claimId: string, day: number, data: Record<string, string>, proof: File | null): Promise<Submission> {
  if (DEMO) {
    const u = must(demoUser(), 'Sign in first'), d = db()
    const c = must(d.claims.find((x) => x.id === claimId && x.student_id === u.id && x.status === 'active'), 'Gig not active')
    const l = must(d.listings.find((x) => x.id === c.listing_id), 'Gig gone')
    const days = sessionsOf(l), sd = days[day - 1]
    if (!sd) throw new Error('That day isn’t part of this gig')
    const today = todayGhana()
    if (today < sd.date) throw new Error(`Day ${day}’s check-in opens on ${sd.date}`)
    if (today > sd.date) throw new Error(`Day ${day}’s check-in closed on ${sd.date}`)
    const problem = validateAnswers(schemaOf(l), data); if (problem) throw new Error(problem)
    if (photoRuleOf(l) === 'required' && !proof) throw new Error('Add a photo from today as proof')
    if (d.submissions.some((s) => s.claim_id === c.id && s.session_day === day && s.status !== 'rejected')) throw new Error(`You’ve already checked in for day ${day}`)
    const proofPath = proof && photoRuleOf(l) !== 'none' ? await uploadFile('proofs', proof, 'proof') : null
    const clean: Record<string, string> = {}; for (const f of schemaOf(l)) { const v = (data[f.key] ?? '').trim(); if (v) clean[f.key] = v }
    const amount = l.pay_model === 'per_unit' ? l.rate : Math.round((l.rate / days.length) * 100) / 100
    const s: Submission = { id: uid(), claim_id: c.id, listing_id: l.id, student_id: u.id, data: clean, summary: `${dayLabel(sd, day - 1)} · ${new Date(sd.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })}`,
      proof_path: proofPath, status: 'pending', amount, admin_note: null, reviewed_at: null, paid_at: null, payout_ref: null, created_at: now(), session_day: day }
    d.submissions.push(s); save(); return s
  }
  const proofPath = proof ? await uploadFile('proofs', proof, 'proof') : null
  const { data: s, error } = await sb!.rpc('submit_checkin', { p_claim: claimId, p_day: day, p_data: data, p_proof: proofPath })
  fail(error)
  return s
}

// ═══════════════════════════ client briefs ═══════════════════════════
/** Sends a business brief, then uploads its files (max 5, 10 MB each). Returns the names of files that failed. */
export async function createRequest(r: Omit<ClientRequest, 'id' | 'status' | 'created_at'>, files: File[] = []): Promise<string[]> {
  const id = uid()
  const row = { ...r, id, admin_note: undefined, listing_id: undefined }
  if (DEMO) { db().requests.push({ ...row, status: 'new', created_at: now() }); save() }
  else { const { error } = await sb!.from('client_requests').insert(row); fail(error) }
  const failed: string[] = []
  for (const [i, file] of files.slice(0, 5).entries()) {
    try {
      const [ext, mime] = checkDoc(file, 10)
      // keep the original name readable in the path so admins see what was sent
      const base = file.name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file'
      const path = `${id}/${i + 1}-${base}.${ext}`
      if (DEMO) { db().files[`brief-files/${path}`] = await toDataUrlRaw(file); db().briefMeta = { ...(db().briefMeta ?? {}), [path]: { size: file.size, mime } }; save() }
      else { const { error } = await sb!.storage.from('brief-files').upload(path, file, { upsert: false, contentType: mime }); fail(error) }
    } catch (e: any) { failed.push(`${file.name}: ${e.message}`) }
  }
  return failed
}
const toDataUrlRaw = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f) })

// ═══════════════════════════ points & rewards (migration 0018) ═══════════════════════════
const demoRewards = (): RewardItem[] => [
  { id: uid(), name: 'GHS 10 airtime', description: 'Sent to your phone on any network.', image_url: null, vendor: 'Any network', category: 'airtime', points_cost: 100, stock: null, active: true, created_at: now() },
  { id: uid(), name: '2GB data bundle', description: 'Valid for 30 days.', image_url: null, vendor: 'MTN', category: 'airtime', points_cost: 150, stock: 20, active: true, created_at: now() },
  { id: uid(), name: 'Gigotter tote bag', description: 'Sturdy canvas tote with the otter on it.', image_url: null, vendor: 'Gigotter', category: 'product', points_cost: 400, stock: 3, active: true, created_at: now() },
  { id: uid(), name: 'Lunch voucher', description: 'One meal at a partner campus café.', image_url: null, vendor: '[Partner café]', category: 'voucher', points_cost: 250, stock: 10, active: true, created_at: now() },
]
function demoStore() {
  const d = db()
  d.rewardItems ??= demoRewards(); d.redemptions ??= []; d.pointsLedger ??= []
  return d as DemoDB & { rewardItems: RewardItem[]; redemptions: Redemption[]; pointsLedger: PointsEntry[] }
}
const ledgerEntry = (e: Omit<PointsEntry, 'id' | 'created_at' | 'submission_id' | 'redemption_id' | 'note'> & Partial<PointsEntry>): PointsEntry =>
  ({ id: uid(), created_at: now(), submission_id: null, redemption_id: null, note: null, ...e })
/** Demo copy of the database triggers: approving work on a points gig settles it and adds the points once. */
function demoSettlePoints(s: Submission, was: SubmissionStatus) {
  const d = demoStore(), l = d.listings.find((x) => x.id === s.listing_id)
  if (l?.currency !== POINTS) return
  if (s.status === 'approved' && was !== 'approved') Object.assign(s, { status: 'paid', paid_at: s.paid_at ?? now(), payout_ref: s.payout_ref || 'points' })
  const net = d.pointsLedger.filter((e) => e.submission_id === s.id && ['earned', 'reversed'].includes(e.kind)).reduce((a, e) => a + e.delta, 0)
  const pts = Math.round(s.amount ?? 0)
  if (s.status === 'paid' && was !== 'paid' && net === 0 && pts > 0) d.pointsLedger.push(ledgerEntry({ student_id: s.student_id, delta: pts, kind: 'earned', submission_id: s.id, note: s.summary || 'Approved work' }))
  else if (was === 'paid' && ['pending', 'rejected'].includes(s.status) && net > 0) d.pointsLedger.push(ledgerEntry({ student_id: s.student_id, delta: -net, kind: 'reversed', submission_id: s.id, note: 'Approval taken back' }))
}
const balanceOf = (entries: PointsEntry[]) => entries.reduce((a, e) => a + e.delta, 0)

/** The signed-in student's points: balance and history (newest first). */
export async function myPoints(): Promise<{ balance: number; entries: PointsEntry[] }> {
  const u = await auth.user(); if (!u) return { balance: 0, entries: [] }
  let entries: PointsEntry[]
  if (DEMO) entries = demoStore().pointsLedger.filter((e) => e.student_id === u.id)
  else {
    const { data, error } = await sb!.from('points_ledger').select('*').eq('student_id', u.id)
    entries = error ? [] : (data ?? [])
  }
  entries = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { balance: balanceOf(entries), entries }
}
/** Today's date in Ghana (same as UTC), YYYY-MM-DD. */
export const ghanaDay = () => new Date().toISOString().slice(0, 10)
/** Give the signed-in member today's login point, once a day (verified members only). null = no answer (offline, error): try again later. */
export async function claimDailyPoint(): Promise<{ awarded: boolean; points: number; balance: number } | null> {
  if (DEMO) {
    const u = demoUser(), d = demoStore(), p = u && d.profiles.find((x) => x.id === u.id)
    if (!u || !p || p.role === 'admin' || p.kyc_status !== 'verified') return { awarded: false, points: DAILY_POINTS, balance: 0 }
    const mine = d.pointsLedger.filter((e) => e.student_id === u.id)
    const awarded = !mine.some((e) => e.kind === 'daily' && e.created_at.slice(0, 10) === ghanaDay())
    if (awarded) { d.pointsLedger.push(ledgerEntry({ student_id: u.id, delta: DAILY_POINTS, kind: 'daily', note: 'Daily login point' })); save() }
    return { awarded, points: DAILY_POINTS, balance: balanceOf(d.pointsLedger.filter((e) => e.student_id === u.id)) }
  }
  const { data, error } = await sb!.rpc('claim_daily_point')
  if (error) return null   // offline or not set up: stay quiet, and let the next visit try again
  return data as { awarded: boolean; points: number; balance: number }
}
/** The signed-in student's reward requests, newest first. */
export async function myRedemptions(): Promise<Redemption[]> {
  const u = await auth.user(); if (!u) return []
  if (DEMO) return demoStore().redemptions.filter((r) => r.student_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const { data, error } = await sb!.from('redemptions').select('*').eq('student_id', u.id).order('created_at', { ascending: false })
  return error ? [] : (data ?? [])
}
/** Rewards on offer (active only, cheapest first). */
export async function listRewardItems(): Promise<RewardItem[]> {
  let items: RewardItem[]
  if (DEMO) items = demoStore().rewardItems.filter((i) => i.active)
  else {
    const { data, error } = await sb!.from('reward_items').select('*').eq('active', true)
    items = error ? [] : (data ?? [])
  }
  return items.sort((a, b) => a.points_cost - b.points_cost || a.name.localeCompare(b.name))
}
/** Spend points on a reward. Points are taken at once; an admin sends the item and can cancel (refund). */
export async function redeemItem(itemId: string, phone: string, note: string): Promise<Redemption> {
  if (DEMO) {
    const u = must(demoUser(), 'Sign in to redeem rewards'), d = demoStore()
    const p = must(d.profiles.find((x) => x.id === u.id), 'Profile not found')
    if (p.kyc_status !== 'verified') throw new Error('Complete verification before redeeming rewards')
    const ph = phone.trim()
    if (ph.replace(/\D/g, '').length < 9 || ph.length > 20) throw new Error('Enter a valid phone number')
    if (note.length > 300) throw new Error('Keep the delivery note under 300 characters')
    const it = d.rewardItems.find((x) => x.id === itemId)
    if (!it || !it.active) throw new Error('This reward isn’t available any more')
    if (it.stock != null && it.stock < 1) throw new Error('This reward is out of stock')
    const bal = balanceOf(d.pointsLedger.filter((e) => e.student_id === u.id))
    if (bal < it.points_cost) throw new Error(`You need ${it.points_cost - bal} more points for this reward`)
    const r: Redemption = { id: uid(), student_id: u.id, item_id: it.id, item_name: it.name, points: it.points_cost, phone: ph,
      delivery_note: note.trim() || null, status: 'requested', admin_note: null, handled_at: null, created_at: now() }
    d.redemptions.push(r)
    d.pointsLedger.push(ledgerEntry({ student_id: u.id, delta: -it.points_cost, kind: 'redeemed', redemption_id: r.id, note: it.name }))
    if (it.stock != null) it.stock -= 1
    save(); return r
  }
  const { data, error } = await sb!.rpc('redeem_item', { p_item: itemId, p_phone: phone.trim(), p_note: note.trim() || null })
  fail(error); return data as Redemption
}

// ═══════════════════════════ admin ═══════════════════════════
export const admin = {
  async profiles(): Promise<Profile[]> {
    if (DEMO) return [...db().profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const { data, error } = await sb!.from('profiles').select('*').order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async setKyc(id: string, status: KycStatus, note: string | null) {
    if (DEMO) {
      const p = db().profiles.find((x) => x.id === id)
      if (p) {
        if (p.kyc_status !== status && (status === 'verified' || status === 'rejected')) p.kyc_email_sent_at = now()
        // same as the database: becoming verified adds the welcome points, once ever
        if (status === 'verified' && p.kyc_status !== 'verified' && p.role !== 'admin') {
          const d = demoStore()
          if (!d.pointsLedger.some((e) => e.student_id === id && e.kind === 'welcome')) d.pointsLedger.push(ledgerEntry({ student_id: id, delta: WELCOME_POINTS, kind: 'welcome', note: 'Welcome bonus', emailed_at: now() }))
        }
        p.kyc_status = status; p.kyc_note = note
      }
      return save()
    }
    const { error } = await sb!.from('profiles').update({ kyc_status: status, kyc_note: note }).eq('id', id)
    fail(error)
  },
  /** Send (or resend) the verified / needs-fixing email for a student's current status. */
  async resendKycEmail(id: string): Promise<string> {
    if (DEMO) {
      const p = must(db().profiles.find((x) => x.id === id), 'Student not found')
      if (p.kyc_status !== 'verified' && p.kyc_status !== 'rejected') throw new Error('Only verified or needs-fixing students can be emailed')
      if (p.kyc_email_sent_at && Date.now() - +new Date(p.kyc_email_sent_at) < 120000) throw new Error('An email was just sent — wait a couple of minutes before sending again')
      p.kyc_email_sent_at = now(); save(); return p.kyc_email_sent_at
    }
    const { data, error } = await sb!.rpc('resend_kyc_email', { p_student: id })
    fail(error)
    return data as string
  },
  // ─── team: invite admins by email (migration 0020) ───
  async invites(): Promise<AdminInvite[]> {
    if (DEMO) return (db().adminInvites ?? []).map(({ token: _t, ...i }) => i).sort((a, b) => b.sent_at.localeCompare(a.sent_at))
    const { data, error } = await sb!.from('admin_invites').select(INVITE_COLS).order('sent_at', { ascending: false })
    fail(error); return (data ?? []) as AdminInvite[]
  },
  /** Send, or resend, an admin invite. In the demo there's no email, so the invite link is returned instead. */
  async inviteAdmin(email: string, name: string): Promise<string | null> {
    const e = email.trim().toLowerCase(), n = name.trim() || null
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('Enter a valid email address')
    if (DEMO) {
      const d = db(); d.adminInvites ??= []
      if (d.profiles.some((p) => p.email?.toLowerCase() === e && p.role === 'admin')) throw new Error('That person is already an admin')
      const token = crypto.randomUUID().replace(/-/g, '')
      const open = d.adminInvites.find((i) => i.email === e && !i.accepted_at && !i.revoked_at)
      const exp = new Date(Date.now() + 7 * 864e5).toISOString()
      if (open) Object.assign(open, { token, name: n ?? open.name, sent_at: now(), expires_at: exp, invited_by: d.session })
      else d.adminInvites.push({ id: uid(), email: e, name: n, token, invited_by: d.session, created_at: now(), sent_at: now(), expires_at: exp, accepted_at: null, accepted_by: null, revoked_at: null })
      save(); return `${location.origin}/admin-invite?token=${token}`
    }
    const { error } = await sb!.rpc('invite_admin', { p_email: e, p_name: n })
    fail(error); return null
  },
  async revokeInvite(id: string) {
    if (DEMO) {
      const i = must((db().adminInvites ?? []).find((x) => x.id === id && !x.accepted_at && !x.revoked_at), 'That invite is no longer open')
      i.revoked_at = now(); return save()
    }
    const { error } = await sb!.rpc('revoke_admin_invite', { p_invite: id })
    fail(error)
  },
  async submissions(): Promise<Submission[]> {
    let subs: Submission[]
    if (DEMO) subs = [...db().submissions]
    else {
      const { data, error } = await sb!.from('submissions').select('*').order('created_at', { ascending: false })
      fail(error); subs = data ?? []
    }
    const [ls, ps] = await Promise.all([listListings({ all: true }), admin.profiles()])
    return subs.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((s) => ({
      ...s, listing: ls.find((l) => l.id === s.listing_id), student: ps.find((p) => p.id === s.student_id),
    }))
  },
  async claims(): Promise<Claim[]> {
    if (DEMO) return db().claims
    const { data, error } = await sb!.from('claims').select('*')
    fail(error); return data ?? []
  },
  async review(ids: string[], status: SubmissionStatus, extra: { admin_note?: string; payout_ref?: string } = {}) {
    const patch: Partial<Submission> = { status, reviewed_at: now(), ...extra }
    if (status === 'paid') patch.paid_at = now()
    if (DEMO) {
      db().submissions.forEach((s) => { if (ids.includes(s.id)) { const was = s.status; Object.assign(s, patch); demoSettlePoints(s, was) } })
      return save()
    }
    const { error } = await sb!.from('submissions').update(patch).in('id', ids)
    fail(error)
  },
  /** Applications for one gig, with each applicant's profile. */
  async applications(listingId: string): Promise<Application[]> {
    let apps: Application[]
    if (DEMO) apps = (db().applications ?? []).filter((a) => a.listing_id === listingId)
    else { const { data, error } = await sb!.from('applications').select('*').eq('listing_id', listingId); fail(error); apps = data ?? [] }
    const ps = await admin.profiles()
    return apps.map((a) => ({ ...a, applicant: ps.find((p) => p.id === a.applicant_id) })).sort((a, b) => a.created_at.localeCompare(b.created_at))
  },
  /** Shortlist / accept / decline. Accepting gives a place on the gig; accept and decline email the person. */
  async decideApplications(ids: string[], status: ApplicationStatus, note?: string): Promise<number> {
    if (DEMO) {
      const d = db(); let done = 0
      for (const a of (d.applications ?? []).filter((x) => ids.includes(x.id) && x.status !== 'withdrawn')) {
        if (a.status === status) continue
        const l = must(d.listings.find((x) => x.id === a.listing_id), 'Gig not found')
        const claim = d.claims.find((c) => c.listing_id === a.listing_id && c.student_id === a.applicant_id)
        if (status === 'accepted') {
          const taken = d.claims.filter((c) => c.listing_id === a.listing_id && ['active', 'completed'].includes(c.status) && c.student_id !== a.applicant_id).length
          if (taken >= l.slots) throw new Error(`There are no places left on “${l.title}”. Increase the number of people needed on the gig, or decline someone first`)
          if (claim) claim.status = 'active'; else d.claims.push({ id: uid(), listing_id: a.listing_id, student_id: a.applicant_id, status: 'active', created_at: now() })
        } else if (a.status === 'accepted') {
          if (d.submissions.some((s) => s.listing_id === a.listing_id && s.student_id === a.applicant_id && s.status !== 'rejected')) throw new Error('This person has already submitted work on this gig, so their place can’t be removed')
          if (claim) claim.status = 'removed'
        }
        Object.assign(a, { status, admin_note: note?.trim() || a.admin_note, decided_at: ['accepted', 'declined'].includes(status) ? now() : a.decided_at }); done++
      }
      save(); return done
    }
    const { data, error } = await sb!.rpc('decide_applications', { p_ids: ids, p_status: status, p_note: note?.trim() || null })
    fail(error); return data as number
  },
  /** Every recorded payment (admin), for totals like "Paid out". Empty if the payments table isn't set up yet. */
  async allPayments(): Promise<Payment[]> {
    if (DEMO) return [...(db().payments ?? [])]
    const { data, error } = await sb!.from('payments').select('*')
    if (error) return []
    return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }))
  },
  /** Payments recorded for a student (optionally on one gig), newest first. */
  async payments(studentId: string, listingId?: string): Promise<Payment[]> {
    if (DEMO) return (db().payments ?? []).filter((p) => p.student_id === studentId && (!listingId || p.listing_id === listingId)).reverse()
    let q = sb!.from('payments').select('*').eq('student_id', studentId).order('paid_at', { ascending: false })
    if (listingId) q = q.eq('listing_id', listingId)
    const { data, error } = await q
    fail(error); return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) }))
  },
  /** Records a MoMo payment you sent, marks the submissions paid and emails the student a receipt. */
  async recordPayment(studentId: string, submissionIds: string[], amount: number, reference: string, note: string, paidAt?: string): Promise<Payment> {
    if (DEMO) {
      const d = db(), p = must(d.profiles.find((x) => x.id === studentId), 'Student not found')
      const subs = d.submissions.filter((s) => submissionIds.includes(s.id) && s.student_id === studentId && s.status === 'approved' && !s.payment_id)
      if (!(amount > 0)) throw new Error('Enter the amount you sent')
      if (!submissionIds.length || subs.length !== submissionIds.length) throw new Error('Some of those submissions aren’t approved and unpaid for this student any more. Refresh and try again')
      const lid = new Set(subs.map((s) => s.listing_id)).size === 1 ? subs[0].listing_id : null
      d.payments ??= []
      const pay: Payment = { id: uid(), receipt_no: `GIG-${1001 + d.payments.length}`, student_id: studentId, listing_id: lid, amount: Math.round(amount * 100) / 100,
        currency: d.listings.find((l) => l.id === lid)?.currency ?? 'GHS', method: p.momo_provider, momo_number: p.momo_number, momo_name: p.momo_name,
        reference: reference.trim() || null, note: note.trim() || null, items: subs.length, paid_at: paidAt ?? now(), email_sent_at: now(), created_at: now() }
      d.payments.push(pay)
      subs.forEach((s) => Object.assign(s, { status: 'paid', paid_at: pay.paid_at, payment_id: pay.id, payout_ref: pay.reference ?? pay.receipt_no }))
      save(); return pay
    }
    const { data, error } = await sb!.rpc('record_payment', { p_student: studentId, p_submissions: submissionIds, p_amount: amount,
      p_reference: reference.trim() || null, p_note: note.trim() || null, p_paid_at: paidAt ?? null })
    fail(error); return { ...(data as Payment), amount: Number((data as Payment).amount) }
  },
  async resendReceipt(paymentId: string): Promise<string> {
    if (DEMO) {
      const p = must((db().payments ?? []).find((x) => x.id === paymentId), 'Payment not found')
      if (p.email_sent_at && Date.now() - +new Date(p.email_sent_at) < 120000) throw new Error('A receipt was just sent — wait a couple of minutes before sending again')
      p.email_sent_at = now(); save(); return p.email_sent_at
    }
    const { data, error } = await sb!.rpc('resend_payment_receipt', { p_payment: paymentId })
    fail(error); return data as string
  },
  // ───── points & rewards ─────
  /** Every reward item, including switched-off ones. */
  async rewardItems(): Promise<RewardItem[]> {
    if (DEMO) return [...demoStore().rewardItems].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const { data, error } = await sb!.from('reward_items').select('*').order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async saveRewardItem(item: Partial<RewardItem> & Pick<RewardItem, 'name' | 'points_cost'>): Promise<RewardItem> {
    const row = { name: item.name.trim(), description: item.description?.trim() || null, image_url: item.image_url || null, vendor: item.vendor?.trim() || null,
      category: item.category ?? 'product', points_cost: Math.round(item.points_cost), stock: item.stock == null || Number.isNaN(item.stock) ? null : Math.max(0, Math.round(item.stock)), active: item.active ?? true }
    if (row.name.length < 2) throw new Error('Give the reward a name')
    if (!(row.points_cost > 0)) throw new Error('Set how many points it costs')
    if (DEMO) {
      const d = demoStore()
      const ex = item.id ? d.rewardItems.find((x) => x.id === item.id) : undefined
      if (ex) { Object.assign(ex, row); save(); return ex }
      const n: RewardItem = { id: uid(), created_at: now(), ...row }; d.rewardItems.push(n); save(); return n
    }
    const q = item.id ? sb!.from('reward_items').update(row).eq('id', item.id) : sb!.from('reward_items').insert(row)
    const { data, error } = await q.select().single()
    fail(error); return data as RewardItem
  },
  /** Reward requests with each student's details, oldest open request first. */
  async redemptions(): Promise<Redemption[]> {
    let rs: Redemption[]
    if (DEMO) rs = [...demoStore().redemptions]
    else { const { data, error } = await sb!.from('redemptions').select('*'); fail(error); rs = data ?? [] }
    const ps = await admin.profiles()
    const rank = (r: Redemption) => (r.status === 'requested' ? 0 : 1)
    return rs.map((r) => ({ ...r, student: ps.find((p) => p.id === r.student_id) }))
      .sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)))
  },
  /** Mark a request sent (emails the student) or cancel it (refunds the points, restores stock). */
  async handleRedemption(id: string, status: 'sent' | 'cancelled', note: string): Promise<Redemption> {
    if (DEMO) {
      const d = demoStore(), r = must(d.redemptions.find((x) => x.id === id), 'Reward request not found')
      if (r.status !== 'requested') throw new Error(`This request was already marked ${r.status}`)
      Object.assign(r, { status, admin_note: note.trim() || null, handled_at: now() })
      if (status === 'cancelled') {
        d.pointsLedger.push(ledgerEntry({ student_id: r.student_id, delta: r.points, kind: 'refund', redemption_id: r.id, note: `Refund: ${r.item_name}` }))
        const it = d.rewardItems.find((x) => x.id === r.item_id); if (it && it.stock != null) it.stock += 1
      }
      save(); return r
    }
    const { data, error } = await sb!.rpc('admin_handle_redemption', { p_redemption: id, p_status: status, p_note: note.trim() || null })
    fail(error); return data as Redemption
  },
  /** Add (positive) or remove (negative) points for a student, with a reason. */
  async adjustPoints(studentId: string, delta: number, note: string): Promise<void> {
    if (!Number.isInteger(delta) || delta === 0) throw new Error('Enter the points to add or remove')
    if (note.trim().length < 3) throw new Error('Add a short reason')
    if (DEMO) { demoStore().pointsLedger.push(ledgerEntry({ student_id: studentId, delta, kind: 'adjust', note: note.trim() })); return save() }
    const { error } = await sb!.rpc('admin_adjust_points', { p_student: studentId, p_delta: delta, p_note: note.trim() })
    fail(error)
  },
  /** Already-verified members whose welcome points haven't been emailed about yet (migration 0019). */
  /** Verified members not yet emailed about the daily login point. */
  async dailyPointsEmailsPending(): Promise<number> {
    if (DEMO) { const d = db() as DemoDB & { dailyEmailed?: string[] }; return d.profiles.filter((p) => p.role !== 'admin' && p.kyc_status === 'verified' && p.email && !(d.dailyEmailed ?? []).includes(p.id)).length }
    const { data, error } = await sb!.rpc('admin_daily_points_emails_pending')
    fail(error); return data as number
  },
  async sendDailyPointsEmails(limit = 20): Promise<{ sent: number; remaining: number }> {
    if (DEMO) {
      const d = db() as DemoDB & { dailyEmailed?: string[] }; d.dailyEmailed ??= []
      const waiting = d.profiles.filter((p) => p.role !== 'admin' && p.kyc_status === 'verified' && p.email && !d.dailyEmailed!.includes(p.id))
      waiting.slice(0, limit).forEach((p) => d.dailyEmailed!.push(p.id)); save()
      return { sent: Math.min(limit, waiting.length), remaining: Math.max(0, waiting.length - limit) }
    }
    const { data, error } = await sb!.rpc('admin_send_daily_points_emails', { p_limit: limit })
    fail(error); return data as { sent: number; remaining: number }
  },
  async welcomeEmailsPending(): Promise<number> {
    if (DEMO) return demoStore().pointsLedger.filter((e) => e.kind === 'welcome' && !e.emailed_at).length
    const { data, error } = await sb!.from('points_ledger').select('id, student_id').eq('kind', 'welcome').is('emailed_at', null)
    if (error) return 0
    const ps = await admin.profiles()
    return (data ?? []).filter((r) => { const p = ps.find((x) => x.id === r.student_id); return p && p.kyc_status === 'verified' && p.email }).length
  },
  /** Emails the next batch of members about their welcome points. */
  async sendWelcomeEmails(limit = 20): Promise<{ sent: number; remaining: number }> {
    if (DEMO) {
      const waiting = demoStore().pointsLedger.filter((e) => e.kind === 'welcome' && !e.emailed_at)
      waiting.slice(0, limit).forEach((e) => (e.emailed_at = now())); save()
      return { sent: Math.min(limit, waiting.length), remaining: Math.max(0, waiting.length - limit) }
    }
    const { data, error } = await sb!.rpc('admin_send_welcome_emails', { p_limit: limit })
    fail(error); return data as { sent: number; remaining: number }
  },
  /** Every points movement (for balances and totals). Empty if migration 0018 hasn't been run. */
  /** One member's points history, newest first (admin view). */
  async studentPoints(id: string): Promise<PointsEntry[]> {
    if (DEMO) return demoStore().pointsLedger.filter((e) => e.student_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))
    const { data, error } = await sb!.from('points_ledger').select('*').eq('student_id', id).order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async pointsLedger(): Promise<PointsEntry[]> {
    if (DEMO) return [...demoStore().pointsLedger]
    const { data, error } = await sb!.from('points_ledger').select('*')
    return error ? [] : (data ?? [])
  },
  async requests(): Promise<ClientRequest[]> {
    if (DEMO) return [...db().requests].reverse()
    const { data, error } = await sb!.from('client_requests').select('*').order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async setRequestStatus(id: string, status: string) { return admin.updateBrief(id, { status }) },
  async updateBrief(id: string, patch: Partial<Pick<ClientRequest, 'status' | 'admin_note' | 'listing_id'>>) {
    if (DEMO) { const r = db().requests.find((x) => x.id === id); if (r) Object.assign(r, patch); return save() }
    const { error } = await sb!.from('client_requests').update(patch).eq('id', id)
    fail(error)
  },
  /** Files a business attached to their brief (shown with the same viewer as gig files). */
  async briefFiles(id: string): Promise<ListingFile[]> {
    const show = (path: string) => path.split('/').pop()!.replace(/^\d+-/, '')
    const mk = (path: string, size: number, mime: string, at: string): ListingFile =>
      ({ id: path, listing_id: '', name: show(path), path, size_bytes: size, mime, visibility: 'joined', created_at: at, bucket: 'brief-files' })
    if (DEMO) {
      const d = db(); return Object.keys(d.files).filter((k) => k.startsWith(`brief-files/${id}/`)).map((k) => k.slice('brief-files/'.length)).sort()
        .map((p) => mk(p, d.briefMeta?.[p]?.size ?? 0, d.briefMeta?.[p]?.mime ?? 'application/octet-stream', now()))
    }
    const { data, error } = await sb!.storage.from('brief-files').list(id, { limit: 20, sortBy: { column: 'name', order: 'asc' } })
    fail(error)
    return (data ?? []).filter((o) => o.id).map((o) => mk(`${id}/${o.name}`, (o.metadata as any)?.size ?? 0, (o.metadata as any)?.mimetype ?? 'application/octet-stream', o.created_at ?? now()))
  },
  /** Downloads a stored file so it can be re-attached elsewhere (e.g. a brief's files onto a new gig). */
  async fileAsUpload(f: ListingFile): Promise<File> {
    const url = await listingFileUrl(f)
    // demo files are data: URLs, which the site's security policy won't let fetch() read
    const blob = url.startsWith('data:') ? new Blob([Uint8Array.from(atob(url.split(',')[1]), (c) => c.charCodeAt(0))], { type: f.mime }) : await (await fetch(url)).blob()
    return new File([blob], f.name, { type: f.mime })
  },
}

export function resetDemo() { try { localStorage.removeItem(KEY_DB) } catch { /* */ } memo = null; location.href = '/' }

// ═══════════════════════════ public feed + testimonials ═══════════════════════════
const shortName = (full?: string | null) => {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const first = parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase()
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first
}
/** Real, recent payouts — anonymised to first name + last initial. Empty if the feed isn't set up yet. */
export async function payoutFeed(limit = 20): Promise<PayoutItem[]> {
  if (DEMO) {
    const d = db(); const groups = new Map<string, PayoutItem>()
    d.submissions.filter((s) => s.status === 'paid' && s.paid_at).forEach((s) => {
      const p = d.profiles.find((x) => x.id === s.student_id); const l = d.listings.find((x) => x.id === s.listing_id)
      if (!p || !l || p.show_in_feed === false) return
      const k = `${p.id}|${l.id}|${s.paid_at!.slice(0, 10)}`
      const g = groups.get(k) ?? { name: shortName(p.full_name), school: p.school, amount: 0, currency: l.currency, gig: l.title, units: 0, paid_at: s.paid_at! }
      g.amount += s.amount ?? 0; g.units++; if (s.paid_at! > g.paid_at) g.paid_at = s.paid_at!; groups.set(k, g)
    })
    return [...groups.values()].sort((a, b) => b.paid_at.localeCompare(a.paid_at)).slice(0, limit)
  }
  const { data, error } = await sb!.rpc('payout_feed', { p_limit: limit })
  if (error) return [] // feed not installed yet (migration 0006) — just hide it
  return (data ?? []) as PayoutItem[]
}
export async function listTestimonials(all = false): Promise<Testimonial[]> {
  if (DEMO) return (db().testimonials ?? []).filter((t) => all || t.published)
  let q = sb!.from('testimonials').select('*').order('created_at', { ascending: false })
  if (!all) q = q.eq('published', true)
  const { data, error } = await q
  if (error) return []
  return data ?? []
}
export async function saveTestimonial(t: Partial<Testimonial>) {
  const row = { name: t.name?.trim(), school: t.school?.trim() || null, quote: t.quote?.trim(), consent: !!t.consent, published: !!t.published && !!t.consent }
  if (DEMO) {
    const d = db(); d.testimonials ??= []
    if (t.id) Object.assign(d.testimonials.find((x) => x.id === t.id) ?? {}, row)
    else d.testimonials.unshift({ ...(row as any), id: uid(), created_at: now() })
    return save()
  }
  const { error } = t.id ? await sb!.from('testimonials').update(row).eq('id', t.id) : await sb!.from('testimonials').insert(row)
  fail(error)
}
export async function deleteTestimonial(id: string) {
  if (DEMO) { const d = db(); d.testimonials = (d.testimonials ?? []).filter((x) => x.id !== id); return save() }
  const { error } = await sb!.from('testimonials').delete().eq('id', id)
  fail(error)
}

// ═══════════════════════════ admin invites (migration 0020) ═══════════════════════════
const INVITE_COLS = 'id,email,name,invited_by,created_at,sent_at,expires_at,accepted_at,accepted_by,revoked_at'
/** Who an invite link is for, so the accept page can explain what to do. Works logged out. */
export async function adminInviteInfo(token: string): Promise<AdminInviteInfo> {
  if (DEMO) {
    const d = db(), i = (d.adminInvites ?? []).find((x) => x.token === token)
    if (!i) return { status: 'invalid' }
    const by = d.profiles.find((p) => p.id === i.invited_by)?.full_name || 'A Gigotter admin'
    return { status: i.accepted_at ? 'accepted' : i.revoked_at ? 'revoked' : i.expires_at < now() ? 'expired' : 'open', email: i.email, name: i.name, invited_by: by }
  }
  const { data, error } = await sb!.rpc('admin_invite_info', { p_token: token })
  fail(error); return data as AdminInviteInfo
}
/** The signed-in person accepts the invite and becomes an admin. Their email must match the invite. */
export async function acceptAdminInvite(token: string) {
  if (DEMO) {
    const d = db(), me = must(demoUser(), 'Log in first, then open the invite link again')
    const i = must((d.adminInvites ?? []).find((x) => x.token === token), 'This invite link isn’t valid. Ask an admin to send a new one')
    if (i.accepted_at) throw new Error('This invite has already been used')
    if (i.revoked_at) throw new Error('This invite was cancelled. Ask an admin to send a new one')
    if (i.expires_at < now()) throw new Error('This invite has expired. Ask an admin to send a new one')
    if (me.email.toLowerCase() !== i.email) throw new Error(`This invite is for ${i.email}. Log in with that email to accept it`)
    must(d.profiles.find((p) => p.id === me.id), 'Profile not found').role = 'admin'
    i.accepted_at = now(); i.accepted_by = me.id; return save()
  }
  const { error } = await sb!.rpc('accept_admin_invite', { p_token: token })
  fail(error)
}
