-- Up Migration
--
-- TASK-708b — VALIDATE final del CHECK settlement_legs_principal_requires_instrument
-- =====================================================================================
-- TASK-708 Slice 0 agrego el CHECK constraint con `NOT VALID` para no rechazar
-- las 4 phantom legs historicas (3 receipt + 1 funding) sin instrument_id.
-- Esta migracion corre el VALIDATE final que confirma que la base esta limpia
-- (cero violations) y promueve el constraint a enforced para todo dml futuro
-- + chequeo retroactivo.
--
-- ESTA MIGRACION FALLA SI HAY VIOLATIONS RESIDUALES.
-- Esa falla es intencional: actua como gate de Acceptance Criteria de TASK-708b.
--
-- Pre-requisitos para que pase:
--   1. apply de TASK-708b ejecutado para Cohorte A (3 receipt legs + 1 reconciled
--      bank_statement_row reanchored)
--   2. apply de TASK-708b para Cohorte B (no hay legs principales asociadas)
--   3. caso especial leg funding `stlleg-exp-pay-c15f6f51-...-funding-...` resuelto
--      (NO es Cohorte B; es payment outside backfill, leg auxiliar funding cuyo
--      instrument_id puede ser NULL para legs auxiliares — pero el CHECK exime
--      legs NOT IN ('receipt','payout'), asi que esa leg NO viola la invariante).
--
-- Si el VALIDATE falla, runbook docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md
-- documenta como identificar la fila residual y completar el apply.

SET search_path = greenhouse_finance, public;

-- Defensive sanity: verify zero violations BEFORE running VALIDATE.
DO $$
DECLARE
  violation_count INT;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM greenhouse_finance.settlement_legs
  WHERE leg_type IN ('receipt', 'payout')
    AND instrument_id IS NULL
    AND superseded_at IS NULL;

  IF violation_count > 0 THEN
    RAISE EXCEPTION 'TASK-708b: cannot VALIDATE settlement_legs_principal_requires_instrument — % residual violation(s). Ejecuta el runbook docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md antes de aplicar esta migracion.', violation_count;
  END IF;
END$$;

ALTER TABLE greenhouse_finance.settlement_legs
  VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument;

COMMENT ON CONSTRAINT settlement_legs_principal_requires_instrument
  ON greenhouse_finance.settlement_legs IS
  'TASK-708 Slice 0 + TASK-708b VALIDATE: legs principales (receipt/payout) deben tener instrument_id NOT NULL. NOT VALID original quedo activo desde 2026-04-28 12:38:18; VALIDATE confirma que la base esta limpia post-remediacion historica.';

-- Down Migration
--
-- Down: revertir el constraint a NOT VALID (si por alguna razon se debe permitir
-- legs principales sin instrument transitoriamente). NO se borra el constraint
-- — se relaja para que filas existentes no validen.

ALTER TABLE greenhouse_finance.settlement_legs
  DROP CONSTRAINT IF EXISTS settlement_legs_principal_requires_instrument;

ALTER TABLE greenhouse_finance.settlement_legs
  ADD CONSTRAINT settlement_legs_principal_requires_instrument
  CHECK (
    leg_type NOT IN ('receipt', 'payout')
    OR instrument_id IS NOT NULL
  )
  NOT VALID;
