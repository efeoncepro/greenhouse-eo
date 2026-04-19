-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.seq_member_role_cost_basis_snapshot_id
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_member_role_cost_basis_snapshot_id()
RETURNS text AS $$
BEGIN
  RETURN 'EO-MRB-' || LPAD(nextval('greenhouse_commercial.seq_member_role_cost_basis_snapshot_id')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_role_blended_cost_basis_snapshot_id()
RETURNS text AS $$
BEGIN
  RETURN 'EO-RBS-' || LPAD(nextval('greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.member_role_cost_basis_snapshots (
  snapshot_id text PRIMARY KEY
    DEFAULT greenhouse_commercial.generate_member_role_cost_basis_snapshot_id(),
  snapshot_key text NOT NULL UNIQUE,
  member_id text NOT NULL
    REFERENCES greenhouse_core.members (member_id) ON DELETE CASCADE,
  role_id text
    REFERENCES greenhouse_commercial.sellable_roles (role_id) ON DELETE SET NULL,
  role_sku text,
  role_code text,
  role_label text,
  employment_type_code text
    REFERENCES greenhouse_commercial.employment_types (employment_type_code) ON DELETE SET NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_id text NOT NULL,
  snapshot_date date NOT NULL,
  mapping_source text NOT NULL
    CHECK (mapping_source = ANY (ARRAY[
      'assignment_role_title_override'::text,
      'person_membership_role_label'::text,
      'member_role_title'::text,
      'unmapped'::text
    ])),
  mapping_source_ref text,
  source_kind text NOT NULL DEFAULT 'member_capacity_economics'
    CHECK (source_kind = ANY (ARRAY[
      'member_capacity_economics'::text
    ])),
  source_ref text,
  resolved_currency text NOT NULL DEFAULT 'CLP',
  loaded_cost_amount numeric(14,2),
  cost_per_hour_amount numeric(14,4),
  total_labor_cost_amount numeric(14,2),
  direct_overhead_amount numeric(14,2),
  shared_overhead_amount numeric(14,2),
  contracted_fte numeric(8,4) NOT NULL DEFAULT 0,
  commercial_availability_hours numeric(10,2) NOT NULL DEFAULT 0,
  snapshot_status text NOT NULL DEFAULT 'unresolved'
    CHECK (snapshot_status = ANY (ARRAY[
      'mapped'::text,
      'partial'::text,
      'unresolved'::text
    ])),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_label text NOT NULL DEFAULT 'low'
    CHECK (confidence_label = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])),
  detail_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT member_role_cost_basis_period_month_check
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT member_role_cost_basis_period_id_match_check
    CHECK (period_id = period_year::text || '-' || LPAD(period_month::text, 2, '0')),
  CONSTRAINT member_role_cost_basis_non_negative_check
    CHECK (
      COALESCE(loaded_cost_amount, 0) >= 0
      AND COALESCE(cost_per_hour_amount, 0) >= 0
      AND COALESCE(total_labor_cost_amount, 0) >= 0
      AND COALESCE(direct_overhead_amount, 0) >= 0
      AND COALESCE(shared_overhead_amount, 0) >= 0
      AND contracted_fte >= 0
      AND commercial_availability_hours >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_member_role_cost_basis_member_period_idx
  ON greenhouse_commercial.member_role_cost_basis_snapshots (
    member_id,
    period_year,
    period_month
  );

CREATE INDEX IF NOT EXISTS greenhouse_member_role_cost_basis_role_period_idx
  ON greenhouse_commercial.member_role_cost_basis_snapshots (
    role_id,
    employment_type_code,
    period_year DESC,
    period_month DESC
  )
  WHERE role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS greenhouse_member_role_cost_basis_status_idx
  ON greenhouse_commercial.member_role_cost_basis_snapshots (
    snapshot_status,
    confidence_label,
    period_year DESC,
    period_month DESC
  );

CREATE TABLE IF NOT EXISTS greenhouse_commercial.role_blended_cost_basis_snapshots (
  snapshot_id text PRIMARY KEY
    DEFAULT greenhouse_commercial.generate_role_blended_cost_basis_snapshot_id(),
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
  source_kind text NOT NULL DEFAULT 'people_blended'
    CHECK (source_kind = ANY (ARRAY[
      'people_blended'::text
    ])),
  source_ref text,
  resolved_currency text NOT NULL DEFAULT 'CLP',
  blended_loaded_cost_amount numeric(14,2) NOT NULL DEFAULT 0,
  blended_cost_per_hour_amount numeric(14,4),
  blended_total_labor_cost_amount numeric(14,2),
  blended_direct_overhead_amount numeric(14,2) NOT NULL DEFAULT 0,
  blended_shared_overhead_amount numeric(14,2) NOT NULL DEFAULT 0,
  weighted_fte numeric(14,4) NOT NULL DEFAULT 0,
  weighted_hours numeric(14,2) NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 0,
  freshest_member_snapshot_at timestamptz,
  oldest_member_snapshot_at timestamptz,
  freshness_days integer NOT NULL DEFAULT 0,
  freshness_status text NOT NULL DEFAULT 'unknown'
    CHECK (freshness_status = ANY (ARRAY[
      'fresh'::text,
      'stale'::text,
      'unknown'::text
    ])),
  confidence_score numeric(5,4) NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_label text NOT NULL DEFAULT 'low'
    CHECK (confidence_label = ANY (ARRAY[
      'high'::text,
      'medium'::text,
      'low'::text
    ])),
  snapshot_status text NOT NULL DEFAULT 'unresolved'
    CHECK (snapshot_status = ANY (ARRAY[
      'complete'::text,
      'partial'::text,
      'unresolved'::text
    ])),
  detail_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  materialized_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_blended_cost_basis_period_month_check
    CHECK (period_month BETWEEN 1 AND 12),
  CONSTRAINT role_blended_cost_basis_period_id_match_check
    CHECK (period_id = period_year::text || '-' || LPAD(period_month::text, 2, '0')),
  CONSTRAINT role_blended_cost_basis_non_negative_check
    CHECK (
      blended_loaded_cost_amount >= 0
      AND COALESCE(blended_cost_per_hour_amount, 0) >= 0
      AND COALESCE(blended_total_labor_cost_amount, 0) >= 0
      AND blended_direct_overhead_amount >= 0
      AND blended_shared_overhead_amount >= 0
      AND weighted_fte >= 0
      AND weighted_hours >= 0
      AND sample_size >= 0
      AND member_count >= 0
      AND freshness_days >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_role_blended_cost_basis_role_period_idx
  ON greenhouse_commercial.role_blended_cost_basis_snapshots (
    role_id,
    employment_type_code,
    period_year,
    period_month
  );

CREATE INDEX IF NOT EXISTS greenhouse_role_blended_cost_basis_role_sku_period_idx
  ON greenhouse_commercial.role_blended_cost_basis_snapshots (
    role_sku,
    employment_type_code,
    period_year DESC,
    period_month DESC
  );

CREATE INDEX IF NOT EXISTS greenhouse_role_blended_cost_basis_status_idx
  ON greenhouse_commercial.role_blended_cost_basis_snapshots (
    snapshot_status,
    confidence_label,
    period_year DESC,
    period_month DESC
  );

ALTER TABLE greenhouse_commercial.member_role_cost_basis_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.role_blended_cost_basis_snapshots OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.seq_member_role_cost_basis_snapshot_id OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.member_role_cost_basis_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.member_role_cost_basis_snapshots TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.member_role_cost_basis_snapshots TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.role_blended_cost_basis_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.role_blended_cost_basis_snapshots TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.role_blended_cost_basis_snapshots TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_member_role_cost_basis_snapshot_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_member_role_cost_basis_snapshot_id TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_member_role_cost_basis_snapshot_id TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.role_blended_cost_basis_snapshots;
DROP TABLE IF EXISTS greenhouse_commercial.member_role_cost_basis_snapshots;
DROP FUNCTION IF EXISTS greenhouse_commercial.generate_role_blended_cost_basis_snapshot_id();
DROP FUNCTION IF EXISTS greenhouse_commercial.generate_member_role_cost_basis_snapshot_id();
DROP SEQUENCE IF EXISTS greenhouse_commercial.seq_role_blended_cost_basis_snapshot_id;
DROP SEQUENCE IF EXISTS greenhouse_commercial.seq_member_role_cost_basis_snapshot_id;
