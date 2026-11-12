-- Gigotter — day-by-day check-ins for gigs that run on set dates (focus groups, trainings, events…).
-- Each session day opens only on its date (Ghana time) and takes one check-in (by default a photo + short report).
-- Each approved day is one submission, so approval, receipts and Record payment work as before.
-- Additive only: existing gigs have no sessions and behave exactly as before. Requires 0008 and 0014. Safe to run more than once.

alter table public.listings add column if not exists sessions jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.listings add constraint listings_sessions_check
    check (jsonb_typeof(sessions) = 'array' and jsonb_array_length(sessions) <= 30);
exception when duplicate_object then null; end $$;

alter table public.submissions add column if not exists session_day int;
do $$ begin
  alter table public.submissions add constraint submissions_session_day_check check (session_day is null or session_day between 1 and 30);
exception when duplicate_object then null; end $$;
create unique index if not exists submissions_one_checkin_per_day on public.submissions(claim_id, session_day)
  where session_day is not null and status <> 'rejected';

-- Session gigs must be checked in day by day (stops the general submit route skipping the dates)
create or replace function public.require_session_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.session_day is null and exists (select 1 from public.listings where id = new.listing_id and jsonb_array_length(sessions) > 0) then
    raise exception 'This gig uses daily check-ins. Use the check-in for today';
  end if;
  return new;
end $$;
revoke execute on function public.require_session_checkin() from public, anon, authenticated;
drop trigger if exists submissions_require_checkin on public.submissions;
create trigger submissions_require_checkin before insert on public.submissions
  for each row execute function public.require_session_checkin();

create or replace function public.submit_checkin(p_claim uuid, p_day int, p_data jsonb, p_proof text) returns public.submissions
language plpgsql security definer set search_path = public as $$
declare c public.claims; l public.listings; s public.submissions; n int; d date; today date := (now() at time zone 'Africa/Accra')::date;
        clean jsonb; amt numeric; spent numeric; recent int; v text;
begin
  select * into c from public.claims where id = p_claim and student_id = auth.uid();
  if c.id is null or c.status <> 'active' then raise exception 'Gig not active'; end if;
  select * into l from public.listings where id = c.listing_id;
  if l.status <> 'live' then raise exception 'This gig is closed'; end if;
  n := jsonb_array_length(l.sessions);
  if n = 0 then raise exception 'This gig doesn’t use daily check-ins'; end if;
  if p_day is null or p_day < 1 or p_day > n then raise exception 'That day isn’t part of this gig'; end if;
  d := (l.sessions->(p_day - 1)->>'date')::date;
  if today < d then raise exception 'Day %’s check-in opens on %', p_day, to_char(d, 'Dy DD Mon'); end if;
  if today > d then raise exception 'Day %’s check-in closed on %', p_day, to_char(d, 'Dy DD Mon'); end if;

  clean := public.validate_answers(l.form_schema, p_data);
  -- keep a GPS pin if the form has an address question (same as submit_work)
  if exists (select 1 from jsonb_array_elements(l.form_schema) f where f->>'type' = 'address') then
    v := btrim(coalesce(p_data->>'gps', ''));
    if v ~ '^-?[0-9]{1,2}\.[0-9]{3,8},-?[0-9]{1,3}\.[0-9]{3,8}$' then clean := clean || jsonb_build_object('gps', v); end if;
  end if;
  if l.photo_rule = 'none' then p_proof := null; end if;
  if l.photo_rule = 'required' and p_proof is null then raise exception 'Add a photo from today as proof'; end if;
  if p_proof is not null and split_part(p_proof, '/', 1) <> auth.uid()::text then raise exception 'Invalid proof photo'; end if;
  if clean = '{}'::jsonb and p_proof is null then raise exception 'Fill in today’s check-in'; end if;

  select count(*) into recent from public.submissions where student_id = auth.uid() and created_at > now() - interval '15 seconds';
  if recent > 0 then raise exception 'Slow down — wait a few seconds between submissions'; end if;

  amt := case when l.pay_model = 'per_unit' then l.rate else round(l.rate / n, 2) end;
  select coalesce(sum(amount), 0) into spent from public.submissions where listing_id = l.id and status <> 'rejected';
  if l.total_budget is not null and spent + amt > l.total_budget then raise exception 'Budget for this gig is used up'; end if;

  insert into public.submissions(claim_id, listing_id, student_id, data, summary, proof_path, amount, session_day)
    values (c.id, l.id, auth.uid(), clean, coalesce(nullif(l.sessions->(p_day - 1)->>'label', ''), 'Day ' || p_day) || ' · ' || to_char(d, 'DD Mon'),
            p_proof, amt, p_day)
    returning * into s;
  return s;
exception when unique_violation then raise exception 'You’ve already checked in for day %', p_day;
end $$;
revoke execute on function public.submit_checkin(uuid, int, jsonb, text) from public, anon;
grant execute on function public.submit_checkin(uuid, int, jsonb, text) to authenticated;
