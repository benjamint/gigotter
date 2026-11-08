-- Gigotter — count QR code scans and the sign-ups they bring in.
-- Each printed code points to gigotter.com/s/<code>. Opening it logs one scan (no names, no IP addresses:
-- just the time, device type and a random per-browser id) and forwards to the page chosen for that code.
-- Safe to run more than once.

create table if not exists public.qr_codes (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9-]{1,23}$'),
  label text not null check (char_length(label) between 1 and 80),
  target text not null default '/' check (target ~ '^/[A-Za-z0-9/_-]*$' and char_length(target) <= 80),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.qr_scans (
  id bigserial primary key,
  code text not null references public.qr_codes(code) on delete cascade,
  visitor text check (visitor ~ '^[a-z0-9-]{8,40}$'),
  device text not null default 'other' check (device in ('mobile', 'tablet', 'desktop', 'other')),
  scanned_at timestamptz not null default now()
);
create index if not exists qr_scans_code_time on public.qr_scans(code, scanned_at desc);

alter table public.qr_codes enable row level security;
alter table public.qr_scans enable row level security;
drop policy if exists "qr codes admin" on public.qr_codes;
create policy "qr codes admin" on public.qr_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "qr scans admin read" on public.qr_scans;
create policy "qr scans admin read" on public.qr_scans for select to authenticated using (public.is_admin());
drop policy if exists "qr scans admin delete" on public.qr_scans;
create policy "qr scans admin delete" on public.qr_scans for delete to authenticated using (public.is_admin());

-- Called by the /s/<code> page. Records the scan and returns where to send the visitor.
create or replace function public.log_scan(p_code text, p_visitor text, p_device text) returns text
language plpgsql security definer set search_path = public as $$
declare c public.qr_codes; v text := nullif(lower(btrim(coalesce(p_visitor, ''))), ''); d text := lower(coalesce(p_device, 'other'));
begin
  select * into c from public.qr_codes where code = lower(btrim(coalesce(p_code, '')));
  if c.code is null then return '/'; end if;
  if c.archived then return c.target; end if;
  if v is not null and v !~ '^[a-z0-9-]{8,40}$' then v := null; end if;
  if d not in ('mobile', 'tablet', 'desktop', 'other') then d := 'other'; end if;
  -- the same browser reopening the link within 30 minutes isn't a new scan
  if v is not null and exists (select 1 from public.qr_scans where code = c.code and visitor = v and scanned_at > now() - interval '30 minutes') then
    return c.target;
  end if;
  -- flood guard: a single code can't record more than 120 scans a minute
  if (select count(*) from public.qr_scans where code = c.code and scanned_at > now() - interval '1 minute') >= 120 then
    return c.target;
  end if;
  insert into public.qr_scans(code, visitor, device) values (c.code, v, d);
  return c.target;
end $$;
revoke execute on function public.log_scan(text, text, text) from public;
grant execute on function public.log_scan(text, text, text) to anon, authenticated;

-- Which code (if any) a student first arrived through. Set once at sign-up, never changeable by students.
alter table public.profiles add column if not exists signup_source text;

create or replace function public.set_signup_source() returns trigger
language plpgsql security definer set search_path = public as $$
declare src text;
begin
  if tg_op = 'INSERT' then
    select lower(btrim(raw_user_meta_data->>'signup_source')) into src from auth.users where id = new.id;
    new.signup_source := case when exists (select 1 from public.qr_codes where code = src) then src end;
  elsif auth.uid() is not null and not public.is_admin() then
    new.signup_source := old.signup_source;
  end if;
  return new;
end $$;
revoke execute on function public.set_signup_source() from public, anon, authenticated;
drop trigger if exists profiles_signup_source on public.profiles;
create trigger profiles_signup_source before insert or update on public.profiles
  for each row execute function public.set_signup_source();

-- Admin dashboard numbers, one row per code
create or replace function public.qr_stats() returns table (
  code text, label text, target text, archived boolean, created_at timestamptz,
  scans bigint, people bigint, scans_7d bigint, mobile bigint, last_scan timestamptz, signups bigint, verified bigint, daily int[]
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select q.code, q.label, q.target, q.archived, q.created_at,
    (select count(*) from qr_scans s where s.code = q.code),
    (select count(distinct coalesce(s.visitor, s.id::text)) from qr_scans s where s.code = q.code),
    (select count(*) from qr_scans s where s.code = q.code and s.scanned_at > now() - interval '7 days'),
    (select count(*) from qr_scans s where s.code = q.code and s.device in ('mobile', 'tablet')),
    (select max(s.scanned_at) from qr_scans s where s.code = q.code),
    (select count(*) from profiles p where p.signup_source = q.code),
    (select count(*) from profiles p where p.signup_source = q.code and p.kyc_status = 'verified'),
    (select array_agg(coalesce(n, 0)::int order by day) from (
       select g::date as day, (select count(*) from qr_scans s where s.code = q.code and s.scanned_at::date = g::date) as n
       from generate_series(current_date - 13, current_date, interval '1 day') g) t)
  from qr_codes q
  order by q.archived, q.created_at desc;
end $$;
revoke execute on function public.qr_stats() from public, anon;
grant execute on function public.qr_stats() to authenticated;

-- Codes for the materials made so far
insert into public.qr_codes(code, label, target) values
  ('brochure', 'A4 brochure', '/'),
  ('card', 'QR card / poster', '/'),
  ('tiktok', 'TikTok', '/')
on conflict (code) do nothing;
