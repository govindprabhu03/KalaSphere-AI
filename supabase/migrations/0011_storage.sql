-- =====================================================================
-- 0011_storage.sql
-- Public "media" bucket for gallery/news images, with authenticated upload.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists media_select on storage.objects;
create policy media_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media');
