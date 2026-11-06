-- Gigotter — keep the GPS pin students capture with an address.
-- Same as submit_work in 0003, plus: when a gig asks for "location", a valid "lat,lng" GPS value
-- (and its accuracy in metres) captured on the student's phone is stored too. Safe to run more than once.

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
  -- GPS pin captured on the student's phone (kept only when the gig asks for an address)
  if 'location' = any(l.proof_fields) then
    v := btrim(coalesce(p_data->>'gps', ''));
    if v ~ '^-?[0-9]{1,2}\.[0-9]{3,8},-?[0-9]{1,3}\.[0-9]{3,8}$' then clean := clean || jsonb_build_object('gps', v); end if;
    v := btrim(coalesce(p_data->>'gps_accuracy', ''));
    if v ~ '^[0-9]{1,5}$' and clean ? 'gps' then clean := clean || jsonb_build_object('gps_accuracy', v); end if;
  end if;
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

revoke execute on function public.submit_work(uuid, jsonb, text) from public, anon;
grant execute on function public.submit_work(uuid, jsonb, text) to authenticated;
