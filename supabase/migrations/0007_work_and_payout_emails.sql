-- Gigotter — email students when their work is approved, rejected or paid.
-- One email per student per admin action (e.g. "Approve all 30" sends each student ONE email listing their items).
-- Requires 0004_verification_emails.sql (send_email, email_layout, html_escape) and the Resend key in Vault.
-- Safe to run more than once.

create or replace function public.money_fmt(p_amount numeric, p_currency text) returns text
language sql immutable as $$
  select case upper(coalesce(p_currency,'GHS')) when 'GHS' then '₵' when 'USD' then '$' when 'NGN' then '₦' when 'KES' then 'KSh ' else upper(p_currency) || ' ' end
         || to_char(coalesce(p_amount,0), 'FM999,999,990.00')
$$;

create or replace function public.notify_submission_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record; first text; items text; more int; subject text; heading text; body text; note text; n int;
begin
  for r in
    select nw.student_id, nw.status, p.email, p.full_name, p.momo_provider, p.momo_number, l.currency,
           count(*) as cnt, sum(coalesce(nw.amount,0)) as total,
           array_agg(html_escape(coalesce(nullif(nw.data->>'business_name',''), nullif(nw.data->>'owner_name',''), initcap(l.unit_label))) order by nw.created_at) as names,
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

drop trigger if exists submissions_status_email on public.submissions;
create trigger submissions_status_email
  after update on public.submissions
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.notify_submission_changes();
