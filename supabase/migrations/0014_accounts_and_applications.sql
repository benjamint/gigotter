-- Gigotter — (A) non-student accounts verified with Ghana Card + selfie, (B) gigs people apply to and are selected for.
-- Existing data keeps working unchanged: everyone is a 'student', every gig is 'open' and 'students' only.
-- Requires 0004 (emails) and 0008 (forms). Safe to run more than once.

-- ═════════════ A. account types and profile details ═════════════
alter table public.profiles add column if not exists account_type text not null default 'student';
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists work_status text;
do $$ begin
  alter table public.profiles add constraint profiles_account_fields check (
    account_type in ('student', 'general')
    and (gender is null or gender in ('female', 'male', 'prefer_not'))
    and (work_status is null or work_status in ('student', 'employed', 'self_employed', 'unemployed', 'other'))
    and coalesce(length(occupation), 0) <= 80
    and (date_of_birth is null or date_of_birth between date '1920-01-01' and current_date));
exception when duplicate_object then null; end $$;

-- Sets the account type at sign-up, checks a submission for review has what that account type needs,
-- and stops people changing account type or birth date once they've submitted.
create or replace function public.profile_account_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text; age int;
begin
  if tg_op = 'INSERT' then
    select lower(raw_user_meta_data->>'account_type') into t from auth.users where id = new.id;
    new.account_type := case when t = 'general' then 'general' else 'student' end;
    return new;
  end if;
  if auth.uid() is null or public.is_admin() then return new; end if;
  if old.kyc_status in ('pending', 'verified') then
    new.account_type := old.account_type; new.date_of_birth := old.date_of_birth;
  end if;
  -- moving to "in review": the documents and details this account type needs must be there
  if new.kyc_status = 'pending' and old.kyc_status in ('unverified', 'rejected') then
    if new.id_card_path is null or new.selfie_path is null then raise exception 'Add your ID and a selfie before submitting'; end if;
    if new.account_type = 'student' and new.student_card_path is null then raise exception 'Add your student card before submitting'; end if;
    -- date of birth is required for new non-student accounts; for students it's checked only when given,
    -- so a student resubmitting from an older version of the site isn't blocked
    if new.account_type = 'general' and new.date_of_birth is null then raise exception 'Add your date of birth'; end if;
    if new.date_of_birth is not null then
      age := extract(year from age(current_date, new.date_of_birth));
      if age < (case when new.account_type = 'student' then 16 else 18 end) then
        raise exception 'You need to be at least % to join Gigotter', case when new.account_type = 'student' then 16 else 18 end;
      end if;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.profile_account_rules() from public, anon, authenticated;
drop trigger if exists profiles_account_rules on public.profiles;
create trigger profiles_account_rules before insert or update on public.profiles
  for each row execute function public.profile_account_rules();

-- ═════════════ B. who can take part, and apply-and-select gigs ═════════════
alter table public.listings add column if not exists audience text not null default 'students';
alter table public.listings add column if not exists join_mode text not null default 'open';
alter table public.listings add column if not exists application_schema jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists eligibility jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.listings add constraint listings_join_rules check (
    audience in ('students', 'general', 'everyone') and join_mode in ('open', 'apply')
    and jsonb_typeof(application_schema) = 'array' and jsonb_array_length(application_schema) <= 30
    and jsonb_typeof(eligibility) = 'object');
exception when duplicate_object then null; end $$;

create or replace function public.audience_allows(p_audience text, p_account text) returns boolean
language sql immutable as $$
  select p_audience = 'everyone' or (p_audience = 'students' and p_account = 'student') or (p_audience = 'general' and p_account = 'general')
$$;

create or replace function public.audience_message(p_audience text) returns text
language sql immutable as $$
  select case p_audience when 'students' then 'This gig is open to students only' when 'general' then 'This gig is open to non-students only' else 'You can’t join this gig' end
$$;

