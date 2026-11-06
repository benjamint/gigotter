-- Gigotter — public "Recently paid" feed (real payouts only) + admin-managed testimonials.
-- Safe to run more than once.

-- ───────────── students can opt out of appearing in the feed ─────────────
alter table public.profiles add column if not exists show_in_feed boolean not null default true;

-- ───────────── recent real payouts, anonymised (first name + last initial, school) ─────────────
create or replace function public.payout_feed(p_limit int default 20)
returns table (name text, school text, amount numeric, currency text, gig text, units int, paid_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    initcap(split_part(btrim(p.full_name), ' ', 1)) ||
      case when position(' ' in btrim(p.full_name)) > 0
           then ' ' || upper(left(split_part(btrim(p.full_name), ' ', array_length(string_to_array(btrim(p.full_name), ' '), 1)), 1)) || '.'
           else '' end as name,
    nullif(p.school, '') as school,
    sum(s.amount) as amount,
    l.currency,
    l.title as gig,
    count(*)::int as units,
    max(s.paid_at) as paid_at
  from public.submissions s
  join public.profiles p on p.id = s.student_id
  join public.listings l on l.id = s.listing_id
  where s.status = 'paid' and s.paid_at > now() - interval '60 days'
    and p.show_in_feed and coalesce(btrim(p.full_name), '') <> ''
  group by p.id, p.full_name, p.school, l.id, l.currency, l.title, date_trunc('day', s.paid_at)
  order by max(s.paid_at) desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
revoke execute on function public.payout_feed(int) from public;
grant execute on function public.payout_feed(int) to anon, authenticated;

-- ───────────── testimonials (real quotes, published by an admin with the student's consent) ─────────────
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  school text check (length(school) <= 120),
  quote text not null check (length(quote) between 10 and 400),
  consent boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint testimonials_consent_before_publish check (not published or consent)
);
alter table public.testimonials enable row level security;
drop policy if exists "testimonials public read" on public.testimonials;
create policy "testimonials public read" on public.testimonials for select using (published or public.is_admin());
drop policy if exists "testimonials admin write" on public.testimonials;
create policy "testimonials admin write" on public.testimonials for all using (public.is_admin()) with check (public.is_admin());
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;
