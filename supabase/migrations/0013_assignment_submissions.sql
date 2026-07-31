-- =====================================================================
-- 0013_assignment_submissions.sql
-- Students submit work for a batch's assignments; faculty grade it.
--   submit_assignment            -> student upserts their submission
--   grade_assignment             -> faculty/admin sets grade + feedback
--   list_my_assignments          -> a student's assignments + own status
--   list_assignment_submissions  -> faculty view of an assignment's submissions
-- The assignments table + RLS already exist in 0006.
-- =====================================================================

create table if not exists public.assignment_submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments (id) on delete cascade,
  batch_id        uuid not null references public.batches (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_user_id uuid not null references auth.users (id) on delete cascade,
  content         text,
  attachment_url  text,
  status          text not null default 'submitted'
                    check (status in ('submitted', 'graded')),
  grade           text,
  feedback        text,
  submitted_at    timestamptz not null default now(),
  graded_at       timestamptz,
  graded_by       uuid references auth.users (id) on delete set null,
  unique (assignment_id, student_user_id)
);
create index if not exists asub_assignment_idx
  on public.assignment_submissions (assignment_id);
create index if not exists asub_student_idx
  on public.assignment_submissions (student_user_id);

alter table public.assignment_submissions enable row level security;

-- A student sees their own submissions; staff see all for their org.
create policy asub_select on public.assignment_submissions
  for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['admin', 'faculty'])
  );

grant select on public.assignment_submissions to authenticated;

-- Student submits (or resubmits) their work. Resubmitting resets grading.
create or replace function public.submit_assignment(
  p_assignment_id uuid, p_content text, p_attachment_url text
)
returns public.assignment_submissions
language plpgsql security definer set search_path = ''
as $$
declare
  a   public.assignments;
  sub public.assignment_submissions;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into a from public.assignments where id = p_assignment_id;
  if a.id is null then raise exception 'assignment not found'; end if;
  if not exists (
    select 1 from public.class_enrollments ce
    where ce.batch_id = a.batch_id
      and ce.student_user_id = (select auth.uid())
      and ce.status = 'active'
  ) then
    raise exception 'you are not enrolled in this batch';
  end if;

  insert into public.assignment_submissions
    (assignment_id, batch_id, organization_id, student_user_id,
     content, attachment_url, status, submitted_at)
  values (a.id, a.batch_id, a.organization_id, (select auth.uid()),
          nullif(btrim(p_content), ''), nullif(btrim(p_attachment_url), ''),
          'submitted', now())
  on conflict (assignment_id, student_user_id) do update
    set content        = excluded.content,
        attachment_url = excluded.attachment_url,
        status         = 'submitted',
        submitted_at   = now(),
        grade = null, feedback = null, graded_at = null, graded_by = null
  returning * into sub;

  return sub;
end;
$$;
grant execute on function public.submit_assignment(uuid, text, text) to authenticated;

-- Faculty/admin grades a submission.
create or replace function public.grade_assignment(
  p_submission_id uuid, p_grade text, p_feedback text
)
returns public.assignment_submissions
language plpgsql security definer set search_path = ''
as $$
declare sub public.assignment_submissions;
begin
  select * into sub from public.assignment_submissions where id = p_submission_id;
  if sub.id is null then raise exception 'submission not found'; end if;
  if not public.has_org_role(sub.organization_id, array['admin', 'faculty']) then
    raise exception 'not allowed to grade';
  end if;

  update public.assignment_submissions
    set grade     = nullif(btrim(p_grade), ''),
        feedback  = nullif(btrim(p_feedback), ''),
        status    = 'graded',
        graded_at = now(),
        graded_by = (select auth.uid())
    where id = p_submission_id
    returning * into sub;

  return sub;
end;
$$;
grant execute on function public.grade_assignment(uuid, text, text) to authenticated;

-- A student's assignments across enrolled batches + their own submission status.
create or replace function public.list_my_assignments()
returns table (
  assignment_id     uuid,
  title             text,
  description       text,
  due_date          date,
  batch_name        text,
  class_title       text,
  submission_status text,
  my_content        text,
  my_attachment_url text,
  my_grade          text,
  my_feedback       text
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.title, a.description, a.due_date,
         b.name, c.title,
         s.status, s.content, s.attachment_url, s.grade, s.feedback
  from public.assignments a
  join public.batches b on b.id = a.batch_id
  join public.classes c on c.id = b.class_id
  join public.class_enrollments ce on ce.batch_id = a.batch_id
    and ce.student_user_id = (select auth.uid()) and ce.status = 'active'
  left join public.assignment_submissions s
    on s.assignment_id = a.id and s.student_user_id = (select auth.uid())
  order by a.due_date nulls last, a.created_at desc;
$$;
grant execute on function public.list_my_assignments() to authenticated;

-- Faculty view: submissions for one assignment, with student identity.
create or replace function public.list_assignment_submissions(p_assignment_id uuid)
returns table (
  submission_id   uuid,
  student_user_id uuid,
  full_name       text,
  email           text,
  content         text,
  attachment_url  text,
  status          text,
  grade           text,
  feedback        text,
  submitted_at    timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.student_user_id, p.full_name, u.email::text,
         s.content, s.attachment_url, s.status, s.grade, s.feedback, s.submitted_at
  from public.assignment_submissions s
  join public.assignments a on a.id = s.assignment_id
  join auth.users u on u.id = s.student_user_id
  left join public.profiles p on p.id = s.student_user_id
  where s.assignment_id = p_assignment_id
    and public.has_org_role(a.organization_id, array['admin', 'faculty'])
  order by s.submitted_at asc;
$$;
grant execute on function public.list_assignment_submissions(uuid) to authenticated;