-- Checks answers against a gig's question list (same rules as submit_work) and returns only the allowed answers
create or replace function public.validate_answers(p_schema jsonb, p_data jsonb) returns jsonb
language plpgsql immutable as $$
declare clean jsonb := '{}'::jsonb; fld jsonb; k text; v text; typ text; lbl text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then p_data := '{}'::jsonb; end if;
  for fld in select * from jsonb_array_elements(coalesce(p_schema, '[]'::jsonb)) loop
    k := fld->>'key'; typ := coalesce(fld->>'type', 'text'); lbl := coalesce(fld->>'label', k);
    v := left(btrim(coalesce(p_data->>k, '')), case typ when 'long' then 1500 when 'address' then 500 else 300 end);
    if v = '' then
      if coalesce((fld->>'required')::boolean, false) then raise exception 'Please answer: %', lbl; end if;
      continue;
    end if;
    if typ = 'email' and v !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception '% doesn’t look like an email', lbl; end if;
    if typ = 'phone' and regexp_replace(v, '\D', '', 'g') !~ '^[0-9]{7,15}$' then raise exception '% doesn’t look like a phone number', lbl; end if;
    if typ = 'number' and v !~ '^-?[0-9]+(\.[0-9]+)?$' then raise exception '% should be a number', lbl; end if;
    if typ = 'date' and v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception '% should be a date', lbl; end if;
    if typ = 'rating' and v !~ '^[1-5]$' then raise exception '% should be 1 to 5', lbl; end if;
    if typ = 'yes_no' and v not in ('Yes', 'No') then raise exception '% should be Yes or No', lbl; end if;
    if typ = 'choice' and not coalesce(fld->'options', '[]'::jsonb) ? v then raise exception 'Pick one of the options for: %', lbl; end if;
    if typ = 'link' and v !~* '^https?://\S+\.\S+' then raise exception '% should be a full link starting with https://', lbl; end if;
    clean := clean || jsonb_build_object(k, v);
  end loop;
  return clean;
end $$;

-- Joining an open gig now also checks the audience, and apply-mode gigs can't be joined directly
create or replace function public.claim_listing(p_listing uuid) returns public.claims
language plpgsql security definer set search_path = public as $$
declare l public.listings; p public.profiles; taken int; c public.claims;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Sign in first'; end if;
  if p.kyc_status <> 'verified' then raise exception 'Complete verification before joining gigs'; end if;
  select * into l from public.listings where id = p_listing for update;
  if l.id is null or l.status <> 'live' then raise exception 'This gig is not open'; end if;
  if l.expires_at < now() then raise exception 'This gig has expired'; end if;
  if not public.audience_allows(l.audience, p.account_type) then raise exception '%', public.audience_message(l.audience); end if;
  if l.join_mode = 'apply' then raise exception 'This gig takes applications. Apply and we’ll let you know if you’re selected'; end if;
  select count(*) into taken from public.claims where listing_id = l.id and status in ('active','completed');
  if taken >= l.slots then raise exception 'All spots are taken'; end if;
  insert into public.claims(listing_id, student_id) values (l.id, p.id)
    on conflict (listing_id, student_id) do update set status = 'active'
    returning * into c;
  return c;
