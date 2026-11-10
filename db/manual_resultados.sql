-- Resultados del manual de pruebas (una fila por cada elección o nota).
-- Run once in Supabase > SQL Editor. Safe to re-run.
--
-- Tabla APARTE del prototipo: no toca ninguna tabla de la operación.
-- El manual solo puede INSERTAR (no leer, no editar, no borrar). Tú lees los
-- resultados desde Supabase > Table Editor > manual_resultados.

create table if not exists manual_resultados (
  id      bigint generated always as identity primary key,
  creado  timestamptz not null default now(),
  nombre  text not null default 'Sin nombre',   -- quién probó
  punto   text not null,                        -- P01 ... P37
  titulo  text not null default '',
  estado  text not null default '',             -- ok | fail | nota
  nota    text not null default '',
  origen  text not null default ''              -- dirección desde la que se envió
);

alter table manual_resultados enable row level security;

drop policy if exists "manual_solo_insertar" on manual_resultados;
create policy "manual_solo_insertar" on manual_resultados
  for insert to anon
  with check (
    char_length(nombre) <= 80 and char_length(punto) <= 8 and
    char_length(titulo) <= 200 and char_length(nota) <= 2000 and
    estado in ('ok','fail','nota')
  );

-- sin política de select/update/delete para anon: solo tú (dueño del proyecto) lees.
grant insert on manual_resultados to anon;
