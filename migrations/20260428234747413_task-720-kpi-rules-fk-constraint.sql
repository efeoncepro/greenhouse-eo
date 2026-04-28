-- TASK-720 Slice 5 — FK enforcement: prevenir reincidencia.
--
-- Cualquier futuro INSERT en `accounts` con `instrument_category` no presente
-- en `instrument_category_kpi_rules` falla con FK violation. Forza que toda
-- categoría nueva pase por el catálogo declarativo antes de activar cuentas.
--
-- Pre-flight: validar que no haya filas activas que la FK rechazaría. Si
-- emerge una fila inválida, ABORT (transaction-scoped, sin estado parcial).

-- Up Migration

DO $$
DECLARE
  v_invalid_count INTEGER;
  v_invalid_categories TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(DISTINCT a.instrument_category, ', ')
  INTO v_invalid_count, v_invalid_categories
  FROM greenhouse_finance.accounts a
  WHERE a.is_active = TRUE
    AND a.instrument_category IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_finance.instrument_category_kpi_rules r
      WHERE r.instrument_category = a.instrument_category
    );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'TASK-720 Slice 5: % active accounts have instrument_category without rule: %. Add rules before applying FK.',
      v_invalid_count, v_invalid_categories;
  END IF;
END $$;

ALTER TABLE greenhouse_finance.accounts
  ADD CONSTRAINT fk_accounts_instrument_category_kpi_rules
  FOREIGN KEY (instrument_category)
  REFERENCES greenhouse_finance.instrument_category_kpi_rules(instrument_category)
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT fk_accounts_instrument_category_kpi_rules ON greenhouse_finance.accounts IS
  'TASK-720 — Cada instrument_category debe estar declarada en instrument_category_kpi_rules. Previene cuentas con KPI rule indefinida (que fail-fast en getBankOverview).';

-- Down Migration

ALTER TABLE greenhouse_finance.accounts
  DROP CONSTRAINT IF EXISTS fk_accounts_instrument_category_kpi_rules;
