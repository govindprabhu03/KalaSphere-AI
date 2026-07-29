-- =====================================================================
-- 0004_events.sql
-- Phase 2: the event flow.
--   events -> registrations (with QR ticket_code) -> attendance (check-in)
--   -> feedback -> certificates.  payments is the cross-cutting money table.
-- Public visitors can read PUBLISHED events (per-org microsites). All writes go
-- through SECURITY DEFINER RPCs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.events (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations (id) on delete cascade,
  slug                   text not null,
  title                  text not null,
  description            text,
  category               text,
  location_text          text,
  starts_at              timestamptz not null,
  ends_at                timestamptz,
  capacity               int,                          -- null = unlimited
  price_cents            int not null default 0,       -- 0 = free
  currency               text not null default 'INR',
  cover_image_url        text,
  is_published           boolean not null default false,
  registration_closes_at timestamptz,
  created_by             uuid references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists events_org_idx on public.events (organization_id);
create index if not exists events_pub_idx
  on public.events (organization_id, is_published, starts_at);

create table if not exists public.event_registrations (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  status          text not null default 'registered'
                    check (status in ('registered', 'cancelled')),
  payment_status  text not null default 'not_required'
                    check (payment_status in ('not_required', 'pending', 'paid', 'failed')),
  amount_cents    int not null default 0,
  ticket_code     text unique,
  checked_in_at   timestamptz,
  checked_in_by   uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists reg_event_idx on public.event_registrations (event_id);
create index if not exists reg_user_idx on public.event_registrations (user_id);

create table if not exists public.event_feedback (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  rating          int not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.certificates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id        uuid references public.events (id) on delete set null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  serial          text not null unique,
  title           text not null,
  issued_at       timestamptz not null default now()
);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  user_id             uuid references auth.users (id) on delete set null,
  registration_id     uuid references public.event_registrations (id) on delete set null,
  provider            text not null default 'razorpay',
  provider_order_id   text,
  provider_payment_id text,
  amount_cents        int not null,
  currency            text not null default 'INR',
  status              text not null default 'created'
                        check (status in ('created', 'paid', 'failed', 'refunded')),
  created_at          timestamptz not null default now()
);

alter table public.events               enable row level security;
alter table public.event_registrations  enable row level security;
alter table public.event_feedback        enable row level security;
alter table public.certificates          enable row level security;
alter table public.payments              enable row level security;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

-- events: published events are world-readable (public microsites); org members
-- also see drafts. Only admins write (via UI actions under RLS).
create policy events_select on public.events
  for select to anon, authenticated
  using (is_published = true or public.is_org_member(organization_id));

create policy events_insert on public.events
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['admin']));
create policy events_update on public.events
  for update to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));
create policy events_delete on public.events
  for delete to authenticated
  using (public.has_org_role(organization_id, array['admin']));

-- registrations: a user sees their own; admins/faculty see all for their org.
-- Writes happen through RPCs only.
create policy reg_select on public.event_registrations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['admin', 'faculty'])
  );

-- feedback / certificates / payments: owner or org admin/faculty can read.
create policy feedback_select on public.event_feedback
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['admin', 'faculty'])
  );

create policy certificates_select on public.certificates
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['admin'])
  );

create policy payments_select on public.payments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['admin'])
  );

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select on public.event_registrations, public.event_feedback,
                public.certificates, public.payments to authenticated;

-- ---------------------------------------------------------------------
-- Helpers + RPCs
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at_events()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at_events();

-- A short, human-friendly ticket code.
create or replace function public.gen_ticket_code()
returns text language sql volatile
set search_path = ''
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

-- Register the current user for an event. Free events get a ticket immediately;
-- paid events start 'pending' (ticket issued after payment).
create or replace function public.register_for_event(p_event_id uuid)
returns public.event_registrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev  public.events;
  reg public.event_registrations;
  taken int;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  select * into ev from public.events where id = p_event_id;
  if ev.id is null then raise exception 'event not found'; end if;
  if not ev.is_published then raise exception 'event is not open for registration'; end if;
  if ev.registration_closes_at is not null and ev.registration_closes_at < now() then
    raise exception 'registration has closed';
  end if;

  select * into reg from public.event_registrations
  where event_id = p_event_id and user_id = (select auth.uid());
  if reg.id is not null then
    return reg;  -- already registered
  end if;

  if ev.capacity is not null then
    select count(*) into taken from public.event_registrations
    where event_id = p_event_id and status = 'registered';
    if taken >= ev.capacity then raise exception 'this event is full'; end if;
  end if;

  insert into public.event_registrations
    (event_id, organization_id, user_id, amount_cents, payment_status, ticket_code)
  values (
    p_event_id, ev.organization_id, (select auth.uid()), ev.price_cents,
    case when ev.price_cents > 0 then 'pending' else 'not_required' end,
    case when ev.price_cents > 0 then null else public.gen_ticket_code() end
  )
  returning * into reg;

  return reg;
end;
$$;
grant execute on function public.register_for_event(uuid) to authenticated;

-- Scan/enter a ticket code to mark attendance. Admin/faculty only.
create or replace function public.check_in_ticket(p_code text)
returns table (registration_id uuid, attendee text, event_title text, already boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reg public.event_registrations;
  ev  public.events;
  prof public.profiles;
  was_already boolean;
begin
  select * into reg from public.event_registrations
  where ticket_code = upper(p_code);
  if reg.id is null then raise exception 'invalid ticket'; end if;

  if not public.has_org_role(reg.organization_id, array['admin', 'faculty']) then
    raise exception 'not allowed to check in tickets';
  end if;

  select * into ev from public.events where id = reg.event_id;
  select * into prof from public.profiles where id = reg.user_id;

  was_already := reg.checked_in_at is not null;
  if not was_already then
    update public.event_registrations
      set checked_in_at = now(), checked_in_by = (select auth.uid())
      where id = reg.id;
  end if;

  return query select reg.id, coalesce(prof.full_name, 'Attendee'), ev.title, was_already;
end;
$$;
grant execute on function public.check_in_ticket(text) to authenticated;

-- List an event's registrations (admin/faculty) with attendee identity.
create or replace function public.list_event_registrations(p_event_id uuid)
returns table (
  registration_id uuid,
  user_id         uuid,
  full_name       text,
  email           text,
  status          text,
  payment_status  text,
  ticket_code     text,
  checked_in_at   timestamptz,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, p.full_name, u.email::text, r.status, r.payment_status,
         r.ticket_code, r.checked_in_at, r.created_at
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = r.user_id
  where r.event_id = p_event_id
    and public.has_org_role(e.organization_id, array['admin', 'faculty'])
  order by r.created_at asc;
$$;
grant execute on function public.list_event_registrations(uuid) to authenticated;

-- Submit feedback for an event the user registered for.
create or replace function public.submit_event_feedback(
  p_event_id uuid, p_rating int, p_comment text
)
returns public.event_feedback
language plpgsql
security definer
set search_path = ''
as $$
declare
  reg public.event_registrations;
  fb  public.event_feedback;
begin
  select * into reg from public.event_registrations
  where event_id = p_event_id and user_id = (select auth.uid());
  if reg.id is null then raise exception 'you did not attend this event'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating must be 1-5'; end if;

  insert into public.event_feedback (event_id, organization_id, user_id, rating, comment)
  values (p_event_id, reg.organization_id, (select auth.uid()), p_rating, nullif(p_comment, ''))
  on conflict (event_id, user_id)
    do update set rating = excluded.rating, comment = excluded.comment
  returning * into fb;

  return fb;
end;
$$;
grant execute on function public.submit_event_feedback(uuid, int, text) to authenticated;
