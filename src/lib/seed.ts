import type { Listing } from './types'

const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString()
const base = {
  description: null, is_remote: false, total_budget: null, status: 'live' as const, client_name: 'WeMove',
  proof_fields: ['business_name', 'owner_name', 'owner_phone', 'location'],
}

export function seedListings(): Listing[] {
  return [
    {
      ...base, id: crypto.randomUUID(), created_at: days(-1),
      title: 'Onboard 30 women-owned salons', type: 'onboarding', emoji: '💅', accent: 'pop',
      summary: 'Walk into salons, pitch Glowy in 2 mins, help the founder sign up. Easy money if you can talk.',
      description: 'Glowy is the growth app for women founders. Your job: find salons run by women, show them the app, and help them create their account using your referral code. We only pay for founders who actually finish sign-up.',
      requirements: ['Salon must be founded or run by a woman', 'Founder signs up with your referral code', 'Snap a pic of the shopfront or the founder with the app open'],
      location: 'Accra — East Legon, Osu, Madina', pay_model: 'per_unit', rate: 50, currency: 'GHS', unit_label: 'salon',
      units_per_student: 30, slots: 5, total_budget: 7500, expires_at: days(12), client_name: 'Glowy',
      proof_fields: ['business_name', 'owner_name', 'owner_phone', 'app_signup_email', 'location'],
    },
    {
      ...base, id: crypto.randomUUID(), created_at: days(-2),
      title: 'Founder focus group — 90 mins, snacks on us', type: 'focus_group', emoji: '🗣️', accent: 'grape',
      summary: 'Bring 4 women founders to a chill session at Legon. We pay you per founder who shows up.',
      requirements: ['Founders must own a running business', 'Confirm attendance 24hrs before', 'Session: Saturday 2pm, Legon campus'],
      location: 'University of Ghana, Legon', pay_model: 'per_unit', rate: 40, currency: 'GHS', unit_label: 'founder',
      units_per_student: 4, slots: 10, expires_at: days(6),
      proof_fields: ['owner_name', 'owner_phone', 'business_name', 'notes'],
    },
    {
      ...base, id: crypto.randomUUID(), created_at: days(-3),
      title: 'Price check: 20 tailors & fashion shops', type: 'research', emoji: '🧵', accent: 'glow',
      summary: 'Ask 20 fashion businesses what they charge for 3 common items. Fixed pay, done in a weekend.',
      requirements: ['Record prices for: kaba & slit, men’s shirt, alteration', 'Mix of market + boutique', 'Be polite, no hard sell'],
      location: 'Kumasi — Adum, Asafo', pay_model: 'fixed', rate: 300, currency: 'GHS', unit_label: 'shop',
      units_per_student: 20, slots: 3, expires_at: days(9),
      proof_fields: ['business_name', 'owner_phone', 'location', 'notes'],
    },
    {
      ...base, id: crypto.randomUUID(), created_at: days(-4), is_remote: true,
      title: 'Get 50 survey responses from women in business', type: 'survey', emoji: '📋', accent: 'lime',
      summary: 'Share our 4-min survey in your group chats. Every legit response = cash.',
      requirements: ['Respondents must run a business', 'No duplicate phone numbers', 'Remote — do it from your bed'],
      location: 'Anywhere', pay_model: 'per_unit', rate: 1, currency: 'USD', unit_label: 'response',
      units_per_student: 50, slots: 8, total_budget: 400, expires_at: days(3),
      proof_fields: ['owner_name', 'owner_phone', 'email'],
    },
  ]
}
