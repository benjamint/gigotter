-- Gigotter — security hardening (audit, 5 Nov 2026)
-- Safe to run more than once. Run in Supabase → SQL Editor.

-- ───────────── 1. Claims: students could edit their own claim row directly ─────────────
-- The old UPDATE policy let a student change listing_id/status on their claim, which
-- bypassed claim_listing() (verification, spots, expiry). Replace it with an RPC.
drop policy if exists "claims own withdraw" on public.claims;
drop policy if exists "claims admin update" on public.claims;
create policy "claims admin update" on public.claims for update
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.withdraw_claim(p_claim uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.claims;
begin
  select * into c from public.claims where id = p_claim and student_id = auth.uid() for update;
  if c.id is null then raise exception 'Gig not found'; end if;
  if c.status <> 'active' then raise exception 'This gig is not active'; end if;
  if exists (select 1 from public.submissions where claim_id = c.id and status <> 'rejected') then
    raise exception 'You have submitted work on this gig, so it can’t be withdrawn';
  end if;
  update public.claims set status = 'withdrawn' where id = c.id;
end $$;

-- ───────────── 2. Submitting work: validate input and rate-limit ─────────────
create or replace function public.submit_work(p_claim uuid, p_data jsonb, p_proof text) returns public.submissions
language plpgsql security definer set search_path = public as $$
declare c public.claims; l public.listings; mine int; recent int; spent numeric; amt numeric;
        s public.submissions; k text; clean jsonb := '{}'::jsonb; f text; v text;
begin
  select * into c from public.claims where id = p_claim and student_id = auth.uid();
  if c.id is null or c.status <> 'active' then raise exception 'Gig not active'; end if;
  select * into l from public.listings where id = c.listing_id;
  if l.status <> 'live' or l.expires_at < now() then raise exception 'This gig is closed'; end if;

  -- only keep the fields this gig asks for, trimmed and length-limited
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Invalid submission'; end if;
  foreach f in array l.proof_fields loop
    v := left(btrim(coalesce(p_data->>f, '')), 300);
    if v <> '' then clean := clean || jsonb_build_object(f, v); end if;
  end loop;
  if clean = '{}'::jsonb then raise exception 'Fill in the details for this submission'; end if;

  -- proof photo must be the student's own upload
  if p_proof is not null and split_part(p_proof, '/', 1) <> auth.uid()::text then
    raise exception 'Invalid proof photo';
  end if;

  -- rate limits: 1 every 15 seconds, 60 per hour per student
  select count(*) into recent from public.submissions where student_id = auth.uid() and created_at > now() - interval '15 seconds';
  if recent > 0 then raise exception 'Slow down — wait a few seconds between submissions'; end if;
  select count(*) into recent from public.submissions where student_id = auth.uid() and created_at > now() - interval '1 hour';
  if recent >= 60 then raise exception 'Too many submissions in the last hour — try again later'; end if;

  select count(*) into mine from public.submissions where claim_id = c.id and status <> 'rejected';
  if l.units_per_student is not null and mine >= l.units_per_student then raise exception 'You’ve reached the limit for this gig'; end if;
  amt := case when l.pay_model = 'per_unit' then l.rate
              else round(l.rate / greatest(coalesce(l.units_per_student,1),1), 2) end;
  select coalesce(sum(amount),0) into spent from public.submissions where listing_id = l.id and status <> 'rejected';
  if l.total_budget is not null and spent + amt > l.total_budget then raise exception 'Budget for this gig is used up'; end if;

  k := nullif(regexp_replace(lower(coalesce(clean->>'owner_phone', clean->>'phone', clean->>'email', clean->>'app_signup_email', '')), '[^a-z0-9@]', '', 'g'), '');
  insert into public.submissions(claim_id, listing_id, student_id, data, proof_path, amount, dedupe_key)
    values (c.id, l.id, auth.uid(), clean, p_proof, amt, k) returning * into s;
  return s;
exception when unique_violation then raise exception 'This business has already been submitted (same contact)';
end $$;

-- ───────────── 3. Profiles: lock more fields, cap lengths ─────────────
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
    new.kyc_note := old.kyc_note;
    new.referral_code := old.referral_code;
    if new.kyc_status is distinct from old.kyc_status then
      if not (new.kyc_status = 'pending' and old.kyc_status in ('unverified','rejected')) then
        new.kyc_status := old.kyc_status;
      end if;
    end if;
    -- documents must be the student's own uploads
    if new.id_card_path is distinct from old.id_card_path and split_part(coalesce(new.id_card_path,''), '/', 1) <> auth.uid()::text then new.id_card_path := old.id_card_path; end if;
    if new.student_card_path is distinct from old.student_card_path and split_part(coalesce(new.student_card_path,''), '/', 1) <> auth.uid()::text then new.student_card_path := old.student_card_path; end if;
    if new.selfie_path is distinct from old.selfie_path and split_part(coalesce(new.selfie_path,''), '/', 1) <> auth.uid()::text then new.selfie_path := old.selfie_path; end if;
    -- identity and payout details are locked once verified (changes go through an admin)
    if old.kyc_status = 'verified' then
      new.full_name := old.full_name; new.momo_number := old.momo_number;
      new.momo_provider := old.momo_provider; new.momo_name := old.momo_name;
      new.id_card_path := old.id_card_path; new.selfie_path := old.selfie_path;
      new.student_card_path := old.student_card_path; new.student_id_number := old.student_id_number;
    end if;
  end if;
  return new;
end $$;

-- keep profile email in sync with the login email (e.g. after an email change)
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.sync_profile_email();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(btrim(coalesce(new.raw_user_meta_data->>'full_name','')), 120))
  on conflict (id) do nothing;
  return new;
