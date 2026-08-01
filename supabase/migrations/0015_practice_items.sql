-- =====================================================================
-- 0015_practice_items.sql
-- A batch's weekly practice plan (riyaz / abhyaas routine). Faculty set items;
-- enrolled students see them grouped by day.
--   list_my_practice -> a student's practice items across enrolled batches
-- Faculty create/delete via the manage RLS below (like assignments in 0006).
-- =====================================================================

create table if not exists public.practice_items (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references public.batches (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null,
  notes           text,
  day_of_week     int check (day_of_week between 0 and 6),  -- 0=Sun … 6=Sat, null=any day
  duration_min    int check (duration_min > 0),
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists practice_batch_idx on public.practice_items (batch_id);

alter table public.practice_items enable row level security;

-- Staff manage their org's practice items.
create policy practice_manage on public.practice_items
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin', 'faculty']))
  with check (public.has_org_role(organization_id, array['admin', 'faculty']));

-- Enrolled students can read the plan for their batch.
create policy practice_student_select on public.practice_items
  for select to authenticated
  using (exists (
    select 1 from public.class_enrollments ce
    where ce.batch_id = practice_items.batch_id
      and ce.student_user_id = (select auth.uid())
      and ce.status = 'active'
  ));

grant select, insert, update, delete on public.practice_items to authenticated;

-- A student's practice items across all batches they're enrolled in.
create or replace function public.list_my_practice()
returns table (
  id           uuid,
  title        text,
  notes        text,
  day_of_week  int,
  duration_min int,
  batch_name   text,
  class_title  text
)
language sql stable security definer set search_path = ''
as $$
  select pi.id, pi.title, pi.notes, pi.day_of_week, pi.duration_min, b.name, c.title
  from public.practice_items pi
  join public.batches b on b.id = pi.batch_id
  join public.classes c on c.id = b.class_id
  join public.class_enrollments ce on ce.batch_id = pi.batch_id
    and ce.student_user_id = (select auth.uid()) and ce.status = 'active'
  order by pi.day_of_week nulls last, pi.created_at asc;
$$;
grant execute on function public.list_my_practice() to authenticated;
