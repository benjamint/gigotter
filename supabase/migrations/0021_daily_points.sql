-- Gigotter — 1 point for every day a verified member logs in, and an admin button that tells
-- members about it by email, a batch at a time.
-- Additive only: a new ledger kind, two new tables and new functions. No existing rows are changed.
-- Requires 0004 (send_email, email_layout, html_escape), 0018 and 0019, and the Resend key in Vault.

-- ───────────── 1. Ledger: a 'daily' kind ─────────────
alter table public.points_ledger drop constraint if exists points_ledger_kind_check;
alter table public.points_ledger add constraint points_ledger_kind_check
  check (kind in ('earned','reversed','redeemed','refund','adjust','welcome','daily'));

create or replace function public.daily_point_amount() returns int language sql immutable as $$ select 1 $$;

-- one row per member per day (Ghana time); the primary key is what stops a second point the same day
create table if not exists public.daily_logins (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (student_id, day)
);
alter table public.daily_logins enable row level security;
drop policy if exists "daily logins read" on public.daily_logins;
create policy "daily logins read" on public.daily_logins for select to authenticated using (student_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.daily_logins from anon, authenticated;

-- ───────────── 2. Claim today's point (called by the app when a member opens it) ─────────────
create or replace function public.claim_daily_point() returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; today date := (now() at time zone 'Africa/Accra')::date; n int; bal int;
begin
  if auth.uid() is null then return json_build_object('awarded', false, 'reason', 'signed_out'); end if;
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role = 'admin' or me.kyc_status <> 'verified' then
    return json_build_object('awarded', false, 'reason', 'not_verified');
  end if;
  insert into public.daily_logins(student_id, day) values (me.id, today) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 1 then
    insert into public.points_ledger(student_id, delta, kind, note)
      values (me.id, public.daily_point_amount(), 'daily', 'Daily login point');
  end if;
  select coalesce(sum(delta), 0) into bal from public.points_ledger where student_id = me.id;
  return json_build_object('awarded', n = 1, 'points', public.daily_point_amount(), 'balance', bal);
end $$;
revoke execute on function public.claim_daily_point() from public, anon;
grant execute on function public.claim_daily_point() to authenticated;

-- ───────────── 3. Announcement emails, sent by an admin a batch at a time ─────────────
create table if not exists public.email_campaign_sends (
  campaign text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (campaign, profile_id)
);
alter table public.email_campaign_sends enable row level security;
drop policy if exists "campaign sends admin read" on public.email_campaign_sends;
create policy "campaign sends admin read" on public.email_campaign_sends for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.email_campaign_sends from anon, authenticated;

-- verified members (not admins) with an email who haven't had this campaign yet
create or replace function public.admin_daily_points_emails_pending() returns int
language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Only admins can see this'; end if;
  select count(*) into n from public.profiles p
    where p.kyc_status = 'verified' and p.role <> 'admin' and coalesce(p.email, '') <> ''
      and not exists (select 1 from public.email_campaign_sends s where s.campaign = 'daily_points' and s.profile_id = p.id);
  return n;
end $$;
revoke execute on function public.admin_daily_points_emails_pending() from public, anon;
grant execute on function public.admin_daily_points_emails_pending() to authenticated;

create or replace function public.admin_send_daily_points_emails(p_limit int default 20) returns json
language plpgsql security definer set search_path = public as $$
declare r record; sent int := 0; first text;
begin
  if not public.is_admin() then raise exception 'Only admins can send these emails'; end if;
  for r in
    select p.id, p.email, p.full_name from public.profiles p
    where p.kyc_status = 'verified' and p.role <> 'admin' and coalesce(p.email, '') <> ''
      and not exists (select 1 from public.email_campaign_sends s where s.campaign = 'daily_points' and s.profile_id = p.id)
    order by p.created_at limit least(greatest(coalesce(p_limit, 20), 1), 50)
  loop
    -- record first, so a slow email never goes out twice
    insert into public.email_campaign_sends(campaign, profile_id) values ('daily_points', r.id) on conflict do nothing;
    if not found then continue; end if;
    first := html_escape(coalesce(nullif(split_part(btrim(r.full_name), ' ', 1), ''), 'there'));
    perform send_email(r.email, 'New: get a Gigotter point every day you log in',
      email_layout('Log in, get a point, ' || first || '!',
        'From today, every day you log in to Gigotter, we add <b>1 point</b> to your Otter Card.'
        || '<div style="margin:20px 0 4px;padding:18px 20px;border-radius:16px;background:#FDF3D3;font-size:15px;color:#15171A">'
        || '&#11088; Log in each day and watch your points add up. Swap them for <b>airtime, data and Gigotter merch</b> in the Rewards store.</div>',
        'Log in and get today’s point', 'https://gigotter.com/login?next=/me',
        'One point a day. You can also earn points on gigs that pay in points.'));
    sent := sent + 1;
  end loop;
  return json_build_object('sent', sent, 'remaining', public.admin_daily_points_emails_pending());
end $$;
revoke execute on function public.admin_send_daily_points_emails(int) from public, anon;
grant execute on function public.admin_send_daily_points_emails(int) to authenticated;
