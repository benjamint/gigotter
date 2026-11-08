import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

const UPDATED = '5 November 2026'
const CONTACT = 'hello@gigotter.com'

type Section = { id: string; title: string; body: ReactNode }

function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: ReactNode; sections: Section[] }) {
  return (
    <div className="container-x py-14">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tightest md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-ink-muted">Last updated {UPDATED}</p>
        <div className="mt-6 text-lg leading-relaxed text-ink-soft">{intro}</div>
      </motion.div>
      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-24 space-y-2 text-sm">
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="block text-ink-muted hover:text-ink">{i + 1}. {s.title}</a>
            ))}
          </div>
        </nav>
        <div className="max-w-3xl space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight">{i + 1}. {s.title}</h2>
              <div className="legal mt-4 space-y-4 leading-relaxed text-ink-soft">{s.body}</div>
            </section>
          ))}
          <p className="border-t border-line pt-8 text-sm text-ink-muted">
            Questions? Email <a href={`mailto:${CONTACT}`} className="font-medium text-ink underline underline-offset-2">{CONTACT}</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

const UL = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc space-y-2 pl-5 marker:text-ink-muted">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
)

// ───────────────────────────── PRIVACY ─────────────────────────────
export function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={<>This policy explains what personal information Gigotter collects, why we collect it, who we share it with and the choices you have. It applies to everyone who uses gigotter.com — students, businesses that send us briefs, and people students speak to while doing a gig.</>}
      sections={[
        {
          id: 'who', title: 'Who we are',
          body: <p>Gigotter (“we”, “us”) runs gigotter.com, a platform that connects verified students with businesses that need work done on the ground. We are based in Accra, Ghana, and we are the data controller for the information described here. We handle personal data in line with Ghana’s Data Protection Act, 2012 (Act 843) and, where it applies, Nigeria’s Data Protection Act, 2023.</p>,
        },
        {
          id: 'collect', title: 'Information we collect',
          body: <>
            <p><b className="font-medium text-ink">When you create an account:</b> your name, email address and password (stored only in encrypted form).</p>
            <p><b className="font-medium text-ink">When you get verified:</b></p>
            <UL items={[
              'phone number, city, school, programme, year of study and student ID number;',
              'a photo of a government ID (for example a Ghana Card, NIN slip, passport or voter ID);',
              'a photo of your student ID card;',
              'a selfie, which we compare with your ID photo to confirm it is really you;',
              'your mobile money provider, number and the name on that account, so we can pay you.',
            ]} />
            <p><b className="font-medium text-ink">When you do gigs:</b> the gigs you join, the work you submit (such as a business name, the owner’s name and phone number, location and a photo), and your earnings and payout history.</p>
            <p><b className="font-medium text-ink">When a business sends us a brief:</b> the contact name, email, company and details of the request.</p>
            <p><b className="font-medium text-ink">Automatically:</b> basic technical information needed to run the site, such as your browser type and pages loaded, and an encrypted session so you stay logged in. If you open Gigotter by scanning one of our QR codes, we count the scan anonymously (the time, whether it was a phone or computer, and a random ID stored in your browser so the same device isn’t counted twice). We keep a note of which code you used for 30 days so we know which posters and flyers work; if you sign up in that time, it’s recorded on your account. We never record your IP address or link scans to anyone who hasn’t signed up. We do not use advertising trackers.</p>
          </>,
        },
        {
          id: 'why', title: 'Why we use it',
          body: <UL items={[
            <><b className="font-medium text-ink">To run your account</b> and let you join gigs, submit work and see your earnings.</>,
            <><b className="font-medium text-ink">To verify you are a real, current student</b> and to prevent fraud, duplicate accounts and payouts to the wrong person.</>,
            <><b className="font-medium text-ink">To pay you</b> to the mobile money account you give us, and to keep records of those payments.</>,
            <><b className="font-medium text-ink">To check submitted work</b> — for example, confirming a business really signed up — before approving payment.</>,
            <><b className="font-medium text-ink">To deliver work to our clients:</b> businesses receive the results of the gigs they pay for (see section 4).</>,
            <><b className="font-medium text-ink">To show recent payouts</b> in the public “Recently paid” feed — only your first name, last initial, school, the amount and the gig, never your phone number. You can switch this off on your dashboard at any time.</>,
            <><b className="font-medium text-ink">To contact you</b> about your account, gigs, verification and payouts.</>,
            <><b className="font-medium text-ink">To meet legal obligations</b>, such as keeping financial records or responding to lawful requests.</>,
          ]} />,
        },
        {
          id: 'share', title: 'Who we share it with',
          body: <>
            <p>We do not sell your personal information. We share it only with:</p>
            <UL items={[
              <><b className="font-medium text-ink">Our service providers</b>, who host and run the platform on our behalf: Supabase (database, login and file storage) and Vercel (website hosting). They may store data on servers outside Ghana, including in the European Union, United Kingdom or United States, under contracts that require them to protect it.</>,
              <><b className="font-medium text-ink">Mobile money and payment providers</b>, to send your payouts.</>,
              <><b className="font-medium text-ink">Clients who commission a gig</b>, who receive the work you submit for that gig (for example, the list of businesses you onboarded). They may also see your first name and school, but never your ID documents, selfie or mobile money details.</>,
              <><b className="font-medium text-ink">Authorities</b>, where the law requires it or to protect people from fraud or harm.</>,
            ]} />
            <p>Your ID documents and selfie are stored in private storage and are seen only by the Gigotter verification team.</p>
          </>,
        },
        {
          id: 'third', title: 'People students speak to during gigs',
          body: <>
            <p>Some gigs involve students collecting details from business owners or members of the public — for example a salon owner’s name and phone number. If your details were collected this way:</p>
            <UL items={[
              'the student should have told you who they were collecting for and asked your permission;',
              'we use your details only for the purpose of that gig, such as confirming your sign-up or contacting you about the client’s product, and share them only with that client;',
              <>you can ask us at any time to remove your details by emailing <a href={`mailto:${CONTACT}`} className="font-medium text-ink underline underline-offset-2">{CONTACT}</a>.</>,
            ]} />
          </>,
        },
        {
          id: 'keep', title: 'How long we keep it',
          body: <UL items={[
            'Account and profile information: while your account is open, and for up to 12 months after you close it.',
            'ID photos, student card photos and selfies: while your account is open, and deleted within 90 days of account closure — or sooner if you ask and we no longer need them to investigate fraud.',
            'Payment and earnings records: up to 6 years, as required for financial and tax records.',
            'Submitted gig work: for as long as the client needs it for the gig, and no longer than 24 months.',
            'Business briefs: up to 24 months after our last contact.',
          ]} />,
        },
        {
          id: 'security', title: 'How we protect it',
          body: <p>Data is encrypted in transit and at rest. Access is restricted so that each student can only see their own information, and identity documents are kept in private storage that only authorised Gigotter staff can open. No system is perfectly secure, but we take reasonable steps to protect your information and will tell you and the relevant authority if a breach puts your rights at risk.</p>,
        },
        {
          id: 'rights', title: 'Your rights',
          body: <>
            <p>You can ask us to:</p>
            <UL items={[
              'give you a copy of the personal information we hold about you;',
              'correct information that is wrong or out of date;',
              'delete your information, where we don’t need to keep it for legal reasons;',
              'stop or limit how we use it, or object to a particular use;',
              'withdraw your consent where we rely on it (this won’t affect what we did before).',
            ]} />
            <p>Email <a href={`mailto:${CONTACT}`} className="font-medium text-ink underline underline-offset-2">{CONTACT}</a> from the address linked to your account. We will reply within 30 days. If you are unhappy with how we handle your data, you can complain to Ghana’s Data Protection Commission (or, in Nigeria, the Nigeria Data Protection Commission).</p>
          </>,
        },
        {
          id: 'age', title: 'Age',
          body: <p>Gigotter is for students aged 18 and over. We do not knowingly collect information from anyone under 18; if we learn we have, we will delete it.</p>,
        },
        {
          id: 'changes', title: 'Changes to this policy',
          body: <p>We may update this policy as Gigotter grows. If the changes are significant we will tell you by email or on the site before they take effect. The date at the top shows when it was last updated.</p>,
        },
      ]}
    />
  )
}

