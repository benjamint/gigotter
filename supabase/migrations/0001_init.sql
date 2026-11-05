-- Gigotter — initial schema
-- Run in Supabase SQL editor (or `supabase db push`). Then promote yourself:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

create extension if not exists pgcrypto;

-- ───────────────────────── enums ─────────────────────────
do $$ begin
  create type kyc_status as enum ('unverified','pending','verified','rejected');
  create type gig_type as enum ('onboarding','focus_group','research','survey','content','other');
  create type pay_model as enum ('per_unit','fixed');
  create type listing_status as enum ('draft','live','paused','closed');
  create type claim_status as enum ('active','completed','withdrawn','removed');
  create type submission_status as enum ('pending','approved','rejected','paid');
exception when duplicate_object then null; end $$;

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  school text,
  programme text,
  study_year text,
  student_id_number text,
  city text,
  role text not null default 'student' check (role in ('student','admin')),
  kyc_status kyc_status not null default 'unverified',
  kyc_note text,
  kyc_submitted_at timestamptz,
  id_card_path text,
  student_card_path text,
  selfie_path text,
  momo_provider text,
  momo_number text,
  momo_name text,
  referral_code text unique default upper(substr(encode(gen_random_bytes(4),'hex'),1,6)),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students can't promote themselves or self-verify
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- only guard app users; SQL editor / service role (no auth.uid) may change anything
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.kyc_note := old.kyc_note;
    new.referral_code := old.referral_code;
    -- students may only move unverified/rejected → pending
    if new.kyc_status is distinct from old.kyc_status then
      if not (new.kyc_status = 'pending' and old.kyc_status in ('unverified','rejected')) then
        new.kyc_status := old.kyc_status;
      end if;
    end if;
    -- lock identity + payout details once verified (changes go through admin)
    if old.kyc_status = 'verified' then
      new.full_name := old.full_name; new.momo_number := old.momo_number;
      new.momo_provider := old.momo_provider; new.momo_name := old.momo_name;
      new.id_card_path := old.id_card_path; new.selfie_path := old.selfie_path;
      new.student_card_path := old.student_card_path;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ───────────────────────── listings ─────────────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type gig_type not null default 'onboarding',
  summary text,
  description text,
  requirements text[] not null default '{}',
  location text,
  is_remote boolean not null default false,
  pay_model pay_model not null default 'per_unit',
  rate numeric(12,2) not null default 0,          -- per unit, or total per student when fixed
  unit_label text not null default 'business',     -- e.g. "salon", "response", "session"
  units_per_student int,                           -- quota per student (null = unlimited until budget)
  total_budget numeric(12,2),                      -- hard cap across all students
  currency text not null default 'GHS',
  slots int not null default 1 check (slots > 0),  -- how many students can join
  proof_fields text[] not null default '{business_name,owner_name,owner_phone,location}',
  expires_at timestamptz not null,
  status listing_status not null default 'live',
  accent text not null default 'glow',
  emoji text not null default '✨',
  client_name text,                                -- for the future agency model
  cover_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ───────────────────────── claims (student joins a gig) ─────────────────────────
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status claim_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (listing_id, student_id)
);

-- ───────────────────────── submissions (proof of work, one per unit) ─────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}',
  dedupe_key text,             -- normalised phone/name, catches the same business twice
  proof_path text,
  status submission_status not null default 'pending',
  amount numeric(12,2),
  admin_note text,
  reviewed_at timestamptz,
  paid_at timestamptz,
  payout_ref text,
  created_at timestamptz not null default now()
);
create unique index if not exists submissions_dedupe on public.submissions(listing_id, dedupe_key)
  where dedupe_key is not null and status <> 'rejected';

-- ───────────────────────── client briefs (future agency) ─────────────────────────
create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, company text,
  need text not null, budget text, deadline text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ───────────────────────── public stats view helpers ─────────────────────────
create or replace view public.listing_stats with (security_invoker = false) as
  select l.id as listing_id,
    (select count(*) from public.claims c where c.listing_id = l.id and c.status in ('active','completed'))::int as taken,
    (select count(*) from public.submissions s where s.listing_id = l.id and s.status in ('approved','paid'))::int as approved_units,
    coalesce((select sum(amount) from public.submissions s where s.listing_id = l.id and s.status in ('pending','approved','paid')),0) as committed
  from public.listings l where l.status <> 'draft';
