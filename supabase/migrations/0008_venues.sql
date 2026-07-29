-- =====================================================================
-- 0008_venues.sql  (Phase 5)
-- Venues + booking requests with conflict detection and admin approval.
-- Published venues are world-readable; approved bookings block overlaps.
-- =====================================================================

create table if not exists public.venues (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  description     text,
  capacity        int,
  base_rate_cents int not null default 0,
  facilities      text[] not null default '{}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists venues_org_idx on public.venues (organization_id);

create table if not exists public.venue_bookings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  venue_id        uuid not null references public.venues (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  title           text not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'requested'
                    check (status in ('requested', 'approved', 'rejected', 'cancelled')),
  facilities      text[] not null default '{}',
  notes           text,
  decided_by      uuid references auth.users (id) on delete set null,
  decided_at      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists bookings_venue_idx on public.venue_bookings (venue_id);
create index if not exists bookings_org_idx on public.venue_bookings (organization_id);

alter table public.venues         enable row level security;
alter table public.venue_bookings enable row level security;

create policy venues_select on public.venues
  for select to anon, authenticated
  using (is_active = true or public.is_org_member(organization_id));
create policy venues_write on public.venues
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy bookings_select on public.venue_bookings
  for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin']));

grant select on public.venues to anon, authenticated;
grant insert, update, delete on public.venues to authenticated;
grant select on public.venue_bookings to authenticated;

-- Request a booking (any signed-in user). Rejected if it overlaps an approved one.
create or replace function public.request_booking(
  p_venue uuid, p_starts timestamptz, p_ends timestamptz,
  p_title text, p_facilities text[], p_notes text
)
returns public.venue_bookings
language plpgsql security definer set search_path = ''
as $$
declare v public.venues; bk public.venue_bookings;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if p_ends <= p_starts then raise exception 'end must be after start'; end if;
  select * into v from public.venues where id = p_venue;
  if v.id is null or not v.is_active then raise exception 'venue not available'; end if;

  if exists (
    select 1 from public.venue_bookings b
    where b.venue_id = p_venue and b.status = 'approved'
      and b.starts_at < p_ends and b.ends_at > p_starts
  ) then
    raise exception 'that time slot is already booked';
  end if;

  insert into public.venue_bookings
    (organization_id, venue_id, user_id, title, starts_at, ends_at, facilities, notes)
  values (v.organization_id, p_venue, (select auth.uid()), p_title, p_starts, p_ends,
          coalesce(p_facilities, '{}'), nullif(p_notes, ''))
  returning * into bk;
  return bk;
end; $$;
grant execute on function public.request_booking(uuid, timestamptz, timestamptz, text, text[], text) to authenticated;

-- Approve/reject a booking (admin). Approving re-checks for conflicts.
create or replace function public.decide_booking(p_booking uuid, p_approve boolean)
returns public.venue_bookings
language plpgsql security definer set search_path = ''
as $$
declare bk public.venue_bookings;
begin
  select * into bk from public.venue_bookings where id = p_booking;
  if bk.id is null then raise exception 'booking not found'; end if;
  if not public.has_org_role(bk.organization_id, array['admin']) then
    raise exception 'not allowed'; end if;

  if p_approve then
    if exists (
      select 1 from public.venue_bookings b
      where b.venue_id = bk.venue_id and b.status = 'approved' and b.id <> bk.id
        and b.starts_at < bk.ends_at and b.ends_at > bk.starts_at
    ) then
      raise exception 'conflicts with an already-approved booking';
    end if;
  end if;

  update public.venue_bookings
    set status = case when p_approve then 'approved' else 'rejected' end,
        decided_by = (select auth.uid()), decided_at = now()
    where id = p_booking
  returning * into bk;
  return bk;
end; $$;
grant execute on function public.decide_booking(uuid, boolean) to authenticated;

-- Admin: all bookings for the org with requester identity.
create or replace function public.list_org_bookings(p_org uuid)
returns table (
  booking_id uuid, venue_name text, title text, requester text,
  starts_at timestamptz, ends_at timestamptz, status text,
  facilities text[], notes text
)
language sql stable security definer set search_path = ''
as $$
  select b.id, v.name, b.title, coalesce(p.full_name, u.email::text),
         b.starts_at, b.ends_at, b.status, b.facilities, b.notes
  from public.venue_bookings b
  join public.venues v on v.id = b.venue_id
  join auth.users u on u.id = b.user_id
  left join public.profiles p on p.id = b.user_id
  where b.organization_id = p_org
    and public.has_org_role(p_org, array['admin'])
  order by b.created_at desc;
$$;
grant execute on function public.list_org_bookings(uuid) to authenticated;

-- Public: approved (busy) time ranges for a venue, no requester info.
create or replace function public.list_venue_busy(p_venue uuid)
returns table (starts_at timestamptz, ends_at timestamptz, title text)
language sql stable security definer set search_path = ''
as $$
  select b.starts_at, b.ends_at, b.title
  from public.venue_bookings b
  where b.venue_id = p_venue and b.status = 'approved' and b.ends_at > now()
  order by b.starts_at asc;
$$;
grant execute on function public.list_venue_busy(uuid) to anon, authenticated;
