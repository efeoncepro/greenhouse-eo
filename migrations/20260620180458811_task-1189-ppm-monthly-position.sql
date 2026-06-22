-- Up Migration

-- TASK-1189 — Posición mensual de PPM (Pago Provisional Mensual, línea PPM del
-- F29) por entidad legal. Mirror del patrón VAT/retenciones (TASK-725/1188): el
-- F29 se declara por RUT (operating entity), scope = `organization_id`, NUNCA
-- `space_id`. PPM = base imponible (ventas netas del período, `income.subtotal`
-- CLP-normalizado) × tasa PPM. La tasa la fija el SII por contribuyente y puede
-- cambiar en el tiempo → vive en una SSOT parametrizable (`ppm_rate_config`),
-- NUNCA hardcode. PPM es un agregado (base × tasa), no per-documento, así que NO
-- lleva tabla ledger (a diferencia de IVA/retenciones).

-- 1. SSOT de tasa PPM — parametrizable por entidad + rango de período.
--    organization_id NULL = tasa default para toda entidad. El resolver elige la
--    fila más específica (org-specific > default) cuyo rango cubra el período.
CREATE TABLE IF NOT EXISTS greenhouse_finance.ppm_rate_config (
  ppm_rate_config_id text PRIMARY KEY,
  organization_id text NULL REFERENCES greenhouse_core.organizations(organization_id),
  effective_period_start text NOT NULL,
  effective_period_end text NULL,
  rate numeric NOT NULL,
  source text NOT NULL DEFAULT 'placeholder_pending_contador',
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ppm_rate_config_rate_check CHECK (rate >= 0 AND rate <= 1),
  CONSTRAINT ppm_rate_config_period_start_format CHECK (effective_period_start ~ '^\d{4}-\d{2}$'),
  CONSTRAINT ppm_rate_config_period_end_format CHECK (effective_period_end IS NULL OR effective_period_end ~ '^\d{4}-\d{2}$')
);

CREATE INDEX IF NOT EXISTS ppm_rate_config_org_idx
  ON greenhouse_finance.ppm_rate_config (organization_id, effective_period_start DESC);

-- 2. Posición mensual de PPM consolidada por entidad legal.
CREATE TABLE IF NOT EXISTS greenhouse_finance.ppm_monthly_positions (
  ppm_position_id text PRIMARY KEY,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  organization_id text NULL REFERENCES greenhouse_core.organizations(organization_id),
  base_amount_clp numeric NOT NULL DEFAULT 0,
  ppm_rate numeric NOT NULL DEFAULT 0,
  ppm_amount_clp numeric NOT NULL DEFAULT 0,
  rate_source text NULL,
  document_count integer NOT NULL DEFAULT 0,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  materialization_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ppm_monthly_positions_period_month_check CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT ppm_monthly_positions_positive_amounts_check CHECK (
    base_amount_clp >= 0 AND ppm_rate >= 0 AND ppm_amount_clp >= 0
  )
);

-- 1 posición por entidad legal por mes (parcial porque organization_id es nullable).
CREATE UNIQUE INDEX IF NOT EXISTS ppm_monthly_positions_org_period_uniq
  ON greenhouse_finance.ppm_monthly_positions (organization_id, period_year, period_month)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ppm_monthly_positions_period_idx
  ON greenhouse_finance.ppm_monthly_positions (period_year, period_month);

-- 3. Seed de la tasa default — PLACEHOLDER pendiente de validación contable.
--    0.25% es la tasa fija ProPyme (14D N°3) común, pero la tasa real del
--    contribuyente la fija el SII; el contador actualiza esta fila antes del flip.
INSERT INTO greenhouse_finance.ppm_rate_config (
  ppm_rate_config_id, organization_id, effective_period_start, effective_period_end, rate, source, notes
) VALUES (
  'PPM-RATE-DEFAULT-2026',
  NULL,
  '2024-01',
  NULL,
  0.0025,
  'placeholder_pending_contador',
  'TASK-1189: tasa PPM default placeholder (0.25%). La tasa real del contribuyente la fija el SII — el contador debe actualizar esta fila (o agregar una org-specific) antes de prender PPM_POSITION_ENABLED.'
)
ON CONFLICT (ppm_rate_config_id) DO NOTHING;

-- 4. GRANTs (runtime + app leen/escriben; migrator para DDL). Owner = greenhouse_ops.
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.ppm_rate_config TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.ppm_rate_config TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.ppm_rate_config TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.ppm_monthly_positions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.ppm_monthly_positions TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.ppm_monthly_positions TO greenhouse_migrator;

-- 5. Anti pre-up-marker bug guard: aborta si las tablas/seed no quedaron.
DO $$
DECLARE
  rate_exists boolean;
  positions_exists boolean;
  seed_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'ppm_rate_config'
  ) INTO rate_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'ppm_monthly_positions'
  ) INTO positions_exists;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_finance.ppm_rate_config WHERE ppm_rate_config_id = 'PPM-RATE-DEFAULT-2026'
  ) INTO seed_exists;

  IF NOT rate_exists THEN
    RAISE EXCEPTION 'TASK-1189 anti pre-up-marker check: greenhouse_finance.ppm_rate_config NO fue creada.';
  END IF;

  IF NOT positions_exists THEN
    RAISE EXCEPTION 'TASK-1189 anti pre-up-marker check: greenhouse_finance.ppm_monthly_positions NO fue creada.';
  END IF;

  IF NOT seed_exists THEN
    RAISE EXCEPTION 'TASK-1189 anti pre-up-marker check: seed PPM-RATE-DEFAULT-2026 NO fue insertado.';
  END IF;
END
$$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.ppm_monthly_positions;
DROP TABLE IF EXISTS greenhouse_finance.ppm_rate_config;
