-- Gigotter — "Tick all that apply" questions, and a wording fix on the "You've been selected" email.
-- Replaces three functions only (create or replace). No tables, columns or data change; existing questions behave as before.
-- validate_answers: from 0014, plus the 'multi' check. submit_work: from 0008, plus the 'multi' check.
-- decide_applications: from 0014, with the email footer pointing to hello@gigotter.com (mail is sent from noreply@).
-- Requires 0014. Safe to run more than once.

create or replace function public.validate_answers(p_schema jsonb, p_data jsonb) returns jsonb
language plpgsql immutable as $$
declare clean jsonb := '{}'::jsonb; fld jsonb; k text; v text; typ text; lbl text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then p_data := '{}'::jsonb; end if;
  for fld in select * from jsonb_array_elements(coalesce(p_schema, '[]'::jsonb)) loop
    k := fld->>'key'; typ := coalesce(fld->>'type', 'text'); lbl := coalesce(fld->>'label', k);
    v := left(btrim(coalesce(p_data->>k, '')), case typ when 'long' then 1500 when 'address' then 500 when 'multi' then 1000 else 300 end);
    if v = '' then
      if coalesce((fld->>'required')::boolean, false) then raise exception 'Please answer: %', lbl; end if;
      continue;
    end if;
    if typ = 'email' and v !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception '% doesn’t look like an email', lbl; end if;
    if typ = 'phone' and regexp_replace(v, '\D', '', 'g') !~ '^[0-9]{7,15}$' then raise exception '% doesn’t look like a phone number', lbl; end if;
    if typ = 'number' and v !~ '^-?[0-9]+(\.[0-9]+)?$' then raise exception '% should be a number', lbl; end if;
    if typ = 'date' and v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception '% should be a date', lbl; end if;
    if typ = 'rating' and v !~ '^[1-5]$' then raise exception '% should be 1 to 5', lbl; end if;
    if typ = 'yes_no' and v not in ('Yes', 'No') then raise exception '% should be Yes or No', lbl; end if;
    if typ = 'choice' and not coalesce(fld->'options', '[]'::jsonb) ? v then raise exception 'Pick one of the options for: %', lbl; end if;
    if typ = 'multi' then
      -- "tick all that apply": every ticked item must be one of the options; stored tidily as "A, B, C"
      if exists (select 1 from regexp_split_to_table(v, ',') x where btrim(x) <> '' and not coalesce(fld->'options', '[]'::jsonb) ? btrim(x)) then
        raise exception 'Pick from the options for: %', lbl; end if;
      v := array_to_string(array(select btrim(x) from regexp_split_to_table(v, ',') x where btrim(x) <> ''), ', ');
      if v = '' then
        if coalesce((fld->>'required')::boolean, false) then raise exception 'Please answer: %', lbl; end if;
        continue;
      end if;
    end if;
    if typ = 'link' and v !~* '^https?://\S+\.\S+' then raise exception '% should be a full link starting with https://', lbl; end if;
    clean := clean || jsonb_build_object(k, v);
  end loop;
  return clean;
end $$;

create or replace function public.submit_work(p_claim uuid, p_data jsonb, p_proof text) returns public.submissions
language plpgsql security definer set search_path = public as $$
declare c public.claims; l public.listings; mine int; recent int; spent numeric; amt numeric;
        s public.submissions; k text; clean jsonb := '{}'::jsonb; v text; fld jsonb; typ text; lbl text;
        has_addr boolean := false; summ text;
