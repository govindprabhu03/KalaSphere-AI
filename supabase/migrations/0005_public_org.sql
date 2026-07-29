-- =====================================================================
-- 0005_public_org.sql
-- Public microsites: expose ONLY an org's public branding fields by slug,
-- without opening the organizations table to anonymous reads.
-- =====================================================================

create or replace function public.public_org_by_slug(p_slug text)
returns table (
  id            uuid,
  name          text,
  slug          text,
  primary_color text,
  logo_url      text
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.name, o.slug, o.primary_color, o.logo_url
  from public.organizations o
  where o.slug = p_slug and o.is_active = true;
$$;

grant execute on function public.public_org_by_slug(text) to anon, authenticated;
