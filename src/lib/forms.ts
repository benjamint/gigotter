/**
 * Per-gig submission forms. Each gig carries its own list of questions (form_schema) and a photo rule,
 * so onboarding, focus groups, app tests, errands, surveys and research each ask for the right things.
 */
import { PROOF_FIELDS, type FieldType, type FormField, type GigType, type Listing, type PhotoRule, type Submission } from './types'

export const FIELD_TYPES: Record<FieldType, { label: string; hint: string }> = {
  text: { label: 'Short answer', hint: 'A name, a few words' },
  long: { label: 'Paragraph', hint: 'Feedback, notes, a description' },
  phone: { label: 'Phone number', hint: 'Checked for a valid number' },
  email: { label: 'Email', hint: 'Checked for a valid email' },
  number: { label: 'Number', hint: 'A price, a count, an age' },
  date: { label: 'Date', hint: 'When something happened' },
  choice: { label: 'Multiple choice', hint: 'Pick one from a list' },
  multi: { label: 'Tick all that apply', hint: 'Pick any number from a list' },
  rating: { label: 'Rating 1–5', hint: 'Stars out of five' },
  yes_no: { label: 'Yes / No', hint: 'A quick confirmation' },
  address: { label: 'Address + GPS pin', hint: 'Full address, with a pin from their phone' },
  link: { label: 'Link', hint: 'A URL, e.g. a post or a listing' },
}

const f = (label: string, type: FieldType, extra: Partial<FormField> = {}): FormField =>
  ({ key: keyFor(label), label, type, required: true, ...extra })

/** Turn a question label into a stable, safe key. */
export function keyFor(label: string, taken: string[] = []): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'question'
  let k = base, n = 2
  while (taken.includes(k)) k = `${base}_${n++}`
  return k
}

export interface GigTemplate {
  unit: string
  pay: 'per_unit' | 'fixed'
  photo: PhotoRule
  photoHint: string
  fields: FormField[]
  requirements: string[]
  blurb: string
  /** gigs where people apply and are selected */
  apply?: FormField[]
}

export const TEMPLATES: Record<GigType, GigTemplate> = {
  onboarding: {
    unit: 'business', pay: 'per_unit', photo: 'required', photoHint: 'The shopfront, or the owner with the app open',
    blurb: 'Students sign up businesses or customers for a product. One submission per sign-up.',
    requirements: ['The business signs up with your referral code'],
    fields: [
      f('Business name', 'text', { placeholder: 'Ama’s Glam Studio', hint: 'As it appears on the signboard.' }),
      f('Owner name', 'text', { placeholder: 'Ama Mensah' }),
      f('Owner phone', 'phone', { placeholder: '024 123 4567', hint: 'A number we can call to confirm.', unique: true }),
      f('Email they signed up with', 'email', { required: false, placeholder: 'ama@studio.com' }),
      f('Full address', 'address', { placeholder: 'Shop 12, Oxford Street, Osu — opposite Papaye', hint: 'Building, street, area and city, plus a landmark. Use your GPS while you’re there.' }),
    ],
  },
  focus_group: {
    unit: 'session', pay: 'fixed', photo: 'optional', photoHint: 'A photo at the venue or a screenshot of the call',
    blurb: 'People apply, you pick who fits, and those selected take part and confirm they attended.',
    apply: [
      f('Why would you like to take part?', 'long', { placeholder: 'A sentence or two' }),
      f('Which days and times can you attend?', 'text', { placeholder: 'e.g. Saturday morning' }),
      f('Have you taken part in a focus group before?', 'yes_no'),
    ],
    requirements: ['Arrive 10 minutes early', 'Stay for the full session'],
    fields: [
      f('Date you attended', 'date'),
      f('Did you stay for the full session?', 'yes_no'),
      f('Your main takeaway', 'long', { required: false, placeholder: 'One or two sentences' }),
    ],
  },
  research: {
    unit: 'visit', pay: 'per_unit', photo: 'required', photoHint: 'The shop, shelf or price tag',
    blurb: 'Students visit places to collect prices, photos and observations.',
    requirements: ['Be courteous — this is research, not sales'],
    fields: [
      f('Place name', 'text', { placeholder: 'Makola stall 14' }),
      f('Full address', 'address'),
      f('What you found', 'long', { placeholder: 'Prices, stock, anything notable' }),
    ],
  },
  survey: {
    unit: 'response', pay: 'per_unit', photo: 'none', photoHint: '',
    blurb: 'Students collect answers from people who match the brief.',
    requirements: ['Respondents must match the brief', 'No duplicate phone numbers'],
    fields: [
      f('Respondent name', 'text'),
      f('Respondent phone', 'phone', { unique: true }),
      f('Age range', 'choice', { options: ['18–24', '25–34', '35–44', '45+'] }),
      f('City or town', 'text'),
    ],
  },
  app_testing: {
    unit: 'test', pay: 'fixed', photo: 'required', photoHint: 'A screenshot of the app showing you finished the task',
    blurb: 'Students try an app or website and report what worked and what didn’t.',
    requirements: ['Use your own phone', 'Complete every step in the brief'],
    fields: [
      f('Email or username you tested with', 'text', { unique: true }),
      f('Phone model', 'text', { placeholder: 'Samsung A14, iPhone 11…' }),
      f('Did you complete the task?', 'yes_no'),
      f('Overall rating', 'rating'),
      f('What worked well?', 'long'),
      f('What was confusing or broken?', 'long'),
    ],
  },
  errand: {
    unit: 'errand', pay: 'per_unit', photo: 'required', photoHint: 'Proof it was done — the delivery, receipt or drop-off',
    blurb: 'Students run a task in person: deliveries, pick-ups, drop-offs, checks.',
    requirements: ['Keep any receipts'],
    fields: [
      f('Who received it / who you met', 'text', { required: false }),
      f('Their phone', 'phone', { required: false }),
      f('Address', 'address'),
      f('Notes', 'long', { required: false, placeholder: 'Anything we should know?' }),
    ],
  },
  content: {
    unit: 'post', pay: 'per_unit', photo: 'optional', photoHint: 'A screenshot of the post',
    blurb: 'Students create or share content on social media.',
    requirements: ['Keep the post up for at least 7 days'],
    fields: [
      f('Platform', 'choice', { options: ['Instagram', 'TikTok', 'X', 'Facebook', 'WhatsApp status', 'Other'] }),
      f('Link to the post', 'link', { unique: true }),
    ],
  },
  other: {
    unit: 'task', pay: 'per_unit', photo: 'optional', photoHint: 'Anything that shows the work was done',
    blurb: 'Start from a blank form and add your own questions.',
    requirements: [],
    fields: [f('What did you do?', 'long')],
  },
}

