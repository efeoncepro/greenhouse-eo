-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

ALTER TABLE greenhouse_commercial.sellable_role_cost_components
  ADD COLUMN IF NOT EXISTS direct_overhead_pct numeric(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shared_overhead_pct numeric(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'catalog_seed',
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric(5,4) NOT NULL DEFAULT 0.6000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sellable_role_cost_components_direct_overhead_pct_range'
  ) THEN
    ALTER TABLE greenhouse_commercial.sellable_role_cost_components
      ADD CONSTRAINT sellable_role_cost_components_direct_overhead_pct_range
      CHECK (direct_overhead_pct >= 0 AND direct_overhead_pct <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sellable_role_cost_components_shared_overhead_pct_range'
  ) THEN
    ALTER TABLE greenhouse_commercial.sellable_role_cost_components
      ADD CONSTRAINT sellable_role_cost_components_shared_overhead_pct_range
      CHECK (shared_overhead_pct >= 0 AND shared_overhead_pct <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sellable_role_cost_components_source_kind_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.sellable_role_cost_components
      ADD CONSTRAINT sellable_role_cost_components_source_kind_check
      CHECK (source_kind = ANY (ARRAY[
        'catalog_seed'::text,
        'admin_manual'::text,
        'payroll_bridge'::text,
        'modeled_formula'::text,
        'backfill'::text
      ]));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sellable_role_cost_components_confidence_score_range'
  ) THEN
    ALTER TABLE greenhouse_commercial.sellable_role_cost_components
      ADD CONSTRAINT sellable_role_cost_components_confidence_score_range
      CHECK (confidence_score >= 0 AND confidence_score <= 1);
  END IF;
END $$;

ALTER TABLE greenhouse_commercial.sellable_role_cost_components
  ADD COLUMN IF NOT EXISTS confidence_label text
    GENERATED ALWAYS AS (
      CASE
        WHEN confidence_score >= 0.85 THEN 'high'
        WHEN confidence_score >= 0.60 THEN 'medium'
        ELSE 'low'
      END
    ) STORED,
  ADD COLUMN IF NOT EXISTS direct_overhead_amount_usd numeric(12,2)
    GENERATED ALWAYS AS (
      (
        base_salary_usd
          + COALESCE(bonus_jit_usd, 0)
          + COALESCE(bonus_rpa_usd, 0)
          + COALESCE(bonus_ar_usd, 0)
          + COALESCE(bonus_sobrecumplimiento_usd, 0)
          + COALESCE(gastos_previsionales_usd, 0)
          + COALESCE(fee_deel_usd, 0)
          + COALESCE(fee_eor_usd, 0)
      ) * direct_overhead_pct
    ) STORED,
  ADD COLUMN IF NOT EXISTS shared_overhead_amount_usd numeric(12,2)
    GENERATED ALWAYS AS (
      (
        base_salary_usd
          + COALESCE(bonus_jit_usd, 0)
          + COALESCE(bonus_rpa_usd, 0)
          + COALESCE(bonus_ar_usd, 0)
          + COALESCE(bonus_sobrecumplimiento_usd, 0)
          + COALESCE(gastos_previsionales_usd, 0)
          + COALESCE(fee_deel_usd, 0)
          + COALESCE(fee_eor_usd, 0)
      ) * shared_overhead_pct
    ) STORED,
  ADD COLUMN IF NOT EXISTS loaded_monthly_cost_usd numeric(14,2)
    GENERATED ALWAYS AS (
      (
        base_salary_usd
          + COALESCE(bonus_jit_usd, 0)
          + COALESCE(bonus_rpa_usd, 0)
          + COALESCE(bonus_ar_usd, 0)
          + COALESCE(bonus_sobrecumplimiento_usd, 0)
          + COALESCE(gastos_previsionales_usd, 0)
          + COALESCE(fee_deel_usd, 0)
          + COALESCE(fee_eor_usd, 0)
      )
      + (
        (
          base_salary_usd
            + COALESCE(bonus_jit_usd, 0)
            + COALESCE(bonus_rpa_usd, 0)
            + COALESCE(bonus_ar_usd, 0)
            + COALESCE(bonus_sobrecumplimiento_usd, 0)
            + COALESCE(gastos_previsionales_usd, 0)
            + COALESCE(fee_deel_usd, 0)
            + COALESCE(fee_eor_usd, 0)
        ) * direct_overhead_pct
      )
      + (
        (
          base_salary_usd
            + COALESCE(bonus_jit_usd, 0)
            + COALESCE(bonus_rpa_usd, 0)
            + COALESCE(bonus_ar_usd, 0)
            + COALESCE(bonus_sobrecumplimiento_usd, 0)
            + COALESCE(gastos_previsionales_usd, 0)
            + COALESCE(fee_deel_usd, 0)
            + COALESCE(fee_eor_usd, 0)
        ) * shared_overhead_pct
      )
    ) STORED,
  ADD COLUMN IF NOT EXISTS loaded_hourly_cost_usd numeric(14,4)
    GENERATED ALWAYS AS (
      (
        (
          base_salary_usd
            + COALESCE(bonus_jit_usd, 0)
            + COALESCE(bonus_rpa_usd, 0)
            + COALESCE(bonus_ar_usd, 0)
            + COALESCE(bonus_sobrecumplimiento_usd, 0)
            + COALESCE(gastos_previsionales_usd, 0)
            + COALESCE(fee_deel_usd, 0)
            + COALESCE(fee_eor_usd, 0)
        )
        + (
          (
            base_salary_usd
              + COALESCE(bonus_jit_usd, 0)
              + COALESCE(bonus_rpa_usd, 0)
              + COALESCE(bonus_ar_usd, 0)
              + COALESCE(bonus_sobrecumplimiento_usd, 0)
              + COALESCE(gastos_previsionales_usd, 0)
              + COALESCE(fee_deel_usd, 0)
              + COALESCE(fee_eor_usd, 0)
          ) * direct_overhead_pct
        )
        + (
          (
            base_salary_usd
              + COALESCE(bonus_jit_usd, 0)
              + COALESCE(bonus_rpa_usd, 0)
              + COALESCE(bonus_ar_usd, 0)
              + COALESCE(bonus_sobrecumplimiento_usd, 0)
              + COALESCE(gastos_previsionales_usd, 0)
              + COALESCE(fee_deel_usd, 0)
              + COALESCE(fee_eor_usd, 0)
          ) * shared_overhead_pct
        )
      ) / NULLIF(hours_per_fte_month::numeric, 0)
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_sellable_role_cost_components_effective_lookup
  ON greenhouse_commercial.sellable_role_cost_components (
    role_id,
    employment_type_code,
    effective_from DESC,
    source_kind
  );

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_role_modeled_cost_basis_snapshot_id()
RETURNS text AS $$
BEGIN
  RETURN 'EO-RMS-' || LPAD(nextval('greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.role_modeled_cost_basis_snapshots (
  snapshot_id text PRIMARY KEY
    DEFAULT greenhouse_commercial.generate_role_modeled_cost_basis_snapshot_id(),
  snapshot_key text NOT NULL UNIQUE,
  role_id text NOT NULL
    REFERENCES greenhouse_commercial.sellable_roles (role_id) ON DELETE CASCADE,
  role_sku text NOT NULL,
  role_code text NOT NULL,
  role_label text NOT NULL,
  employment_type_code text NOT NULL
    REFERENCES greenhouse_commercial.employment_types (employment_type_code) ON DELETE RESTRICT,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  snapshot_date date NOT NULL,
  source_cost_component_effective_from date NOT NULL,
  source_kind text NOT NULL
    CHECK (source_kind = ANY (ARRAY[
      'catalog_seed'::text,
      'admin_manual'::text,
      'payroll_bridge'::text,
      'modeled_formula'::text,
      'backfill'::text
    ])),
  source_ref text,
  resolved_currency text NOT NULL DEFAULT 'USD',
  base_labor_cost_amount numeric(14,2) NOT NULL DEFAULT 0,
  direct_overhead_pct numeric(6,4) NOT NULL DEFAULT 0,
  shared_overhead_pct numeric(6,4) NOT NULL DEFAULT 0,
  direct_overhead_amount numeric(14,2) NOT NULL DEFAULT 0,
  shared_overhead_amount numeric(14,2) NOT NULL DEFAULT 0,
  loaded_cost_amount numeric(14,2) NOT NULL DEFAULT 0,
  cost_per_hour_amount numeric(14,4),
  hours_per_fte_month integer NOT NULL DEFAULT 180,
  confidence_score numeric(5,4) NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_label text NOT NULL
    CHECK (confidence_label = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])),
  snapshot_status text NOT NULL DEFAULT 'complete'
    CHECK (snapshot_status = ANY (ARRAY[
      'complete'::text,
      'partial'::text,
      'unresolved'::text
    ])),
  detail_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_modeled_cost_basis_period_month_check
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT role_modeled_cost_basis_period_id_match_check
    CHECK (period_id = period_year::text || '-' || LPAD(period_month::text, 2, '0')),
  CONSTRAINT role_modeled_cost_basis_non_negative_check
    CHECK (
      base_labor_cost_amount >= 0
      AND direct_overhead_pct >= 0
      AND direct_overhead_pct <= 10
      AND shared_overhead_pct >= 0
      AND shared_overhead_pct <= 10
      AND direct_overhead_amount >= 0
      AND shared_overhead_amount >= 0
      AND loaded_cost_amount >= 0
      AND COALESCE(cost_per_hour_amount, 0) >= 0
      AND hours_per_fte_month > 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_role_modeled_cost_basis_role_period_idx
  ON greenhouse_commercial.role_modeled_cost_basis_snapshots (
    role_id,
    employment_type_code,
    period_year,
    period_month
  );

CREATE INDEX IF NOT EXISTS greenhouse_role_modeled_cost_basis_role_sku_period_idx
  ON greenhouse_commercial.role_modeled_cost_basis_snapshots (
    role_sku,
    employment_type_code,
    period_year DESC,
    period_month DESC
  );

CREATE INDEX IF NOT EXISTS greenhouse_role_modeled_cost_basis_status_idx
  ON greenhouse_commercial.role_modeled_cost_basis_snapshots (
    snapshot_status,
    confidence_label,
    period_year DESC,
    period_month DESC
  );

ALTER TABLE greenhouse_commercial.role_modeled_cost_basis_snapshots OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.role_modeled_cost_basis_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.role_modeled_cost_basis_snapshots TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.role_modeled_cost_basis_snapshots TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.role_modeled_cost_basis_snapshots;
DROP FUNCTION IF EXISTS greenhouse_commercial.generate_role_modeled_cost_basis_snapshot_id();
DROP SEQUENCE IF EXISTS greenhouse_commercial.seq_role_modeled_cost_basis_snapshot_id;

ALTER TABLE greenhouse_commercial.sellable_role_cost_components
  DROP COLUMN IF EXISTS loaded_hourly_cost_usd,
  DROP COLUMN IF EXISTS loaded_monthly_cost_usd,
  DROP COLUMN IF EXISTS shared_overhead_amount_usd,
  DROP COLUMN IF EXISTS direct_overhead_amount_usd,
  DROP COLUMN IF EXISTS confidence_label,
  DROP COLUMN IF EXISTS confidence_score,
  DROP COLUMN IF EXISTS source_ref,
  DROP COLUMN IF EXISTS source_kind,
  DROP COLUMN IF EXISTS shared_overhead_pct,
  DROP COLUMN IF EXISTS direct_overhead_pct;
