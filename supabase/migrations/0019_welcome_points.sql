-- Gigotter — welcome bonus: 10 points when a member is verified (enough for GHS 5 MTN airtime in Rewards).
-- Given once per person, ever. Members verified before this migration get it too; an admin then emails them
-- in batches from Admin › Rewards (admin_send_welcome_emails), so the email service isn't flooded.
-- Additions only. Requires 0004, 0010 and 0018. Safe to run more than once.

-- ───────────── 1. Ledger: a 'welcome' kind, once per person, and who has been told ─────────────
alter table public.points_ledger drop constraint if exists points_ledger_kind_check;
alter table public.points_ledger add constraint points_ledger_kind_check
  check (kind in ('earned','reversed','redeemed','refund','adjust','welcome'));
create unique index if not exists points_ledger_welcome_once on public.points_ledger(student_id) where kind = 'welcome';
alter table public.points_ledger add column if not exists emailed_at timestamptz;

-- The bonus amount lives here only
create or replace function public.welcome_points_amount() returns int language sql immutable as $$ select 10 $$;

create or replace function public.grant_welcome_points(p_student uuid, p_emailed boolean default false) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if exists (select 1 from public.profiles where id = p_student and role = 'admin') then return false; end if;
  insert into public.points_ledger(student_id, delta, kind, note, emailed_at, created_by)
    values (p_student, public.welcome_points_amount(), 'welcome', 'Welcome bonus', case when p_emailed then now() end, null)
    on conflict (student_id) where kind = 'welcome' do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke execute on function public.grant_welcome_points(uuid, boolean) from public, anon, authenticated;

-- ───────────── 2. The verified email mentions the points ─────────────
create or replace function public.welcome_points_box(p_student uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.points_ledger where student_id = p_student and kind = 'welcome') then
    '<div style="margin:20px 0 4px;padding:18px 20px;border-radius:16px;background:#FDF3D3;font-size:15px;color:#15171A">'
    || '&#127873; <b>' || public.welcome_points_amount() || ' Gigotter points</b> are in your account. '
    || 'Swap them for <b>GHS 5 MTN airtime</b> in the Rewards store.</div>'
  else '' end
$$;
revoke execute on function public.welcome_points_box(uuid) from public, anon, authenticated;

-- Same as 0010, with the welcome points in the verified email. The needs-fixing email is unchanged.
create or replace function public.send_kyc_email(p public.profiles) returns boolean
language plpgsql security definer set search_path = public as $$
declare first text := html_escape(coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'there'));
        box text;
begin
  if p.role = 'admin' or coalesce(p.email, '') = '' then return false; end if;
  if p.kyc_status = 'verified' then
    box := public.welcome_points_box(p.id);
    if box <> '' then
      perform send_email(p.email, 'You’re verified, and you have ' || public.welcome_points_amount() || ' points to spend',
        email_layout('You’re verified, ' || first || '!',
          'Your details have been approved. You can now join any open gig on Gigotter and start earning, paid straight to your mobile money.'
          || box
          || '<div style="margin-top:14px;font-size:14px;color:#6B7077">Ready to earn more? <a href="https://gigotter.com/gigs" style="color:#245A44;font-weight:600">Browse open gigs</a>.</div>',
          'Redeem my points', 'https://gigotter.com/rewards',
          'Your referral code is on your dashboard — share it with the businesses you sign up so we can credit you.'));
    else
      perform send_email(p.email, 'You’re verified — start earning on Gigotter',
        email_layout('You’re verified, ' || first || '!',
          'Your student ID and selfie have been approved. You can now join any open gig on Gigotter and start earning — paid straight to your mobile money.',
          'Browse open gigs', 'https://gigotter.com/gigs',
          'Your referral code is on your dashboard — share it with the businesses you sign up so we can credit you.'));
    end if;
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

-- Becoming verified: add the welcome points first (marked as told, since the verified email says so), then email
create or replace function public.notify_kyc_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kyc_status is distinct from old.kyc_status then
    if new.kyc_status = 'verified' and new.role <> 'admin' then perform public.grant_welcome_points(new.id, true); end if;
    perform public.send_kyc_email(new);
  end if;
  return new;
end $$;
revoke execute on function public.notify_kyc_change() from public, anon, authenticated;

-- ───────────── 3. Members verified before today get the bonus too (not yet emailed) ─────────────
insert into public.points_ledger(student_id, delta, kind, note, created_by)
  select p.id, public.welcome_points_amount(), 'welcome', 'Welcome bonus', null
  from public.profiles p where p.kyc_status = 'verified' and p.role <> 'admin'
  on conflict (student_id) where kind = 'welcome' do nothing;

-- ───────────── 4. Admin: tell them, a batch at a time ─────────────
create or replace function public.admin_send_welcome_emails(p_limit int default 20) returns json
language plpgsql security definer set search_path = public as $$
declare r record; sent int := 0; left_ int; first text;
begin
  if not public.is_admin() then raise exception 'Only admins can send these emails'; end if;
  for r in
    select l.id as lid, p.email, p.full_name from public.points_ledger l join public.profiles p on p.id = l.student_id
    where l.kind = 'welcome' and l.emailed_at is null and p.kyc_status = 'verified' and p.role <> 'admin' and coalesce(p.email, '') <> ''
    order by l.created_at limit least(greatest(coalesce(p_limit, 20), 1), 50)
    for update of l skip locked
  loop
    first := html_escape(coalesce(nullif(split_part(btrim(r.full_name), ' ', 1), ''), 'there'));
    perform send_email(r.email, 'You have ' || public.welcome_points_amount() || ' Gigotter points waiting',
      email_layout('A gift for you, ' || first || '!',
        'Thanks for being part of Gigotter. We’ve added a welcome bonus to your account:'
        || '<div style="margin:20px 0 4px;padding:18px 20px;border-radius:16px;background:#FDF3D3;font-size:15px;color:#15171A">'
        || '&#127873; <b>' || public.welcome_points_amount() || ' Gigotter points</b> are in your account. '
        || 'Swap them for <b>GHS 5 MTN airtime</b> in the Rewards store.</div>',
        'Redeem my points', 'https://gigotter.com/rewards',
        'Earn more points on quick gigs and spend them on airtime and Gigotter merch.'));
    update public.points_ledger set emailed_at = now() where id = r.lid;
    sent := sent + 1;
  end loop;
  select count(*) into left_ from public.points_ledger l join public.profiles p on p.id = l.student_id
    where l.kind = 'welcome' and l.emailed_at is null and p.kyc_status = 'verified' and p.role <> 'admin' and coalesce(p.email, '') <> '';
  return json_build_object('sent', sent, 'remaining', left_);
end $$;
revoke execute on function public.admin_send_welcome_emails(int) from public, anon;
grant execute on function public.admin_send_welcome_emails(int) to authenticated;
