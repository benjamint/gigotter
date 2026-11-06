-- Gigotter — email students when their verification is approved or needs a fix.
-- Sends through Resend's API from the database, so it works whichever device the admin uses.
--
-- BEFORE running this file, store your Resend API key in Supabase Vault (once), in its own query:
--   select vault.create_secret('re_your_key_here', 'resend_api_key');
-- (Use the same key you put in Supabase's SMTP settings, or create a new "Sending access" key in Resend.)
-- Safe to run more than once.

create extension if not exists pg_net;

-- ───────────── send one email via Resend (server-side only) ─────────────
create or replace function public.send_email(p_to text, p_subject text, p_html text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if k is null or p_to is null or p_to = '' then
    raise warning 'send_email skipped (no resend_api_key in vault or no recipient)';
    return;
  end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
    body := jsonb_build_object('from', 'Gigotter <noreply@gigotter.com>', 'to', jsonb_build_array(p_to),
                               'subject', p_subject, 'html', p_html)
  );
exception when others then
  -- never block the admin's approval because an email failed
  raise warning 'send_email failed: %', sqlerrm;
end $$;
-- nobody may call this directly from the website (otherwise anyone could send email as Gigotter)
revoke execute on function public.send_email(text, text, text) from public, anon, authenticated;

create or replace function public.html_escape(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- branded layout matching supabase/email-templates
create or replace function public.email_layout(p_heading text, p_body text, p_button text, p_url text, p_note text) returns text
language sql immutable as $$
select format($html$<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>%1$s</title></head>
<body style="margin:0;padding:0;background:#F7F6F2">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F7F6F2"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
<tr><td style="padding:0 4px 24px"><a href="https://gigotter.com" style="text-decoration:none"><img src="https://gigotter.com/logo-mark.png" width="40" height="40" alt="Gigotter" style="display:inline-block;vertical-align:middle;border:0"><span style="display:inline-block;vertical-align:middle;margin-left:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#15171A">Gigotter</span></a></td></tr>
<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid #E4E1D8;border-radius:20px;padding:36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="font-size:24px;line-height:1.25;font-weight:700;color:#15171A;padding-bottom:12px">%1$s</div>
<div style="font-size:16px;line-height:1.6;color:#6B7077;padding-bottom:24px">%2$s</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#245A44" style="border-radius:999px"><a href="%4$s" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">%3$s</a></td></tr></table>
<div style="border-top:1px solid #E4E1D8;margin-top:28px;padding-top:20px;font-size:13px;line-height:1.6;color:#6B7077">%5$s</div>
</td></tr>
<tr><td style="padding:24px 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B7077">Gigotter · Real work for real businesses, paid to mobile money.<br>Accra, Ghana · <a href="https://gigotter.com" style="color:#6B7077">gigotter.com</a> · <a href="https://gigotter.com/privacy" style="color:#6B7077">Privacy</a></td></tr>
</table></td></tr></table></body></html>$html$, p_heading, p_body, p_button, p_url, p_note)
$$;

-- ───────────── trigger: verification approved / needs a fix ─────────────
create or replace function public.notify_kyc_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare first text := html_escape(coalesce(nullif(split_part(btrim(new.full_name), ' ', 1), ''), 'there'));
begin
  if new.kyc_status is not distinct from old.kyc_status or new.role = 'admin' then return new; end if;

  if new.kyc_status = 'verified' then
    perform send_email(new.email, 'You’re verified — start earning on Gigotter',
      email_layout('You’re verified, ' || first || '!',
        'Your student ID and selfie have been approved. You can now join any open gig on Gigotter and start earning — paid straight to your mobile money.',
        'Browse open gigs', 'https://gigotter.com/gigs',
        'Your referral code is on your dashboard — share it with the businesses you sign up so we can credit you.'));
  elsif new.kyc_status = 'rejected' then
    perform send_email(new.email, 'Your Gigotter verification needs a quick fix',
      email_layout('Almost there, ' || first,
        'We couldn’t approve your verification yet. Here’s what to fix:<br><br><b style="color:#15171A">'
          || coalesce(nullif(html_escape(new.kyc_note), ''), 'Please check your documents and try again.') || '</b>',
        'Update my details', 'https://gigotter.com/verify',
        'Once you resubmit, we’ll review it again — usually within 24 hours.'));
  end if;
  return new;
end $$;
revoke execute on function public.notify_kyc_change() from public, anon, authenticated;

drop trigger if exists profiles_kyc_email on public.profiles;
create trigger profiles_kyc_email after update of kyc_status on public.profiles
  for each row execute function public.notify_kyc_change();
