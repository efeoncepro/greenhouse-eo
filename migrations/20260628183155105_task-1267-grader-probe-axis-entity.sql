-- Up Migration

-- TASK-1267 Slice 1 — Entity Infrastructure Probes.
-- Suma un TERCER eje ortogonal de readiness al probe layer de TASK-1266: `entity`
-- ("¿existe el backbone real de entidad de la marca en el mundo?" — Google Knowledge
-- Graph / Wikidata / Reddit-UGC). Los ejes existentes `structural` ("¿por qué no te
-- citan?") y `agentic` ("¿te pueden usar los agentes?") quedan intactos.
--
-- El CHECK inline original (`axis IN ('structural','agentic')`, auto-nombrado
-- `grader_probe_results_axis_check`) RECHAZARÍA las filas de eje `entity`. Esta migración
-- es additive + idempotente: reemplaza el CHECK por la versión de 3 valores. Todas las
-- filas existentes (solo structural/agentic) satisfacen el nuevo CHECK → se agrega validado.
-- `probe_kind` es TEXT libre (sin CHECK) → los kinds nuevos (knowledge_graph/wikidata/
-- reddit_ugc) NO requieren cambio de schema.

SET search_path TO public, greenhouse_growth;

-- Drop del CHECK previo por descubrimiento (defensa ante nombre auto-generado distinto
-- entre entornos): se localiza el constraint CHECK sobre la columna `axis` que todavía NO
-- contempla `entity` y se elimina; luego se agrega el nuevo con nombre estable.
DO $$
DECLARE
  axis_check_name text;
BEGIN
  SELECT con.conname
    INTO axis_check_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'greenhouse_growth'
    AND rel.relname = 'grader_probe_results'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%axis%'
    AND pg_get_constraintdef(con.oid) NOT ILIKE '%entity%'
  LIMIT 1;

  IF axis_check_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE greenhouse_growth.grader_probe_results DROP CONSTRAINT %I',
      axis_check_name
    );
  END IF;
END
$$;

ALTER TABLE greenhouse_growth.grader_probe_results
  ADD CONSTRAINT grader_probe_results_axis_check
  CHECK (axis IN ('structural', 'agentic', 'entity'));

-- Anti pre-up-marker guard (ISSUE-068): aborta si el nuevo CHECK no quedó aplicado o
-- si todavía rechaza 'entity' (markers invertidos / drop+add no ejecutado).
DO $$
DECLARE
  allows_entity boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'greenhouse_growth'
      AND rel.relname = 'grader_probe_results'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%entity%'
  ) INTO allows_entity;

  IF NOT allows_entity THEN
    RAISE EXCEPTION 'TASK-1267 anti pre-up-marker check: grader_probe_results axis CHECK does NOT allow entity. Migration markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

SET search_path TO public, greenhouse_growth;

-- Revert al CHECK de 2 valores. Asume que no quedaron filas `entity` (el rollback va de
-- la mano del flag OFF + revert del código que las produce); si las hubiera, este ALTER
-- fallaría loud (correcto: no se debe descartar evidencia silenciosamente).
ALTER TABLE greenhouse_growth.grader_probe_results
  DROP CONSTRAINT IF EXISTS grader_probe_results_axis_check;

ALTER TABLE greenhouse_growth.grader_probe_results
  ADD CONSTRAINT grader_probe_results_axis_check
  CHECK (axis IN ('structural', 'agentic'));
