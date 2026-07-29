-- =====================================================================
-- 0010_content.sql  (Phase 7)
-- News, announcements, gallery, and community (artist) profiles.
-- =====================================================================

create table if not exists public.news_posts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug            text not null,
  title           text not null,
  body            text,
  cover_image_url text,
  is_published    boolean not null default false,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  message         text not null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text,
  image_url       text not null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.artist_profiles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  stage_name      text not null,
  discipline      text,
  bio             text,
  links           text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.news_posts      enable row level security;
alter table public.announcements   enable row level security;
alter table public.gallery_items   enable row level security;
alter table public.artist_profiles enable row level security;

create policy news_select on public.news_posts
  for select to anon, authenticated
  using (is_published = true or public.is_org_member(organization_id));
create policy news_write on public.news_posts
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy ann_select on public.announcements
  for select to anon, authenticated using (true);
create policy ann_write on public.announcements
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy gallery_select on public.gallery_items
  for select to anon, authenticated using (true);
create policy gallery_write on public.gallery_items
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy artist_select on public.artist_profiles
  for select to anon, authenticated
  using (is_public = true or user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin']));
create policy artist_write on public.artist_profiles
  for all to authenticated
  using (user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin']))
  with check (user_id = (select auth.uid())
              or public.has_org_role(organization_id, array['admin']));

grant select on public.news_posts, public.announcements, public.gallery_items,
      public.artist_profiles to anon, authenticated;
grant insert, update, delete on public.news_posts, public.announcements,
      public.gallery_items, public.artist_profiles to authenticated;
