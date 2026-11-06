import { TEMPLATES } from './forms'
import type { GigType, Listing } from './types'

const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
const base = {
  description: null, is_remote: false, total_budget: null, status: 'live' as const, client_name: 'Gigotter', cover_url: null,
  proof_fields: [] as string[], photo_hint: null,
}
const form = (t: GigType) => ({ form_schema: TEMPLATES[t].fields, photo_rule: TEMPLATES[t].photo, photo_hint: TEMPLATES[t].photoHint })

export function seedListings(): Listing[] {
  return [
    {
      ...base, id: crypto.randomUUID(), created_at: days(-1),
      title: 'Onboard 30 women-owned salons', ...form('onboarding'), type: 'onboarding', emoji: '💅', accent: 'pop',
      summary: 'Visit women-owned salons, introduce the Glowy app and help each founder create her account.',
      description: 'Glowy is a growth platform for women founders, combining mentorship, community and an AI business advisor. You’ll visit salons run by women, give a short introduction to the app and help the founder sign up using your referral code. Payment is per founder who completes sign-up.',
      requirements: ['Salon must be founded or run by a woman', 'Founder signs up with your referral code', 'Snap a pic of the shopfront or the founder with the app open'],
      location: 'Accra — East Legon, Osu, Madina', pay_model: 'per_unit', rate: 50, currency: 'GHS', unit_label: 'salon',
      units_per_student: 30, slots: 5, total_budget: 7500, expires_at: days(12), client_name: 'Glowy',
    },
    {
      ...base, id: crypto.randomUUID(), created_at: days(-2),
      title: 'Join a 90-minute focus group on money apps', ...form('focus_group'), type: 'focus_group', emoji: '🗣️', accent: 'grape',
      summary: 'Share your honest views on mobile money apps in a hosted discussion at Legon. Paid once you attend.',
      requirements: ['Uses mobile money at least weekly', 'Confirm attendance 24 hours before', 'Session: Saturday 2pm, Legon campus'],
      location: 'University of Ghana, Legon', pay_model: 'fixed', rate: 80, currency: 'GHS', unit_label: 'session',
      units_per_student: 1, slots: 10, expires_at: days(6),
    },
    {
      ...base, id: crypto.randomUUID(), created_at: days(-3),
      title: 'Price check: 20 tailors & fashion shops', ...form('research'), type: 'research', emoji: '🧵', accent: 'glow',
      summary: 'Collect prices for three common items from 20 fashion businesses. Fixed fee, about a weekend of work.',
      requirements: ['Record prices for: kaba & slit, men’s shirt, alteration', 'Mix of market + boutique', 'Be courteous — this is research, not sales'],
      location: 'Kumasi — Adum, Asafo', pay_model: 'fixed', rate: 300, currency: 'GHS', unit_label: 'shop',
      units_per_student: 20, slots: 3, expires_at: days(9),
    },
    {
      ...base, id: crypto.randomUUID(), created_at: days(-4), is_remote: true,
      title: 'Collect 50 survey responses from women in business', ...form('survey'), type: 'survey', emoji: '📋', accent: 'lime',
      summary: 'Share a four-minute survey with women who run businesses. Paid per valid response.',
      requirements: ['Respondents must run a business', 'No duplicate phone numbers', 'Fully remote'],
      location: 'Anywhere', pay_model: 'per_unit', rate: 1, currency: 'USD', unit_label: 'response',
      units_per_student: 50, slots: 8, total_budget: 400, expires_at: days(3),
    },
    {
      ...base, ...form('app_testing'), id: crypto.randomUUID(), created_at: days(-1), is_remote: true,
      title: 'Test a new savings app for 20 minutes', type: 'app_testing', emoji: '', accent: 'lime',
      summary: 'Install the beta, open an account, save ₵5 and tell us what was confusing.',
      requirements: ['Android phone', 'Finish every step in the brief', 'Screenshot the final screen'],
      location: 'Anywhere', pay_model: 'fixed', rate: 40, currency: 'GHS', unit_label: 'test',
      units_per_student: 1, slots: 25, expires_at: days(10), client_name: 'Gigotter Labs',
    },
    {
      ...base, ...form('errand'), id: crypto.randomUUID(), created_at: days(-1),
      title: 'Drop flyers at 15 pharmacies in Osu', type: 'errand', emoji: '', accent: 'glow',
      summary: 'Pick up a pack of flyers and leave a few at each pharmacy on the list.',
      requirements: ['Collect flyers from our Osu office', 'Photo of the flyers on the counter at each stop'],
      location: 'Accra — Osu', pay_model: 'per_unit', rate: 10, currency: 'GHS', unit_label: 'drop-off',
      units_per_student: 15, slots: 2, expires_at: days(5),
    },
  ]
}
