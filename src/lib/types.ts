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
  /** when the verified / needs-fixing email was last sent */
  kyc_email_sent_at?: string | null
  id_card_path: string | null
  student_card_path: string | null
  selfie_path: string | null
  momo_provider: string | null
  momo_number: string | null
  momo_name: string | null
  referral_code: string | null
  show_in_feed?: boolean
  /** 'student' (student card) or 'general' (Ghana Card + selfie only) */
  account_type?: AccountType
  date_of_birth?: string | null
  gender?: Gender | null
  occupation?: string | null
  work_status?: WorkStatus | null
  /** QR code they first arrived through (set at sign-up) */
  signup_source?: string | null
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
  /** who can take part */
  audience?: Audience
  /** open = first come; apply = people apply and you select */
  join_mode?: JoinMode
  application_schema?: FormField[]
  eligibility?: Eligibility
  /** set dates; each day opens its own check-in on that date */
  sessions?: SessionDay[]
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
  /** set when paid through Record payment (has a receipt) */
  payment_id?: string | null
  /** which session day this check-in is for (1-based) */
  session_day?: number | null
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
  phone?: string | null
  work_type?: string | null
  location?: string | null
  /** private, admin only */
  admin_note?: string | null
  /** the gig this brief was turned into */
  listing_id?: string | null
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

export type FieldType = 'text' | 'long' | 'phone' | 'email' | 'number' | 'date' | 'choice' | 'multi' | 'rating' | 'yes_no' | 'address' | 'link'
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

/** A document attached to a gig (manual, brochure, script…). */
export interface ListingFile {
  id: string
  listing_id: string
  name: string
  path: string
  size_bytes: number
  mime: string
  /** public = anyone viewing the gig; joined = only students who joined it */
  visibility: 'public' | 'joined'
  created_at: string
  /** storage bucket; gig attachments by default, 'brief-files' for files sent with a business brief */
  bucket?: 'gig-files' | 'brief-files'
}

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

export interface QrCode { code: string; label: string; target: string; archived: boolean; created_at: string }
export interface QrStat extends QrCode { scans: number; people: number; scans_7d: number; mobile: number; last_scan: string | null; signups: number; verified: number; daily: number[] }

/** A manual MoMo payment you recorded; the student gets an emailed receipt. */
export interface Payment {
  id: string; receipt_no: string; student_id: string; listing_id: string | null
  amount: number; currency: string; method: string | null; momo_number: string | null; momo_name: string | null
  reference: string | null; note: string | null; items: number; paid_at: string; email_sent_at: string | null; created_at: string
}

/** Points: a gig whose currency is POINTS pays Gigotter points instead of cash (migration 0018). */
export const POINTS = 'PTS'
export type RewardCategory = 'airtime' | 'product' | 'voucher' | 'other'
export const REWARD_CATEGORIES: Record<RewardCategory, string> = { airtime: 'Airtime & data', product: 'Products', voucher: 'Vouchers', other: 'Other' }
export interface RewardItem {
  id: string; name: string; description: string | null; image_url: string | null; vendor: string | null
  category: RewardCategory; points_cost: number; stock: number | null; active: boolean; created_at: string
}
export type RedemptionStatus = 'requested' | 'sent' | 'cancelled'
export interface Redemption {
  id: string; student_id: string; item_id: string | null; item_name: string; points: number; phone: string
  delivery_note: string | null; status: RedemptionStatus; admin_note: string | null; handled_at: string | null; created_at: string
  student?: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone' | 'school'>
}
export type PointsKind = 'earned' | 'reversed' | 'redeemed' | 'refund' | 'adjust' | 'welcome' | 'daily'
/** Points every member gets once, when they're verified (migration 0019). */
export const WELCOME_POINTS = 10
/** Points a verified member gets once a day for logging in (migration 0021). */
export const DAILY_POINTS = 1
export interface PointsEntry {
  id: string; student_id: string; delta: number; kind: PointsKind; submission_id: string | null
  redemption_id: string | null; note: string | null; created_at: string; emailed_at?: string | null
}

/** An emailed invite to become an admin (migration 0020). */
export interface AdminInvite {
  id: string; email: string; name: string | null; invited_by: string | null; created_at: string; sent_at: string
  expires_at: string; accepted_at: string | null; accepted_by: string | null; revoked_at: string | null
}
export interface AdminInviteInfo { status: 'open' | 'accepted' | 'revoked' | 'expired' | 'invalid'; email?: string; name?: string | null; invited_by?: string }

/** One day of a scheduled gig. date is YYYY-MM-DD (Ghana time); start/end are HH:MM. */
export interface SessionDay { date: string; label?: string; start?: string; end?: string }
export type AccountType = 'student' | 'general'
export type Gender = 'female' | 'male' | 'prefer_not'
export type WorkStatus = 'student' | 'employed' | 'self_employed' | 'unemployed' | 'other'
export type Audience = 'students' | 'general' | 'everyone'
export type JoinMode = 'open' | 'apply'
/** What a gig is looking for (shown to applicants, used to filter applicants). All optional. */
export interface Eligibility { min_age?: number | null; max_age?: number | null; genders?: Gender[]; work_statuses?: WorkStatus[] }
export type ApplicationStatus = 'applied' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn'
export interface Application {
  id: string; listing_id: string; applicant_id: string; answers: Record<string, string>
  status: ApplicationStatus; admin_note: string | null; created_at: string; decided_at: string | null
  applicant?: Profile; listing?: Pick<Listing, 'id' | 'title' | 'currency' | 'expires_at' | 'cover_url' | 'type'>
}
export const GENDERS: Record<Gender, string> = { female: 'Female', male: 'Male', prefer_not: 'Prefer not to say' }
export const WORK_STATUSES: Record<WorkStatus, string> = { student: 'Student', employed: 'Employed', self_employed: 'Self-employed / business owner', unemployed: 'Not working right now', other: 'Other' }
export const AUDIENCES: Record<Audience, { label: string; short: string }> = {
  students: { label: 'Students only', short: 'Students only' },
  general: { label: 'Non-students only', short: 'Non-students only' },
  everyone: { label: 'Everyone', short: 'Open to everyone' },
}

export interface PayoutItem { name: string; school: string | null; amount: number; currency: string; gig: string; units: number; paid_at: string }
export interface Testimonial { id: string; name: string; school: string | null; quote: string; consent: boolean; published: boolean; created_at: string }

/** Numbers for the admin Insights tab (site_insights() in migration 0017). */
export interface Insights {
  days: number; since: string; first_view: string | null
  totals: { views: number; visitors: number; sessions: number }; prev: { views: number; visitors: number; sessions: number }
  signups: number; prev_signups: number; returning: number
  daily: { day: string; views: number; visitors: number; signups: number }[]
  sources: { source: string; visitors: number; sessions: number; signups: number }[]
  pages: { path: string; views: number; visitors: number }[]
  devices: { device: string; visitors: number }[]
  gigs: { id: string; title: string; status: string; join_mode: string; expires_at: string; views: number; visitors: number; applied: number; joined: number }[]
  funnel: { visitors: number; signups: number; verified: number; took_part: number; completed: number; paid: number }
}
