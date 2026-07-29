-- =====================================================================
-- 0003_list_org_members.sql
-- Phase 1: admins need to see member names/emails, but profiles RLS only
-- exposes a user's own profile and auth.users is never directly readable.
-- This SECURITY DEFINER function returns the member list for admins only.
-- =====================================================================

create or replace function public.list_org_members(org uuid)
returns table (
  member_id  uuid,
  user_id    uuid,
  role       text,
  status     text,
  full_name  text,
  email      text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.user_id, m.role, m.status, p.full_name, u.email::text, m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = org
    and public.has_org_role(org, array['admin'])   -- non-admins get zero rows
  order by m.created_at asc;
$$;

grant execute on function public.list_org_members(uuid) to authenticated;
