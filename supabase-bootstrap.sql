-- Bootstrap minimo para resolver: "Could not find the table ... in the schema cache".
-- Ejecuta este archivo completo en el SQL Editor del MISMO proyecto que esta en app.js.

create extension if not exists pgcrypto;

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

alter table public.restaurant_tables
add column if not exists qr_image_url text;

alter table public.business_settings enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.table_sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.service_requests enable row level security;

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
declare
  target_table text;
begin
  foreach target_table in array array[
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
        and tablename = target_table
        and policyname = 'anon_full_access_mvp'
    ) then
      execute format(
        'create policy anon_full_access_mvp on public.%I for all to anon using (true) with check (true)',
        target_table
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
select true, 'Tu restaurante', 'Servicio a la mesa rapido y claro', '#f05a28', 'COP'
where not exists (select 1 from public.business_settings);

insert into public.restaurant_tables (table_number, table_name, qr_code)
select n, 'Mesa ' || n, 'mesa-' || n
from generate_series(1, 8) as n
where not exists (
  select 1 from public.restaurant_tables t where t.table_number = n
);

insert into public.menu_categories (name, sort_order)
select name, sort_order
from (values
  ('Entradas', 10),
  ('Platos fuertes', 20),
  ('Bebidas', 30),
  ('Postres', 40)
) as seed(name, sort_order)
where not exists (
  select 1 from public.menu_categories c where c.name = seed.name
);

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
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
    select 1
    from pg_policies
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
  'bootstrap_ready' as status,
  to_regclass('public.business_settings') as business_settings,
  to_regclass('public.restaurant_tables') as restaurant_tables,
  to_regclass('public.menu_categories') as menu_categories,
  to_regclass('public.menu_items') as menu_items,
  to_regclass('public.service_requests') as service_requests;
