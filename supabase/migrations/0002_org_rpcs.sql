-- =====================================================================
-- 0002_org_rpcs.sql
-- Phase 1: self-service org creation + adding members by email.
-- Both are SECURITY DEFINER so they can write to RLS-locked tables in a
-- single, controlled transaction.
-- =====================================================================

-- Create an organization and make the caller its admin.
create or replace function public.create_organization(org_name text, org_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org public.organizations;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  insert into public.organizations (name, slug)
  values (org_name, org_slug)
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (new_org.id, (select auth.uid()), 'admin', 'active');

  insert into public.audit_log (organization_id, actor_user_id, action, entity, entity_id)
  values (new_org.id, (select auth.uid()), 'organization.created', 'organization', new_org.id::text);

  return new_org;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;

-- Add an existing (already-registered) user to an org by email. Admins only.
create or replace function public.add_member_by_email(
  org uuid,
  member_email text,
  member_role text
)
returns public.organization_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  new_member public.organization_members;
begin
  if not public.has_org_role(org, array['admin']) then
    raise exception 'only admins can add members';
  end if;

  if member_role not in ('admin', 'faculty', 'parent', 'student', 'artist') then
    raise exception 'invalid role';
  end if;

  select id into target_user
  from auth.users
  where lower(email) = lower(member_email)
  limit 1;

  if target_user is null then
    raise exception 'No user is registered with that email yet. Ask them to sign up first.';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (org, target_user, member_role, 'active')
  on conflict (organization_id, user_id)
    do update set role = excluded.role, status = 'active'
  returning * into new_member;

  insert into public.audit_log (organization_id, actor_user_id, action, entity, entity_id, metadata)
  values (org, (select auth.uid()), 'member.added', 'organization_member',
          new_member.id::text, jsonb_build_object('role', member_role, 'email', lower(member_email)));

  return new_member;
end;
$$;

grant execute on function public.add_member_by_email(uuid, text, text) to authenticated;
