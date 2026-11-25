-- Gigotter — invite admins by email from the dashboard (Admin › Team).
-- Additive only: one new table and new functions. No existing rows are changed.
-- guard_profile_update is re-declared with the same rules as 0003, plus one switch that only
-- accept_admin_invite() turns on, so an invited person can be made an admin.
-- Requires 0004 (send_email, email_layout, html_escape) and the Resend key in Vault.

-- ───────────── invites ─────────────
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (name is null or char_length(name) <= 80),
  token_hash text not null,                       -- sha256 of the link token; the token itself is only in the email
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz
);
-- at most one open invite per email
create unique index if not exists admin_invites_open_email on public.admin_invites (email) where accepted_at is null and revoked_at is null;
create index if not exists admin_invites_token on public.admin_invites (token_hash);

alter table public.admin_invites enable row level security;
drop policy if exists "admins read invites" on public.admin_invites;
create policy "admins read invites" on public.admin_invites for select using (public.is_admin());
-- no insert/update/delete policies: changes only go through the functions below
-- and the token hash is never readable from the app
revoke all on public.admin_invites from anon, authenticated;
grant select (id, email, name, invited_by, created_at, sent_at, expires_at, accepted_at, accepted_by, revoked_at)
  on public.admin_invites to authenticated;

create or replace function public.admin_invite_hash(p_token text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;
revoke execute on function public.admin_invite_hash(text) from public, anon, authenticated;

-- ───────────── same profile guard as 0003, with a switch for accepted invites ─────────────
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if auth.uid() is not null and not public.is_admin() then
    -- only accept_admin_invite() sets this, for the signed-in person's own row, after checking the invite
    if coalesce(current_setting('gigotter.admin_invite', true), '') <> new.id::text then
      new.role := old.role;
    end if;
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
revoke execute on function public.guard_profile_update() from public, anon, authenticated;

-- ───────────── send (or resend) an invite ─────────────
create or replace function public.invite_admin(p_email text, p_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare e text := lower(btrim(coalesce(p_email, '')));
        n text := nullif(btrim(coalesce(p_name, '')), '');
        tok text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
        inviter text;
        inv public.admin_invites;
        first text;
begin
  if not public.is_admin() then raise exception 'Only admins can invite admins'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(e) > 254 then raise exception 'Enter a valid email address'; end if;
  if n is not null and char_length(n) > 80 then raise exception 'Name is too long'; end if;
  if exists (select 1 from public.profiles where lower(email) = e and role = 'admin') then raise exception 'That person is already an admin'; end if;

  select * into inv from public.admin_invites where email = e and accepted_at is null and revoked_at is null for update;
  if inv.id is not null then
    if inv.sent_at > now() - interval '1 minute' then raise exception 'An invite was just sent to this email. Wait a minute before sending again'; end if;
    update public.admin_invites set token_hash = public.admin_invite_hash(tok), name = coalesce(n, name), invited_by = auth.uid(),
      sent_at = now(), expires_at = now() + interval '7 days' where id = inv.id returning * into inv;
  else
    insert into public.admin_invites (email, name, token_hash, invited_by)
      values (e, n, public.admin_invite_hash(tok), auth.uid()) returning * into inv;
  end if;

  select coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'A Gigotter admin') into inviter from public.profiles where id = auth.uid();
  first := coalesce(nullif(split_part(coalesce(inv.name, ''), ' ', 1), ''), 'there');
  perform send_email(e, html_escape(coalesce(inviter, 'A Gigotter admin')) || ' invited you to help run Gigotter',
    email_layout('You’re invited, ' || html_escape(first) || '!',
      html_escape(coalesce(inviter, 'A Gigotter admin')) || ' has invited you to join the Gigotter team as an <b>admin</b>. '
        || 'You’ll be able to review students, post gigs, check work and manage payouts and rewards.'
        || '<br><br>Sign up or log in with <b style="color:#15171A">' || html_escape(e) || '</b>, then accept the invite.',
      'Accept invite', 'https://gigotter.com/admin-invite?token=' || tok,
      'This link works once and expires in 7 days. If you weren’t expecting it, you can ignore this email.'));
  return inv.id;
end $$;
revoke execute on function public.invite_admin(text, text) from public, anon;
grant execute on function public.invite_admin(text, text) to authenticated;

-- ───────────── cancel an invite ─────────────
create or replace function public.revoke_admin_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can cancel invites'; end if;
  update public.admin_invites set revoked_at = now() where id = p_invite and accepted_at is null and revoked_at is null;
  if not found then raise exception 'That invite is no longer open'; end if;
end $$;
revoke execute on function public.revoke_admin_invite(uuid) from public, anon;
grant execute on function public.revoke_admin_invite(uuid) to authenticated;

-- ───────────── who is this invite for (shown on the accept page) ─────────────
create or replace function public.admin_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare inv public.admin_invites; who text;
begin
  select * into inv from public.admin_invites where token_hash = public.admin_invite_hash(p_token);
  if inv.id is null then return jsonb_build_object('status', 'invalid'); end if;
  select coalesce(nullif(btrim(full_name), ''), 'A Gigotter admin') into who from public.profiles where id = inv.invited_by;
  return jsonb_build_object(
    'status', case when inv.accepted_at is not null then 'accepted' when inv.revoked_at is not null then 'revoked'
                   when inv.expires_at < now() then 'expired' else 'open' end,
    'email', inv.email, 'name', inv.name, 'invited_by', coalesce(who, 'A Gigotter admin'));
end $$;
revoke execute on function public.admin_invite_info(text) from public;
grant execute on function public.admin_invite_info(text) to anon, authenticated;

-- ───────────── accept: the signed-in person, with the invited email, becomes an admin ─────────────
create or replace function public.accept_admin_invite(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare inv public.admin_invites; mine text;
begin
  if auth.uid() is null then raise exception 'Log in first, then open the invite link again'; end if;
  select * into inv from public.admin_invites where token_hash = public.admin_invite_hash(p_token) for update;
  if inv.id is null then raise exception 'This invite link isn’t valid. Ask an admin to send a new one'; end if;
  if inv.accepted_at is not null then raise exception 'This invite has already been used'; end if;
  if inv.revoked_at is not null then raise exception 'This invite was cancelled. Ask an admin to send a new one'; end if;
  if inv.expires_at < now() then raise exception 'This invite has expired. Ask an admin to send a new one'; end if;
  select lower(email) into mine from auth.users where id = auth.uid();
  if mine is distinct from inv.email then raise exception 'This invite is for %. Log in with that email to accept it', inv.email; end if;

  perform set_config('gigotter.admin_invite', auth.uid()::text, true);
  update public.profiles set role = 'admin' where id = auth.uid();
  perform set_config('gigotter.admin_invite', '', true);
  update public.admin_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
end $$;
revoke execute on function public.accept_admin_invite(text) from public, anon;
grant execute on function public.accept_admin_invite(text) to authenticated;
