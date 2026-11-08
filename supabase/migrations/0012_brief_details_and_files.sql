-- Gigotter — richer business briefs: phone number, kind of work, location, attachments, admin notes,
-- and a link to the gig a brief was turned into. Safe to run more than once.

alter table public.client_requests add column if not exists phone text;
alter table public.client_requests add column if not exists work_type text;
alter table public.client_requests add column if not exists location text;
alter table public.client_requests add column if not exists admin_note text;
alter table public.client_requests add column if not exists listing_id uuid references public.listings(id) on delete set null;

do $$ begin
  alter table public.client_requests add constraint client_requests_extra_len check (
    (phone is null or (length(phone) <= 40 and regexp_replace(phone, '\D', '', 'g') ~ '^[0-9]{7,15}$'))
    and coalesce(length(work_type), 0) <= 40 and coalesce(length(location), 0) <= 160 and coalesce(length(admin_note), 0) <= 4000);
exception when duplicate_object then null; end $$;

-- the public can only send a brief, never set admin fields
create or replace function public.sanitize_brief() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.admin_note := null; new.listing_id := null; end if;
  return new;
end $$;
revoke execute on function public.sanitize_brief() from public, anon, authenticated;
drop trigger if exists client_requests_sanitize on public.client_requests;
create trigger client_requests_sanitize before insert on public.client_requests
  for each row execute function public.sanitize_brief();

-- ───────── attachments: private bucket; uploads only right after sending a brief, max 5 per brief ─────────
insert into storage.buckets (id, name, public) values ('brief-files', 'brief-files', false) on conflict (id) do nothing;
update storage.buckets set public = false, file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv']
  where id = 'brief-files';

create or replace function public.brief_upload_allowed(p_folder text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_requests r where r.id::text = p_folder and r.created_at > now() - interval '30 minutes')
     and (select count(*) from storage.objects o where o.bucket_id = 'brief-files' and o.name like p_folder || '/%') < 5
$$;
revoke execute on function public.brief_upload_allowed(text) from public;
grant execute on function public.brief_upload_allowed(text) to anon, authenticated;

drop policy if exists "brief files upload" on storage.objects;
create policy "brief files upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'brief-files' and public.brief_upload_allowed((storage.foldername(name))[1]));
drop policy if exists "brief files admin read" on storage.objects;
create policy "brief files admin read" on storage.objects for select to authenticated
  using (bucket_id = 'brief-files' and public.is_admin());
drop policy if exists "brief files admin delete" on storage.objects;
create policy "brief files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'brief-files' and public.is_admin());
