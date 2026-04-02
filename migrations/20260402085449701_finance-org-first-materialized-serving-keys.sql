SET search_path = greenhouse_finance, greenhouse_serving, greenhouse_core, public;

-- Add org-first compatibility keys to finance intelligence tables without
-- removing the legacy client bridge yet.

ALTER TABLE greenhouse_finance.cost_allocations
  ADD COLUMN IF NOT EXISTS organization_id text,
  ADD COLUMN IF NOT EXISTS space_id text;

UPDATE greenhouse_finance.cost_allocations ca
SET
  organization_id = COALESCE(
    ca.organization_id,
    (
      SELECT s.organization_id
      FROM greenhouse_finance.expenses e
      LEFT JOIN greenhouse_core.spaces s
        ON s.space_id = e.space_id
      WHERE e.expense_id = ca.expense_id
        AND s.organization_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT s.organization_id
      FROM greenhouse_core.spaces s
      WHERE s.client_id = ca.client_id
        AND s.organization_id IS NOT NULL
        AND s.active = TRUE
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
      LIMIT 1
    )
  ),
  space_id = COALESCE(
    ca.space_id,
    (
      SELECT e.space_id
      FROM greenhouse_finance.expenses e
      WHERE e.expense_id = ca.expense_id
        AND e.space_id IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT s.space_id
      FROM greenhouse_core.spaces s
      WHERE s.client_id = ca.client_id
        AND s.active = TRUE
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
      LIMIT 1
    )
  )
WHERE ca.organization_id IS NULL
   OR ca.space_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_cost_alloc_org_period
  ON greenhouse_finance.cost_allocations (organization_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_cost_alloc_space_period
  ON greenhouse_finance.cost_allocations (space_id, period_year, period_month);

ALTER TABLE greenhouse_finance.client_economics
  ADD COLUMN IF NOT EXISTS organization_id text;

UPDATE greenhouse_finance.client_economics ce
SET organization_id = COALESCE(
  ce.organization_id,
  (
    SELECT cp.organization_id
    FROM greenhouse_finance.client_profiles cp
    WHERE cp.client_id = ce.client_id
      AND cp.organization_id IS NOT NULL
    ORDER BY cp.updated_at DESC NULLS LAST, cp.created_at DESC NULLS LAST, cp.client_profile_id ASC
    LIMIT 1
  ),
  (
    SELECT s.organization_id
    FROM greenhouse_core.spaces s
    WHERE s.client_id = ce.client_id
      AND s.organization_id IS NOT NULL
      AND s.active = TRUE
    ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
    LIMIT 1
  ),
  (
    SELECT o.organization_id
    FROM greenhouse_core.organizations o
    WHERE o.organization_id = ce.client_id
    LIMIT 1
  )
)
WHERE ce.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_econ_org_period
  ON greenhouse_finance.client_economics (organization_id, period_year, period_month);

ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ADD COLUMN IF NOT EXISTS organization_id text;

UPDATE greenhouse_serving.commercial_cost_attribution cca
SET organization_id = COALESCE(
  cca.organization_id,
  (
    SELECT s.organization_id
    FROM greenhouse_core.spaces s
    WHERE s.client_id = cca.client_id
      AND s.organization_id IS NOT NULL
      AND s.active = TRUE
    ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.space_id ASC
    LIMIT 1
  )
)
WHERE cca.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_cost_attr_org_period
  ON greenhouse_serving.commercial_cost_attribution (organization_id, period_year, period_month);

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.idx_commercial_cost_attr_org_period;
ALTER TABLE greenhouse_serving.commercial_cost_attribution
  DROP COLUMN IF EXISTS organization_id;

DROP INDEX IF EXISTS greenhouse_finance.idx_client_econ_org_period;
ALTER TABLE greenhouse_finance.client_economics
  DROP COLUMN IF EXISTS organization_id;

DROP INDEX IF EXISTS greenhouse_finance.idx_cost_alloc_space_period;
DROP INDEX IF EXISTS greenhouse_finance.idx_cost_alloc_org_period;
ALTER TABLE greenhouse_finance.cost_allocations
  DROP COLUMN IF EXISTS space_id,
  DROP COLUMN IF EXISTS organization_id;
