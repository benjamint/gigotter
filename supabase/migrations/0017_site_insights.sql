-- Gigotter — count site visits and power the admin Insights tab.
-- Additions only: one new table and two new functions. No existing table, row or function is changed.
-- What is stored per page view: the page (gig and account ids replaced by ":id"), the time, phone/tablet/computer,
-- where the visit came from (a website, a share link, a QR code or a campaign tag), a random per-browser id,
-- a random per-visit id, and the account id if the person is signed in. No names, no IP addresses.
-- Admins' own visits are not counted. Safe to run more than once.

create table if not exists public.page_views (
  id bigserial primary key,
  path text not null check (char_length(path) between 1 and 120 and path ~ '^/'),
  gig_id uuid references public.listings(id) on delete set null,
  visitor text check (visitor ~ '^[a-z0-9-]{8,40}$'),
  session text check (session ~ '^[a-z0-9-]{8,40}$'),
  source text not null default 'direct' check (source ~ '^[a-z0-9.:_-]{1,60}$'),
  device text not null default 'other' check (device in ('mobile', 'tablet', 'desktop', 'other')),
  user_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index if not exists page_views_time on public.page_views(viewed_at desc);
create index if not exists page_views_visitor on public.page_views(visitor, viewed_at);
create index if not exists page_views_gig on public.page_views(gig_id, viewed_at) where gig_id is not null;
create index if not exists page_views_user on public.page_views(user_id, viewed_at) where user_id is not null;

alter table public.page_views enable row level security;
-- nobody writes directly: visits only come in through log_view() below
drop policy if exists "page views admin read" on public.page_views;
create policy "page views admin read" on public.page_views for select to authenticated using (public.is_admin());
drop policy if exists "page views admin delete" on public.page_views;
create policy "page views admin delete" on public.page_views for delete to authenticated using (public.is_admin());

-- Called by the site on every page change. Cleans the input, ignores admins and floods, never errors.
create or replace function public.log_view(p_path text, p_visitor text, p_session text, p_source text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pth text := btrim(coalesce(p_path, ''));
  v text := nullif(lower(btrim(coalesce(p_visitor, ''))), '');
  s text := nullif(lower(btrim(coalesce(p_session, ''))), '');
  src text := lower(btrim(coalesce(p_source, 'direct')));
  dev text := lower(coalesce(p_device, 'other'));
  gid uuid;
  me uuid := auth.uid();
begin
  if me is not null and public.is_admin() then return; end if;
  pth := split_part(split_part(pth, '?', 1), '#', 1);
  if pth !~ '^/[A-Za-z0-9/_.:-]{0,119}$' or pth ~* '^/(admin|s/)' then return; end if;
  if pth ~* '^/gigs/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/?$' then
    gid := substring(pth from 7 for 36)::uuid;
    if not exists (select 1 from public.listings where id = gid) then gid := null; end if;
  end if;
  pth := regexp_replace(pth, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', ':id', 'g');
  if char_length(pth) > 1 then pth := rtrim(pth, '/'); end if;
  if v is not null and v !~ '^[a-z0-9-]{8,40}$' then v := null; end if;
  if s is not null and s !~ '^[a-z0-9-]{8,40}$' then s := null; end if;
  if src !~ '^[a-z0-9.:_-]{1,60}$' then src := 'other'; end if;
  if dev not in ('mobile', 'tablet', 'desktop', 'other') then dev := 'other'; end if;
  -- the same browser on the same page within 10 seconds is one view (reloads, double renders)
  if v is not null and exists (select 1 from public.page_views where visitor = v and path = pth and viewed_at > now() - interval '10 seconds') then return; end if;
  -- flood guards: 60 views a minute per browser, 1,000 a minute for the whole site
  if v is not null and (select count(*) from public.page_views where visitor = v and viewed_at > now() - interval '1 minute') >= 60 then return; end if;
  if (select count(*) from public.page_views where viewed_at > now() - interval '1 minute') >= 1000 then return; end if;
  insert into public.page_views(path, gig_id, visitor, session, source, device, user_id) values (pth, gid, v, s, src, dev, me);
exception when others then return;
end $$;
revoke execute on function public.log_view(text, text, text, text, text) from public;
grant execute on function public.log_view(text, text, text, text, text) to anon, authenticated;

-- Everything the Insights tab shows, for the last p_days days (and the same span before it, for comparison).
create or replace function public.site_insights(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d int := least(greatest(coalesce(p_days, 30), 1), 365);
  t0 timestamptz := date_trunc('day', now()) - make_interval(days => d - 1);
  tp timestamptz := t0 - make_interval(days => d);
  res jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  with
  v as (select * from public.page_views where viewed_at >= t0),
  pv as (select * from public.page_views where viewed_at >= tp and viewed_at < t0),
  -- where each browser first came from, and which browser each account used first
  first_src as (select distinct on (visitor) visitor, source from public.page_views where visitor is not null order by visitor, viewed_at),
  acct as (select distinct on (user_id) user_id, visitor from public.page_views where user_id is not null and visitor is not null order by user_id, viewed_at),
  su as (
    select p.id, p.kyc_status::text as kyc, coalesce(fs.source, 'unknown') as src
    from public.profiles p left join acct on acct.user_id = p.id left join first_src fs on fs.visitor = acct.visitor
    where p.role <> 'admin' and p.created_at >= t0
  ),
  sess as (select distinct on (session) session, visitor, source from v where session is not null order by session, viewed_at)
  select jsonb_build_object(
    'days', d,
    'since', t0,
    'first_view', (select min(viewed_at) from public.page_views),
    'totals', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor), 'sessions', count(distinct session)) from v),
    'prev', (select jsonb_build_object('views', count(*), 'visitors', count(distinct visitor), 'sessions', count(distinct session)) from pv),
    'signups', (select count(*) from su),
    'prev_signups', (select count(*) from public.profiles where role <> 'admin' and created_at >= tp and created_at < t0),
    'returning', (select count(*) from (select visitor from v where visitor is not null group by visitor having count(distinct date_trunc('day', viewed_at)) > 1) z),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(g, 'YYYY-MM-DD'), 'views', coalesce(x.views, 0), 'visitors', coalesce(x.visitors, 0), 'signups', coalesce(s.n, 0)) order by g), '[]'::jsonb)
      from generate_series(t0, date_trunc('day', now()), interval '1 day') g
      left join (select date_trunc('day', viewed_at) dd, count(*) views, count(distinct visitor) visitors from v group by 1) x on x.dd = g
      left join (select date_trunc('day', created_at) dd, count(*) n from public.profiles where role <> 'admin' and created_at >= t0 group by 1) s on s.dd = g
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', coalesce(a.source, b.src), 'visitors', coalesce(a.visitors, 0), 'sessions', coalesce(a.sessions, 0), 'signups', coalesce(b.n, 0))
        order by coalesce(a.visitors, 0) desc, coalesce(b.n, 0) desc), '[]'::jsonb)
      from (select source, count(*) sessions, count(distinct visitor) visitors from sess group by source) a
      full join (select src, count(*) n from su group by src) b on b.src = a.source
    ),
    'pages', (
      select coalesce(jsonb_agg(r order by r.views desc), '[]'::jsonb) from (
        select path, count(*) views, count(distinct visitor) visitors from v group by path order by count(*) desc limit 12
      ) r
    ),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', device, 'visitors', n) order by n desc), '[]'::jsonb) from (select device, count(distinct visitor) n from v group by device) r),
    'gigs', (
      select coalesce(jsonb_agg(r order by r.visitors desc, r.views desc), '[]'::jsonb) from (
        select l.id, l.title, l.status::text as status, l.join_mode, l.expires_at,
          coalesce(gv.views, 0) as views, coalesce(gv.visitors, 0) as visitors,
          (select count(*) from public.applications a where a.listing_id = l.id and a.created_at >= t0) as applied,
          (select count(*) from public.claims c where c.listing_id = l.id and c.created_at >= t0) as joined
        from public.listings l
        left join (select gig_id, count(*) views, count(distinct visitor) visitors from v where gig_id is not null group by gig_id) gv on gv.gig_id = l.id
        where gv.gig_id is not null or (l.status = 'live' and l.expires_at > now())
        order by coalesce(gv.visitors, 0) desc limit 25
      ) r
    ),
    -- people who signed up in this period, and how far they got
    'funnel', jsonb_build_object(
      'visitors', (select count(distinct visitor) from v),
      'signups', (select count(*) from su),
      'verified', (select count(*) from su where kyc = 'verified'),
      'took_part', (select count(*) from su where exists (select 1 from public.applications a where a.applicant_id = su.id)
                                              or exists (select 1 from public.claims c where c.student_id = su.id)),
      'completed', (select count(*) from su where exists (select 1 from public.submissions x where x.student_id = su.id and x.status in ('approved', 'paid'))
                                              or exists (select 1 from public.claims c where c.student_id = su.id and c.status = 'completed')),
      'paid', (select count(*) from su where exists (select 1 from public.submissions x where x.student_id = su.id and x.status = 'paid')
                                         or exists (select 1 from public.payments y where y.student_id = su.id))
    )
  ) into res;
  return res;
end $$;
revoke execute on function public.site_insights(int) from public, anon;
grant execute on function public.site_insights(int) to authenticated;
