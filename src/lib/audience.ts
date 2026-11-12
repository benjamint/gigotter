import type { AccountType, Audience, Eligibility, Listing, Profile } from './types'
import { GENDERS, WORK_STATUSES } from './types'

export const audienceOf = (l: Pick<Listing, 'audience'>): Audience => l.audience ?? 'students'
export const accountOf = (p?: Pick<Profile, 'account_type'> | null): AccountType => p?.account_type ?? 'student'
export const audienceAllows = (a: Audience, t: AccountType) => a === 'everyone' || (a === 'students' && t === 'student') || (a === 'general' && t === 'general')
export const audienceMessage = (a: Audience) => (a === 'students' ? 'This gig is open to students only' : a === 'general' ? 'This gig is open to non-students only' : 'You can’t join this gig')
export const isApply = (l: Pick<Listing, 'join_mode'>) => l.join_mode === 'apply'

/** Whole years since a YYYY-MM-DD date of birth. */
export function ageOf(dob?: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob + 'T12:00:00'), n = new Date()
  if (isNaN(+d)) return null
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
}

/** Plain-English summary of who a gig is looking for, e.g. "Ages 25–35 · Women · Employed". */
export function eligibilityText(e?: Eligibility | null): string {
  if (!e) return ''
  const bits: string[] = []
  if (e.min_age || e.max_age) bits.push(e.min_age && e.max_age ? `Ages ${e.min_age}–${e.max_age}` : e.min_age ? `Ages ${e.min_age}+` : `Up to age ${e.max_age}`)
  if (e.genders?.length) bits.push(e.genders.map((g) => (g === 'female' ? 'Women' : g === 'male' ? 'Men' : GENDERS[g])).join(' or '))
  if (e.work_statuses?.length) bits.push(e.work_statuses.map((w) => WORK_STATUSES[w]).join(' or '))
  return bits.join(' · ')
}

/** Reasons a profile doesn't match a gig's criteria (empty = matches or unknown). */
export function eligibilityMisses(e: Eligibility | undefined | null, p: Profile): string[] {
  if (!e) return []
  const out: string[] = [], age = ageOf(p.date_of_birth)
  if (age != null && e.min_age && age < e.min_age) out.push(`under ${e.min_age}`)
  if (age != null && e.max_age && age > e.max_age) out.push(`over ${e.max_age}`)
  if (e.genders?.length && p.gender && !e.genders.includes(p.gender)) out.push(GENDERS[p.gender].toLowerCase())
  if (e.work_statuses?.length && p.work_status && !e.work_statuses.includes(p.work_status)) out.push(WORK_STATUSES[p.work_status].toLowerCase())
  return out
}
