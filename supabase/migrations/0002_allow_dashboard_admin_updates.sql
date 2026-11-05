-- Fix: the profile guard also blocked changes made from the Supabase SQL editor
-- (which runs with no logged-in user), so promoting an admin was silently undone.
-- Only enforce the guard for requests from signed-in app users.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.kyc_note := old.kyc_note;
    new.referral_code := old.referral_code;
    if new.kyc_status is distinct from old.kyc_status then
      if not (new.kyc_status = 'pending' and old.kyc_status in ('unverified','rejected')) then
        new.kyc_status := old.kyc_status;
      end if;
    end if;
    if old.kyc_status = 'verified' then
      new.full_name := old.full_name; new.momo_number := old.momo_number;
      new.momo_provider := old.momo_provider; new.momo_name := old.momo_name;
      new.id_card_path := old.id_card_path; new.selfie_path := old.selfie_path;
      new.student_card_path := old.student_card_path;
    end if;
  end if;
  return new;
end $$;
