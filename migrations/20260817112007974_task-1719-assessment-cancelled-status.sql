-- Up Migration

-- TASK-1719 Slice 3 — Cancelación gobernada de un candidate_test.
--
-- Forward-fix del CHECK inline de `hiring_assessment.status` (nacido en
-- `20260708113233408_task-1360-assessment-engine.sql`, nombrado por Postgres
-- `hiring_assessment_status_check`). Se agrega el 7.º valor `cancelled`.
--
-- ⚠️ INVARIANTE DE DISEÑO — `cancelled` NO entra al predicado de instancia abierta.
-- El índice parcial `hiring_assessment_open_instance_unique_idx` cubre
-- ('assigned','sent','in_progress','submitted') y NO se toca. Dejar `cancelled` fuera
-- ES la recuperación: libera el slot (application_id, template_id) y habilita re-asignar
-- sin borrar la fila cancelada (que queda como evidencia auditable). Esto es exactamente
-- lo que ya declaraba el comentario de `20260710223640237_audit-hiring-structural-uniqueness.sql`.

ALTER TABLE greenhouse_hiring.hiring_assessment
  DROP CONSTRAINT IF EXISTS hiring_assessment_status_check;

ALTER TABLE greenhouse_hiring.hiring_assessment
  ADD CONSTRAINT hiring_assessment_status_check
  CHECK (status IN (
    'assigned', 'sent', 'in_progress', 'submitted', 'scored', 'expired', 'cancelled'));

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment.status IS
  'TASK-1719: `cancelled` es TERMINAL y sólo alcanzable desde `assigned`/`sent` (el candidato aún no empezó). Queda FUERA del predicado de instancia abierta a propósito: liberar el slot (application, template) ES el mecanismo de recuperación — se re-asigna sin borrar la fila cancelada. NUNCA agregar `cancelled` a hiring_assessment_open_instance_unique_idx.';

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el CHECK no quedó realmente aplicado
-- con el nuevo valor. Un `pgmigrations` verde sin DDL ejecutado es la falla silenciosa que
-- este bloque existe para hacer ruidosa.
DO $$
DECLARE
  cancelled_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hiring_assessment_status_check'
      AND pg_get_constraintdef(oid) LIKE '%cancelled%'
  ) INTO cancelled_ok;

  IF NOT cancelled_ok THEN
    RAISE EXCEPTION 'TASK-1719 forward-fix check failed: hiring_assessment_status_check sin ''cancelled''';
  END IF;
END
$$;

-- Down Migration

-- El down sólo puede volver al CHECK de 6 valores si NINGUNA fila quedó `cancelled`;
-- si quedó alguna, el ADD CONSTRAINT falla ruidoso (correcto: revertir borraría evidencia
-- de cancelaciones auditadas, y esa decisión es humana, no automática).
ALTER TABLE greenhouse_hiring.hiring_assessment
  DROP CONSTRAINT IF EXISTS hiring_assessment_status_check;

ALTER TABLE greenhouse_hiring.hiring_assessment
  ADD CONSTRAINT hiring_assessment_status_check
  CHECK (status IN (
    'assigned', 'sent', 'in_progress', 'submitted', 'scored', 'expired'));