begin
  select * into c from public.claims where id = p_claim and student_id = auth.uid();
  if c.id is null or c.status <> 'active' then raise exception 'Gig not active'; end if;
  select * into l from public.listings where id = c.listing_id;
  if l.status <> 'live' or l.expires_at < now() then raise exception 'This gig is closed'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Invalid submission'; end if;

  for fld in select * from jsonb_array_elements(l.form_schema) loop
    k := fld->>'key'; typ := coalesce(fld->>'type', 'text'); lbl := coalesce(fld->>'label', k);
    v := left(btrim(coalesce(p_data->>k, '')), case typ when 'long' then 1500 when 'address' then 500 when 'multi' then 1000 else 300 end);
    if v = '' then
      if coalesce((fld->>'required')::boolean, false) then raise exception 'Please answer: %', lbl; end if;
      continue;
    end if;
    if typ = 'email' and v !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception '% doesn’t look like an email', lbl; end if;
    if typ = 'phone' and regexp_replace(v, '\D', '', 'g') !~ '^[0-9]{7,15}$' then raise exception '% doesn’t look like a phone number', lbl; end if;
    if typ = 'number' and v !~ '^-?[0-9]+(\.[0-9]+)?$' then raise exception '% should be a number', lbl; end if;
    if typ = 'date' and v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception '% should be a date', lbl; end if;
    if typ = 'rating' and v !~ '^[1-5]$' then raise exception '% should be 1 to 5', lbl; end if;
    if typ = 'yes_no' and v not in ('Yes', 'No') then raise exception '% should be Yes or No', lbl; end if;
    if typ = 'choice' and not coalesce(fld->'options', '[]'::jsonb) ? v then raise exception 'Pick one of the options for: %', lbl; end if;
    if typ = 'multi' then
      -- "tick all that apply": every ticked item must be one of the options; stored tidily as "A, B, C"
      if exists (select 1 from regexp_split_to_table(v, ',') x where btrim(x) <> '' and not coalesce(fld->'options', '[]'::jsonb) ? btrim(x)) then
        raise exception 'Pick from the options for: %', lbl; end if;
      v := array_to_string(array(select btrim(x) from regexp_split_to_table(v, ',') x where btrim(x) <> ''), ', ');
      if v = '' then
        if coalesce((fld->>'required')::boolean, false) then raise exception 'Please answer: %', lbl; end if;
        continue;
      end if;
    end if;
    if typ = 'link' and v !~* '^https?://\S+\.\S+' then raise exception '% should be a full link starting with https://', lbl; end if;
    clean := clean || jsonb_build_object(k, v);
    if typ = 'address' then has_addr := true; end if;
    if summ is null and typ not in ('long', 'address', 'date', 'yes_no', 'rating', 'multi') then summ := left(v, 80); end if;
    -- the first "unique" answer stops the same person/business/link being submitted twice on this gig
    if s.dedupe_key is null and coalesce((fld->>'unique')::boolean, false) then
      s.dedupe_key := nullif(regexp_replace(lower(v), case when typ = 'phone' then '\D' else '[^a-z0-9@./]' end, '', 'g'), '');
      if typ = 'phone' then s.dedupe_key := right(s.dedupe_key, 9); end if;
    end if;
  end loop;

  -- GPS pin captured on the student's phone (kept only when the form has an address question)
  if has_addr then
    v := btrim(coalesce(p_data->>'gps', ''));
    if v ~ '^-?[0-9]{1,2}\.[0-9]{3,8},-?[0-9]{1,3}\.[0-9]{3,8}$' then clean := clean || jsonb_build_object('gps', v); end if;
    v := btrim(coalesce(p_data->>'gps_accuracy', ''));
    if v ~ '^[0-9]{1,5}$' and clean ? 'gps' then clean := clean || jsonb_build_object('gps_accuracy', v); end if;
  end if;
  if clean = '{}'::jsonb and p_proof is null then raise exception 'Fill in the details for this submission'; end if;

  -- photo: required / optional / not used
  if l.photo_rule = 'none' then p_proof := null; end if;
  if l.photo_rule = 'required' and p_proof is null then raise exception 'Add a photo as proof'; end if;
  if p_proof is not null and split_part(p_proof, '/', 1) <> auth.uid()::text then raise exception 'Invalid proof photo'; end if;

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

  insert into public.submissions(claim_id, listing_id, student_id, data, summary, proof_path, amount, dedupe_key)
    values (c.id, l.id, auth.uid(), clean, coalesce(summ, initcap(l.unit_label)), p_proof, amt, s.dedupe_key) returning * into s;
  return s;
