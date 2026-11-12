import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Clock, IdCard, Lock, ShieldCheck, Smartphone, User, GraduationCap, Camera } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { FileDrop, SelfieCam } from '../components/Upload'
import { PageLoader, Spinner, useToast } from '../components/ui'
import { fileUrl, updateMyProfile, uploadFile } from '../lib/api'
import { useSession } from '../lib/session'
import { scrollToEl, useScrollIntoViewOn } from '../lib/scroll'
import { GENDERS, MOMO_PROVIDERS, WORK_STATUSES, type AccountType } from '../lib/types'
import { accountOf, ageOf } from '../lib/audience'
import PickOrOther from '../components/PickOrOther'
import { PROGRAMMES, SCHOOLS } from '../lib/schools'

const ALL_STEPS = [
  { key: 'about', label: 'About you', icon: User },
  { key: 'id', label: 'Your ID', icon: IdCard },
  { key: 'student', label: 'Student card', icon: GraduationCap },
  { key: 'selfie', label: 'Selfie', icon: Camera },
  { key: 'momo', label: 'Get paid', icon: Smartphone },
] as const
type StepKey = (typeof ALL_STEPS)[number]['key']
/** Non-students verify with a Ghana Card and selfie only: no student card step. */
const stepsFor = (t: AccountType) => ALL_STEPS.filter((s) => t === 'student' || s.key !== 'student')
const MIN_AGE: Record<AccountType, number> = { student: 16, general: 18 }

