-- TASK-722 — Bank Reconciliation Synergy Workbench.
--
-- Cambios aditivos para conectar Banco (snapshots) ↔ Conciliación (periodos):
--
-- 1. account_reconciliation_snapshots.reconciliation_period_id TEXT FK
--    REFERENCES reconciliation_periods(period_id) ON DELETE SET NULL
--    nullable. Permite que un snapshot declarado en Banco se asocie al periodo
--    canónico una vez creado/abierto en el workbench. Si el periodo se elimina
--    (borrado físico no permitido hoy, pero defensivo), el snapshot queda
--    desligado pero NO se borra — preserva audit.
--
-- 2. UNIQUE (account_id, year, month) en reconciliation_periods. Hoy la PK es
--    period_id (text) y la idempotencia depende del formato deterministic
--    `accountId_year_MM` aplicado por createReconciliationPeriodInPostgres.
--    Sin UNIQUE compuesto, dos requests concurrentes pueden crear duplicados
--    con period_id distinto. Pre-flight detecta y aborta si encuentra
--    duplicados existentes (no debería haber — defensivo).

-- Up Migration

-- Pre-flight 1: detectar duplicados de (account_id, year, month) si los hay.
-- Si existen, ABORT — la migración no se aplica y el operador debe limpiar
-- los duplicados antes de re-correr.
DO $$
DECLARE
  v_dup_count INTEGER;
  v_dup_sample TEXT;
BEGIN
  WITH dups AS (
    SELECT account_id, year, month, COUNT(*)::int AS n
    FROM greenhouse_finance.reconciliation_periods
    GROUP BY account_id, year, month
    HAVING COUNT(*) > 1
  )
  SELECT COUNT(*), STRING_AGG(account_id || '/' || year || '-' || LPAD(month::text, 2, '0') || ' (n=' || n || ')', ', ')
  INTO v_dup_count, v_dup_sample
  FROM dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'TASK-722: % duplicate (account_id, year, month) groups in reconciliation_periods: %. Clean up before applying UNIQUE constraint.',
      v_dup_count, v_dup_sample;
  END IF;
END $$;

-- 1. Add UNIQUE constraint as DB-level idempotency guard.
ALTER TABLE greenhouse_finance.reconciliation_periods
  ADD CONSTRAINT uniq_recon_periods_account_year_month UNIQUE (account_id, year, month);

COMMENT ON CONSTRAINT uniq_recon_periods_account_year_month
  ON greenhouse_finance.reconciliation_periods IS
  'TASK-722 — DB-level idempotency: dos requests concurrentes con mismo (account_id, year, month) no pueden insertar duplicados. Antes de esto, la garantía era solo aplicacional via period_id deterministic.';

-- 2. Add FK from snapshots → periods (nullable, ON DELETE SET NULL).
ALTER TABLE greenhouse_finance.account_reconciliation_snapshots
  ADD COLUMN IF NOT EXISTS reconciliation_period_id TEXT
  REFERENCES greenhouse_finance.reconciliation_periods(period_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recon_snapshots_period
  ON greenhouse_finance.account_reconciliation_snapshots (reconciliation_period_id)
  WHERE reconciliation_period_id IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.account_reconciliation_snapshots.reconciliation_period_id IS
  'TASK-722 — FK al periodo canónico de conciliación. Linkea un snapshot declarado en Banco con el periodo del workbench que lo procesa. ON DELETE SET NULL preserva el snapshot si el periodo se elimina (borrado no permitido hoy, defensivo). NULL para snapshots sin periodo procesado todavía.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_recon_snapshots_period;

ALTER TABLE greenhouse_finance.account_reconciliation_snapshots
  DROP COLUMN IF EXISTS reconciliation_period_id;

ALTER TABLE greenhouse_finance.reconciliation_periods
  DROP CONSTRAINT IF EXISTS uniq_recon_periods_account_year_month;
