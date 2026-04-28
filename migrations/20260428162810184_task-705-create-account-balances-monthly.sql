-- Up Migration
--
-- TASK-705 Slice 2 — account_balances_monthly canonical read model
-- ===================================================================
-- Read model agregado por (account_id, balance_year, balance_month). Hoy el
-- chart "Ultimos 12 meses" en AccountDetailDrawer se computa on-the-fly cada
-- vez via DISTINCT ON (date_trunc('month', balance_date)) sobre account_balances
-- diaria, lo que cuesta ~5+ segundos por apertura. Esta tabla materializa una
-- sola vez y se refresca reactivamente cuando los balances diarios cambian.
--
-- Reglas duras:
--   - PK textual app-generated (`acctbal-mo-{accountId}-{YYYY-MM}`) coherente
--     con el patron de account_balances daily.
--   - UNIQUE (account_id, balance_year, balance_month) garantiza idempotencia
--     (UPSERT canonico).
--   - FK a accounts(account_id) ON DELETE CASCADE: si la cuenta cae, sus
--     monthly snapshots tambien.
--   - FK a spaces(space_id) ON DELETE SET NULL: tenant puede salir, snapshot
--     historico se mantiene para audit.
--   - Columnas FX TASK-699 incluidas: realized + translation separadas + total.
--   - opening_balance / closing_balance / closing_balance_clp permiten leer
--     cualquier mes sin recomputar desde history.
--   - last_transaction_at facilita freshness signaling.

SET search_path = greenhouse_finance, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_finance.account_balances_monthly (
  balance_id                       TEXT PRIMARY KEY,
  account_id                       TEXT NOT NULL,
  space_id                         TEXT,
  balance_year                     INT NOT NULL,
  balance_month                    INT NOT NULL,
  currency                         TEXT NOT NULL,
  opening_balance                  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_balance                  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_balance_clp              NUMERIC(14, 2),
  period_inflows                   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  period_outflows                  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fx_gain_loss_clp                 NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fx_gain_loss_realized_clp        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fx_gain_loss_translation_clp     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transaction_count                INTEGER NOT NULL DEFAULT 0,
  last_transaction_at              TIMESTAMPTZ,
  computed_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT account_balances_monthly_year_month_check
    CHECK (balance_month BETWEEN 1 AND 12 AND balance_year BETWEEN 2000 AND 2999),
  CONSTRAINT account_balances_monthly_unique
    UNIQUE (account_id, balance_year, balance_month),
  CONSTRAINT account_balances_monthly_account_fkey
    FOREIGN KEY (account_id)
    REFERENCES greenhouse_finance.accounts (account_id)
    ON DELETE CASCADE,
  CONSTRAINT account_balances_monthly_space_fkey
    FOREIGN KEY (space_id)
    REFERENCES greenhouse_core.spaces (space_id)
    ON DELETE SET NULL
);

-- Hot path: lectura del chart "Ultimos 12 meses" de un cuenta especifica.
CREATE INDEX IF NOT EXISTS idx_account_balances_monthly_account_period
  ON greenhouse_finance.account_balances_monthly (account_id, balance_year DESC, balance_month DESC);

-- Hot path: scoping por space (tenant isolation) cuando se filtra por space_id.
CREATE INDEX IF NOT EXISTS idx_account_balances_monthly_space_account_period
  ON greenhouse_finance.account_balances_monthly (space_id, account_id, balance_year DESC, balance_month DESC)
  WHERE space_id IS NOT NULL;

-- Freshness signal hot path.
CREATE INDEX IF NOT EXISTS idx_account_balances_monthly_computed_at
  ON greenhouse_finance.account_balances_monthly (computed_at DESC);

-- updated_at trigger (project convention)
CREATE OR REPLACE FUNCTION greenhouse_finance.fn_account_balances_monthly_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_balances_monthly_touch_updated_at
  ON greenhouse_finance.account_balances_monthly;

CREATE TRIGGER trg_account_balances_monthly_touch_updated_at
  BEFORE UPDATE ON greenhouse_finance.account_balances_monthly
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_account_balances_monthly_touch_updated_at();

COMMENT ON TABLE greenhouse_finance.account_balances_monthly IS
  'TASK-705 read model: agregacion mensual de account_balances daily. Refrescado reactivamente via accountBalancesMonthlyProjection cuando un payment afecta un mes; tambien backfilled por ops-worker daily. Source of truth sigue siendo account_balances daily; este es proyeccion derivada.';

COMMENT ON COLUMN greenhouse_finance.account_balances_monthly.balance_id IS
  'PK app-generated: acctbal-mo-{accountId}-{YYYY-MM}.';

COMMENT ON COLUMN greenhouse_finance.account_balances_monthly.opening_balance IS
  'Closing del primer dia del mes (DISTINCT ON balance_date ASC).';

COMMENT ON COLUMN greenhouse_finance.account_balances_monthly.closing_balance IS
  'Closing del ultimo dia del mes con snapshot diario (DISTINCT ON balance_date DESC).';

COMMENT ON COLUMN greenhouse_finance.account_balances_monthly.computed_at IS
  'Timestamp de la ultima rematerializacion. Freshness signal: NOW() - computed_at > threshold => stale.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_account_balances_monthly_touch_updated_at
  ON greenhouse_finance.account_balances_monthly;
DROP FUNCTION IF EXISTS greenhouse_finance.fn_account_balances_monthly_touch_updated_at();

DROP INDEX IF EXISTS greenhouse_finance.idx_account_balances_monthly_computed_at;
DROP INDEX IF EXISTS greenhouse_finance.idx_account_balances_monthly_space_account_period;
DROP INDEX IF EXISTS greenhouse_finance.idx_account_balances_monthly_account_period;

DROP TABLE IF EXISTS greenhouse_finance.account_balances_monthly;
