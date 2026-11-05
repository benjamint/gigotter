# Gigotter auth email templates

Branded versions of Supabase's sign-in emails. Paste each into **Supabase → Authentication → Emails → Templates**.

| Supabase template | Subject | File |
|---|---|---|
| Confirm signup | Confirm your Gigotter account | `confirm-signup.html` |
| Reset password | Reset your Gigotter password | `reset-password.html` |
| Magic link | Your Gigotter log-in link | `magic-link.html` |
| Change email address | Confirm your new email address | `change-email.html` |
| Invite user | You’ve been invited to Gigotter | `invite-user.html` |
| Reauthentication | Your Gigotter verification code | `reauthentication.html` |

To change the wording or colours, edit `build.py` and run `python3 supabase/email-templates/build.py`, then paste the regenerated files again.

The logo is loaded from `https://gigotter.com/logo-mark.png`, so keep that file on the site.
