-- Up Migration

-- TASK-1719 — Forward-fix documental del ledger de assignment (auditoría adversarial de
-- Slices 3-5). Las migraciones anteriores ya están aplicadas: NO se editan.
--
-- HALLAZGO BLOQUEANTE. `cancelCandidateTest` nunca tocaba el ledger. Cancelar liberaba el
-- índice de la INSTANCIA (`hiring_assessment_open_instance_unique_idx` excluye `cancelled`)
-- pero dejaba la fila del ledger `outcome='assigned'`, `superseded_at IS NULL` y apuntando a
-- la instancia muerta. El índice del ledger — (application, policy, versión, etapa, intento)
-- WHERE `superseded_at IS NULL` — es una llave DISTINTA y NO se libera sola.
--
-- Consecuencia observable: re-asignar por el command gobernado devolvía `already_assigned` con
-- el `assessment_id` CANCELADO (HTTP 200, sin instancia nueva, sin correo), y en el carril
-- automático `stage-comms/decide.ts` leía ese `assigned` y CALLABA: candidato movido de etapa,
-- prueba cancelada, cero comunicación.
--
-- El fix es TS puro (`supersedeAssignmentsForAssessment`, en la misma transacción que cancela
-- la instancia) y NO necesita DDL: el GRANT column-scoped de la migración 20260817100030803 ya
-- concede UPDATE de (assessment_id, outcome, outcome_reason, superseded_at, updated_at) a
-- `greenhouse_runtime`, y los CHECK vigentes admiten `('cancelled', 'operator_cancelled')` con
-- instancia adjunta.
--
-- Lo que sí queda desactualizado es el COMMENT: afirmaba que NINGÚN write path escribe
-- `superseded_at`. Desde ahora sí lo escribe el path de cancelación, y un comentario que miente
-- en la base es exactamente lo que llevó a que nadie notara el agujero.

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.superseded_at IS
  'TASK-1719: libera la llave de idempotencia (application, policy, versión, etapa, intento). LO ESCRIBE el path de CANCELACIÓN (`supersedeAssignmentsForAssessment`, en la misma transacción que cancela la instancia), que además fija outcome=cancelled + outcome_reason=operator_cancelled. Cancelar libera DOS llaves: el índice de instancia abierta (estructural, `cancelled` está fuera de su predicado) y ésta (write explícito). El retry gobernado de un terminal-pero-recuperable (`held`/`blocked`/`stale`) por reconciliación sigue SIN write path: ese caso lo resuelve un command humano.';

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.outcome IS
  'TASK-1719: `intent` es NO TERMINAL y EFÍMERO — sólo vive entre el INSERT del intent y el UPDATE que le adjunta la instancia, dentro de la misma transacción; una fila `intent` en reposo es evidencia de un bug. `cancelled` lo escribe el supersede de la cancelación sobre una fila que era `assigned`: por eso el cap de volumen (D5.2) cuenta `assigned` MÁS `cancelled/operator_cancelled` — cancelar no des-envía el correo que el candidato ya recibió, así que no puede liberar presupuesto del cap.';

-- Anti pre-up-marker bug guard (ISSUE-068). Esta migración no crea objetos, así que el guard
-- verifica lo que la corrección REQUIERE de la base: los grants column-scoped que el supersede
-- necesita. Sin ellos el write revienta con 42501 dentro de la tx de cancelar — o sea, cancelar
-- dejaría de funcionar por completo.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(needed.column_name, ', ')
    INTO missing
    FROM (VALUES ('superseded_at'), ('outcome'), ('outcome_reason'), ('updated_at')) AS needed(column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.column_privileges
      WHERE table_schema = 'greenhouse_hiring'
        AND table_name = 'hiring_assessment_assignment'
        AND grantee = 'greenhouse_runtime'
        AND privilege_type = 'UPDATE'
        AND column_name = needed.column_name
   );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'TASK-1719 supersede write path: falta GRANT UPDATE(%) a greenhouse_runtime.', missing;
  END IF;
END
$$;

-- Down Migration

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.superseded_at IS
  'TASK-1719: reservado para el retry gobernado de un outcome terminal-pero-recuperable. NINGÚN write path lo escribe todavía (Slice 4). Hasta entonces, un outcome terminal congela ese (application, policy, versión, etapa, intento) y la recuperación es un command humano.';

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.outcome IS
  'TASK-1719: `intent` es NO TERMINAL y EFÍMERO — sólo vive entre el INSERT del intent y el UPDATE que le adjunta la instancia, dentro de la misma transacción. Una fila `intent` en reposo es evidencia de un bug, no un estado operable.';
