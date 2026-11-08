import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Claim, ClientRequest, KycStatus, Listing, ListingFile, Payment, QrCode, QrStat, PayoutItem, Profile, Submission, SubmissionStatus, Testimonial } from './types'
import { seedListings } from './seed'
import { photoRuleOf, schemaOf, subTitle, validateAnswers } from './forms'
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
  qrScans?: { code: string; visitor: string | null; device: string; scanned_at: string }[]
  files: Record<string, string>
  listingFiles?: ListingFile[]
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
  async signUp(email: string, password: string, full_name: string, captchaToken?: string) {
    email = email.trim().toLowerCase()
    if (DEMO) {
      const d = db()
      if (d.users.some((u) => u.email === email)) throw new Error('That email already has an account — log in instead.')
      const id = uid()
      d.users.push({ id, email, password })
      d.profiles.push({ ...blankProfile(id, email, full_name), signup_source: scanSource() })
      d.session = id
      return save()
    }
    const signup_source = scanSource() ?? undefined
    const { data, error } = await sb!.auth.signUp({ email, password, options: { data: { full_name: full_name.trim().slice(0, 120), signup_source }, emailRedirectTo: `${location.origin}/verify`, captchaToken } })
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

// ═══════════════════════════ QR codes ═══════════════════════════
const SRC_KEY = 'gigotter-src', VISITOR_KEY = 'gigotter-visitor'
/** The QR code this browser arrived through in the last 30 days, if any (credited at sign-up). */
export function scanSource(): string | null {
  try { const s = JSON.parse(localStorage.getItem(SRC_KEY) || 'null'); return s && Date.now() - s.at < 30 * 864e5 ? s.code : null } catch { return null }
}
const deviceType = () => { const ua = navigator.userAgent; return /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop' }
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
  const { error } = await sb!.from('profiles').update(safe).eq('id', u.id)
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
  'unit_label', 'units_per_student', 'total_budget', 'currency', 'slots', 'proof_fields', 'form_schema', 'photo_rule', 'photo_hint', 'expires_at', 'status', 'accent', 'emoji',
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
  const q = row.id
    ? sb!.from('listings').update(row).eq('id', row.id).select().single()
    : sb!.from('listings').insert({ ...row, created_by: u?.id }).select().single()
  const { data, error } = await q
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

// ═══════════════════════════ admin ═══════════════════════════
export const admin = {
  async profiles(): Promise<Profile[]> {
    if (DEMO) return [...db().profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const { data, error } = await sb!.from('profiles').select('*').order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async setKyc(id: string, status: KycStatus, note: string | null) {
    if (DEMO) { const p = db().profiles.find((x) => x.id === id); if (p) { if (p.kyc_status !== status && (status === 'verified' || status === 'rejected')) p.kyc_email_sent_at = now(); p.kyc_status = status; p.kyc_note = note } return save() }
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
    if (DEMO) { db().submissions.forEach((s) => ids.includes(s.id) && Object.assign(s, patch)); return save() }
    const { error } = await sb!.from('submissions').update(patch).in('id', ids)
    fail(error)
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
