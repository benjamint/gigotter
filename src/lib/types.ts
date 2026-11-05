export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type GigType = 'onboarding' | 'focus_group' | 'research' | 'survey' | 'content' | 'other'
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
  proof_fields: string[]
  expires_at: string
  status: ListingStatus
  accent: Accent
  emoji: string
  client_name: string | null
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
  onboarding: { label: 'Onboarding', emoji: '🤝' },
  focus_group: { label: 'Focus group', emoji: '🗣️' },
  research: { label: 'Field research', emoji: '🔎' },
  survey: { label: 'Survey', emoji: '📋' },
  content: { label: 'Content', emoji: '🎬' },
  other: { label: 'Other', emoji: '✨' },
}

export const PROOF_FIELDS: Record<string, { label: string; placeholder: string; type?: string }> = {
  business_name: { label: 'Business name', placeholder: 'Ama’s Glam Studio' },
  owner_name: { label: 'Founder / owner name', placeholder: 'Ama Mensah' },
  owner_phone: { label: 'Owner phone', placeholder: '024 123 4567', type: 'tel' },
  email: { label: 'Email', placeholder: 'ama@studio.com', type: 'email' },
  location: { label: 'Location / area', placeholder: 'East Legon, Accra' },
  instagram: { label: 'Instagram / TikTok', placeholder: '@amasglam' },
  app_signup_email: { label: 'Email they signed up with', placeholder: 'ama@studio.com', type: 'email' },
  notes: { label: 'Notes', placeholder: 'Anything we should know?' },
}

export const MOMO_PROVIDERS = ['MTN MoMo', 'Telecel Cash', 'AT Money', 'OPay', 'PalmPay', 'M-Pesa', 'Other']
export const CURRENCIES: Record<string, string> = { GHS: '₵', USD: '$', NGN: '₦', KES: 'KSh ' }
