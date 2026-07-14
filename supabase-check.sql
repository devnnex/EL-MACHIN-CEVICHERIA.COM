-- Diagnostico rapido. No modifica nada.
-- Si alguna columna sale null, esa tabla no existe en ESTE proyecto/base.

select
  current_database() as database_name,
  current_schema() as current_schema,
  to_regclass('public.business_settings') as business_settings,
  to_regclass('public.restaurant_tables') as restaurant_tables,
  to_regclass('public.menu_categories') as menu_categories,
  to_regclass('public.menu_items') as menu_items,
  to_regclass('public.table_sessions') as table_sessions,
  to_regclass('public.session_items') as session_items,
  to_regclass('public.service_requests') as service_requests;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'business_settings',
    'restaurant_tables',
    'menu_categories',
    'menu_items',
    'table_sessions',
    'session_items',
    'service_requests'
  )
order by table_name;
