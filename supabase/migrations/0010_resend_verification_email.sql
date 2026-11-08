-- Gigotter — remember when each student was emailed about their verification, and let admins resend it
-- (e.g. for students verified before verification emails were switched on). Requires 0004. Safe to run more than once.

alter table public.profiles add column if not exists kyc_email_sent_at timestamptz;

-- One place that writes the verified / needs-fixing email for a profile
create or replace function public.send_kyc_email(p public.profiles) returns boolean
language plpgsql security definer set search_path = public as $$
declare first text := html_escape(coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'there'));
begin
  if p.role = 'admin' or coalesce(p.email, '') = '' then return false; end if;
  if p.kyc_status = 'verified' then
    perform send_email(p.email, 'You’re verified — start earning on Gigotter',
      email_layout('You’re verified, ' || first || '!',
        'Your student ID and selfie have been approved. You can now join any open gig on Gigotter and start earning — paid straight to your mobile money.',
        'Browse open gigs', 'https://gigotter.com/gigs',
        'Your referral code is on your dashboard — share it with the businesses you sign up so we can credit you.'));
  elsif p.kyc_status = 'rejected' then
    perform send_email(p.email, 'Your Gigotter verification needs a quick fix',
      email_layout('Almost there, ' || first,
        'We couldn’t approve your verification yet. Here’s what to fix:<br><br><b style="color:#15171A">'
          || coalesce(nullif(html_escape(p.kyc_note), ''), 'Please check your documents and try again.') || '</b>',
        'Update my details', 'https://gigotter.com/verify',
        'Once you resubmit, we’ll review it again — usually within 24 hours.'));
  else
    return false;
  end if;
  update public.profiles set kyc_email_sent_at = now() where id = p.id;
  return true;
end $$;
revoke execute on function public.send_kyc_email(public.profiles) from public, anon, authenticated;

-- The automatic email when an admin changes a student's status now goes through the same function
create or replace function public.notify_kyc_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kyc_status is distinct from old.kyc_status then perform public.send_kyc_email(new); end if;
  return new;
end $$;
revoke execute on function public.notify_kyc_change() from public, anon, authenticated;
drop trigger if exists profiles_kyc_email on public.profiles;
create trigger profiles_kyc_email after update of kyc_status on public.profiles
  for each row execute function public.notify_kyc_change();

-- Admin button: send (or resend) the email for a student's current status. Returns when it was sent.
create or replace function public.resend_kyc_email(p_student uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if not public.is_admin() then raise exception 'Only admins can send this email'; end if;
  select * into p from public.profiles where id = p_student;
  if p.id is null then raise exception 'Student not found'; end if;
  if p.kyc_status not in ('verified', 'rejected') then raise exception 'Only verified or needs-fixing students can be emailed'; end if;
  if p.kyc_email_sent_at > now() - interval '2 minutes' then raise exception 'An email was just sent — wait a couple of minutes before sending again'; end if;
  if not public.send_kyc_email(p) then raise exception 'This student has no email address'; end if;
  return now();
end $$;
revoke execute on function public.resend_kyc_email(uuid) from public, anon;
grant execute on function public.resend_kyc_email(uuid) to authenticated;
