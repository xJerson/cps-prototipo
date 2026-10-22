-- CPS prototype schema for Supabase (no login).
-- Run once in Supabase > SQL Editor. Safe to re-run: uses IF NOT EXISTS.
--
-- Design: one table per collection of the prototype state `S`.
-- Each record keeps its full shape in `data` (jsonb) so the prototype code
-- does not change its field names; `k` is the record id (r.id, or r.n for bitacora).
-- PRODUCCION: replace jsonb with normalized columns and real foreign keys.

create table if not exists config (
  k          text primary key,           -- e.g. 'cierreAgendamiento', 'cat', 'ID', 'audSeq'
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
  tablas text[] := array[
    -- catalogs and master data
    'clientes','propiedades','unidades','contactos','tecnicos','tarifas',
    'productos','vehiculos','impuestos',
    -- work
    'estimados','wos','adicionales','visitas','asistencias','disponibilidad',
    'solicitudes','solicitudes_comerciales','solicitudes_sup','agenda_sup',
    'devoluciones','borradores','reportes','rep_diario','excepciones',
    'recordatorios_wo','comunicaciones_wo','comunicaciones','dias_cerrados',
    'confirmaciones_agendamiento',
    -- money
    'facturas','pagos','creditos_prop','creditos_serv','pinturas',
    'pagos_tecnico','nomina','descuentos','gastos_compartidos','movs',
    -- traces and notices
    'bitacora','avisos','notis','revisiones_cliente'
  ];
begin
  foreach t in array tablas loop
    execute format($f$
      create table if not exists %I (
        k          text primary key,
        data       jsonb not null,
        updated_at timestamptz not null default now()
      )$f$, t);
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "prototype_open" on %I', t);
    -- No login: the anon key may read and write everything.
    -- PRODUCCION: replace with per-role policies tied to authenticated users.
    execute format('create policy "prototype_open" on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;

alter table config enable row level security;
drop policy if exists "prototype_open" on config;
create policy "prototype_open" on config for all to anon using (true) with check (true);
