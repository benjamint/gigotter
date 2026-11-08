-- Gigotter — record manual MoMo payments and email the student a receipt.
-- Payment itself stays manual (you send it from your phone); this records it, marks the submissions paid
-- and sends a receipt with a receipt number. Requires 0004 and 0008. Safe to run more than once.

create sequence if not exists public.payment_receipt_seq start 1001;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique default ('GIG-' || nextval('public.payment_receipt_seq')),
  student_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0 and amount < 1000000),
  currency text not null default 'GHS',
  method text,
  momo_number text,
  momo_name text,
  reference text check (char_length(reference) <= 80),
  note text check (char_length(note) <= 500),
  items int not null default 0,
  paid_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_student on public.payments(student_id, paid_at desc);
alter table public.submissions add column if not exists payment_id uuid references public.payments(id) on delete set null;

alter table public.payments enable row level security;
drop policy if exists "payments read" on public.payments;
create policy "payments read" on public.payments for select to authenticated using (student_id = auth.uid() or public.is_admin());
drop policy if exists "payments admin write" on public.payments;
create policy "payments admin write" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The receipt email
create or replace function public.send_payment_receipt(p_payment uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare pay public.payments; p public.profiles; gig text; items text; first text; row_style text :=
  'padding:10px 0;border-bottom:1px solid #E4E1D8;font-size:14px;color:#6B7077';
begin
  select * into pay from public.payments where id = p_payment;
  select * into p from public.profiles where id = pay.student_id;
  if pay.id is null or coalesce(p.email, '') = '' then return false; end if;
  select title into gig from public.listings where id = pay.listing_id;
  select string_agg('<li style="margin:2px 0">' || html_escape(coalesce(nullif(s.summary, ''), 'Submission')) || ' &middot; ' || money_fmt(s.amount, pay.currency) || '</li>', '' order by s.created_at)
    into items from (select * from public.submissions where payment_id = pay.id order by created_at limit 12) s;
  first := html_escape(coalesce(nullif(split_part(btrim(p.full_name), ' ', 1), ''), 'there'));

  perform send_email(p.email, 'Payment receipt ' || pay.receipt_no || ' · ' || money_fmt(pay.amount, pay.currency) || ' sent',
    email_layout('Payment sent, ' || first,
      'We’ve sent your Gigotter earnings to your mobile money. Here’s your receipt.'
      || '<div style="margin:22px 0 4px;padding:22px;border-radius:16px;background:#F7F6F2;text-align:center">'
      ||   '<div style="font-size:13px;color:#6B7077">Amount paid</div>'
      ||   '<div style="font-size:34px;font-weight:700;color:#15171A;letter-spacing:-0.5px">' || money_fmt(pay.amount, pay.currency) || '</div>'
      ||   '<div style="font-size:13px;color:#2F6B52;font-weight:600">&#10003; Payment successful</div></div>'
      || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px">'
      || '<tr><td style="' || row_style || '">Receipt no.</td><td align="right" style="' || row_style || ';color:#15171A;font-weight:600">' || pay.receipt_no || '</td></tr>'
      || '<tr><td style="' || row_style || '">Date</td><td align="right" style="' || row_style || ';color:#15171A">' || to_char(pay.paid_at at time zone 'Africa/Accra', 'DD Mon YYYY, HH24:MI') || '</td></tr>'
      || '<tr><td style="' || row_style || '">Paid to</td><td align="right" style="' || row_style || ';color:#15171A">' || html_escape(coalesce(pay.method, 'Mobile money'))
      ||   case when coalesce(pay.momo_number, '') <> '' then ' &middot; ending ' || html_escape(right(regexp_replace(pay.momo_number, '\D', '', 'g'), 3)) else '' end
      ||   case when coalesce(pay.momo_name, '') <> '' then '<br>' || html_escape(pay.momo_name) else '' end || '</td></tr>'
      || case when coalesce(pay.reference, '') <> '' then '<tr><td style="' || row_style || '">Transaction ID</td><td align="right" style="' || row_style || ';color:#15171A">' || html_escape(pay.reference) || '</td></tr>' else '' end
      || case when gig is not null then '<tr><td style="' || row_style || '">Gig</td><td align="right" style="' || row_style || ';color:#15171A">' || html_escape(gig) || '</td></tr>' else '' end
      || '</table>'
      || case when items is not null then '<div style="margin-top:18px;font-size:14px;color:#15171A;font-weight:600">For ' || pay.items || case when pay.items = 1 then ' submission' else ' submissions' end || '</div><ul style="margin:6px 0 0;padding-left:20px;font-size:14px;color:#6B7077">' || items || '</ul>' else '' end
      || case when coalesce(pay.note, '') <> '' then '<div style="margin-top:16px;padding:12px 14px;border-radius:12px;background:#EEF3EF;font-size:14px;color:#15171A">' || html_escape(pay.note) || '</div>' else '' end,
      'See my earnings', 'https://gigotter.com/me',
      'Keep this email as your receipt. If the money hasn’t reached you within 24 hours, reply to hello@gigotter.com quoting ' || pay.receipt_no || '.'));
  update public.payments set email_sent_at = now() where id = pay.id;
  return true;
end $$;
revoke execute on function public.send_payment_receipt(uuid) from public, anon, authenticated;

-- Admin: record a payment you sent, mark the submissions paid, email the receipt
create or replace function public.record_payment(p_student uuid, p_submissions uuid[], p_amount numeric,
  p_reference text default null, p_note text default null, p_paid_at timestamptz default null) returns public.payments
language plpgsql security definer set search_path = public as $$
declare p public.profiles; pay public.payments; n int; lst uuid; cur text;
begin
  if not public.is_admin() then raise exception 'Only admins can record payments'; end if;
  select * into p from public.profiles where id = p_student;
  if p.id is null then raise exception 'Student not found'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter the amount you sent'; end if;
  if coalesce(array_length(p_submissions, 1), 0) = 0 then raise exception 'Choose at least one approved submission'; end if;
  select count(*), min(listing_id::text)::uuid into n, lst from public.submissions
    where id = any(p_submissions) and student_id = p_student and status = 'approved' and payment_id is null;
  if n <> array_length(p_submissions, 1) then raise exception 'Some of those submissions aren’t approved and unpaid for this student any more. Refresh and try again'; end if;
  if (select count(distinct listing_id) from public.submissions where id = any(p_submissions)) > 1 then lst := null; end if;
  select coalesce((select currency from public.listings where id = lst), 'GHS') into cur;

  insert into public.payments(student_id, listing_id, amount, currency, method, momo_number, momo_name, reference, note, items, paid_at)
    values (p_student, lst, round(p_amount, 2), cur, p.momo_provider, p.momo_number, p.momo_name,
            nullif(btrim(coalesce(p_reference, '')), ''), nullif(btrim(coalesce(p_note, '')), ''), n, coalesce(p_paid_at, now()))
    returning * into pay;
  update public.submissions set status = 'paid', paid_at = pay.paid_at, payment_id = pay.id,
    payout_ref = coalesce(pay.reference, pay.receipt_no), reviewed_at = coalesce(reviewed_at, now())
    where id = any(p_submissions);
  perform public.send_payment_receipt(pay.id);
  select * into pay from public.payments where id = pay.id;
  return pay;
end $$;
revoke execute on function public.record_payment(uuid, uuid[], numeric, text, text, timestamptz) from public, anon;
grant execute on function public.record_payment(uuid, uuid[], numeric, text, text, timestamptz) to authenticated;

create or replace function public.resend_payment_receipt(p_payment uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare pay public.payments;
begin
  if not public.is_admin() then raise exception 'Only admins can send receipts'; end if;
  select * into pay from public.payments where id = p_payment;
  if pay.id is null then raise exception 'Payment not found'; end if;
  if pay.email_sent_at > now() - interval '2 minutes' then raise exception 'A receipt was just sent — wait a couple of minutes before sending again'; end if;
  if not public.send_payment_receipt(pay.id) then raise exception 'This student has no email address'; end if;
  return now();
end $$;
revoke execute on function public.resend_payment_receipt(uuid) from public, anon;
grant execute on function public.resend_payment_receipt(uuid) to authenticated;

-- Approved / paid emails skip submissions paid through record_payment (they get the receipt instead)
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
      and nw.payment_id is null  -- paid through record_payment: the receipt email covers it
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
