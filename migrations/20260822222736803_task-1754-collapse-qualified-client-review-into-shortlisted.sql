-- Up Migration

-- TASK-1754 — EXPAND del colapso de etapas. `qualified` y `client_review` se absorben en
-- `shortlisted` (ADR GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1 §3).
--
-- ⚠️ ESTA MIGRACIÓN NO TOCA `hiring_application_stage_check`. Es deliberado y es la mitad
-- del punto: hay UNA sola instancia de Cloud SQL para dev, staging y producción, y hoy
-- `origin/main` todavía escribe `qualified` cuando un operador arrastra una tarjeta a la
-- columna «Evaluación» (la mitigación 4e1566d9a no está en producción). Angostar el `CHECK`
-- acá rompería producción en el acto — exactamente como pasó el 2026-08-22 con el enum de
-- desenlaces, que dejó «Dejar en espera» tirando 23514 durante ~7 minutos. El contract vive
-- parqueado en docs/tasks/pending-migrations/ y se aplica DESPUÉS del release que retira el
-- escritor. Canon: GREENHOUSE_DATABASE_TOOLING_V1.md.
--
-- Colapso CON PÉRDIDA DECLARADA: ningún campo recupera cuál de las tres etapas era. Se acepta
-- porque `qualified` y `client_review` nunca fueron elegibles desde ninguna superficie —los 10
-- movimientos humanos a «Evaluación» cayeron en `qualified` sin que nadie pudiera elegirlo—
-- así que no hay intención humana que preservar. Es pérdida real, y se declara acá en vez de
-- descubrirse después.
--
-- NO emite `hiring.application.stage_changed`: ese evento lo produce el command, no la base.
-- Fabricarlo desde SQL sería inventar un acto humano que no ocurrió, y además dispararía la
-- automatización de assessment sobre personas reales sin que nadie lo haya decidido. Las filas
-- migradas quedan visibles en la cola de reconciliación de su vacante
-- (`resolveApplicationsAwaitingAssignment`, que deriva del estado vigente), que es el camino
-- gobernado para que un humano decida si corresponde asignarles la prueba.

UPDATE greenhouse_hiring.hiring_application
SET stage = 'shortlisted'
WHERE stage IN ('qualified', 'client_review');

-- Readback dentro de la propia migración: si quedara una sola fila en las etapas absorbidas,
-- abortar. Un `UPDATE` que reporta "0 filas" y una migración que no corrió se ven idénticos
-- en el log de node-pg-migrate.
DO $$
DECLARE remaining bigint;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM greenhouse_hiring.hiring_application
  WHERE stage IN ('qualified', 'client_review');

  IF remaining > 0 THEN
    RAISE EXCEPTION 'TASK-1754 readback: quedan % filas en qualified/client_review despues del expand', remaining;
  END IF;
END
$$;

-- Down Migration

-- IRREVERSIBLE POR DISEÑO, y el `SELECT` de abajo lo hace explícito en vez de fingir un undo.
--
-- El colapso es con pérdida: la fila migrada ya no sabe si venía de `qualified` o de
-- `client_review`, así que no existe un `UPDATE` que las devuelva a su etapa original. Un down
-- que mandara todo `shortlisted` de vuelta a `qualified` sería PEOR que no tener down: movería
-- también las 4 filas que ya estaban legítimamente en `shortlisted` a una etapa donde la
-- automatización no las mira.
--
-- El rollback real de este slice es el revert del código (los literales siguen válidos en el
-- `CHECK` durante todo el expand, así que la base sigue aceptando lo que el código escriba).

SELECT 'TASK-1754: expand con perdida declarada; no hay undo de datos. Rollback = revert del codigo.' AS down_migration_notice;
