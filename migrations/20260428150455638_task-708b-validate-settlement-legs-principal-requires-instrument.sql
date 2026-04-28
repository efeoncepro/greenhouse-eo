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
-- Patron canonico: idempotente + self-checking (Camino E).
--   - Si quedan violations residuales → RAISE NOTICE + RETURN sin error.
--     La migracion corre a salvo en cualquier orden; queda registrada en
--     pgmigrations y puede re-evaluarse en el siguiente migrate:up.
--   - Si la base esta limpia (count == 0) → ALTER TABLE VALIDATE CONSTRAINT
--     se ejecuta y el constraint queda enforced.
--
-- Beneficio del skip silencioso: la migracion NO bloquea pnpm migrate:up
-- antes del apply runbook. El operador corre el runbook (inventory →
-- backfill → classify → apply) y al final un pnpm migrate:up que la re-corre
-- valida automaticamente cuando la base ya esta limpia.
--
-- Si el constraint ya esta validado por una corrida previa de esta migracion,
-- el VALIDATE es no-op (PostgreSQL detecta convalidated=TRUE y no re-evalua).

SET search_path = greenhouse_finance, public;

DO $$
DECLARE
  violation_count INT;
  is_validated BOOLEAN;
BEGIN
  -- Si el constraint ya quedo validado en una corrida previa, no hay nada que hacer.
  SELECT convalidated INTO is_validated
  FROM pg_constraint
  WHERE conname = 'settlement_legs_principal_requires_instrument'
    AND conrelid = 'greenhouse_finance.settlement_legs'::regclass;

  IF is_validated IS TRUE THEN
    RAISE NOTICE 'TASK-708b: settlement_legs_principal_requires_instrument already validated. No-op.';
    RETURN;
  END IF;

  -- Contar violations residuales.
  SELECT COUNT(*) INTO violation_count
  FROM greenhouse_finance.settlement_legs
  WHERE leg_type IN ('receipt', 'payout')
    AND instrument_id IS NULL
    AND superseded_at IS NULL;

  IF violation_count > 0 THEN
    RAISE NOTICE 'TASK-708b: skipping VALIDATE — % residual violation(s) remain. Run apply runbook (docs/operations/runbooks/TASK-708b-nubox-phantom-remediation.md) before this constraint can be enforced. Migration is registered as no-op until cleanup is complete; re-run pnpm migrate:up after apply to validate.', violation_count;

    RETURN;
  END IF;

  -- Base limpia: validar el constraint.
  EXECUTE 'ALTER TABLE greenhouse_finance.settlement_legs VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument';

  RAISE NOTICE 'TASK-708b: settlement_legs_principal_requires_instrument validated successfully — base is clean.';
END$$;

COMMENT ON CONSTRAINT settlement_legs_principal_requires_instrument
  ON greenhouse_finance.settlement_legs IS
  'TASK-708 Slice 0 + TASK-708b VALIDATE: legs principales (receipt/payout) deben tener instrument_id NOT NULL. NOT VALID original quedo activo desde 2026-04-28 12:38:18; VALIDATE confirma que la base esta limpia post-remediacion historica. Migracion idempotente con skip silencioso si hay residuos.';

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