export default function Verify() {
  const { user, profile, loading, refresh } = useSession()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [redo, setRedo] = useState(false)
  const [f, setF] = useState({ full_name: '', phone: '', school: '', programme: '', study_year: '', student_id_number: '', city: '', momo_provider: 'MTN MoMo', momo_number: '', momo_name: '', date_of_birth: '', gender: '', occupation: '', work_status: '' })
  const [acct, setAcct] = useState<AccountType>('student')
  const [files, setFiles] = useState<{ id: File | null; student: File | null; selfie: File | null }>({ id: null, student: null, selfie: null })
  const [prev, setPrev] = useState<{ id?: string | null; student?: string | null; selfie?: string | null }>({})

  useEffect(() => {
    if (!profile) return
    setF((x) => ({ ...x, ...Object.fromEntries(Object.keys(x).map((k) => [k, (profile as any)[k] ?? (x as any)[k]])) }))
    setAcct(accountOf(profile))
    Promise.all([fileUrl('kyc', profile.id_card_path), fileUrl('kyc', profile.student_card_path), fileUrl('kyc', profile.selfie_path)])
      .then(([id, student, selfie]) => setPrev({ id, student, selfie }))
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const topRef = useScrollIntoViewOn<HTMLDivElement>([step])
  useEffect(() => { if (profile?.kyc_status === 'pending' || profile?.kyc_status === 'verified') scrollToEl(null) }, [profile?.kyc_status, redo])

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/signup?next=/verify" replace />
  if (!profile) return <PageLoader />

  if ((profile.kyc_status === 'pending' || profile.kyc_status === 'verified') && !redo) return <Status s={profile.kyc_status} />

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const STEPS = stepsFor(acct)
  const isStudent = acct === 'student'
  const age = ageOf(f.date_of_birth)
  const ageOk = age != null && age >= MIN_AGE[acct] && age < 100
  const checks: Record<StepKey, boolean> = {
    about: !!(f.full_name.trim() && f.phone.trim() && ageOk && f.gender && (isStudent
      ? f.school.trim() && f.programme.trim() && f.study_year && f.student_id_number.trim()
      : f.city.trim() && f.occupation.trim() && f.work_status)),
    id: !!(files.id || prev.id),
    student: !!(files.student || prev.student),
    selfie: !!(files.selfie || prev.selfie),
    momo: !!(f.momo_provider && f.momo_number.replace(/\D/g, '').length >= 9 && f.momo_name),
  }
  const valid = STEPS.map((x) => checks[x.key])
  const cur = STEPS[Math.min(step, STEPS.length - 1)].key
  const go = (d: number) => { setDir(d); setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d))) }

  const submit = async () => {
    setBusy(true)
    try {
      const patch: Record<string, any> = { ...f, account_type: acct, gender: f.gender || null, work_status: isStudent ? 'student' : f.work_status || null,
        date_of_birth: f.date_of_birth || null, occupation: f.occupation.trim() || null }
      if (!isStudent) Object.assign(patch, { school: null, programme: null, study_year: null, student_id_number: null })
      if (files.id) patch.id_card_path = await uploadFile('kyc', files.id, 'id-card')
      if (files.student) patch.student_card_path = await uploadFile('kyc', files.student, 'student-card')
      if (files.selfie) patch.selfie_path = await uploadFile('kyc', files.selfie, 'selfie')
      patch.kyc_status = 'pending'
      patch.kyc_submitted_at = new Date().toISOString()
      await updateMyProfile(patch)
      setRedo(false)
      await refresh()
    } catch (e: any) { toast(e.message, 'err') } finally { setBusy(false) }
  }

  return (
    <div ref={topRef} className="mx-auto max-w-2xl px-4 py-10">
      <div className="eyebrow">Verification</div>
      <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.04em]">Verify your <span className="em">identity</span></h1>
      <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted"><Lock className="h-4 w-4" />Your documents are encrypted and seen only by the Gigotter verification team.</p>
      {profile.kyc_status === 'rejected' && profile.kyc_note && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><b className="font-medium">Please update your details:</b> {profile.kyc_note}</div>
      )}

      {/* stepper */}
      <div className="mt-8 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <button key={s.key} onClick={() => { if (i <= step || valid.slice(0, i).every(Boolean)) { setDir(i > step ? 1 : -1); setStep(i) } }} className="group flex-1" aria-label={s.label}>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full bg-brand-500" animate={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }} transition={{ duration: 0.5 }} />
            </div>
            <div className={`mt-2.5 hidden text-xs font-medium sm:block ${i === step ? 'text-ink' : 'text-ink-muted'}`}>{s.label}</div>
          </button>
        ))}
      </div>

      <div className="card relative mt-6 overflow-hidden p-6 md:p-8">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir}
            initial={{ x: dir * 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -60, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {cur === 'about' && (
              <div>
                <StepHead n={1} of={STEPS.length} t="The basics" d="Use your name exactly as it is on your ID." />
                <div role="radiogroup" aria-label="Account type" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1">
                  {([['student', 'I’m a student'], ['general', 'I’m not a student']] as const).map(([k, l]) => (
                    <button type="button" role="radio" aria-checked={acct === k} key={k} onClick={() => setAcct(k)}
                      className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${acct === k ? 'bg-white text-ink shadow-soft' : 'text-ink-muted hover:text-ink'}`}>{l}</button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full legal name" className="sm:col-span-2"><input className="input" value={f.full_name} onChange={set('full_name')} placeholder="Abena Owusu" /></Field>
                  <Field label="Phone"><input className="input" type="tel" value={f.phone} onChange={set('phone')} placeholder="024 123 4567" /></Field>
                  <Field label="City"><input className="input" value={f.city} onChange={set('city')} placeholder="Accra" /></Field>
                  <Field label="Date of birth">
                    <input className="input" type="date" value={f.date_of_birth} onChange={set('date_of_birth')} max={new Date().toISOString().slice(0, 10)} />
                    {f.date_of_birth && !ageOk && <p className="mt-1.5 text-xs text-red-600">You need to be at least {MIN_AGE[acct]} to join Gigotter.</p>}
                  </Field>
                  <Field label="Gender"><select className="input" value={f.gender} onChange={set('gender')}><option value="">Pick one</option>{Object.entries(GENDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                  {isStudent ? (
                    <>
                      <Field label="School" className="sm:col-span-2"><PickOrOther groups={SCHOOLS} value={f.school} onChange={(v) => setF({ ...f, school: v })} placeholder="Choose your school" otherPlaceholder="Type your school’s full name" /></Field>
                      <Field label="Programme"><PickOrOther options={PROGRAMMES} value={f.programme} onChange={(v) => setF({ ...f, programme: v })} placeholder="Choose your programme" otherPlaceholder="Type your programme" /></Field>
                      <Field label="Year"><select className="input" value={f.study_year} onChange={set('study_year')}><option value="">Pick one</option>{['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Postgrad'].map((y) => <option key={y}>{y}</option>)}</select></Field>
                      <Field label="Student ID number" className="sm:col-span-2"><input className="input" value={f.student_id_number} onChange={set('student_id_number')} placeholder="10987654" /></Field>
                    </>
                  ) : (
                    <>
                      <Field label="What do you do?"><select className="input" value={f.work_status} onChange={set('work_status')}><option value="">Pick one</option>{Object.entries(WORK_STATUSES).filter(([k]) => k !== 'student').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                      <Field label="Occupation"><input className="input" maxLength={80} value={f.occupation} onChange={set('occupation')} placeholder="e.g. Graphic designer, trader, nurse" /></Field>
                    </>
                  )}
                </div>
                <p className="mt-4 text-xs text-ink-muted">Your age, gender and occupation help match you to gigs that are looking for people like you. Only the Gigotter team sees them.</p>
              </div>
            )}
            {cur === 'id' && (
              <div>
                <StepHead n={step + 1} of={STEPS.length} t={isStudent ? 'Your ID card' : 'Your Ghana Card'} d={isStudent ? 'Ghana Card, NIN slip, passport or voter ID. Front side, all four corners in frame, no glare.' : 'The front of your Ghana Card, all four corners in frame, no glare. We use it to confirm who you are.'} />
                <FileDrop label="Upload or snap your ID" hint="JPG or PNG" capture="environment" file={files.id} previewUrl={prev.id} onFile={(x) => setFiles({ ...files, id: x })} />
              </div>
            )}
            {cur === 'student' && (
              <div>
                <StepHead n={step + 1} of={STEPS.length} t="Your student card" d="Proves you’re a student right now. Make sure the name and expiry are readable." />
                <FileDrop label="Upload or snap your student ID" hint="Front side" capture="environment" file={files.student} previewUrl={prev.student} onFile={(x) => setFiles({ ...files, student: x })} />
              </div>
            )}
            {cur === 'selfie' && (
              <div>
                <StepHead n={step + 1} of={STEPS.length} t="Quick selfie" d="We compare this with your ID photo to confirm it’s really you." />
                <SelfieCam file={files.selfie} previewUrl={prev.selfie} onFile={(x) => setFiles({ ...files, selfie: x })} />
              </div>
            )}
            {cur === 'momo' && (
              <div>
                <StepHead n={step + 1} of={STEPS.length} t="Where should we send your money?" d="The name on your MoMo account must match your ID — that’s how we keep payouts safe." />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MOMO_PROVIDERS.map((p) => (
                    <button type="button" key={p} onClick={() => setF({ ...f, momo_provider: p })}
                      className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${f.momo_provider === p ? 'border-ink bg-brand-50 shadow-soft' : 'border-line bg-white hover:border-ink'}`}>{p}</button>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="MoMo number"><input className="input" type="tel" value={f.momo_number} onChange={set('momo_number')} placeholder="024 123 4567" /></Field>
                  <Field label="Name on account"><input className="input" value={f.momo_name} onChange={set('momo_name')} placeholder="Abena Owusu" /></Field>
                </div>
                {f.momo_name && f.full_name && f.momo_name.trim().toLowerCase() !== f.full_name.trim().toLowerCase() && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Heads up: this doesn’t match your ID name ({f.full_name}). That can slow down approval.</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button onClick={() => go(-1)} disabled={step === 0} className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" />Back</button>
          {step < STEPS.length - 1
            ? <button onClick={() => go(1)} disabled={!valid[step]} className="btn-primary">Next <ArrowRight className="h-4 w-4" /></button>
            : <button onClick={submit} disabled={!valid.every(Boolean) || busy} className="btn-brand">{busy ? <Spinner /> : <>Submit for review <Check className="h-4 w-4" /></>}</button>}
        </div>
      </div>
    </div>
  )

  function Status({ s }: { s: 'pending' | 'verified' }) {
    const ok = s === 'verified'
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-lg place-items-center px-4 text-center">
        <div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${ok ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-700'}`}>
            {ok ? <ShieldCheck className="h-7 w-7" strokeWidth={1.5} /> : <Clock className="h-7 w-7" strokeWidth={1.5} />}
          </motion.div>
          <h1 className="mt-8 text-3xl font-semibold tracking-tightest md:text-4xl">{ok ? 'You’re verified' : 'We’re reviewing your details'}</h1>
          <p className="mt-3 text-ink-muted">{ok ? 'You can now join any open gig.' : 'This usually takes less than 24 hours. Browse gigs in the meantime and join as soon as you’re approved.'}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/gigs" className="btn-brand">Browse gigs <ArrowRight className="h-4 w-4" /></Link>
            {!ok && <button onClick={() => setRedo(true)} className="btn-ghost">Edit my details</button>}
          </div>
        </div>
      </div>
    )
  }
}

const StepHead = ({ n, of, t, d }: { n: number; of: number; t: string; d: string }) => (
  <div className="mb-6"><div className="eyebrow">Step {n} of {of}</div><h2 className="mt-1 text-2xl font-semibold">{t}</h2><p className="mt-1 text-sm text-ink-muted">{d}</p></div>
)
const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}><label className="label">{label}</label>{children}</div>
)