/** Old gigs only have proof_fields (keys into a fixed library). Convert them so everything uses one path. */
const LEGACY: Record<string, FieldType> = { owner_phone: 'phone', email: 'email', app_signup_email: 'email', location: 'address', notes: 'long' }
export function schemaOf(l: Pick<Listing, 'form_schema' | 'proof_fields'>): FormField[] {
  if (l.form_schema?.length) return l.form_schema
  return (l.proof_fields ?? []).map((k) => ({
    key: k, label: PROOF_FIELDS[k]?.label ?? k.replace(/_/g, ' '), type: LEGACY[k] ?? 'text',
    required: !PROOF_FIELDS[k]?.optional, hint: PROOF_FIELDS[k]?.hint, placeholder: PROOF_FIELDS[k]?.placeholder, unique: k === 'owner_phone',
  }))
}
export const photoRuleOf = (l: Pick<Listing, 'photo_rule'>): PhotoRule => l.photo_rule ?? 'required'

const AUTO = ['gps', 'gps_accuracy']
/** A short name for a submission: the stored summary, else the first answer. */
export function subTitle(s: Pick<Submission, 'data' | 'summary'>, schema?: FormField[], fallback = 'Submission'): string {
  if (s.summary) return s.summary
  for (const fld of schema ?? []) { const v = s.data[fld.key]; if (v && !['long', 'address', 'date', 'yes_no', 'rating'].includes(fld.type)) return v }
  const first = s.data.business_name || s.data.owner_name || Object.entries(s.data).find(([k, v]) => v && !AUTO.includes(k))?.[1]
  return first ? String(first).slice(0, 80) : fallback
}

/** Readable value for display (ratings as stars). */
export function displayValue(fld: FormField | undefined, v: string | undefined): string {
  if (!v) return ''
  if (fld?.type === 'rating') return `${'★'.repeat(Number(v))}${'☆'.repeat(5 - Number(v))} (${v}/5)`
  if (fld?.type === 'date') { const d = new Date(v + 'T12:00:00'); return isNaN(+d) ? v : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
  return v
}

export const labelFor = (schema: FormField[], k: string) =>
  schema.find((x) => x.key === k)?.label ?? ({ gps: 'GPS location', gps_accuracy: 'GPS accuracy (m)' } as Record<string, string>)[k] ?? PROOF_FIELDS[k]?.label ?? k.replace(/_/g, ' ')

/** Client-side check that mirrors the server. Returns an error message or null. */
/** A “tick all that apply” answer is stored as “A, B, C”. */
export const splitMulti = (v: string) => v.split(',').map((o) => o.trim()).filter(Boolean)

export function validateAnswers(schema: FormField[], data: Record<string, string>): string | null {
  for (const fld of schema) {
    const v = (data[fld.key] ?? '').trim()
    if (!v) { if (fld.required) return `Please answer: ${fld.label}`; continue }
    if (fld.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return `${fld.label} doesn’t look like an email`
    if (fld.type === 'phone' && !/^\d{7,15}$/.test(v.replace(/\D/g, ''))) return `${fld.label} doesn’t look like a phone number`
    if (fld.type === 'number' && !/^-?\d+(\.\d+)?$/.test(v)) return `${fld.label} should be a number`
    if (fld.type === 'multi' && splitMulti(v).some((o) => !(fld.options ?? []).includes(o))) return `Pick from the options for: ${fld.label}`
    if (fld.type === 'link' && !/^https?:\/\/\S+\.\S+/i.test(v)) return `${fld.label} should be a full link starting with https://`
  }
  return null
}