grant select on public.listing_stats to anon, authenticated;

-- ───────────────────────── RPC: join a gig atomically ─────────────────────────
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
  select count(*) into taken from public.claims where listing_id = l.id and status in ('active','completed');
  if taken >= l.slots then raise exception 'All spots are taken'; end if;
  insert into public.claims(listing_id, student_id) values (l.id, p.id)
    on conflict (listing_id, student_id) do update set status = 'active'
    returning * into c;
  return c;
end $$;

-- ───────────────────────── RPC: submit one unit of work ─────────────────────────
create or replace function public.submit_work(p_claim uuid, p_data jsonb, p_proof text) returns public.submissions
language plpgsql security definer set search_path = public as $$
declare c public.claims; l public.listings; mine int; spent numeric; amt numeric; s public.submissions; k text;
begin
  select * into c from public.claims where id = p_claim and student_id = auth.uid();
  if c.id is null or c.status <> 'active' then raise exception 'Gig not active'; end if;
  select * into l from public.listings where id = c.listing_id;
  if l.expires_at < now() then raise exception 'This gig has expired'; end if;
  select count(*) into mine from public.submissions where claim_id = c.id and status <> 'rejected';
  if l.units_per_student is not null and mine >= l.units_per_student then raise exception 'You have reached the limit for this gig'; end if;
  amt := case when l.pay_model = 'per_unit' then l.rate
              else round(l.rate / greatest(coalesce(l.units_per_student,1),1), 2) end;
  select coalesce(sum(amount),0) into spent from public.submissions where listing_id = l.id and status <> 'rejected';
  if l.total_budget is not null and spent + amt > l.total_budget then raise exception 'Budget for this gig is used up'; end if;
  k := nullif(regexp_replace(lower(coalesce(p_data->>'owner_phone', p_data->>'phone', p_data->>'email', '')), '[^a-z0-9@]', '', 'g'), '');
  insert into public.submissions(claim_id, listing_id, student_id, data, proof_path, amount, dedupe_key)
    values (c.id, l.id, auth.uid(), p_data, p_proof, amt, k) returning * into s;
  return s;
exception when unique_violation then raise exception 'This business has already been submitted (same contact)';
end $$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.claims enable row level security;
alter table public.submissions enable row level security;
alter table public.client_requests enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "listings public read" on public.listings;
create policy "listings public read" on public.listings for select using (status <> 'draft' or public.is_admin());
drop policy if exists "listings admin write" on public.listings;
create policy "listings admin write" on public.listings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "claims read" on public.claims;
create policy "claims read" on public.claims for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "claims own withdraw" on public.claims;
create policy "claims own withdraw" on public.claims for update using (student_id = auth.uid() or public.is_admin());

drop policy if exists "subs read" on public.submissions;
create policy "subs read" on public.submissions for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "subs admin update" on public.submissions;
create policy "subs admin update" on public.submissions for update using (public.is_admin());

drop policy if exists "briefs anyone insert" on public.client_requests;
create policy "briefs anyone insert" on public.client_requests for insert with check (true);
drop policy if exists "briefs admin read" on public.client_requests;
create policy "briefs admin read" on public.client_requests for select using (public.is_admin());
drop policy if exists "briefs admin update" on public.client_requests;
create policy "briefs admin update" on public.client_requests for update using (public.is_admin());

-- ───────────────────────── Storage (private buckets) ─────────────────────────
insert into storage.buckets (id, name, public) values ('kyc','kyc',false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('proofs','proofs',false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('covers','covers',true) on conflict (id) do nothing;

drop policy if exists "covers admin write" on storage.objects;
create policy "covers admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_admin());

drop policy if exists "kyc own upload" on storage.objects;
create policy "kyc own upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('kyc','proofs') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "kyc own read" on storage.objects;
create policy "kyc own read" on storage.objects for select to authenticated
  using (bucket_id in ('kyc','proofs') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "kyc own replace" on storage.objects;
create policy "kyc own replace" on storage.objects for update to authenticated
  using (bucket_id in ('kyc','proofs') and (storage.foldername(name))[1] = auth.uid()::text);
