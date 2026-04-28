-- Up Migration
--
-- TASK-708b — Cleanup atomico: extender CHECK + cascade supersede + VALIDATE
-- ============================================================================
-- Tras correr el apply runbook, quedan settlement_legs residuales (receipt/payout
-- con instrument_id NULL) cuyos linked_payment_id ya estaban superseded por chain
-- previa (TASK-702: factoring proceeds + replacements). El CHECK actual rechaza
-- UPDATE de esas filas porque sigue evaluando `instrument_id NOT NULL`.
--
-- Esta migracion hace 3 cosas en transaccion:
--
--   1. DROP + CREATE CHECK extendido para excluir filas superseded de la
--      invariante. Coherente con la regla canonica: "supersede chains
--      (payment, OTB, dismissal) quedan fuera de invariantes activas". Una
--      leg superseded es historico audit-only.
--
--   2. Cascade supersede de legs cuyos linked_payment_id ya estan superseded.
--      Patron canonico: si el payment cae, la leg cae con audit (no deletes).
--
--   3. VALIDATE CONSTRAINT — confirma que la base esta limpia post-cleanup
--      y promueve el CHECK a enforced retroactivo + futuro.
--
-- La migracion es atomica: si VALIDATE falla, todo el cleanup hace rollback.

SET search_path = greenhouse_finance, public;

-- =========================================================================
-- 1. Extender CHECK para excluir filas superseded
-- =========================================================================

ALTER TABLE greenhouse_finance.settlement_legs
  DROP CONSTRAINT IF EXISTS settlement_legs_principal_requires_instrument;

ALTER TABLE greenhouse_finance.settlement_legs
  ADD CONSTRAINT settlement_legs_principal_requires_instrument
  CHECK (
    leg_type NOT IN ('receipt', 'payout')
    OR instrument_id IS NOT NULL
    OR superseded_at IS NOT NULL
    OR superseded_by_otb_id IS NOT NULL
  )
  NOT VALID;

-- =========================================================================
-- 2. Cascade supersede: legs cuyos linked income_payments ya estan superseded
-- =========================================================================

UPDATE greenhouse_finance.settlement_legs sl
SET superseded_at = NOW(),
    superseded_reason = 'TASK-708b: cascade supersede — linked income_payment ya superseded por chain previa, leg asociada queda fuera del pool reconciliable.',
    updated_at = NOW()
FROM greenhouse_finance.income_payments ip
WHERE sl.leg_type IN ('receipt', 'payout')
  AND sl.instrument_id IS NULL
  AND sl.superseded_at IS NULL
  AND ip.payment_id = sl.linked_payment_id
  AND sl.linked_payment_type = 'income_payment'
  AND ip.superseded_at IS NOT NULL;

-- Mismo cleanup para expense_payments (defensivo, no debería haber casos hoy
-- pero la regla aplica simetrica).
UPDATE greenhouse_finance.settlement_legs sl
SET superseded_at = NOW(),
    superseded_reason = 'TASK-708b: cascade supersede — linked expense_payment ya superseded por chain previa, leg asociada queda fuera del pool reconciliable.',
    updated_at = NOW()
FROM greenhouse_finance.expense_payments ep
WHERE sl.leg_type IN ('receipt', 'payout')
  AND sl.instrument_id IS NULL
  AND sl.superseded_at IS NULL
  AND ep.payment_id = sl.linked_payment_id
  AND sl.linked_payment_type = 'expense_payment'
  AND ep.superseded_at IS NOT NULL;

-- =========================================================================
-- 3. VALIDATE — la base debe estar limpia ahora
-- =========================================================================

DO $$
DECLARE
  violation_count INT;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM greenhouse_finance.settlement_legs
  WHERE leg_type IN ('receipt', 'payout')
    AND instrument_id IS NULL
    AND superseded_at IS NULL
    AND superseded_by_otb_id IS NULL;

  IF violation_count > 0 THEN
    RAISE EXCEPTION 'TASK-708b: % residual violation(s) remain after cascade supersede. Apply runbook before this migration. Migration aborted (transaction rolled back).', violation_count;
  END IF;

  EXECUTE 'ALTER TABLE greenhouse_finance.settlement_legs VALIDATE CONSTRAINT settlement_legs_principal_requires_instrument';

  RAISE NOTICE 'TASK-708b: cascade supersede + VALIDATE completed successfully — base is clean.';
END$$;

COMMENT ON CONSTRAINT settlement_legs_principal_requires_instrument
  ON greenhouse_finance.settlement_legs IS
  'TASK-708 + TASK-708b: legs principales (receipt/payout) deben tener instrument_id NOT NULL. Filas superseded (cualquier chain: payment, OTB, dismissal manual) quedan fuera de la invariante — son historico audit-only. Validado retroactivo + enforced para todo dml futuro.';

-- Down Migration
--
-- Revertir el CHECK a su shape sin la clausula superseded_at. NO revertimos los
-- cascade supersedes (preservan audit). Si por alguna razon hace falta volver
-- al CHECK estricto, hay que limpiar manualmente las filas superseded antes.

ALTER TABLE greenhouse_finance.settlement_legs
  DROP CONSTRAINT IF EXISTS settlement_legs_principal_requires_instrument;

ALTER TABLE greenhouse_finance.settlement_legs
  ADD CONSTRAINT settlement_legs_principal_requires_instrument
  CHECK (
    leg_type NOT IN ('receipt', 'payout')
    OR instrument_id IS NOT NULL
  )
  NOT VALID;
