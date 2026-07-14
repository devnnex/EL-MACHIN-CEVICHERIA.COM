-- Preflight: ejecuta esto antes de supabase-schema.sql si la base ya tiene datos.
-- No modifica datos persistentes. Crea una tabla temporal de resultados para evitar fallar en bases limpias.

create temp table if not exists preflight_results (
  check_name text,
  severity text,
  detail text
) on commit drop;

truncate table preflight_results;

do $$
declare
  row_data record;
begin
  insert into preflight_results (check_name, severity, detail)
  select 'table_exists', 'info', name || '=' || (to_regclass('public.' || name) is not null)
  from unnest(array[
    'business_settings',
    'restaurant_tables',
    'menu_categories',
    'menu_items',
    'table_sessions',
    'session_items',
    'service_requests'
  ]) as name;

  if to_regclass('public.restaurant_tables') is not null then
    for row_data in execute
      'select table_number, count(*) as total
       from public.restaurant_tables
       group by table_number
       having count(*) > 1'
    loop
      insert into preflight_results values (
        'duplicate_table_number',
        'error',
        'Mesa ' || row_data.table_number || ' aparece ' || row_data.total || ' veces'
      );
    end loop;

    for row_data in execute
      'select qr_code, count(*) as total
       from public.restaurant_tables
       where qr_code is not null
       group by qr_code
       having count(*) > 1'
    loop
      insert into preflight_results values (
        'duplicate_qr_code',
        'error',
        'QR ' || row_data.qr_code || ' aparece ' || row_data.total || ' veces'
      );
    end loop;
  end if;

  if to_regclass('public.menu_categories') is not null then
    for row_data in execute
      'select name, count(*) as total
       from public.menu_categories
       group by name
       having count(*) > 1'
    loop
      insert into preflight_results values (
        'duplicate_category_name',
        'error',
        'Categoria ' || row_data.name || ' aparece ' || row_data.total || ' veces'
      );
    end loop;
  end if;

  if to_regclass('public.table_sessions') is not null then
    for row_data in execute
      'select table_id, count(*) as total
       from public.table_sessions
       where status = ''open''
       group by table_id
       having count(*) > 1'
    loop
      insert into preflight_results values (
        'duplicate_open_sessions',
        'error',
        'La mesa ' || row_data.table_id || ' tiene ' || row_data.total || ' cuentas abiertas'
      );
    end loop;
  end if;

  if to_regclass('public.service_requests') is not null then
    for row_data in execute
      'select status, count(*) as total
       from public.service_requests
       group by status
       order by status'
    loop
      insert into preflight_results values (
        'request_status_count',
        'info',
        row_data.status || '=' || row_data.total
      );
    end loop;
  end if;
end;
$$;

select *
from preflight_results
order by
  case severity when 'error' then 0 when 'warning' then 1 else 2 end,
  check_name,
  detail;
