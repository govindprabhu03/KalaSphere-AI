-- =====================================================================
-- 0009_canteen.sql  (Phase 6)
-- Menu -> orders -> kitchen board. Public places orders; staff advance status.
-- =====================================================================

create table if not exists public.menu_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  description     text,
  category        text,
  price_cents     int not null default 0,
  is_available    boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists menu_org_idx on public.menu_items (organization_id);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  order_number    text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'preparing', 'ready', 'collected', 'cancelled')),
  total_cents     int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists orders_org_idx on public.orders (organization_id);
create index if not exists orders_user_idx on public.orders (user_id);

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  menu_item_id    uuid references public.menu_items (id) on delete set null,
  name_snapshot   text not null,
  price_cents     int not null,
  qty             int not null default 1,
  created_at      timestamptz not null default now()
);

alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

create policy menu_select on public.menu_items
  for select to anon, authenticated
  using (is_available = true or public.is_org_member(organization_id));
create policy menu_write on public.menu_items
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin']))
  with check (public.has_org_role(organization_id, array['admin']));

create policy orders_select on public.orders
  for select to authenticated
  using (user_id = (select auth.uid())
         or public.has_org_role(organization_id, array['admin', 'faculty']));

create policy order_items_select on public.order_items
  for select to authenticated
  using (
    public.has_org_role(organization_id, array['admin', 'faculty'])
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant select on public.orders, public.order_items to authenticated;

-- Place an order. p_items = [{ "menu_item_id": uuid, "qty": int }, ...]
create or replace function public.place_order(p_org uuid, p_items jsonb)
returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare o public.orders; it jsonb; mi public.menu_items; total int := 0; code text; q int;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;

  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.orders (organization_id, user_id, order_number, total_cents, status)
    values (p_org, (select auth.uid()), code, 0, 'pending') returning * into o;

  for it in select jsonb_array_elements(p_items) loop
    select * into mi from public.menu_items
      where id = (it->>'menu_item_id')::uuid and organization_id = p_org and is_available;
    if mi.id is null then continue; end if;
    q := greatest(1, coalesce((it->>'qty')::int, 1));
    insert into public.order_items (order_id, organization_id, menu_item_id, name_snapshot, price_cents, qty)
      values (o.id, p_org, mi.id, mi.name, mi.price_cents, q);
    total := total + mi.price_cents * q;
  end loop;

  if total = 0 then
    delete from public.orders where id = o.id;
    raise exception 'no valid items in cart';
  end if;

  update public.orders set total_cents = total where id = o.id returning * into o;
  return o;
end; $$;
grant execute on function public.place_order(uuid, jsonb) to authenticated;

create or replace function public.update_order_status(p_order uuid, p_status text)
returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare o public.orders;
begin
  if p_status not in ('pending', 'preparing', 'ready', 'collected', 'cancelled') then
    raise exception 'invalid status'; end if;
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'order not found'; end if;
  if not public.has_org_role(o.organization_id, array['admin', 'faculty']) then
    raise exception 'not allowed'; end if;
  update public.orders set status = p_status where id = p_order returning * into o;
  return o;
end; $$;
grant execute on function public.update_order_status(uuid, text) to authenticated;

create or replace function public.list_kitchen_orders(p_org uuid)
returns table (
  order_id uuid, order_number text, status text, total_cents int,
  requester text, items text, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.order_number, o.status, o.total_cents,
         coalesce(p.full_name, u.email::text),
         (select string_agg(oi.qty || '× ' || oi.name_snapshot, ', ')
          from public.order_items oi where oi.order_id = o.id),
         o.created_at
  from public.orders o
  join auth.users u on u.id = o.user_id
  left join public.profiles p on p.id = o.user_id
  where o.organization_id = p_org
    and public.has_org_role(p_org, array['admin', 'faculty'])
    and o.status in ('pending', 'preparing', 'ready')
  order by o.created_at asc;
$$;
grant execute on function public.list_kitchen_orders(uuid) to authenticated;
