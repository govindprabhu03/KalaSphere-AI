-- =====================================================================
-- 0014_org_branding.sql
-- Per-tenant branding. logo_url + primary_color already exist (0001); add a
-- short tagline and surface all three through the public microsite RPC.
-- Admins update their own org's branding via the existing organizations UPDATE
-- RLS (has_org_role admin); nothing new is exposed to anon here.
-- =====================================================================

alter table public.organizations
  add column if not exists tagline text;

-- Return type gains a column, so the function must be dropped and recreated.
drop function if exists public.public_org_by_slug(text);

create or replace function public.public_org_by_slug(p_slug text)
returns table (
  id            uuid,
  name          text,
  slug          text,
  primary_color text,
  logo_url      text,
  tagline       text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.name, o.slug, o.primary_color, o.logo_url, o.tagline
  from public.organizations o
  where o.slug = p_slug and o.is_active = true;
$$;

grant execute on function public.public_org_by_slug(text) to anon, authenticated;
