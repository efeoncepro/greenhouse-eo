-- Up Migration

-- TASK-1765 Slice 1 — EXPAND del eje de desenlace de `hiring_application`.
--
-- Implementa GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1 §4 y §4.1.
-- Aditiva a propósito: agrega los dos desenlaces nuevos, la causa gobernada y el campo de
-- archivado, y NO aplica todavía el invariante `stage='closed'` ⟺ desenlace (ese es el Slice 5,
-- bloqueado por TASK-1748 mientras sus 32 filas sintéticas sigan en `closed` sin decisión).
--
-- `on_hold` sigue admitido acá y sale en el Slice 4: mientras Application 360 lo ofrezca, retirarlo
-- del CHECK dejaría a esa superficie escribiendo un valor que la base rechaza.
--
-- El nombre `hiring_application_decision_check` NO se asumió: se resolvió por readback contra
-- pg_constraint el 2026-08-22 antes de escribir este DROP.

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'not_selected', 'rejected',
    'withdrawn', 'unresponsive', 'on_hold'));

ALTER TABLE greenhouse_hiring.hiring_application
  ADD COLUMN IF NOT EXISTS decision_cause TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN greenhouse_hiring.hiring_application.decision_cause IS
  'TASK-1765 — causa gobernada del desenlace. Obligatoria en `not_selected`, prohibida en el resto. '
  'Enum, NUNCA texto libre: el embudo de equidad y el cuerpo del correo ramifican por ella.';

COMMENT ON COLUMN greenhouse_hiring.hiring_application.archived_at IS
  'TASK-1765 — archivado del REGISTRO, ortogonal a `stage` y a `decision`. Archivar no declara el '
  'desenlace de nadie. Lo escribe TASK-1748; archivar escribiendo `closed` está prohibido (ADR §5).';

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_cause_check CHECK (
    decision_cause IS NULL
    OR decision_cause IN ('capacity_filled', 'opening_closed', 'process_cancelled'));

-- Bicondicional de pareja: la causa es obligatoria en `not_selected` y prohibida en los otros cinco.
--
-- OJO — NO "arreglar" esto envolviendo en COALESCE. Cuando `decision IS NULL` (postulación abierta),
-- `(decision = 'not_selected')` evalúa NULL, la comparación entera evalúa NULL, y un CHECK ACEPTA
-- NULL. Ese es el comportamiento DESEADO: una postulación sin decisión no tiene causa y tampoco la
-- exige. Envolver en COALESCE convertiría el caso abierto en una violación y rompería todo INSERT.
ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_cause_pairing_check CHECK (
    (decision_cause IS NOT NULL) = (decision = 'not_selected'));

CREATE INDEX IF NOT EXISTS hiring_application_archived_idx
  ON greenhouse_hiring.hiring_application (archived_at)
  WHERE archived_at IS NOT NULL;

-- Guard anti pre-up-marker: si los markers estuvieran invertidos, esta sección no habría corrido y
-- la migración quedaría registrada como aplicada sin haber ejecutado una sola línea de DDL. El repo
-- ya pagó ese bug dos veces (TASK-768 Slice 1, ISSUE-068 / TASK-404).
DO $$
DECLARE
  missing_columns int;
  missing_constraints int;
  missing_index int;
BEGIN
  SELECT COUNT(*) INTO missing_columns
    FROM (VALUES ('decision_cause'), ('archived_at')) AS expected(column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'greenhouse_hiring'
        AND c.table_name = 'hiring_application'
        AND c.column_name = expected.column_name);

  IF missing_columns > 0 THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: faltan % columna(s) de las 2 esperadas en greenhouse_hiring.hiring_application. Los markers de la migración pueden estar invertidos.', missing_columns;
  END IF;

  SELECT COUNT(*) INTO missing_constraints
    FROM (VALUES
      ('hiring_application_decision_check'),
      ('hiring_application_decision_cause_check'),
      ('hiring_application_decision_cause_pairing_check')
    ) AS expected(conname)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_constraint pc
      WHERE pc.conrelid = 'greenhouse_hiring.hiring_application'::regclass
        AND pc.contype = 'c'
        AND pc.conname = expected.conname);

  IF missing_constraints > 0 THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: faltan % constraint(s) de las 3 esperadas en greenhouse_hiring.hiring_application.', missing_constraints;
  END IF;

  SELECT COUNT(*) INTO missing_index
    FROM pg_indexes
   WHERE schemaname = 'greenhouse_hiring'
     AND tablename = 'hiring_application'
     AND indexname = 'hiring_application_archived_idx';

  IF missing_index <> 1 THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: hiring_application_archived_idx no quedó creado.';
  END IF;

  -- El CHECK ampliado tiene que admitir EXACTAMENTE los 7 literales del expand. Si alguien reordena
  -- o recorta la lista, esto lo detecta acá y no seis meses después con un INSERT rechazado en prod.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.hiring_application'::regclass
       AND conname = 'hiring_application_decision_check'
       AND pg_get_constraintdef(oid) LIKE '%not_selected%'
       AND pg_get_constraintdef(oid) LIKE '%unresponsive%'
  ) THEN
    RAISE EXCEPTION 'TASK-1765 anti pre-up-marker check: el CHECK de decision no admite not_selected/unresponsive.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_hiring.hiring_application_archived_idx;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_cause_pairing_check;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_cause_check;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP COLUMN IF EXISTS decision_cause,
  DROP COLUMN IF EXISTS archived_at;

ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'rejected', 'withdrawn', 'on_hold'));
