-- Up Migration

-- TASK-802 — Engagement Commercial Terms Time-Versioned
-- ============================================================================
-- Capa 2 de EPIC-014. Persiste términos comerciales versionados para
-- greenhouse_core.services sin mutar el service_id cuando un Sample Sprint
-- transiciona de no_cost a success_fee/reduced_fee/committed.
--
-- Ajustes de discovery:
--   1. service_id TEXT, no UUID (TASK-801: services.service_id es text).
--   2. declared_by nullable en DB porque ON DELETE SET NULL preserva historial;
--      el helper TS exige actor humano al declarar.
--   3. Eligibility de TASK-813 se valida en el helper antes de escribir:
--      active=TRUE, status!='legacy_seed_archived', hubspot_sync_status!='unmapped'.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.engagement_commercial_terms (
  terms_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id          text NOT NULL
    REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  terms_kind          text NOT NULL
    CHECK (terms_kind = ANY (ARRAY[
      'committed'::text,
      'no_cost'::text,
      'success_fee'::text,
      'reduced_fee'::text
    ])),
  effective_from      date NOT NULL,
  effective_to        date,
  monthly_amount_clp  numeric(18,2),
  success_criteria    jsonb,
  declared_by         text
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  declared_at         timestamptz NOT NULL DEFAULT now(),
  reason              text NOT NULL CHECK (length(btrim(reason)) >= 10),
  CONSTRAINT engagement_commercial_terms_effective_range_check
    CHECK (effective_to IS NULL OR effective_to > effective_from),
  CONSTRAINT engagement_commercial_terms_amount_non_negative_check
    CHECK (monthly_amount_clp IS NULL OR monthly_amount_clp >= 0),
  CONSTRAINT engagement_commercial_terms_no_cost_amount_check
    CHECK (terms_kind <> 'no_cost' OR monthly_amount_clp IS NULL OR monthly_amount_clp = 0),
  CONSTRAINT engagement_commercial_terms_success_fee_criteria_check
    CHECK (
      terms_kind <> 'success_fee'
      OR (success_criteria IS NOT NULL AND jsonb_typeof(success_criteria) = 'object')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS engagement_commercial_terms_active_unique
  ON greenhouse_commercial.engagement_commercial_terms (service_id)
  WHERE effective_to IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS engagement_commercial_terms_service_effective_from_unique
  ON greenhouse_commercial.engagement_commercial_terms (service_id, effective_from);

CREATE INDEX IF NOT EXISTS engagement_commercial_terms_kind_idx
  ON greenhouse_commercial.engagement_commercial_terms (terms_kind, effective_from)
  WHERE effective_to IS NULL;

CREATE INDEX IF NOT EXISTS engagement_commercial_terms_service_timeline_idx
  ON greenhouse_commercial.engagement_commercial_terms (service_id, effective_from DESC);

COMMENT ON TABLE greenhouse_commercial.engagement_commercial_terms IS
  'TASK-802. Time-versioned commercial terms for engagement services. At most one active row per service via partial unique index; historical rows preserve transitions.';

COMMENT ON COLUMN greenhouse_commercial.engagement_commercial_terms.service_id IS
  'FK to greenhouse_core.services(service_id). TEXT by contract (TASK-801), not UUID.';

COMMENT ON COLUMN greenhouse_commercial.engagement_commercial_terms.declared_by IS
  'Actor who declared the terms. Nullable only to support ON DELETE SET NULL; declareCommercialTerms requires declaredBy in input.';

GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_commercial_terms TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_commercial_terms TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_commercial_terms TO greenhouse_migrator;

-- Down Migration

REVOKE SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_commercial_terms FROM greenhouse_runtime;
REVOKE SELECT, INSERT, UPDATE ON greenhouse_commercial.engagement_commercial_terms FROM greenhouse_app;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.engagement_commercial_terms FROM greenhouse_migrator;

DROP INDEX IF EXISTS greenhouse_commercial.engagement_commercial_terms_service_timeline_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_commercial_terms_kind_idx;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_commercial_terms_service_effective_from_unique;
DROP INDEX IF EXISTS greenhouse_commercial.engagement_commercial_terms_active_unique;
DROP TABLE IF EXISTS greenhouse_commercial.engagement_commercial_terms;
