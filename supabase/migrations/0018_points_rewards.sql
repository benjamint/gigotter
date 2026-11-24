-- Gigotter — points gigs and the Rewards marketplace.
-- A gig whose currency is 'PTS' pays Gigotter points instead of cash: approving the work adds the points at once.
-- Students spend points on reward items (airtime, products) that an admin sends out by hand.
-- Additions only: no existing rows are changed (every existing gig keeps its currency and stays a cash gig).
-- Requires 0004 (send_email, email_layout, html_escape), 0007 and 0013. Safe to run more than once.

-- ───────────── 1. Tables ─────────────
create table if not exists public.reward_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text check (char_length(description) <= 1000),
  image_url text,
  vendor text check (char_length(vendor) <= 120),
  category text not null default 'product' check (category in ('airtime','product','voucher','other')),
  points_cost int not null check (points_cost > 0 and points_cost <= 10000000),
  stock int check (stock is null or stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.reward_items(id) on delete set null,
  item_name text not null,
  points int not null check (points > 0),
  phone text not null check (char_length(phone) between 7 and 20),
  delivery_note text check (char_length(delivery_note) <= 300),
  status text not null default 'requested' check (status in ('requested','sent','cancelled')),
  admin_note text check (char_length(admin_note) <= 300),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists redemptions_student on public.redemptions(student_id, created_at desc);
create index if not exists redemptions_status on public.redemptions(status, created_at);

-- Every change to a student's points is one row; the balance is the sum of delta.
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null check (delta <> 0),
  kind text not null check (kind in ('earned','reversed','redeemed','refund','adjust')),
  submission_id uuid references public.submissions(id) on delete set null,
  redemption_id uuid references public.redemptions(id) on delete set null,
  note text check (char_length(note) <= 300),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists points_ledger_student on public.points_ledger(student_id, created_at desc);
create index if not exists points_ledger_submission on public.points_ledger(submission_id);

-- ───────────── 2. Who can read and write ─────────────
alter table public.reward_items enable row level security;
drop policy if exists "reward items read" on public.reward_items;
create policy "reward items read" on public.reward_items for select using (active or public.is_admin());
drop policy if exists "reward items admin write" on public.reward_items;
create policy "reward items admin write" on public.reward_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.redemptions enable row level security;
drop policy if exists "redemptions read" on public.redemptions;
create policy "redemptions read" on public.redemptions for select to authenticated using (student_id = auth.uid() or public.is_admin());
-- no insert/update policies: redemptions change only through redeem_item / admin_handle_redemption

alter table public.points_ledger enable row level security;
drop policy if exists "points read" on public.points_ledger;
create policy "points read" on public.points_ledger for select to authenticated using (student_id = auth.uid() or public.is_admin());
-- no write policies: the ledger changes only through the functions below

create or replace function public.points_balance(p_student uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.points_ledger where student_id = p_student
$$;
revoke execute on function public.points_balance(uuid) from public, anon, authenticated;

-- ───────────── 3. Points gigs: approving the work adds the points ─────────────
-- Before the update: an approved submission on a points gig is settled at once (no MoMo payout step).
create or replace function public.points_settle_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved'
     and (select upper(currency) from public.listings where id = new.listing_id) = 'PTS' then
    new.status := 'paid';
    new.paid_at := coalesce(new.paid_at, now());
    new.payout_ref := coalesce(nullif(new.payout_ref, ''), 'points');
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end $$;
revoke execute on function public.points_settle_submission() from public, anon, authenticated;
drop trigger if exists submissions_points_settle on public.submissions;
create trigger submissions_points_settle before update of status on public.submissions
  for each row execute function public.points_settle_submission();

-- After the update: credit the points once; take them back if a settled submission is un-approved.
create or replace function public.points_ledger_for_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare pts int; net int;
begin
  if (select upper(currency) from public.listings where id = new.listing_id) is distinct from 'PTS' then return null; end if;
  pts := round(coalesce(new.amount, 0))::int;
  select coalesce(sum(delta), 0) into net from public.points_ledger
    where submission_id = new.id and kind in ('earned','reversed');
  if new.status = 'paid' and old.status is distinct from 'paid' and net = 0 and pts > 0 then
    insert into public.points_ledger(student_id, delta, kind, submission_id, note)
      values (new.student_id, pts, 'earned', new.id, left(coalesce(nullif(new.summary, ''), 'Approved work'), 300));
  elsif old.status = 'paid' and new.status in ('pending','rejected') and net > 0 then
    insert into public.points_ledger(student_id, delta, kind, submission_id, note)
      values (new.student_id, -net, 'reversed', new.id, 'Approval taken back');
  end if;
  return null;
end $$;
revoke execute on function public.points_ledger_for_submission() from public, anon, authenticated;
drop trigger if exists submissions_points_ledger on public.submissions;
create trigger submissions_points_ledger after update of status on public.submissions
  for each row execute function public.points_ledger_for_submission();

-- ───────────── 4. Students: redeem an item ─────────────
create or replace function public.redeem_item(p_item uuid, p_phone text, p_note text default null) returns public.redemptions
language plpgsql security definer set search_path = public as $$
declare p public.profiles; it public.reward_items; bal int; r public.redemptions; ph text;
begin
  if auth.uid() is null then raise exception 'Sign in to redeem rewards'; end if;
  -- lock the student's row so two redemptions at the same moment can't overspend
  select * into p from public.profiles where id = auth.uid() for update;
  if p.id is null then raise exception 'Profile not found'; end if;
  if p.kyc_status <> 'verified' then raise exception 'Complete verification before redeeming rewards'; end if;
  ph := btrim(coalesce(p_phone, ''));
  if char_length(regexp_replace(ph, '\D', '', 'g')) < 9 or char_length(ph) > 20 then raise exception 'Enter a valid phone number'; end if;
  if char_length(coalesce(p_note, '')) > 300 then raise exception 'Keep the delivery note under 300 characters'; end if;

  select * into it from public.reward_items where id = p_item for update;
  if it.id is null or not it.active then raise exception 'This reward isn’t available any more'; end if;
  if it.stock is not null and it.stock < 1 then raise exception 'This reward is out of stock'; end if;
  bal := public.points_balance(p.id);
  if bal < it.points_cost then raise exception 'You need % more points for this reward', it.points_cost - bal; end if;

  insert into public.redemptions(student_id, item_id, item_name, points, phone, delivery_note)
    values (p.id, it.id, it.name, it.points_cost, ph, nullif(btrim(coalesce(p_note, '')), ''))
    returning * into r;
  insert into public.points_ledger(student_id, delta, kind, redemption_id, note)
    values (p.id, -it.points_cost, 'redeemed', r.id, left(it.name, 300));
  if it.stock is not null then update public.reward_items set stock = stock - 1 where id = it.id; end if;
  return r;
end $$;
revoke execute on function public.redeem_item(uuid, text, text) from public, anon;
grant execute on function public.redeem_item(uuid, text, text) to authenticated;

-- ───────────── 5. Admin: send or cancel a redemption, adjust points ─────────────
create or replace function public.admin_handle_redemption(p_redemption uuid, p_status text, p_note text default null) returns public.redemptions
language plpgsql security definer set search_path = public as $$
declare r public.redemptions; p public.profiles; first text;
begin
  if not public.is_admin() then raise exception 'Only admins can handle rewards'; end if;
  if p_status not in ('sent','cancelled') then raise exception 'Choose sent or cancelled'; end if;
  select * into r from public.redemptions where id = p_redemption for update;
  if r.id is null then raise exception 'Reward request not found'; end if;
  if r.status <> 'requested' then raise exception 'This request was already marked %', r.status; end if;

  update public.redemptions set status = p_status, admin_note = nullif(btrim(coalesce(p_note, '')), ''), handled_at = now()
    where id = r.id returning * into r;

  if p_status = 'cancelled' then
    insert into public.points_ledger(student_id, delta, kind, redemption_id, note)
      values (r.student_id, r.points, 'refund', r.id, left('Refund: ' || r.item_name, 300));
    update public.reward_items set stock = stock + 1 where id = r.item_id and stock is not null;
  else
    select * into p from public.profiles where id = r.student_id;
    if coalesce(p.email, '') <> '' then
      first := html_escape(coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'there'));
      perform send_email(p.email, 'Your reward is on its way: ' || r.item_name,
        email_layout('Enjoy your reward, ' || first || '!',
          'We’ve sent <b style="color:#15171A">' || html_escape(r.item_name) || '</b> that you redeemed for <b style="color:#15171A">'
          || r.points || ' points</b>.'
          || case when r.admin_note is not null then '<div style="margin-top:16px;padding:12px 14px;border-radius:12px;background:#EEF3EF;font-size:14px;color:#15171A">' || html_escape(r.admin_note) || '</div>' else '' end,
          'Earn more points', 'https://gigotter.com/gigs',
          'Something not right? Reply to hello@gigotter.com and we’ll sort it out.'));
    end if;
  end if;
  return r;
end $$;
revoke execute on function public.admin_handle_redemption(uuid, text, text) from public, anon;
grant execute on function public.admin_handle_redemption(uuid, text, text) to authenticated;

create or replace function public.admin_adjust_points(p_student uuid, p_delta int, p_note text) returns public.points_ledger
language plpgsql security definer set search_path = public as $$
declare e public.points_ledger;
begin
  if not public.is_admin() then raise exception 'Only admins can adjust points'; end if;
  if not exists (select 1 from public.profiles where id = p_student) then raise exception 'Student not found'; end if;
  if coalesce(p_delta, 0) = 0 or abs(p_delta) > 1000000 then raise exception 'Enter the points to add or remove'; end if;
  if char_length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'Add a short reason'; end if;
  insert into public.points_ledger(student_id, delta, kind, note) values (p_student, p_delta, 'adjust', left(btrim(p_note), 300))
    returning * into e;
  return e;
end $$;
revoke execute on function public.admin_adjust_points(uuid, int, text) from public, anon;
grant execute on function public.admin_adjust_points(uuid, int, text) to authenticated;

-- ───────────── 6. Emails speak points for points gigs ─────────────
create or replace function public.money_fmt(p_amount numeric, p_currency text) returns text
language sql immutable as $$
  select case when upper(coalesce(p_currency,'GHS')) = 'PTS'
    then to_char(round(coalesce(p_amount,0)), 'FM999,999,990') || ' points'
    else case upper(coalesce(p_currency,'GHS')) when 'GHS' then '₵' when 'USD' then '$' when 'NGN' then '₦' when 'KES' then 'KSh ' else upper(p_currency) || ' ' end
         || to_char(coalesce(p_amount,0), 'FM999,999,990.00') end
$$;

-- Same as 0013, plus a points version of the "paid" email.
create or replace function public.notify_submission_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record; first text; items text; more int; subject text; heading text; body text; note text; n int;
begin
  for r in
    select nw.student_id, nw.status, p.email, p.full_name, p.momo_provider, p.momo_number, l.currency,
           count(*) as cnt, sum(coalesce(nw.amount,0)) as total,
           array_agg(html_escape(coalesce(nullif(nw.summary,''), nullif(nw.data->>'business_name',''), nullif(nw.data->>'owner_name',''), initcap(l.unit_label))) order by nw.created_at) as names,
           string_agg(distinct html_escape(l.title), ', ') as gigs,
           max(nw.payout_ref) as ref,
           array_remove(array_agg(distinct html_escape(nullif(btrim(nw.admin_note), ''))), null) as notes
    from new_rows nw
    join old_rows od on od.id = nw.id
    join profiles p on p.id = nw.student_id
    join listings l on l.id = nw.listing_id
    where nw.status is distinct from od.status and nw.status in ('approved', 'paid', 'rejected')
      and nw.payment_id is null  -- paid through record_payment: the receipt email covers it
    group by nw.student_id, nw.status, p.email, p.full_name, p.momo_provider, p.momo_number, l.currency
  loop
    first := html_escape(coalesce(nullif(split_part(btrim(r.full_name), ' ', 1), ''), 'there'));
    n := least(coalesce(array_length(r.names, 1), 0), 8);
    more := r.cnt - n;
    items := '<ul style="margin:0 0 4px;padding-left:20px;color:#15171A">'
             || (select string_agg('<li style="margin:2px 0">' || x || '</li>', '') from unnest(r.names[1:n]) x)
             || case when more > 0 then '<li style="margin:2px 0;color:#6B7077">+ ' || more || ' more</li>' else '' end || '</ul>';

    if r.status = 'paid' and upper(coalesce(r.currency, '')) = 'PTS' then
      subject := 'You earned ' || money_fmt(r.total, r.currency);
      heading := 'Points added, ' || first || '!';
      body := r.cnt || case when r.cnt = 1 then ' submission' else ' submissions' end || ' for <b style="color:#15171A">' || r.gigs
              || '</b> ' || case when r.cnt = 1 then 'was' else 'were' end || ' approved — <b style="color:#15171A">'
              || money_fmt(r.total, r.currency) || '</b> added to your Gigotter points.<br><br>' || items;
      perform send_email(r.email, subject, email_layout(heading, body, 'Spend my points', 'https://gigotter.com/rewards',
        'Redeem your points for airtime and more in Rewards.'));

    elsif r.status = 'approved' then
      subject := 'Approved: ' || money_fmt(r.total, r.currency) || ' on its way';
      heading := 'Nice work, ' || first || '!';
      body := r.cnt || case when r.cnt = 1 then ' submission' else ' submissions' end || ' for <b style="color:#15171A">' || r.gigs
              || '</b> ' || case when r.cnt = 1 then 'was' else 'were' end || ' approved — <b style="color:#15171A">'
              || money_fmt(r.total, r.currency) || '</b> will be sent to your mobile money in the next weekly payout.<br><br>' || items;
      perform send_email(r.email, subject, email_layout(heading, body, 'See my earnings', 'https://gigotter.com/me',
        'Keep going — every approved submission adds to your next payout.'));

    elsif r.status = 'paid' then
      subject := money_fmt(r.total, r.currency) || ' sent to your mobile money';
      heading := 'You’ve been paid, ' || first;
      body := 'We’ve sent <b style="color:#15171A">' || money_fmt(r.total, r.currency) || '</b> to your '
              || coalesce(html_escape(r.momo_provider), 'mobile money') || ' account'
              || case when coalesce(r.momo_number, '') <> '' then ' ending <b style="color:#15171A">' || html_escape(right(regexp_replace(r.momo_number, '\D', '', 'g'), 3)) || '</b>' else '' end
              || ' for ' || r.cnt || case when r.cnt = 1 then ' submission' else ' submissions' end || ' on <b style="color:#15171A">' || r.gigs || '</b>.<br><br>' || items
              || case when coalesce(r.ref, '') <> '' then '<br>Payout reference: <b style="color:#15171A">' || html_escape(r.ref) || '</b>' else '' end;
      perform send_email(r.email, subject, email_layout(heading, body, 'Find more gigs', 'https://gigotter.com/gigs',
        'Didn’t receive it within 24 hours? Reply to hello@gigotter.com with the reference above.'));

    elsif r.status = 'rejected' then
      subject := case when r.cnt = 1 then 'A submission needs your attention' else r.cnt || ' submissions need your attention' end;
      heading := 'Quick check needed, ' || first;
      note := case when coalesce(array_length(r.notes, 1), 0) > 0
                   then '<br><br>Here’s why:<br><b style="color:#15171A">' || array_to_string(r.notes, '<br>') || '</b>' else '' end;
      body := 'We couldn’t approve ' || case when r.cnt = 1 then 'this submission' else 'these submissions' end
              || ' for <b style="color:#15171A">' || r.gigs || '</b>:<br><br>' || items || note;
      perform send_email(r.email, subject, email_layout(heading, body, 'Open my gig', 'https://gigotter.com/me',
        'If you think this is a mistake, reply to hello@gigotter.com and we’ll take another look.'));
    end if;
  end loop;
  return null;
end $$;
revoke execute on function public.notify_submission_changes() from public, anon, authenticated;
