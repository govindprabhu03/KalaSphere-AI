-- =====================================================================
-- 0006_workshops_classes.sql
-- Phase 3: Workshops (enroll like events) + Cultural Classes
-- (classes -> batches -> student enrollments -> sessions -> attendance,
--  plus assignments). Published workshops/classes are publicly readable.
-- =====================================================================

-- ---------------- Workshops ----------------
create table if not exists public.workshops (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  category        text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  capacity        int,
  price_cents     int not null default 0,
  currency        text not null default 'INR',
  is_published    boolean not null default false,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists workshops_org_idx on public.workshops (organization_id);

create table if not exists public.workshop_enrollments (
  id              uuid primary key default gen_random_uuid(),
  workshop_id     uuid not null references public.workshops (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  status          text not null default 'enrolled' check (status in ('enrolled', 'cancelled')),
  payment_status  text not null default 'not_required'
                    check (payment_status in ('not_required', 'pending', 'paid', 'failed')),
  amount_cents    int not null default 0,
  created_at      timestamptz not null default now(),
  unique (workshop_id, user_id)
);

-- ---------------- Cultural Classes ----------------
create table if not exists public.classes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  discipline      text,
  fee_cents       int not null default 0,
  currency        text not null default 'INR',
  is_published    boolean not null default false,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
create index if not exists classes_org_idx on public.classes (organization_id);

create table if not exists public.batches (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  faculty_user_id uuid references auth.users (id) on delete set null,
  schedule_text   text,
  capacity        int,
  created_at      timestamptz not null default now()
);
create index if not exists batches_class_idx on public.batches (class_id);

create table if not exists public.class_enrollments (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.batches (id) on delete cascade,
  class_id         uuid not null references public.classes (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  student_user_id  uuid not null references auth.users (id) on delete cascade,
  status           text not null default 'active' check (status in ('active', 'left')),
  created_at       timestamptz not null default now(),
  unique (batch_id, student_user_id)
);

create table if not exists public.class_sessions (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.batches (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text,
  session_date    date not null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.class_attendance (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.class_sessions (id) on delete cascade,
  batch_id         uuid not null references public.batches (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  student_user_id  uuid not null references auth.users (id) on delete cascade,
  present          boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (session_id, student_user_id)
);

create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.batches (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.workshops            enable row level security;
alter table public.workshop_enrollments enable row level security;
alter table public.classes              enable row level security;
alter table public.batches              enable row level security;
alter table public.class_enrollments    enable row level security;
alter table public.class_sessions       enable row level security;
alter table public.class_attendance     enable row level security;
alter table public.assignments          enable row level security;

-- Helper: is a class published? (definer, for public batch reads)
create or replace function public.class_is_published(cid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.classes c where c.id = cid and c.is_published); $$;
grant execute on function public.class_is_published(uuid) to anon, authenticated;

-- ---------------- RLS ----------------
create policy workshops_select on public.workshops
  for select to anon, authenticated
  using (is_published = true or public.is_org_member(organization_id));
create policy workshops_write on public.workshops
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy wenroll_select on public.workshop_enrollments
  for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin', 'faculty']));

create policy classes_select on public.classes
  for select to anon, authenticated
  using (is_published = true or public.is_org_member(organization_id));
create policy classes_write on public.classes
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy batches_select on public.batches
  for select to anon, authenticated
  using (public.is_org_member(organization_id) or public.class_is_published(class_id));
create policy batches_write on public.batches
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy cenroll_select on public.class_enrollments
  for select to authenticated
  using (student_user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin', 'faculty']));

create policy sessions_manage on public.class_sessions
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin', 'faculty']))
  with check (public.has_org_role(organization_id, array['admin', 'faculty']));

create policy attendance_select on public.class_attendance
  for select to authenticated
  using (student_user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin', 'faculty']));

create policy assignments_manage on public.assignments
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin', 'faculty']))
  with check (public.has_org_role(organization_id, array['admin', 'faculty']));
create policy assignments_student_select on public.assignments
  for select to authenticated
  using (exists (
    select 1 from public.class_enrollments ce
    where ce.batch_id = assignments.batch_id
      and ce.student_user_id = (select auth.uid())
      and ce.status = 'active'
  ));

grant select on public.workshops, public.classes, public.batches to anon, authenticated;
grant insert, update, delete on public.workshops, public.classes, public.batches,
      public.class_sessions, public.assignments to authenticated;
grant select on public.workshop_enrollments, public.class_enrollments,
      public.class_attendance to authenticated;

-- updated_at triggers
create or replace function public.set_updated_at_generic()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists workshops_updated on public.workshops;
create trigger workshops_updated before update on public.workshops
  for each row execute function public.set_updated_at_generic();
drop trigger if exists classes_updated on public.classes;
create trigger classes_updated before update on public.classes
  for each row execute function public.set_updated_at_generic();

-- ---------------- RPCs ----------------
create or replace function public.enroll_in_workshop(p_workshop_id uuid)
returns public.workshop_enrollments
language plpgsql security definer set search_path = ''
as $$
declare w public.workshops; en public.workshop_enrollments; taken int;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into w from public.workshops where id = p_workshop_id;
  if w.id is null or not w.is_published then raise exception 'workshop not open'; end if;
  select * into en from public.workshop_enrollments
    where workshop_id = p_workshop_id and user_id = (select auth.uid());
  if en.id is not null then return en; end if;
  if w.capacity is not null then
    select count(*) into taken from public.workshop_enrollments
      where workshop_id = p_workshop_id and status = 'enrolled';
    if taken >= w.capacity then raise exception 'workshop is full'; end if;
  end if;
  insert into public.workshop_enrollments
    (workshop_id, organization_id, user_id, amount_cents, payment_status)
  values (p_workshop_id, w.organization_id, (select auth.uid()), w.price_cents,
          case when w.price_cents > 0 then 'pending' else 'not_required' end)
  returning * into en;
  return en;
end; $$;
grant execute on function public.enroll_in_workshop(uuid) to authenticated;

create or replace function public.enroll_in_class(p_batch_id uuid)
returns public.class_enrollments
language plpgsql security definer set search_path = ''
as $$
declare b public.batches; c public.classes; en public.class_enrollments; taken int;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into b from public.batches where id = p_batch_id;
  if b.id is null then raise exception 'batch not found'; end if;
  select * into c from public.classes where id = b.class_id;
  if not c.is_published then raise exception 'class not open for enrollment'; end if;
  select * into en from public.class_enrollments
    where batch_id = p_batch_id and student_user_id = (select auth.uid());
  if en.id is not null then return en; end if;
  if b.capacity is not null then
    select count(*) into taken from public.class_enrollments
      where batch_id = p_batch_id and status = 'active';
    if taken >= b.capacity then raise exception 'batch is full'; end if;
  end if;
  insert into public.class_enrollments
    (batch_id, class_id, organization_id, student_user_id)
  values (p_batch_id, b.class_id, b.organization_id, (select auth.uid()))
  returning * into en;
  return en;
end; $$;
grant execute on function public.enroll_in_class(uuid) to authenticated;

create or replace function public.mark_class_attendance(
  p_session_id uuid, p_student uuid, p_present boolean
)
returns public.class_attendance
language plpgsql security definer set search_path = ''
as $$
declare s public.class_sessions; att public.class_attendance;
begin
  select * into s from public.class_sessions where id = p_session_id;
  if s.id is null then raise exception 'session not found'; end if;
  if not public.has_org_role(s.organization_id, array['admin', 'faculty']) then
    raise exception 'not allowed'; end if;
  insert into public.class_attendance (session_id, batch_id, organization_id, student_user_id, present)
  values (p_session_id, s.batch_id, s.organization_id, p_student, p_present)
  on conflict (session_id, student_user_id) do update set present = excluded.present
  returning * into att;
  return att;
end; $$;
grant execute on function public.mark_class_attendance(uuid, uuid, boolean) to authenticated;

create or replace function public.list_batch_students(p_batch_id uuid)
returns table (enrollment_id uuid, student_user_id uuid, full_name text, email text, status text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.student_user_id, p.full_name, u.email::text, e.status
  from public.class_enrollments e
  join public.batches b on b.id = e.batch_id
  join auth.users u on u.id = e.student_user_id
  left join public.profiles p on p.id = e.student_user_id
  where e.batch_id = p_batch_id
    and public.has_org_role(b.organization_id, array['admin', 'faculty'])
  order by e.created_at asc;
$$;
grant execute on function public.list_batch_students(uuid) to authenticated;

create or replace function public.list_workshop_enrollments(p_workshop_id uuid)
returns table (enrollment_id uuid, user_id uuid, full_name text, email text, payment_status text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.user_id, p.full_name, u.email::text, e.payment_status
  from public.workshop_enrollments e
  join public.workshops w on w.id = e.workshop_id
  join auth.users u on u.id = e.user_id
  left join public.profiles p on p.id = e.user_id
  where e.workshop_id = p_workshop_id
    and public.has_org_role(w.organization_id, array['admin', 'faculty'])
  order by e.created_at asc;
$$;
grant execute on function public.list_workshop_enrollments(uuid) to authenticated;