exception when unique_violation then raise exception 'This has already been submitted on this gig';
end $$;
revoke execute on function public.submit_work(uuid, jsonb, text) from public, anon;
grant execute on function public.submit_work(uuid, jsonb, text) to authenticated;

create or replace function public.decide_applications(p_ids uuid[], p_status text, p_note text default null) returns int
language plpgsql security definer set search_path = public as $$
declare a record; taken int; done int := 0; first text; note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'Only admins can decide applications'; end if;
  if p_status not in ('shortlisted', 'accepted', 'declined', 'applied') then raise exception 'Unknown status'; end if;
  for a in
    select ap.*, l.title, l.slots, l.status as l_status, pr.email, pr.full_name
    from public.applications ap join public.listings l on l.id = ap.listing_id join public.profiles pr on pr.id = ap.applicant_id
    where ap.id = any(p_ids) and ap.status <> 'withdrawn' order by ap.created_at
  loop
    if a.status = p_status then continue; end if;
    first := html_escape(coalesce(nullif(split_part(btrim(a.full_name), ' ', 1), ''), 'there'));
    if p_status = 'accepted' then
      select count(*) into taken from public.claims where listing_id = a.listing_id and status in ('active', 'completed') and student_id <> a.applicant_id;
      if taken >= a.slots then raise exception 'There are no places left on “%”. Increase the number of people needed on the gig, or decline someone first', a.title; end if;
      insert into public.claims(listing_id, student_id) values (a.listing_id, a.applicant_id)
        on conflict (listing_id, student_id) do update set status = 'active';
      perform send_email(a.email, 'You’ve been selected: ' || a.title,
        email_layout('You’re in, ' || first || '!',
          'Good news: you’ve been selected for <b style="color:#15171A">' || html_escape(a.title) || '</b>. Open the gig on your dashboard for the details and what to do next.'
            || case when note is not null then '<br><br><b style="color:#15171A">' || html_escape(note) || '</b>' else '' end,
          'Open my dashboard', 'https://gigotter.com/me',
          'Can’t make it any more? Email hello@gigotter.com so we can offer your place to someone else.'));
    elsif a.status = 'accepted' then
      -- taking a place away: only if no work has been submitted yet
      if exists (select 1 from public.submissions s join public.claims c on c.id = s.claim_id
                 where c.listing_id = a.listing_id and c.student_id = a.applicant_id and s.status <> 'rejected') then
        raise exception '% has already submitted work on this gig, so their place can’t be removed', coalesce(a.full_name, 'This person');
      end if;
      update public.claims set status = 'removed' where listing_id = a.listing_id and student_id = a.applicant_id;
    end if;
    if p_status = 'declined' then
      perform send_email(a.email, 'Your application: ' || a.title,
        email_layout('Thanks for applying, ' || first,
          'We weren’t able to offer you a place on <b style="color:#15171A">' || html_escape(a.title) || '</b> this time. Places are limited and each gig looks for specific people, so please keep applying to new gigs.'
            || case when note is not null then '<br><br>' || html_escape(note) else '' end,
          'See open gigs', 'https://gigotter.com/gigs', 'Thank you for your interest in Gigotter.'));
    end if;
    update public.applications set status = p_status, admin_note = coalesce(note, admin_note),
      decided_at = case when p_status in ('accepted', 'declined') then now() else decided_at end
      where id = a.id;
    done := done + 1;
  end loop;
  return done;
end $$;
revoke execute on function public.decide_applications(uuid[], text, text) from public, anon;
grant execute on function public.decide_applications(uuid[], text, text) to authenticated;
