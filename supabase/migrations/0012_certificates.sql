-- =====================================================================
-- 0012_certificates.sql
-- Certificate generation for event attendees.
--   issue_event_certificates  -> admin issues certs to checked-in attendees
--   list_my_certificates       -> a user's own certificates (+ event/org names)
--   certificate_by_serial      -> public verification by serial (anon-readable)
-- The certificates table + RLS (owner/admin select) already exist in 0004.
-- All writes go through the SECURITY DEFINER RPC below (no direct insert policy).
-- =====================================================================

-- A human-friendly, unguessable certificate serial.
create or replace function public.gen_cert_serial()
returns text language sql volatile
set search_path = ''
as $$
  select 'CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- Issue a certificate to everyone who checked in to an event. Admin only.
-- Idempotent: users who already hold a certificate for this event are skipped,
-- so it's safe to run again after more people are checked in. Returns the count
-- of NEW certificates created. `p_title` is optional — falls back to the event title.
create or replace function public.issue_event_certificates(p_event_id uuid, p_title text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev     public.events;
  issued int := 0;
begin
  select * into ev from public.events where id = p_event_id;
  if ev.id is null then raise exception 'event not found'; end if;
  if not public.has_org_role(ev.organization_id, array['admin']) then
    raise exception 'not allowed to issue certificates';
  end if;

  insert into public.certificates (organization_id, event_id, user_id, serial, title)
  select ev.organization_id, ev.id, r.user_id, public.gen_cert_serial(),
         coalesce(nullif(btrim(p_title), ''), ev.title)
  from public.event_registrations r
  where r.event_id = p_event_id
    and r.checked_in_at is not null
    and not exists (
      select 1 from public.certificates c
      where c.event_id = p_event_id and c.user_id = r.user_id
    );

  get diagnostics issued = row_count;
  return issued;
end;
$$;
grant execute on function public.issue_event_certificates(uuid, text) to authenticated;

-- The current user's certificates, with event + organization names.
create or replace function public.list_my_certificates()
returns table (
  serial      text,
  title       text,
  issued_at   timestamptz,
  event_title text,
  org_name    text
)
language sql stable security definer
set search_path = ''
as $$
  select c.serial, c.title, c.issued_at, e.title, o.name
  from public.certificates c
  join public.organizations o on o.id = c.organization_id
  left join public.events e on e.id = c.event_id
  where c.user_id = (select auth.uid())
  order by c.issued_at desc;
$$;
grant execute on function public.list_my_certificates() to authenticated;

-- Public verification by serial. Serials are random and unguessable, so knowing
-- one implies you hold the certificate; we return only what's printed on it.
create or replace function public.certificate_by_serial(p_serial text)
returns table (
  serial         text,
  title          text,
  issued_at      timestamptz,
  recipient_name text,
  event_title    text,
  org_name       text
)
language sql stable security definer
set search_path = ''
as $$
  select c.serial, c.title, c.issued_at,
         coalesce(p.full_name, 'Recipient'), e.title, o.name
  from public.certificates c
  join public.organizations o on o.id = c.organization_id
  left join public.events e on e.id = c.event_id
  left join public.profiles p on p.id = c.user_id
  where c.serial = p_serial;
$$;
grant execute on function public.certificate_by_serial(text) to anon, authenticated;
