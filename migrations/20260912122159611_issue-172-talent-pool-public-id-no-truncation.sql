-- Up Migration

-- ISSUE-172 — `lpad(text, 5, '0')` en PostgreSQL RECORTA cuando el texto excede 5 caracteres; no
-- sólo rellena. El default original de `talent_pool_membership.public_id` (TASK-1723) era
-- `lpad(nextval(...)::text, 5, '0')`: pasado 99.999 en la secuencia, diez valores consecutivos
-- colapsan en el mismo `public_id` (`575712` → `57571`, `575713` → `57571`) contra
-- `UNIQUE (public_id)`. Rompía el cron `ops-hiring-talent-pool-reconcile` en cada corrida y hacía
-- fallar de forma intermitente al consumer `growth_hiring_application_from_submission`, que es el
-- carril vivo por el que entran las postulaciones de candidatos.
--
-- 1. El default pasa a rellenar SIN recortar: cinco dígitos mientras alcance, y crece cuando no.
--    Va en una función porque la expresión inline necesitaría `nextval` en dos argumentos de
--    `lpad` (valor y largo) y saltearía un valor por fila; la función lo toma UNA sola vez.
CREATE OR REPLACE FUNCTION greenhouse_hiring.next_talent_pool_public_id()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $fn$
DECLARE
  n bigint := nextval('greenhouse_hiring.talent_pool_public_seq');
BEGIN
  RETURN 'EO-TLP-' || lpad(n::text, GREATEST(5, length(n::text)), '0');
END
$fn$;

ALTER FUNCTION greenhouse_hiring.next_talent_pool_public_id() OWNER TO greenhouse_ops;
GRANT EXECUTE ON FUNCTION greenhouse_hiring.next_talent_pool_public_id() TO greenhouse_runtime, greenhouse_app, greenhouse_migrator_user;

ALTER TABLE greenhouse_hiring.talent_pool_membership
  ALTER COLUMN public_id SET DEFAULT greenhouse_hiring.next_talent_pool_public_id();

-- 2. Reanclar la secuencia justo sobre el máximo real en uso. La secuencia estaba en ~575.000 con
--    230 filas porque la projection evaluaba el default para los 247 facets activos cada 5 minutos
--    (ISSUE-172 §"Por qué se agotó"); el anti-join en `projection.ts` corta esa quema. Con el
--    default nuevo, reanclar es seguro: ningún valor futuro puede recortarse.
SELECT setval(
  'greenhouse_hiring.talent_pool_public_seq',
  (SELECT GREATEST(COALESCE(MAX(NULLIF(regexp_replace(public_id, '\D', '', 'g'), '')::bigint), 0), 1)
     FROM greenhouse_hiring.talent_pool_membership)
);

-- 3. Anti pre-up-marker guard: aborta si el default no quedó reemplazado, si la expresión aún
--    recorta o si la secuencia no quedó reanclada bajo 100.000.
DO $$
DECLARE
  current_default text;
  probe text;
  seq_value bigint;
BEGIN
  SELECT pg_get_expr(d.adbin, d.adrelid) INTO current_default
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
   WHERE d.adrelid = 'greenhouse_hiring.talent_pool_membership'::regclass
     AND a.attname = 'public_id';

  IF current_default IS NULL OR position('next_talent_pool_public_id' IN current_default) = 0 THEN
    RAISE EXCEPTION 'ISSUE-172 anti pre-up-marker check: public_id default was NOT replaced (got: %)', current_default;
  END IF;

  probe := lpad('575712', GREATEST(5, length('575712')), '0');
  IF probe <> '575712' THEN
    RAISE EXCEPTION 'ISSUE-172: la expresión nueva sigue recortando (%)', probe;
  END IF;

  probe := lpad('7', GREATEST(5, length('7')), '0');
  IF probe <> '00007' THEN
    RAISE EXCEPTION 'ISSUE-172: la expresión nueva no rellena a 5 dígitos (%)', probe;
  END IF;

  SELECT last_value INTO seq_value
    FROM pg_sequences
   WHERE schemaname = 'greenhouse_hiring' AND sequencename = 'talent_pool_public_seq';

  IF seq_value IS NULL OR seq_value > 99999 THEN
    RAISE EXCEPTION 'ISSUE-172: la secuencia no quedó reanclada bajo 100000 (last_value=%)', seq_value;
  END IF;
END
$$;

-- Down Migration

-- Restaura el default original de TASK-1723. Reintroduce el recorte (es el undo, no una mejora).
-- La secuencia NO se devuelve a su valor previo: reanclarla hacia arriba sólo saltearía IDs.
ALTER TABLE greenhouse_hiring.talent_pool_membership
  ALTER COLUMN public_id SET DEFAULT ('EO-TLP-' || lpad(nextval('greenhouse_hiring.talent_pool_public_seq')::text, 5, '0'));

DROP FUNCTION IF EXISTS greenhouse_hiring.next_talent_pool_public_id();