end $$;
revoke execute on function public.claim_listing(uuid) from public, anon;
grant execute on function public.claim_listing(uuid) to authenticated;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'applied' check (status in ('applied', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
  admin_note text check (char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (listing_id, applicant_id)
);
create index if not exists applications_listing on public.applications(listing_id, status);
alter table public.applications enable row level security;
drop policy if exists "applications read" on public.applications;
create policy "applications read" on public.applications for select to authenticated using (applicant_id = auth.uid() or public.is_admin());
drop policy if exists "applications admin write" on public.applications;
create policy "applications admin write" on public.applications for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.apply_to_listing(p_listing uuid, p_answers jsonb) returns public.applications
language plpgsql security definer set search_path = public as $$
declare p public.profiles; l public.listings; a public.applications; clean jsonb; recent int;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Sign in first'; end if;
  if p.kyc_status <> 'verified' then raise exception 'Complete verification before applying'; end if;
  select * into l from public.listings where id = p_listing;
  if l.id is null or l.status <> 'live' or l.expires_at < now() then raise exception 'This gig isn’t taking applications'; end if;
  if l.join_mode <> 'apply' then raise exception 'This gig doesn’t need an application. Just join it'; end if;
  if not public.audience_allows(l.audience, p.account_type) then raise exception '%', public.audience_message(l.audience); end if;
  select * into a from public.applications where listing_id = l.id and applicant_id = p.id;
  if a.id is not null and a.status <> 'withdrawn' then raise exception 'You’ve already applied to this gig'; end if;
  select count(*) into recent from public.applications where applicant_id = p.id and created_at > now() - interval '1 hour';
  if recent >= 15 then raise exception 'Too many applications in the last hour. Try again later'; end if;
  clean := public.validate_answers(l.application_schema, p_answers);
  insert into public.applications(listing_id, applicant_id, answers) values (l.id, p.id, clean)
    on conflict (listing_id, applicant_id) do update set answers = excluded.answers, status = 'applied', admin_note = null, decided_at = null, created_at = now()
    returning * into a;
  return a;
end $$;
revoke execute on function public.apply_to_listing(uuid, jsonb) from public, anon;
grant execute on function public.apply_to_listing(uuid, jsonb) to authenticated;

create or replace function public.withdraw_application(p_application uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.applications set status = 'withdrawn', decided_at = now()
    where id = p_application and applicant_id = auth.uid() and status in ('applied', 'shortlisted');
  if not found then raise exception 'This application can’t be withdrawn'; end if;
end $$;
revoke execute on function public.withdraw_application(uuid) from public, anon;
grant execute on function public.withdraw_application(uuid) to authenticated;

-- Admin: shortlist / accept / decline. Accepting gives the person a place on the gig (a claim), so they
-- log their attendance or work exactly like any other gig, and are paid once that's approved.
create or replace function public.decide_applications(p_ids uuid[], p_status text, p_note text default null) returns int
language plpgsql security definer set search_path = public as $$
declare a record; taken int; done int := 0; first text; note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'Only admins can decide applications'; end if;
  if p_status not in ('shortlisted', 'accepted', 'declined', 'applied') then raise exception 'Unknown status'; end if;
  for a in
    select ap.*, l.title, l.slots, l.status as l_status, pr.email, pr.full_name
    from public.applications ap join public.listings l on l.id = ap.listing_id join public.profiles pr on pr.id = ap.applicant_id
    where ap.id = any(p_ids) and ap.status <> 'withdrawn' order by ap.created_at
  loop
    if a.status = p_status then continue; end if;
    first := html_escape(coalesce(nullif(split_part(btrim(a.full_name), ' ', 1), ''), 'there'));
    if p_status = 'accepted' then
      select count(*) into taken from public.claims where listing_id = a.listing_id and status in ('active', 'completed') and student_id <> a.applicant_id;
      if taken >= a.slots then raise exception 'There are no places left on “%”. Increase the number of people needed on the gig, or decline someone first', a.title; end if;
      insert into public.claims(listing_id, student_id) values (a.listing_id, a.applicant_id)
        on conflict (listing_id, student_id) do update set status = 'active';
      perform send_email(a.email, 'You’ve been selected: ' || a.title,
        email_layout('You’re in, ' || first || '!',
          'Good news: you’ve been selected for <b style="color:#15171A">' || html_escape(a.title) || '</b>. Open the gig on your dashboard for the details and what to do next.'
            || case when note is not null then '<br><br><b style="color:#15171A">' || html_escape(note) || '</b>' else '' end,
          'Open my dashboard', 'https://gigotter.com/me',
          'Can’t make it any more? Let us know by replying to this email so we can offer your place to someone else.'));
    elsif a.status = 'accepted' then
      -- taking a place away: only if no work has been submitted yet
      if exists (select 1 from public.submissions s join public.claims c on c.id = s.claim_id
                 where c.listing_id = a.listing_id and c.student_id = a.applicant_id and s.status <> 'rejected') then
        raise exception '% has already submitted work on this gig, so their place can’t be removed', coalesce(a.full_name, 'This person');
      end if;
      update public.claims set status = 'removed' where listing_id = a.listing_id and student_id = a.applicant_id;
    end if;
    if p_status = 'declined' then
      perform send_email(a.email, 'Your application: ' || a.title,
        email_layout('Thanks for applying, ' || first,
          'We weren’t able to offer you a place on <b style="color:#15171A">' || html_escape(a.title) || '</b> this time. Places are limited and each gig looks for specific people, so please keep applying to new gigs.'
            || case when note is not null then '<br><br>' || html_escape(note) else '' end,
          'See open gigs', 'https://gigotter.com/gigs', 'Thank you for your interest in Gigotter.'));
    end if;
    update public.applications set status = p_status, admin_note = coalesce(note, admin_note),
      decided_at = case when p_status in ('accepted', 'declined') then now() else decided_at end
      where id = a.id;
    done := done + 1;
  end loop;
  return done;
end $$;
revoke execute on function public.decide_applications(uuid[], text, text) from public, anon;
grant execute on function public.decide_applications(uuid[], text, text) to authenticated;
