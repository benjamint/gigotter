export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type GigType = 'onboarding' | 'focus_group' | 'research' | 'survey' | 'app_testing' | 'errand' | 'content' | 'other'
export type PayModel = 'per_unit' | 'fixed'
export type ListingStatus = 'draft' | 'live' | 'paused' | 'closed'
export type ClaimStatus = 'active' | 'completed' | 'withdrawn' | 'removed'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  school: string | null
  programme: string | null
  study_year: string | null
  student_id_number: string | null
  city: string | null
  role: 'student' | 'admin'
  kyc_status: KycStatus
  kyc_note: string | null
  kyc_submitted_at: string | null
  id_card_path: string | null
  student_card_path: string | null
  selfie_path: string | null
  momo_provider: string | null
  momo_number: string | null
  momo_name: string | null
  referral_code: string | null
  show_in_feed?: boolean
  created_at: string
}

export interface Listing {
  id: string
  title: string
  type: GigType
  summary: string | null
  description: string | null
  requirements: string[]
  location: string | null
  is_remote: boolean
  pay_model: PayModel
  rate: number
  unit_label: string
  units_per_student: number | null
  total_budget: number | null
  currency: string
  slots: number
  /** legacy: fixed field keys. New gigs use form_schema (see schemaOf in lib/forms.ts). */
  proof_fields: string[]
  form_schema: FormField[]
  photo_rule: PhotoRule
  photo_hint: string | null
  expires_at: string
  status: ListingStatus
  accent: Accent
  emoji: string
  client_name: string | null
  cover_url: string | null
  created_at: string
  // joined stats
  taken?: number
  approved_units?: number
  committed?: number
}

export type Accent = 'glow' | 'pop' | 'grape' | 'lime'

export interface Claim {
  id: string
  listing_id: string
  student_id: string
  status: ClaimStatus
  created_at: string
  listing?: Listing
}

export interface Submission {
  id: string
  claim_id: string
  listing_id: string
  student_id: string
  data: Record<string, string>
  /** first answer, used as the submission's name in lists and emails */
  summary?: string | null
  proof_path: string | null
  status: SubmissionStatus
  amount: number | null
  admin_note: string | null
  reviewed_at: string | null
  paid_at: string | null
  payout_ref: string | null
  created_at: string
  listing?: Pick<Listing, 'title' | 'currency' | 'unit_label'>
  student?: Pick<Profile, 'full_name' | 'momo_number' | 'momo_provider' | 'momo_name'>
}

export interface ClientRequest {
  id: string
  name: string
  email: string
  company: string | null
  need: string
  budget: string | null
  deadline: string | null
  status: string
  created_at: string
}

export const GIG_TYPES: Record<GigType, { label: string; emoji: string }> = {
  onboarding: { label: 'Onboarding', emoji: '' },
  focus_group: { label: 'Focus group', emoji: '' },
  research: { label: 'Field research', emoji: '' },
  survey: { label: 'Survey', emoji: '' },
  app_testing: { label: 'App testing', emoji: '' },
  errand: { label: 'Errand', emoji: '' },
  content: { label: 'Content', emoji: '' },
  other: { label: 'Other', emoji: '' },
}

export type FieldType = 'text' | 'long' | 'phone' | 'email' | 'number' | 'date' | 'choice' | 'rating' | 'yes_no' | 'address' | 'link'
export interface FormField {
  key: string
  label: string
  type: FieldType
  required: boolean
  hint?: string
  placeholder?: string
  /** for 'choice' */
  options?: string[]
  /** the same answer can't be submitted twice on one gig (e.g. a phone number) */
  unique?: boolean
}
export type PhotoRule = 'required' | 'optional' | 'none'

export interface ProofField { label: string; placeholder: string; type?: string; hint?: string; multiline?: boolean; optional?: boolean }
export const PROOF_FIELDS: Record<string, ProofField> = {
  business_name: { label: 'Business name', placeholder: 'Ama’s Glam Studio', hint: 'As it appears on the signboard.' },
  owner_name: { label: 'Founder / owner name', placeholder: 'Ama Mensah', hint: 'Full name of the person who runs it.' },
  owner_phone: { label: 'Owner phone', placeholder: '024 123 4567', type: 'tel', hint: 'A number we can call to confirm.' },
  email: { label: 'Email', placeholder: 'ama@studio.com', type: 'email' },
  location: {
    label: 'Full address', multiline: true,
    placeholder: 'Shop 12, Oxford Street, Osu, Accra — opposite Papaye',
    hint: 'Building or shop number, street, area and city, plus a nearby landmark. Tap “Use my current location” while you’re there so we can find it on a map.',
  },
  digital_address: { label: 'Ghana Post digital address', placeholder: 'GA-123-4567', hint: 'From the GhanaPostGPS app or the sign on the building.', optional: true },
  instagram: { label: 'Instagram / TikTok', placeholder: '@amasglam', optional: true },
  app_signup_email: { label: 'Email they signed up with', placeholder: 'ama@studio.com', type: 'email', hint: 'The email they used to create their account, so we can match it.' },
  notes: { label: 'Notes', placeholder: 'Anything we should know?', multiline: true, optional: true },
}
/** Extra values captured automatically (not chosen by admins). */
export const AUTO_FIELDS: Record<string, string> = { gps: 'GPS location', gps_accuracy: 'GPS accuracy (m)' }
export const fieldLabel = (k: string) => PROOF_FIELDS[k]?.label ?? AUTO_FIELDS[k] ?? k.replace(/_/g, ' ')

export const MOMO_PROVIDERS = ['MTN MoMo', 'Telecel Cash', 'AT Money', 'OPay', 'PalmPay', 'M-Pesa', 'Other']
export const CURRENCIES: Record<string, string> = { GHS: '₵', USD: '$', NGN: '₦', KES: 'KSh ' }

export interface PayoutItem { name: string; school: string | null; amount: number; currency: string; gig: string; units: number; paid_at: string }
export interface Testimonial { id: string; name: string; school: string | null; quote: string; consent: boolean; published: boolean; created_at: string }
