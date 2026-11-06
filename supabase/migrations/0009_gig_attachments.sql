-- Gigotter — attachments on gigs (manuals, onboarding docs, brochures, scripts).
-- Each file is either "public" (shown on the gig page to anyone) or "joined" (only students who joined the gig).
-- Files live in a PRIVATE bucket and are only ever served through short-lived signed links,
-- so a "joined" file can't be opened by guessing its address. Safe to run more than once.

create table if not exists public.listing_files (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  path text not null unique,
  size_bytes integer not null check (size_bytes between 1 and 26214400),
  mime text not null,
  visibility text not null default 'joined' check (visibility in ('public', 'joined')),
  created_at timestamptz not null default now()
);
create index if not exists listing_files_listing on public.listing_files(listing_id);

-- Who may see a file: admins; anyone for public files on published gigs; students who joined for the rest.
create or replace function public.can_read_listing_file(p_listing uuid, p_visibility text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.listings l
    where l.id = p_listing and l.status <> 'draft'
      and (p_visibility = 'public' or exists (
        select 1 from public.claims c
        where c.listing_id = l.id and c.student_id = auth.uid() and c.status in ('active', 'completed')))
  )
$$;
revoke execute on function public.can_read_listing_file(uuid, text) from public;
grant execute on function public.can_read_listing_file(uuid, text) to anon, authenticated;

alter table public.listing_files enable row level security;
drop policy if exists "listing files read" on public.listing_files;
create policy "listing files read" on public.listing_files for select
  using (public.can_read_listing_file(listing_id, visibility));
drop policy if exists "listing files admin write" on public.listing_files;
create policy "listing files admin write" on public.listing_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Private bucket: 25 MB, documents and images only (no executables, no macro-enabled Office files)
insert into storage.buckets (id, name, public) values ('gig-files', 'gig-files', false) on conflict (id) do nothing;
update storage.buckets set public = false, file_size_limit = 26214400,
  allowed_mime_types = array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv']
  where id = 'gig-files';

drop policy if exists "gig files read" on storage.objects;
create policy "gig files read" on storage.objects for select
  using (bucket_id = 'gig-files' and exists (
    select 1 from public.listing_files f where f.path = storage.objects.name
      and public.can_read_listing_file(f.listing_id, f.visibility)));
drop policy if exists "gig files admin upload" on storage.objects;
create policy "gig files admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'gig-files' and public.is_admin());
drop policy if exists "gig files admin update" on storage.objects;
create policy "gig files admin update" on storage.objects for update to authenticated
  using (bucket_id = 'gig-files' and public.is_admin());
drop policy if exists "gig files admin delete" on storage.objects;
create policy "gig files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gig-files' and public.is_admin());