// ───────────────────────────── TERMS ─────────────────────────────
export function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      intro={<>These terms are the agreement between you and Gigotter when you use gigotter.com. Please read them — by creating an account or sending us a brief, you agree to them. Our <Link to="/privacy" className="font-medium text-ink underline underline-offset-2">Privacy Policy</Link> explains how we handle your information.</>}
      sections={[
        {
          id: 'service', title: 'What Gigotter is',
          body: <p>Gigotter connects verified students with businesses (“clients”) that need tasks done, such as onboarding customers, recruiting for focus groups, field research and surveys. We publish paid gigs, check the work students submit and pay students for approved work.</p>,
        },
        {
          id: 'eligibility', title: 'Who can join',
          body: <UL items={[
            'You must be at least 18 years old and currently enrolled at a university, polytechnic, college or similar institution.',
            'You may only have one account, and it must be in your own legal name.',
            'You must complete verification with genuine, current documents. We may approve or decline any application, and may ask you to verify again.',
          ]} />,
        },
        {
          id: 'account', title: 'Your account',
          body: <UL items={[
            'Keep your login details private. You are responsible for activity on your account.',
            'Keep your information up to date, including your mobile money details.',
            'The mobile money account you give us must be in your own name. We do not pay to third-party accounts.',
          ]} />,
        },
        {
          id: 'gigs', title: 'Joining and doing gigs',
          body: <>
            <UL items={[
              'Each gig sets out the task, requirements, the proof you must submit, the pay, the number of spots and a closing date. Joining a gig reserves a spot; if you can’t do it, withdraw so another student can take it.',
              'Do the work honestly and as described. Each submission must be genuine — a real person or business that meets the gig’s requirements — and must come from your own work.',
              'When you speak to business owners or members of the public, be polite, tell them you are working with Gigotter on behalf of the client, and only collect their details with their permission. Don’t pressure anyone or make promises the client hasn’t authorised.',
              'You represent Gigotter and our clients while doing gigs. Don’t misrepresent who you are, what the product does, or what people will receive.',
            ]} />
          </>,
        },
        {
          id: 'pay', title: 'Getting paid',
          body: <UL items={[
            'You are paid only for work we approve. We review submissions, usually within 24 hours, and may reject work that is incomplete, duplicated, doesn’t meet the requirements or can’t be confirmed.',
            'Approved earnings are sent to your mobile money account in our regular payout batches. Gigotter does not charge students any fees. Your mobile money provider may charge its own fees.',
            'Each gig has a total budget. Once it is used up, the gig closes and no further submissions are paid.',
            'If we find that paid work was fake or fraudulent, we may reverse or withhold those earnings and recover amounts already paid.',
            'You are an independent contractor, not an employee of Gigotter or our clients. You are responsible for any tax due on your earnings.',
          ]} />,
        },
        {
          id: 'not-allowed', title: 'What’s not allowed',
          body: <UL items={[
            'Submitting fake, made-up, copied or duplicate work, or work done by someone else.',
            'Using fake or someone else’s documents, or creating more than one account.',
            'Collecting personal information without permission, or using information from a gig for anything other than that gig.',
            'Harassing, misleading or pressuring anyone, or behaving in a way that harms Gigotter or a client’s reputation.',
            'Trying to get around the platform’s security or access other people’s data.',
          ]} />,
        },
        {
          id: 'clients', title: 'For businesses',
          body: <p>Briefs sent through the “For businesses” page are requests, not contracts. If we take on your project, we will agree the scope, price and timing with you separately. You must have the right to ask for the work you request, and you must use any personal information you receive from a gig lawfully and only for the agreed purpose.</p>,
        },
        {
          id: 'ending', title: 'Suspending or closing accounts',
          body: <p>You can close your account at any time by emailing us; we will pay any approved earnings owed to you. We may suspend or close an account that breaks these terms, provides false information or puts others at risk. Where we can, we will tell you why.</p>,
        },
        {
          id: 'liability', title: 'Our responsibility',
          body: <>
            <p>We work hard to keep Gigotter running smoothly, but the platform is provided “as is”. We don’t guarantee that gigs will always be available or that the site will be uninterrupted or error-free.</p>
            <p>To the extent the law allows, Gigotter is not responsible for indirect losses, or for anything that happens between you and the people you meet while doing a gig. Our total responsibility to you for any claim is limited to the approved earnings owed to you. Nothing in these terms limits rights you have under Ghanaian consumer law that cannot be excluded.</p>
          </>,
        },
        {
          id: 'changes', title: 'Changes and governing law',
          body: <p>We may update these terms; if the changes are significant we will tell you before they take effect, and continuing to use Gigotter means you accept them. These terms are governed by the laws of the Republic of Ghana, and disputes will be handled by the courts of Ghana. We would always rather sort things out with you directly first — just email us.</p>,
        },
      ]}
    />
  )
}
