-- Up Migration

-- TASK-1188 — Posición mensual de RETENCIONES (línea retenciones del F29) por
-- entidad legal. Mirror del patrón VAT (TASK-725/533): el F29 se declara por RUT
-- (operating entity), así que el scope fiscal es `organization_id`, NUNCA
-- `space_id`/`client_id`. La fuente es la retención SII que Efeonce PRACTICÓ como
-- agente retenedor al pagar honorarios:
--   1. payroll honorarios internos  → greenhouse_payroll.payroll_entries.sii_retention_amount
--   2. boletas honorarios recibidas → greenhouse_finance.expenses.withholding_amount (BHE)
-- El ledger guarda ambos orígenes etiquetados (`source_kind`) + un dedup guard
-- (`dedup_status` + `superseded_by_entry_id`) para no doble-contar cuando un mismo
-- honorario (mismo RUT + período) aparece en las 2 fuentes (se prefiere la BHE =
-- documento legal). La posición consolida el ledger `counted` por (entidad, período).

-- 1. Ledger de asientos de retención (un asiento por documento-fuente).
CREATE TABLE IF NOT EXISTS greenhouse_finance.retention_ledger_entries (
  retention_entry_id text PRIMARY KEY,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  organization_id text NULL REFERENCES greenhouse_core.organizations(organization_id),
  source_kind text NOT NULL,
  source_id text NOT NULL,
  source_public_ref text NULL,
  counterparty_rut text NULL,
  counterparty_name text NULL,
  source_date date NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  exchange_rate_to_clp numeric NULL,
  retention_bucket text NOT NULL,
  retention_rate numeric NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  retention_amount numeric NOT NULL DEFAULT 0,
  retention_amount_clp numeric NOT NULL DEFAULT 0,
  dedup_status text NOT NULL DEFAULT 'counted',
  superseded_by_entry_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT retention_ledger_entries_period_month_check CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT retention_ledger_entries_source_kind_check CHECK (
    source_kind IN ('payroll_honorarios', 'expense_bhe')
  ),
  CONSTRAINT retention_ledger_entries_bucket_check CHECK (
    retention_bucket IN ('honorarios', 'segunda_categoria')
  ),
  CONSTRAINT retention_ledger_entries_dedup_status_check CHECK (
    dedup_status IN ('counted', 'superseded')
  ),
  CONSTRAINT retention_ledger_entries_positive_amounts_check CHECK (
    gross_amount >= 0 AND retention_amount >= 0 AND retention_amount_clp >= 0
  )
);

-- Idempotencia del materializador: un asiento por (source_kind, source_id, período).
CREATE UNIQUE INDEX IF NOT EXISTS retention_ledger_entries_source_uniq
  ON greenhouse_finance.retention_ledger_entries (source_kind, source_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS retention_ledger_entries_org_period_idx
  ON greenhouse_finance.retention_ledger_entries (organization_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS retention_ledger_entries_period_idx
  ON greenhouse_finance.retention_ledger_entries (period_year, period_month);

-- 2. Posición mensual consolidada por entidad legal.
CREATE TABLE IF NOT EXISTS greenhouse_finance.retention_monthly_positions (
  retention_position_id text PRIMARY KEY,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  organization_id text NULL REFERENCES greenhouse_core.organizations(organization_id),
  total_retention_amount_clp numeric NOT NULL DEFAULT 0,
  honorarios_retention_amount_clp numeric NOT NULL DEFAULT 0,
  segunda_categoria_retention_amount_clp numeric NOT NULL DEFAULT 0,
  gross_base_amount_clp numeric NOT NULL DEFAULT 0,
  document_count integer NOT NULL DEFAULT 0,
  ledger_entry_count integer NOT NULL DEFAULT 0,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  materialization_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT retention_monthly_positions_period_month_check CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT retention_monthly_positions_positive_amounts_check CHECK (
    total_retention_amount_clp >= 0
    AND honorarios_retention_amount_clp >= 0
    AND segunda_categoria_retention_amount_clp >= 0
  )
);

-- 1 posición por entidad legal por mes (parcial porque organization_id es nullable).
CREATE UNIQUE INDEX IF NOT EXISTS retention_monthly_positions_org_period_uniq
  ON greenhouse_finance.retention_monthly_positions (organization_id, period_year, period_month)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS retention_monthly_positions_period_idx
  ON greenhouse_finance.retention_monthly_positions (period_year, period_month);

-- 3. GRANTs (runtime + app leen/escriben; migrator para DDL). Owner = greenhouse_ops.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.retention_ledger_entries TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.retention_ledger_entries TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.retention_ledger_entries TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.retention_monthly_positions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.retention_monthly_positions TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.retention_monthly_positions TO greenhouse_migrator;

-- 4. Anti pre-up-marker bug guard: aborta si las tablas no quedaron creadas.
DO $$
DECLARE
  ledger_exists boolean;
  positions_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'retention_ledger_entries'
  ) INTO ledger_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'retention_monthly_positions'
  ) INTO positions_exists;

  IF NOT ledger_exists THEN
    RAISE EXCEPTION 'TASK-1188 anti pre-up-marker check: greenhouse_finance.retention_ledger_entries NO fue creada.';
  END IF;

  IF NOT positions_exists THEN
    RAISE EXCEPTION 'TASK-1188 anti pre-up-marker check: greenhouse_finance.retention_monthly_positions NO fue creada.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.retention_ledger_entries;
DROP TABLE IF EXISTS greenhouse_finance.retention_monthly_positions;
