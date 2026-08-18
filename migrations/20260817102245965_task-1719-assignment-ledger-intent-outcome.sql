-- Up Migration

-- TASK-1719 — Forward-fix del ledger de assignment (auditoría adversarial de Slices 1-2).
-- La migración 20260817100030803 ya está aplicada: NO se edita, se corrige hacia adelante.
--
-- HALLAZGO #1 (bloqueante). El CHECK `hiring_assessment_assignment_assigned_instance_ck`
-- (`outcome <> 'assigned' OR assessment_id IS NOT NULL`) es correcto, pero el command escribía
-- `outcome='assigned'` con `assessment_id=NULL` ANTES de crear la instancia — el ledger es el
-- hecho durable y la instancia su consecuencia. Resultado: `23514` en TODA asignación exitosa,
-- error crudo → 500 y dead-letter fabricado en el carril reactivo. El happy path era el único
-- camino que NO funcionaba.
--
-- Fix: se agrega el outcome NO TERMINAL `'intent'`. El command registra el intent con
-- `'intent'` (sin instancia, legítimamente), crea la instancia y cierra la fila a
-- `assigned | already_assigned` dentro de la MISMA transacción. Se preserva el invariante
-- ("el intent es el hecho durable") y se conserva el CHECK, que sigue prohibiendo el estado
-- que miente (`assigned` sin instancia).
--
-- `'intent'` es un estado EFÍMERO por construcción: sólo existe entre el INSERT y el UPDATE
-- de la misma transacción. Una fila `'intent'` en reposo significa que un command murió
-- después de commitear el ledger — imposible hoy (todo corre en una tx), pero si aparece es
-- evidencia de un bug, no un estado operable. Los readers la tratan como fault, nunca como
-- outcome comunicable al candidato.
--
-- HALLAZGO #5. `attempt_seq > 1` sólo lo puede escribir un command humano (ADR D2 capa 3).
-- El guardia vivía SOLO en TS y `recordAssignment` está exportado: cualquier caller nuevo lo
-- salta. Se baja a la DB (trío canónico state-machine + CHECK + audit).

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  DROP CONSTRAINT IF EXISTS hiring_assessment_assignment_outcome_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  ADD CONSTRAINT hiring_assessment_assignment_outcome_check
  CHECK (outcome IN (
    'intent', 'assigned', 'already_assigned', 'held', 'blocked', 'stale', 'cancelled'));

-- ADR D2 capa 3 en la DB: la automatización SOLO registra el primer intento. Retake y
-- re-asignación post-cancelación son commands humanos con capability y razón. Un bug de la
-- policy no puede generar la segunda prueba de nadie ni saltándose el TS.
ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  DROP CONSTRAINT IF EXISTS hiring_assessment_assignment_attempt_authority_ck;

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  ADD CONSTRAINT hiring_assessment_assignment_attempt_authority_ck
  CHECK (origin = 'manual' OR attempt_seq = 1);

-- HALLAZGO #11. El comentario de la migración anterior afirmaba que "la reconciliación
-- supersede y vuelve a intentar". NADA escribe `superseded_at` hoy: la columna existe y el
-- índice único parcial la honra, pero el write path de supersede es Slice 4. Se deja escrito
-- en la DB para que nadie lea la capacidad como si ya existiera.
COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.superseded_at IS
  'TASK-1719: reservado para el retry gobernado de un outcome terminal-pero-recuperable. NINGÚN write path lo escribe todavía (Slice 4). Hasta entonces, un outcome terminal congela ese (application, policy, versión, etapa, intento) y la recuperación es un command humano.';

COMMENT ON COLUMN greenhouse_hiring.hiring_assessment_assignment.outcome IS
  'TASK-1719: `intent` es NO TERMINAL y EFÍMERO — sólo vive entre el INSERT del intent y el UPDATE que le adjunta la instancia, dentro de la misma transacción. Una fila `intent` en reposo es evidencia de un bug, no un estado operable.';

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los CHECK no quedaron realmente aplicados.
DO $$
DECLARE
  intent_ok boolean;
  attempt_ck_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hiring_assessment_assignment_outcome_check'
      AND pg_get_constraintdef(oid) LIKE '%intent%'
  ) INTO intent_ok;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hiring_assessment_assignment_attempt_authority_ck'
  ) INTO attempt_ck_ok;

  IF NOT intent_ok OR NOT attempt_ck_ok THEN
    RAISE EXCEPTION 'TASK-1719 forward-fix check failed: intent_outcome=% attempt_authority=%',
      intent_ok, attempt_ck_ok;
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  DROP CONSTRAINT IF EXISTS hiring_assessment_assignment_attempt_authority_ck;

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  DROP CONSTRAINT IF EXISTS hiring_assessment_assignment_outcome_check;

ALTER TABLE greenhouse_hiring.hiring_assessment_assignment
  ADD CONSTRAINT hiring_assessment_assignment_outcome_check
  CHECK (outcome IN ('assigned', 'already_assigned', 'held', 'blocked', 'stale', 'cancelled'));
