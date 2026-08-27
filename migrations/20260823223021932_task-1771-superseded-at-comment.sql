-- Up Migration` no se ejecutó (bug de pre-up-marker) y la migración quedó registrada
--   sin hacer nada.
--
-- POR QUÉ EL COMENTARIO NUEVO NO VUELVE A CADUCAR (el arreglo de fondo no es el timing, es el
--   fraseo): el vigente afirma una AUSENCIA —«ningún write path lo escribe todavía»— y eso es un
--   hecho sobre el estado del código guardado en una base que sirve a tres entornos con versiones
--   distintas. No puede ser cierto para los tres a la vez ni con el timing perfecto. El nuevo
--   describe SEMÁNTICA: qué significa la columna y en qué se diferencian sus dos escritores. Eso
--   no caduca con un deploy. Lo único que lo ata al release es que NOMBRA `supersedeAssignmentDeadEnd`,
--   y por eso —no por riesgo— la condición de arriba es estricta. Regla general en
--   GREENHOUSE_DATABASE_TOOLING_V1.md (2026-08-23).
--
-- RIESGO: nulo sobre los datos. `COMMENT ON COLUMN` es metadata: no reescribe filas, no escanea
--   la tabla y se revierte con otro COMMENT. Lo que sí exige cuidado es `migrate:up`, que aplica
--   TODAS las pendientes: verificar `pnpm migrate:status` y no correr nada si aparece alguna ajena.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Up Migration

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.superseded_at IS
  'TASK-1771: liberación gobernada de la clave de idempotencia. Lo escribe `supersedeAssignmentDeadEnd` (carril automático, resultado recuperable, capability hiring.assessment.policy.govern, tope de 3 por clave y condición de que la asignación HOY ocurriría) y `supersedeAssignmentsForAssessment` (cancelación de la instancia). El primero CONSERVA `outcome` y `outcome_reason` —son la explicación del bloqueo—; el segundo los reescribe a cancelled porque ahí el hecho sí cambió. NUNCA se recupera borrando filas: el ledger es append-only.';

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el COMMENT no quedó aplicado de verdad.
DO $$
DECLARE
  comment_ok boolean;
BEGIN
  SELECT COALESCE(
    col_description(
      'greenhouse_hiring.hiring_assessment_assignment'::regclass,
      (SELECT ordinal_position
         FROM information_schema.columns
        WHERE table_schema = 'greenhouse_hiring'
          AND table_name = 'hiring_assessment_assignment'
          AND column_name = 'superseded_at')::int
    ) LIKE '%TASK-1771%', false) INTO comment_ok;

  IF NOT comment_ok THEN
    RAISE EXCEPTION 'TASK-1771 anti pre-up-marker check: el COMMENT de superseded_at NO se aplicó. Los markers pueden estar invertidos.';
  END IF;
END
$$;

-- Down Migration

-- OJO: NO es el texto que traia el `.pending`. Ese restauraba la variante «NINGÚN write path lo
-- escribe todavía (Slice 4)», que dejó de ser el comentario vigente: el readback previo a aplicar
-- esta migración devolvió el texto de abajo, refinado despues de escribirse el parqueo. Un rollback
-- al texto del `.pending` habria instalado un comentario que nunca existio en la base.
COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.superseded_at IS
  'TASK-1719: libera la llave de idempotencia (application, policy, versión, etapa, intento). LO ESCRIBE el path de CANCELACIÓN (`supersedeAssignmentsForAssessment`, en la misma transacción que cancela la instancia), que además fija outcome=cancelled + outcome_reason=operator_cancelled. Cancelar libera DOS llaves: el índice de instancia abierta (estructural, `cancelled` está fuera de su predicado) y ésta (write explícito). El retry gobernado de un terminal-pero-recuperable (`held`/`blocked`/`stale`) por reconciliación sigue SIN write path: ese caso lo resuelve un command humano.';
