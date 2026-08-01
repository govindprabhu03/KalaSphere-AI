-- =====================================================================
-- 0016_orders_realtime.sql
-- Enable Supabase Realtime for the kitchen board: broadcast orders changes so
-- staff see new/updated orders live. RLS still applies to realtime — only users
-- who can SELECT a row (orders_select: owner or org admin/faculty) receive it.
-- =====================================================================

-- Add orders to the realtime publication (idempotent).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'orders'
     )
  then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Full row images so UPDATE/DELETE events carry organization_id for filtering.
alter table public.orders replica identity full;
