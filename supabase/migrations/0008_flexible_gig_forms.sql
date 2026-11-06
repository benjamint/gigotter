-- Gigotter — every gig gets its own submission form.
-- Onboarding asks for business details; a focus group asks "did you attend?"; an app test asks for a rating
-- and feedback; an errand asks for a drop-off address and photo. Admins build the form per gig.
-- Safe to run more than once.

-- 1) new kinds of work
alter type public.gig_type add value if not exists 'app_testing';
alter type public.gig_type add value if not exists 'errand';

-- 2) the form itself, the photo rule, and a short name for each submission
alter table public.listings add column if not exists form_schema jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists photo_rule text not null default 'required';
alter table public.listings add column if not exists photo_hint text;
alter table public.submissions add column if not exists summary text;

do $$ begin
  alter table public.listings add constraint listings_photo_rule_check check (photo_rule in ('required','optional','none'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.listings add constraint listings_form_schema_check
    check (jsonb_typeof(form_schema) = 'array' and jsonb_array_length(form_schema) <= 30);
exception when duplicate_object then null; end $$;

-- 3) convert existing gigs (fixed business fields) into forms, so old and new gigs work the same way
update public.listings l set form_schema = (
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', k,
    'label', case k when 'business_name' then 'Business name' when 'owner_name' then 'Founder / owner name'
                    when 'owner_phone' then 'Owner phone' when 'email' then 'Email' when 'location' then 'Full address'
                    when 'digital_address' then 'Ghana Post digital address' when 'instagram' then 'Instagram / TikTok'
                    when 'app_signup_email' then 'Email they signed up with' when 'notes' then 'Notes' else initcap(replace(k,'_',' ')) end,
    'type', case k when 'owner_phone' then 'phone' when 'email' then 'email' when 'app_signup_email' then 'email'
                   when 'location' then 'address' when 'notes' then 'long' else 'text' end,
    'required', k not in ('digital_address','instagram','notes'),
    'unique', k = 'owner_phone'
  ) order by ord), '[]'::jsonb)
  from unnest(l.proof_fields) with ordinality as t(k, ord)
) where l.form_schema = '[]'::jsonb;

update public.submissions set summary = left(coalesce(nullif(data->>'business_name',''), nullif(data->>'owner_name',''), nullif(data->>'email','')), 80)
where summary is null;

-- 4) submit_work: validate every answer against the gig's form
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
    v := left(btrim(coalesce(p_data->>k, '')), case typ when 'long' then 1500 when 'address' then 500 else 300 end);
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
    if typ = 'link' and v !~* '^https?://\S+\.\S+' then raise exception '% should be a full link starting with https://', lbl; end if;
    clean := clean || jsonb_build_object(k, v);
    if typ = 'address' then has_addr := true; end if;
    if summ is null and typ not in ('long', 'address', 'date', 'yes_no', 'rating') then summ := left(v, 80); end if;
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

-- 5) emails name each submission by its summary instead of assuming a business
create or replace function public.notify_submission_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record; first text; items text; more int; subject text; heading text; body text; note text; n int;
begin
  for r in
    select nw.student_id, nw.status, p.email, p.full_name, p.momo_provider, p.momo_number, l.currency,
           count(*) as cnt, sum(coalesce(nw.amount,0)) as total,
           array_agg(html_escape(coalesce(nullif(nw.summary,''), nullif(nw.data->>'business_name',''), nullif(nw.data->>'owner_name',''), initcap(l.unit_label))) order by nw.created_at) as names,
           string_agg(distinct html_escape(l.title), ', ') as gigs,
           max(nw.payout_ref) as ref,
           array_remove(array_agg(distinct html_escape(nullif(btrim(nw.admin_note), ''))), null) as notes
    from new_rows nw
    join old_rows od on od.id = nw.id
    join profiles p on p.id = nw.student_id
    join listings l on l.id = nw.listing_id
    where nw.status is distinct from od.status and nw.status in ('approved', 'paid', 'rejected')
    group by nw.student_id, nw.status, p.email, p.full_name, p.momo_provider, p.momo_number, l.currency
  loop
    first := html_escape(coalesce(nullif(split_part(btrim(r.full_name), ' ', 1), ''), 'there'));
    n := least(coalesce(array_length(r.names, 1), 0), 8);
    more := r.cnt - n;
    items := '<ul style="margin:0 0 4px;padding-left:20px;color:#15171A">'
             || (select string_agg('<li style="margin:2px 0">' || x || '</li>', '') from unnest(r.names[1:n]) x)
             || case when more > 0 then '<li style="margin:2px 0;color:#6B7077">+ ' || more || ' more</li>' else '' end || '</ul>';

    if r.status = 'approved' then
      subject := 'Approved: ' || money_fmt(r.total, r.currency) || ' on its way';
      heading := 'Nice work, ' || first || '!';
      body := r.cnt || case when r.cnt = 1 then ' submission' else ' submissions' end || ' for <b style="color:#15171A">' || r.gigs
              || '</b> ' || case when r.cnt = 1 then 'was' else 'were' end || ' approved — <b style="color:#15171A">'
              || money_fmt(r.total, r.currency) || '</b> will be sent to your mobile money in the next weekly payout.<br><br>' || items;
      perform send_email(r.email, subject, email_layout(heading, body, 'See my earnings', 'https://gigotter.com/me',
        'Keep going — every approved submission adds to your next payout.'));

    elsif r.status = 'paid' then
      subject := money_fmt(r.total, r.currency) || ' sent to your mobile money';
      heading := 'You’ve been paid, ' || first;
      body := 'We’ve sent <b style="color:#15171A">' || money_fmt(r.total, r.currency) || '</b> to your '
              || coalesce(html_escape(r.momo_provider), 'mobile money') || ' account'
              || case when coalesce(r.momo_number, '') <> '' then ' ending <b style="color:#15171A">' || html_escape(right(regexp_replace(r.momo_number, '\D', '', 'g'), 3)) || '</b>' else '' end
              || ' for ' || r.cnt || case when r.cnt = 1 then ' submission' else ' submissions' end || ' on <b style="color:#15171A">' || r.gigs || '</b>.<br><br>' || items
              || case when coalesce(r.ref, '') <> '' then '<br>Payout reference: <b style="color:#15171A">' || html_escape(r.ref) || '</b>' else '' end;
      perform send_email(r.email, subject, email_layout(heading, body, 'Find more gigs', 'https://gigotter.com/gigs',
        'Didn’t receive it within 24 hours? Reply to hello@gigotter.com with the reference above.'));

    elsif r.status = 'rejected' then
      subject := case when r.cnt = 1 then 'A submission needs your attention' else r.cnt || ' submissions need your attention' end;
      heading := 'Quick check needed, ' || first;
      note := case when coalesce(array_length(r.notes, 1), 0) > 0
                   then '<br><br>Here’s why:<br><b style="color:#15171A">' || array_to_string(r.notes, '<br>') || '</b>' else '' end;
      body := 'We couldn’t approve ' || case when r.cnt = 1 then 'this submission' else 'these submissions' end
              || ' for <b style="color:#15171A">' || r.gigs || '</b>:<br><br>' || items || note;
      perform send_email(r.email, subject, email_layout(heading, body, 'Open my gig', 'https://gigotter.com/me',
        'If you think this is a mistake, reply to hello@gigotter.com and we’ll take another look.'));
    end if;
  end loop;
  return null;
end $$;
revoke execute on function public.notify_submission_changes() from public, anon, authenticated;
