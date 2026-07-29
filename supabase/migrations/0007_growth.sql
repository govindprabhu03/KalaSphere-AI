-- =====================================================================
-- 0007_growth.sql  (Phase 4)
-- Monthly student evaluations -> growth charts, + parent linking.
-- Evaluations are readable by the student, their linked parent, and the
-- org's faculty/admin. Writes go through SECURITY DEFINER RPCs.
-- =====================================================================

create table if not exists public.student_evaluations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  batch_id         uuid references public.batches (id) on delete set null,
  student_user_id  uuid not null references auth.users (id) on delete cascade,
  period           text not null,                 -- 'YYYY-MM'
  pitch            smallint,
  rhythm           smallint,
  voice            smallint,
  confidence       smallint,
  coordination     smallint,
  expression       smallint,
  practice         smallint,
  attendance_score smallint,
  performance      smallint,
  remarks          text,
  evaluated_by     uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_user_id, batch_id, period)
);

alter table public.student_evaluations enable row level security;

create or replace function public.is_parent_of(child uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.parent_child_links l
    where l.parent_user_id = (select auth.uid()) and l.child_user_id = child
  );
$$;
grant execute on function public.is_parent_of(uuid) to authenticated;

create policy evals_select on public.student_evaluations
  for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or public.is_parent_of(student_user_id)
    or public.has_org_role(organization_id, array['admin', 'faculty'])
  );

grant select on public.student_evaluations to authenticated;

-- Faculty/admin enter or update a monthly evaluation.
create or replace function public.upsert_evaluation(
  p_batch_id uuid, p_student uuid, p_period text,
  p_pitch int, p_rhythm int, p_voice int, p_confidence int, p_coordination int,
  p_expression int, p_practice int, p_attendance int, p_performance int, p_remarks text
)
returns public.student_evaluations
language plpgsql security definer set search_path = ''
as $$
declare b public.batches; ev public.student_evaluations;
begin
  select * into b from public.batches where id = p_batch_id;
  if b.id is null then raise exception 'batch not found'; end if;
  if not public.has_org_role(b.organization_id, array['admin', 'faculty']) then
    raise exception 'not allowed'; end if;

  insert into public.student_evaluations (
    organization_id, batch_id, student_user_id, period,
    pitch, rhythm, voice, confidence, coordination, expression,
    practice, attendance_score, performance, remarks, evaluated_by)
  values (
    b.organization_id, p_batch_id, p_student, p_period,
    p_pitch, p_rhythm, p_voice, p_confidence, p_coordination, p_expression,
    p_practice, p_attendance, p_performance, nullif(p_remarks, ''), (select auth.uid()))
  on conflict (student_user_id, batch_id, period) do update set
    pitch = excluded.pitch, rhythm = excluded.rhythm, voice = excluded.voice,
    confidence = excluded.confidence, coordination = excluded.coordination,
    expression = excluded.expression, practice = excluded.practice,
    attendance_score = excluded.attendance_score, performance = excluded.performance,
    remarks = excluded.remarks, evaluated_by = (select auth.uid()), updated_at = now()
  returning * into ev;
  return ev;
end; $$;
grant execute on function public.upsert_evaluation(uuid, uuid, text, int, int, int, int, int, int, int, int, int, text) to authenticated;

-- Growth timeline for a student (self / parent / faculty / admin).
create or replace function public.list_student_growth(p_student uuid)
returns setof public.student_evaluations
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (
    p_student = (select auth.uid())
    or public.is_parent_of(p_student)
    or exists (select 1 from public.student_evaluations e
               where e.student_user_id = p_student
                 and public.has_org_role(e.organization_id, array['admin', 'faculty']))
  ) then
    return;
  end if;
  return query select * from public.student_evaluations
    where student_user_id = p_student order by period asc;
end; $$;
grant execute on function public.list_student_growth(uuid) to authenticated;

create or replace function public.student_display_name(p_student uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(p.full_name, u.email::text)
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = p_student and (
    p_student = (select auth.uid())
    or public.is_parent_of(p_student)
    or exists (select 1 from public.student_evaluations e
               where e.student_user_id = p_student
                 and public.has_org_role(e.organization_id, array['admin', 'faculty']))
    or exists (select 1 from public.class_enrollments ce join public.batches b on b.id = ce.batch_id
               where ce.student_user_id = p_student
                 and public.has_org_role(b.organization_id, array['admin', 'faculty']))
  );
$$;
grant execute on function public.student_display_name(uuid) to authenticated;

-- Admin links a registered parent to a student by the parent's email.
create or replace function public.link_parent_to_student(
  p_org uuid, p_parent_email text, p_student uuid
)
returns public.parent_child_links
language plpgsql security definer set search_path = ''
as $$
declare parent_id uuid; lnk public.parent_child_links;
begin
  if not public.has_org_role(p_org, array['admin']) then
    raise exception 'only admins can link parents'; end if;
  select id into parent_id from auth.users where lower(email) = lower(p_parent_email) limit 1;
  if parent_id is null then
    raise exception 'No user with that email — ask the parent to register first.'; end if;
  insert into public.parent_child_links (organization_id, parent_user_id, child_user_id)
  values (p_org, parent_id, p_student)
  on conflict (parent_user_id, child_user_id) do update set organization_id = excluded.organization_id
  returning * into lnk;
  return lnk;
end; $$;
grant execute on function public.link_parent_to_student(uuid, text, uuid) to authenticated;

create or replace function public.list_my_children()
returns table (child_user_id uuid, full_name text, email text)
language sql stable security definer set search_path = ''
as $$
  select l.child_user_id, p.full_name, u.email::text
  from public.parent_child_links l
  join auth.users u on u.id = l.child_user_id
  left join public.profiles p on p.id = l.child_user_id
  where l.parent_user_id = (select auth.uid());
$$;
grant execute on function public.list_my_children() to authenticated;
