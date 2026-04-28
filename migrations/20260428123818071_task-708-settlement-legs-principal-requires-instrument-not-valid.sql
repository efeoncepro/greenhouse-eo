-- Up Migration
--
-- TASK-708 Slice 0 — settlement_legs principal requires instrument (NOT VALID)
-- ============================================================================
-- Settlement legs con leg_type IN ('receipt','payout') son los anchors canonicos
-- de cash flow. Permitir instrument_id IS NULL en estas legs es un bug:
-- significa que se puede reconciliar contra una leg sin saber a que cuenta
-- pertenece el cash.
--
-- Validado en datos (2026-04-28): hay 4 legs con instrument_id IS NULL
-- (3 receipt + 1 funding), 1 receipt ya reconciliada contra una bank statement row.
-- Esos rows son responsabilidad de TASK-708b (historical remediation).
--
-- En Slice 0 agregamos el CHECK con NOT VALID:
--   - PostgreSQL no valida filas existentes (las 4 phantom legs sobreviven).
--   - Cualquier INSERT/UPDATE nuevo es validado: no se puede crear una
--     receipt/payout leg con instrument_id NULL.
--   - El VALIDATE final corre al cierre de TASK-708b cuando el histórico se
--     limpie. Ese paso vive en migracion separada (no en esta task).
--
-- legs con leg_type IN ('funding','fx_conversion','internal_transfer','fee')
-- siguen permitiendo instrument_id NULL como esta hoy — son legs auxiliares
-- que no representan cash anchor primario.

SET search_path = greenhouse_finance, public;

ALTER TABLE greenhouse_finance.settlement_legs
  ADD CONSTRAINT settlement_legs_principal_requires_instrument
  CHECK (
    leg_type NOT IN ('receipt', 'payout')
    OR instrument_id IS NOT NULL
  )
  NOT VALID;

COMMENT ON CONSTRAINT settlement_legs_principal_requires_instrument
  ON greenhouse_finance.settlement_legs IS
  'TASK-708 Slice 0: legs principales (receipt/payout) deben tener instrument_id NOT NULL — sin cuenta canonica no se puede reconciliar honestamente. NOT VALID hasta que TASK-708b limpie phantoms historicos; entonces VALIDATE en migracion separada.';

-- Down Migration

ALTER TABLE greenhouse_finance.settlement_legs
  DROP CONSTRAINT IF EXISTS settlement_legs_principal_requires_instrument;
