import type { Listing, SessionDay, Submission, SubmissionStatus } from './types'

/** Today's date in Ghana (UTC+0, no daylight saving) as YYYY-MM-DD. Check-ins open only on their own day. */
export const todayGhana = () => new Date().toISOString().slice(0, 10)

export const sessionsOf = (l: Pick<Listing, 'sessions'>): SessionDay[] => l.sessions ?? []
export const hasSessions = (l: Pick<Listing, 'sessions'>) => sessionsOf(l).length > 0
export const dayLabel = (d: SessionDay, i: number) => d.label?.trim() || `Day ${i + 1}`

/** "Sat 21 Nov" */
export function formatDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const d = new Date(date + 'T12:00:00Z')
  return isNaN(+d) ? date : d.toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' })
}
export const timeRange = (d: SessionDay) => (d.start ? `${d.start}${d.end ? `–${d.end}` : ''}` : '')

export type DayState = 'upcoming' | 'open' | 'missed' | 'redo' | SubmissionStatus

/** Where a participant stands on one day: locked, open today, done (with review status), missed, or needs redoing. */
export function dayState(day: SessionDay, index: number, subs: Submission[], today = todayGhana()): { state: DayState; sub?: Submission } {
  const mine = subs.filter((s) => s.session_day === index + 1).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const live = mine.find((s) => s.status !== 'rejected')
  if (live) return { state: live.status, sub: live }
  if (day.date > today) return { state: 'upcoming' }
  if (day.date === today) return { state: mine.length ? 'redo' : 'open', sub: mine[0] }
  return { state: 'missed', sub: mine[0] }
}