end $$;

do $$ begin
  alter table public.profiles add constraint profiles_len check (
    coalesce(length(full_name),0) <= 120 and coalesce(length(phone),0) <= 30 and coalesce(length(school),0) <= 120
    and coalesce(length(programme),0) <= 120 and coalesce(length(study_year),0) <= 30 and coalesce(length(student_id_number),0) <= 50
    and coalesce(length(city),0) <= 80 and coalesce(length(momo_provider),0) <= 40 and coalesce(length(momo_number),0) <= 30
    and coalesce(length(momo_name),0) <= 120 and coalesce(length(kyc_note),0) <= 1000
    and coalesce(length(id_card_path),0) <= 300 and coalesce(length(student_card_path),0) <= 300 and coalesce(length(selfie_path),0) <= 300);
exception when duplicate_object then null; end $$;

-- ───────────── 4. Business briefs: cap lengths + throttle spam ─────────────
do $$ begin
  alter table public.client_requests add constraint client_requests_len check (
    length(name) between 1 and 120 and length(email) between 3 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and coalesce(length(company),0) <= 160 and length(need) between 10 and 4000
    and coalesce(length(budget),0) <= 80 and coalesce(length(deadline),0) <= 80);
exception when duplicate_object then null; end $$;

create or replace function public.throttle_client_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.client_requests where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'You’ve sent a few briefs already — we’ll be in touch soon';
  end if;
  if (select count(*) from public.client_requests where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'We’re getting a lot of requests right now — please try again later';
  end if;
  new.status := 'new';
  return new;
end $$;
drop trigger if exists client_requests_throttle on public.client_requests;
create trigger client_requests_throttle before insert on public.client_requests
  for each row execute function public.throttle_client_requests();

-- ───────────── 5. Storage: no overwriting, images only, size caps ─────────────
drop policy if exists "kyc own replace" on storage.objects;
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
  where id in ('kyc','proofs');
update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp']
  where id = 'covers';
drop policy if exists "covers admin manage" on storage.objects;
create policy "covers admin manage" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_admin());
drop policy if exists "covers admin delete" on storage.objects;
create policy "covers admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_admin());

-- ───────────── 6. Listings: sanity checks ─────────────
do $$ begin
  alter table public.listings add constraint listings_sane check (
    rate >= 0 and slots between 1 and 10000 and (units_per_student is null or units_per_student between 1 and 100000)
    and (total_budget is null or total_budget >= 0) and length(title) between 3 and 160);
exception when duplicate_object then null; end $$;

-- ───────────── 7. Only signed-in users may call the app's functions ─────────────
revoke execute on function public.claim_listing(uuid) from public, anon;
revoke execute on function public.submit_work(uuid, jsonb, text) from public, anon;
revoke execute on function public.withdraw_claim(uuid) from public, anon;
grant execute on function public.claim_listing(uuid) to authenticated;
grant execute on function public.submit_work(uuid, jsonb, text) to authenticated;
grant execute on function public.withdraw_claim(uuid) to authenticated;
-- trigger-only helpers should never be called directly
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
revoke execute on function public.throttle_client_requests() from public, anon, authenticated;
