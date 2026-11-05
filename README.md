# Gigotter

A student gig marketplace. Businesses (starting with Glowy) post work; verified students join paid gigs (onboarding businesses, focus groups, field research, surveys), submit proof of work, and get paid to mobile money. An admin portal runs verification, gigs, reviews, and payouts.

**Stack:** Vite + React + TypeScript, Tailwind, Framer Motion, Supabase (Auth, Postgres, Storage).

## Run it

```bash
npm install
npm run dev
```

With no `.env`, the app runs in **demo mode**: data is stored in your browser and the demo admin login is `admin@gigotter.com` / `gigotteradmin`.

## Photos

The design uses real photography. Drop images into `public/images/` using the names listed in [`public/images/README.md`](public/images/README.md). Until a file exists, a neutral placeholder shows in its place. Admins can also upload a cover photo for each gig.

## Connect Supabase

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Sign up through the app with your own email, then make yourself admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
4. Under Auth → URL configuration, add your site URL (e.g. `https://gigotter.com`) and `/verify` as a redirect.

Deploy on Vercel as a static Vite app. `vercel.json` already handles SPA routing.

## How it works

| Flow | What happens |
|---|---|
| Sign up | Email + password. A profile row is created by a database trigger. |
| Verify | Details → ID card → student card → live camera selfie → MoMo. Files go to a **private** `kyc` bucket. Status becomes `pending`. |
| Admin review | The admin sees selfie, ID, and student card side by side, plus a warning if the MoMo name doesn't match the ID name. Approve, or reject with a note the student sees. |
| Join a gig | `claim_listing()` RPC checks verification, expiry, and free spots in one transaction, so two students can't take the last spot. |
| Submit work | `submit_work()` RPC enforces the per-student quota and the budget cap, and **rejects duplicates** (same business phone/email on the same gig). |
| Payouts | Admin approves units → downloads a payout CSV (per student, per currency, with MoMo details) → marks them paid with a batch reference. |
| Briefs | `/brief` lets businesses request work, which lands in the admin Briefs tab. This is the start of the agency model. |

### Gig settings
Type · pay per unit **or** fixed per student · rate · unit name ("salon") · units per student · number of students needed · optional total budget cap · currency (GHS/USD/NGN/KES) · expiry · targeting requirements ("female founder") · which proof fields to collect · draft/live/paused/closed.

### Security (RLS)
- Students can only read and write their own profile, claims, and submissions.
- A trigger stops students from making themselves admin or approving their own verification, and locks identity and MoMo details once they're verified.
- KYC and proof files are in private buckets. Admins view them through 10-minute signed URLs.

## What I added to the original idea

1. **Referral code per student.** Founders enter it when they sign up for the client’s product (e.g. Glowy). This is the most reliable way to credit students and stop fake onboardings.
2. **Pay only for approved units,** with a budget cap per gig, so you can't overspend.
3. **Duplicate-business detection** across all students on a gig.
4. **MoMo name must match ID name.** This blocks payouts to someone else's wallet.
5. **Withdraw button,** so students who back out free up their spot.
6. **Business brief intake** for the agency vision.

## Roadmap / known gaps

- **Automated face match + ID check:** use [Smile ID](https://usesmileid.com) (covers Ghana Card and Nigerian NIN). Today the admin compares faces by eye.
- **Automated MoMo payouts:** Paystack Transfers or Hubtel, run from a Supabase Edge Function. Today it's CSV + mark as paid.
- **Confirm onboardings against client apps:** match the referral code against real sign-ups (e.g. Glowy’s API) and auto-approve.
- **Notifications:** WhatsApp/SMS when a student is verified, work is approved, or a payout is sent.
- **Expiry jobs:** a `pg_cron` job to auto-close expired gigs and nudge inactive claims.
- **Leaderboard / streaks** per campus for engagement.
- **Client portal:** businesses log in, fund a gig, and watch progress (the full agency model).
- **Compliance:** register with Ghana's Data Protection Commission (and NDPC in Nigeria) before collecting IDs at scale, and add a privacy policy page.
