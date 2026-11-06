import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Claim, ClientRequest, KycStatus, Listing, Profile, Submission, SubmissionStatus } from './types'
import { seedListings } from './seed'
import { checkImage, safeExt } from './security'

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
  files: Record<string, string>
}
const KEY_DB = 'gigotter-demo-v1'
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
      d.profiles.push(blankProfile(id, email, full_name))
      d.session = id
      return save()
    }
    const { data, error } = await sb!.auth.signUp({ email, password, options: { data: { full_name: full_name.trim().slice(0, 120) }, emailRedirectTo: `${location.origin}/verify`, captchaToken } })
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
export async function saveListing(l: Partial<Listing>): Promise<Listing> {
  const { taken, approved_units, committed, ...row } = l
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
    const key = (data.owner_phone || data.phone || data.email || '').toLowerCase().replace(/[^a-z0-9@]/g, '')
    if (key && d.submissions.some((s) => s.listing_id === l.id && s.status !== 'rejected' &&
      (s.data.owner_phone || s.data.phone || s.data.email || '').toLowerCase().replace(/[^a-z0-9@]/g, '') === key)) {
      throw new Error('This business has already been submitted (same contact)')
    }
    const s: Submission = {
      id: uid(), claim_id: c.id, listing_id: l.id, student_id: u.id, data, proof_path: proofPath, status: 'pending',
      amount, admin_note: null, reviewed_at: null, paid_at: null, payout_ref: null, created_at: now(),
    }
    d.submissions.push(s); save(); return s
  }
  const { data: s, error } = await sb!.rpc('submit_work', { p_claim: claimId, p_data: data, p_proof: proofPath })
  fail(error)
  return s
}

// ═══════════════════════════ client briefs ═══════════════════════════
export async function createRequest(r: Omit<ClientRequest, 'id' | 'status' | 'created_at'>) {
  if (DEMO) { db().requests.push({ ...r, id: uid(), status: 'new', created_at: now() }); return save() }
  const { error } = await sb!.from('client_requests').insert(r)
  fail(error)
}

// ═══════════════════════════ admin ═══════════════════════════
export const admin = {
  async profiles(): Promise<Profile[]> {
    if (DEMO) return [...db().profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))
    const { data, error } = await sb!.from('profiles').select('*').order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async setKyc(id: string, status: KycStatus, note: string | null) {
    if (DEMO) { const p = db().profiles.find((x) => x.id === id); if (p) { p.kyc_status = status; p.kyc_note = note } return save() }
    const { error } = await sb!.from('profiles').update({ kyc_status: status, kyc_note: note }).eq('id', id)
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
    if (DEMO) { db().submissions.forEach((s) => ids.includes(s.id) && Object.assign(s, patch)); return save() }
    const { error } = await sb!.from('submissions').update(patch).in('id', ids)
    fail(error)
  },
  async requests(): Promise<ClientRequest[]> {
    if (DEMO) return [...db().requests].reverse()
    const { data, error } = await sb!.from('client_requests').select('*').order('created_at', { ascending: false })
    fail(error); return data ?? []
  },
  async setRequestStatus(id: string, status: string) {
    if (DEMO) { const r = db().requests.find((x) => x.id === id); if (r) r.status = status; return save() }
    const { error } = await sb!.from('client_requests').update({ status }).eq('id', id)
    fail(error)
  },
}

export function resetDemo() { try { localStorage.removeItem(KEY_DB) } catch { /* */ } memo = null; location.href = '/' }
