-- Servicio a la mesa: esquema idempotente para Supabase.
-- Ejecuta este archivo completo en el SQL editor. Puede correrse de nuevo sin duplicar tablas base.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  is_primary boolean not null default true,
  business_name text not null default 'Tu restaurante',
  subtitle text default 'Servicio a la mesa rapido y claro',
  logo_url text,
  cover_url text,
  accent_color text not null default '#f05a28',
  currency text not null default 'COP',
  tax_rate numeric(8,4) not null default 0,
  service_fee numeric(8,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number integer not null,
  table_name text,
  qr_code text,
  qr_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.table_sessions(id) on delete cascade,
  table_id uuid references public.restaurant_tables(id) on delete set null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.restaurant_tables(id) on delete cascade,
  session_id uuid references public.table_sessions(id) on delete set null,
  request_type text not null default 'waiter',
  message text,
  status text not null default 'pending',
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.business_settings,
  public.restaurant_tables,
  public.menu_categories,
  public.menu_items,
  public.table_sessions,
  public.session_items,
  public.service_requests
to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_settings_single_primary'
  ) then
    alter table public.business_settings add constraint business_settings_single_primary unique (is_primary);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'restaurant_tables_table_number_key'
  ) then
    alter table public.restaurant_tables add constraint restaurant_tables_table_number_key unique (table_number);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'restaurant_tables_qr_code_key'
  ) then
    alter table public.restaurant_tables add constraint restaurant_tables_qr_code_key unique (qr_code);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'menu_categories_name_key'
  ) then
    alter table public.menu_categories add constraint menu_categories_name_key unique (name);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'table_sessions_status_check'
  ) then
    alter table public.table_sessions add constraint table_sessions_status_check check (status in ('open', 'closed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'session_items_status_check'
  ) then
    alter table public.session_items add constraint session_items_status_check check (status in ('pending', 'served', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'service_requests_type_check'
  ) then
    alter table public.service_requests add constraint service_requests_type_check check (request_type in ('waiter', 'bill', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'service_requests_status_check'
  ) then
    alter table public.service_requests add constraint service_requests_status_check check (status in ('pending', 'acknowledged', 'resolved', 'cancelled'));
  end if;
end;
$$;

alter table public.restaurant_tables
add column if not exists qr_image_url text;

create unique index if not exists one_open_session_per_table
on public.table_sessions(table_id)
where status = 'open';

create index if not exists idx_session_items_session on public.session_items(session_id);
create index if not exists idx_service_requests_status on public.service_requests(status, created_at desc);
create index if not exists idx_service_requests_table on public.service_requests(table_id);

drop trigger if exists set_business_settings_updated_at on public.business_settings;
create trigger set_business_settings_updated_at
before update on public.business_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_restaurant_tables_updated_at on public.restaurant_tables;
create trigger set_restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.set_updated_at();

drop trigger if exists set_menu_categories_updated_at on public.menu_categories;
create trigger set_menu_categories_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

drop trigger if exists set_table_sessions_updated_at on public.table_sessions;
create trigger set_table_sessions_updated_at
before update on public.table_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_session_items_updated_at on public.session_items;
create trigger set_session_items_updated_at
before update on public.session_items
for each row execute function public.set_updated_at();

drop trigger if exists set_service_requests_updated_at on public.service_requests;
create trigger set_service_requests_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

create or replace view public.active_table_dashboard as
select
  t.id as table_id,
  t.table_number,
  t.table_name,
  t.qr_code,
  t.qr_image_url,
  s.id as session_id,
  s.status as session_status,
  coalesce(sum(si.quantity * si.unit_price) filter (where si.status <> 'cancelled'), 0) as current_total,
  count(sr.id) filter (where sr.status = 'pending') as pending_requests
from public.restaurant_tables t
left join public.table_sessions s on s.table_id = t.id and s.status = 'open'
left join public.session_items si on si.session_id = s.id
left join public.service_requests sr on sr.table_id = t.id and sr.status = 'pending'
group by t.id, s.id;

grant select on public.active_table_dashboard to anon, authenticated;

alter table public.business_settings enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.table_sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.service_requests enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_settings',
    'restaurant_tables',
    'menu_categories',
    'menu_items',
    'table_sessions',
    'session_items',
    'service_requests'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'anon_full_access_mvp'
    ) then
      execute format(
        'create policy anon_full_access_mvp on public.%I for all to anon using (true) with check (true)',
        table_name
      );
    end if;
  end loop;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.service_requests;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.session_items;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.table_sessions;
  exception when duplicate_object then
    null;
  end;
end;
$$;

insert into public.business_settings (is_primary, business_name, subtitle, accent_color, currency)
values (true, 'Tu restaurante', 'Servicio a la mesa rapido y claro', '#f05a28', 'COP')
on conflict (is_primary) do nothing;

insert into public.restaurant_tables (table_number, table_name, qr_code)
select n, 'Mesa ' || n, 'mesa-' || n
from generate_series(1, 8) as n
on conflict (table_number) do nothing;

insert into public.menu_categories (name, sort_order)
values
  ('Entradas', 10),
  ('Platos fuertes', 20),
  ('Bebidas', 30),
  ('Postres', 40)
on conflict (name) do nothing;

insert into public.menu_items (category_id, name, description, price, sort_order)
select c.id, 'Producto de ejemplo', 'Edita o elimina este producto desde el administrador.', 15000, 10
from public.menu_categories c
where c.name = 'Entradas'
  and not exists (select 1 from public.menu_items limit 1);

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_brand_assets_read'
  ) then
    create policy public_brand_assets_read
    on storage.objects for select
    to anon
    using (bucket_id = 'brand-assets');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_brand_assets_write'
  ) then
    create policy public_brand_assets_write
    on storage.objects for insert
    to anon
    with check (bucket_id = 'brand-assets');
  end if;
end;
$$;

notify pgrst, 'reload schema';

select
  'schema_ready' as status,
  to_regclass('public.restaurant_tables') as restaurant_tables,
  to_regclass('public.menu_items') as menu_items,
  to_regclass('public.service_requests') as service_requests;
