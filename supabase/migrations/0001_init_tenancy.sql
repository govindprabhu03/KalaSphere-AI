-- =====================================================================
-- 0001_init_tenancy.sql
-- Phase 0 foundation: organizations (tenants), profiles, RBAC catalog,
-- memberships, parent-child links, immutable audit log.
--
-- Multi-tenancy + authorization are enforced in Postgres via Row-Level
-- Security (RLS). SECURITY DEFINER helper functions are the ONLY thing that
-- reads membership rows inside policies, which avoids RLS recursion and keeps
-- policies fast and simple.
--
-- Apply this in the Supabase SQL Editor, or via `supabase db push` if you use
-- the Supabase CLI.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Each row is one Ravindra Bhavan (tenant).
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  logo_url      text,
  primary_color text not null default '#6d28d9',
  locale        text not null default 'en',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One profile per auth user (1:1 with auth.users).
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  avatar_url        text,
  phone             text,
  is_platform_admin boolean not null default false,   -- super admin flag (platform-wide)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Catalog of roles (referenced by memberships).
create table if not exists public.roles (
  key         text primary key,
  name        text not null,
  description text,
  is_org_role boolean not null default true
);

-- Catalog of fine-grained permissions.
create table if not exists public.permissions (
  key         text primary key,
  description text
);

-- Which permissions each role grants.
create table if not exists public.role_permissions (
  role_key       text not null references public.roles (key) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_key, permission_key)
);

-- Links a user to an organization with an org role.
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null references public.roles (key),
  status          text not null default 'active'
                    check (status in ('active', 'invited', 'suspended')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists organization_members_user_idx
  on public.organization_members (user_id);
create index if not exists organization_members_org_idx
  on public.organization_members (organization_id);

-- Parent <-> child relationship (used by the parent portal).
create table if not exists public.parent_child_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_user_id  uuid not null references auth.users (id) on delete cascade,
  child_user_id   uuid not null references auth.users (id) on delete cascade,
  relationship    text not null default 'parent',
  created_at      timestamptz not null default now(),
  unique (parent_user_id, child_user_id)
);

-- Immutable audit trail. No UPDATE/DELETE policies => append-only.
create table if not exists public.audit_log (
  id              bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete set null,
  actor_user_id   uuid references auth.users (id) on delete set null,
  action          text not null,
  entity          text,
  entity_id       text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_log_org_idx on public.audit_log (organization_id);

-- ---------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER -> bypass RLS, no recursion)
-- ---------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_platform_admin
  );
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.user_org_role(org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org
    and m.user_id = (select auth.uid())
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.has_org_role(org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_platform_admin() or exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(roles)
  );
$$;

-- Create a profile row automatically when an auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Prevent non-super-admins from granting themselves platform admin.
create or replace function public.guard_profile_privilege()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_platform_admin is distinct from old.is_platform_admin
     and not public.is_platform_admin() then
    raise exception 'not allowed to change is_platform_admin';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_guard_privilege on public.profiles;
create trigger profiles_guard_privilege
  before update on public.profiles
  for each row execute function public.guard_profile_privilege();

-- ---------------------------------------------------------------------
-- 4. Row-Level Security
-- ---------------------------------------------------------------------

alter table public.organizations        enable row level security;
alter table public.profiles              enable row level security;
alter table public.roles                 enable row level security;
alter table public.permissions           enable row level security;
alter table public.role_permissions      enable row level security;
alter table public.organization_members  enable row level security;
alter table public.parent_child_links    enable row level security;
alter table public.audit_log             enable row level security;

-- organizations ------------------------------------------------------
create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (public.is_platform_admin());

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_org_role(id, array['admin']))
  with check (public.has_org_role(id, array['admin']));

create policy organizations_delete on public.organizations
  for delete to authenticated
  using (public.is_platform_admin());

-- profiles -----------------------------------------------------------
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_platform_admin());

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_platform_admin())
  with check (id = (select auth.uid()) or public.is_platform_admin());

-- roles / permissions catalog (read-only for users) -----------------
create policy roles_select on public.roles
  for select to authenticated using (true);
create policy permissions_select on public.permissions
  for select to authenticated using (true);
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (true);

-- organization_members ----------------------------------------------
create policy members_select on public.organization_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_member(organization_id));

create policy members_write on public.organization_members
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

-- parent_child_links -------------------------------------------------
create policy links_select on public.parent_child_links
  for select to authenticated
  using (
    parent_user_id = (select auth.uid())
    or child_user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['admin', 'faculty'])
  );

create policy links_write on public.parent_child_links
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

-- audit_log (read-only for admins; append-only in general) -----------
create policy audit_select on public.audit_log
  for select to authenticated
  using (public.has_org_role(organization_id, array['admin']));

-- ---------------------------------------------------------------------
-- 5. Grants (RLS filters rows; grants gate access)
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.roles, public.permissions, public.role_permissions
  to authenticated;
grant select, insert, update, delete
  on public.organizations, public.profiles,
     public.organization_members, public.parent_child_links
  to authenticated;
grant select on public.audit_log to authenticated;
grant execute on function
  public.is_platform_admin(),
  public.is_org_member(uuid),
  public.user_org_role(uuid),
  public.has_org_role(uuid, text[])
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Seed: role & permission catalog
-- ---------------------------------------------------------------------

insert into public.roles (key, name, description, is_org_role) values
  ('super_admin', 'Super Admin', 'Platform-wide administrator', false),
  ('admin',       'Admin',       'Manages one Ravindra Bhavan', true),
  ('faculty',     'Faculty',     'Teaches classes, marks attendance, evaluates students', true),
  ('parent',      'Parent',      'Guardian linked to a student', true),
  ('student',     'Student',     'Enrolled learner', true),
  ('artist',      'Artist',      'Community artist / performer', true),
  ('public',      'Public',      'Visitor with no org membership', false)
on conflict (key) do nothing;

insert into public.permissions (key, description) values
  ('platform.manage',   'Manage organizations, users and platform settings'),
  ('org.manage',        'Manage a single organization'),
  ('events.manage',     'Create and manage events'),
  ('workshops.manage',  'Create and manage workshops'),
  ('classes.manage',    'Create and manage cultural classes'),
  ('attendance.mark',   'Mark attendance'),
  ('students.evaluate', 'Evaluate student growth'),
  ('venue.manage',      'Manage venues and bookings'),
  ('venue.approve',     'Approve or reject venue bookings'),
  ('canteen.manage',    'Manage canteen menu and orders'),
  ('community.moderate','Moderate community content'),
  ('reports.view',      'View reports and analytics')
on conflict (key) do nothing;

insert into public.role_permissions (role_key, permission_key) values
  ('super_admin', 'platform.manage'),
  ('admin', 'org.manage'),
  ('admin', 'events.manage'),
  ('admin', 'workshops.manage'),
  ('admin', 'classes.manage'),
  ('admin', 'attendance.mark'),
  ('admin', 'students.evaluate'),
  ('admin', 'venue.manage'),
  ('admin', 'venue.approve'),
  ('admin', 'canteen.manage'),
  ('admin', 'community.moderate'),
  ('admin', 'reports.view'),
  ('faculty', 'attendance.mark'),
  ('faculty', 'students.evaluate'),
  ('faculty', 'classes.manage')
on conflict do nothing;
