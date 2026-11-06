# Security

Audit date: 5 November 2026. Every database fix below was tested against a local PostgreSQL copy of the schema, by acting as a student, an unverified student, a logged-out visitor and an admin.

## Findings and fixes

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | **High** | Students could edit their own claim row directly, moving it onto a full or closed gig and skipping verification and spot limits. | Removed the student UPDATE policy. Withdrawing now goes through `withdraw_claim()`. (`0003`) |
| 2 | **High** | Students could overwrite their uploaded ID or selfie file after it had been approved. | Removed the storage UPDATE policy. Uploads never overwrite (`upsert: false`). (`0003`) |
| 3 | **High** | Vulnerable dependencies: React Router open redirect, PostCSS, Supabase auth-js. | Upgraded to patched versions. |
| 4 | Medium | Open redirect through `?next=` on the log-in and sign-up pages. | `safeNext()` only allows paths on this site. |
| 5 | Medium | Any file type and size could be uploaded (HTML/SVG, huge files). | Buckets accept images only (5 MB, or 8 MB for covers), and the browser checks before uploading. |
| 6 | Medium | `submit_work` accepted any JSON fields and sizes, with no rate limit, so pending junk could drain a gig's budget. | Only the gig's own proof fields are kept (300 characters each). Limits of 1 per 15 seconds and 60 per hour. Proof photo must be the student's own. |
| 7 | Medium | The business brief form allowed unlimited anonymous inserts. | Length checks, email format, 3 per email per hour, 30 per hour overall, a hidden bot trap field and a browser cooldown. |
| 8 | Medium | Password reset and confirmation emails could be triggered on every click. | 60-second cooldown that survives a refresh. Neutral wording, so it doesn't reveal whether an account exists. Supabase rate limits still apply. |
| 9 | Low | No brute-force slowdown in the browser. | Increasing wait after 3 failed log-ins (5 seconds up to 5 minutes). Optional Turnstile CAPTCHA. |
| 10 | Low | No security headers. | CSP, frame blocking, nosniff, strict referrer, camera limited to this site, HSTS (`vercel.json`). |
| 11 | Low | A production build without Supabase settings fell back to demo mode, which has a public admin password. | Demo only runs in development or with `VITE_DEMO=true`. Otherwise a maintenance page shows. |
| 12 | Low | The payout CSV could carry spreadsheet formulas (CSV injection). | Cells that start with `= + - @` are neutralised. |
| 13 | Low | Students could change their profile email, and the database had no length limits. | Email is locked and synced from the login email. Length limits are enforced in the database. |
| 14 | Low | Logged-out visitors could call the app's database functions, and trigger helpers were callable. | Execute permission is granted to signed-in users only. Trigger helpers are revoked. |

Remaining, accepted: the Vite and esbuild advisories affect only the local development server, not the live site.

## Supabase dashboard checklist

- [ ] Run `supabase/migrations/0003_security_hardening.sql`.
- [ ] **Authentication → Sign In / Providers → Email:** Confirm email **on**, Secure email change **on**, Secure password change **on**, minimum password length **8**, require letters and digits.
- [ ] **Authentication → Sign In / Providers:** turn off providers you don't use (Phone, Anonymous sign-ins).
- [ ] **Authentication → URL Configuration:** only `https://gigotter.com/**` (and the Vercel preview URL if needed) in Redirect URLs.
- [ ] **Authentication → Rate Limits:** keep the defaults. Raise "emails per hour" only as far as you need once Resend is connected.
- [ ] **Authentication → Attack Protection:** turn on CAPTCHA (Turnstile) **after** adding `VITE_TURNSTILE_SITE_KEY` in Vercel and redeploying. Turn on leaked-password protection if your plan includes it.
- [ ] **Admin account:** use a long, unique password. Two-factor sign-in for admins is a planned improvement.
- [ ] Never put the `service_role` key in the website or in Vercel's `VITE_` variables.
