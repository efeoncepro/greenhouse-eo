-- Up Migration

-- TASK-815 — Direct Service Expense Allocation Primitive
-- ========================================================================
-- Explicit, approved expense -> service allocation. This avoids guessing
-- service_id for direct-client expenses and gives TASK-806/Service
-- Attribution a strong, auditable source for service-linked direct costs.

CREATE TABLE IF NOT EXISTS greenhouse_finance.expense_service_allocations (
  allocation_id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES greenhouse_finance.expenses(expense_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES greenhouse_core.clients(client_id) ON DELETE RESTRICT,
  period_year INTEGER NOT NULL CHECK (period_year >= 2000 AND period_year <= 2100),
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  allocated_amount_clp NUMERIC(14,2) NOT NULL CHECK (allocated_amount_clp > 0),
  allocation_source TEXT NOT NULL DEFAULT 'manual' CHECK (
    allocation_source = ANY (ARRAY['manual'::TEXT, 'rule'::TEXT, 'imported'::TEXT, 'backfill'::TEXT])
  ),
  evidence_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    review_status = ANY (ARRAY['draft'::TEXT, 'approved'::TEXT, 'rejected'::TEXT])
  ),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  CONSTRAINT expense_service_allocations_approval_state CHECK (
    (review_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND rejected_by IS NULL AND rejected_at IS NULL)
    OR (review_status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL AND approved_by IS NULL AND approved_at IS NULL)
    OR (review_status = 'draft' AND approved_by IS NULL AND approved_at IS NULL AND rejected_by IS NULL AND rejected_at IS NULL)
  ),
  CONSTRAINT expense_service_allocations_rejection_reason CHECK (
    review_status != 'rejected' OR length(trim(coalesce(rejection_reason, ''))) >= 10
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS expense_service_allocations_active_pair_idx
  ON greenhouse_finance.expense_service_allocations (expense_id, service_id)
  WHERE review_status != 'rejected';

CREATE INDEX IF NOT EXISTS expense_service_allocations_expense_idx
  ON greenhouse_finance.expense_service_allocations (expense_id, review_status);

CREATE INDEX IF NOT EXISTS expense_service_allocations_service_period_idx
  ON greenhouse_finance.expense_service_allocations (service_id, period_year, period_month, review_status);

CREATE INDEX IF NOT EXISTS expense_service_allocations_client_period_idx
  ON greenhouse_finance.expense_service_allocations (client_id, period_year, period_month, review_status);

CREATE OR REPLACE FUNCTION greenhouse_finance.set_expense_service_allocation_defaults()
RETURNS TRIGGER AS $$
DECLARE
  expense_record RECORD;
  service_record RECORD;
  allocation_total NUMERIC;
BEGIN
  SELECT
    e.expense_id,
    e.allocated_client_id,
    e.total_amount_clp,
    e.effective_cost_amount_clp,
    e.cost_is_direct,
    e.period_year,
    e.period_month,
    COALESCE(e.document_date, e.payment_date) AS effective_date,
    e.is_annulled
  INTO expense_record
  FROM greenhouse_finance.expenses e
  WHERE e.expense_id = NEW.expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense % does not exist.', NEW.expense_id;
  END IF;

  IF COALESCE(expense_record.is_annulled, FALSE) = TRUE THEN
    RAISE EXCEPTION 'Expense % is annulled and cannot receive service allocations.', NEW.expense_id;
  END IF;

  IF expense_record.cost_is_direct IS DISTINCT FROM TRUE OR expense_record.allocated_client_id IS NULL THEN
    RAISE EXCEPTION 'Expense % must be a direct-client expense before it can receive service allocations.', NEW.expense_id;
  END IF;

  SELECT
    s.service_id,
    s.active,
    s.status,
    s.hubspot_sync_status,
    sp.client_id AS service_client_id
  INTO service_record
  FROM greenhouse_core.services s
  LEFT JOIN greenhouse_core.spaces sp
    ON sp.space_id = s.space_id
  WHERE s.service_id = NEW.service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service % does not exist.', NEW.service_id;
  END IF;

  IF service_record.active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Service % is inactive and cannot receive expense allocations.', NEW.service_id;
  END IF;

  IF service_record.status = 'legacy_seed_archived' THEN
    RAISE EXCEPTION 'Service % is legacy_seed_archived and cannot receive expense allocations.', NEW.service_id;
  END IF;

  IF service_record.hubspot_sync_status = 'unmapped' THEN
    RAISE EXCEPTION 'Service % is unmapped and cannot receive expense allocations.', NEW.service_id;
  END IF;

  NEW.client_id := COALESCE(NULLIF(trim(NEW.client_id), ''), expense_record.allocated_client_id, service_record.service_client_id);

  IF NEW.client_id IS NULL THEN
    RAISE EXCEPTION 'Expense service allocation requires a client_id.';
  END IF;

  IF expense_record.allocated_client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM expense_record.allocated_client_id THEN
    RAISE EXCEPTION 'Allocation client_id % does not match expense allocated_client_id %.', NEW.client_id, expense_record.allocated_client_id;
  END IF;

  IF service_record.service_client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM service_record.service_client_id THEN
    RAISE EXCEPTION 'Allocation client_id % does not match service client_id %.', NEW.client_id, service_record.service_client_id;
  END IF;

  NEW.period_year := COALESCE(NEW.period_year, expense_record.period_year, EXTRACT(YEAR FROM expense_record.effective_date)::INTEGER);
  NEW.period_month := COALESCE(NEW.period_month, expense_record.period_month, EXTRACT(MONTH FROM expense_record.effective_date)::INTEGER);

  IF NEW.period_year IS NULL OR NEW.period_month IS NULL THEN
    RAISE EXCEPTION 'Expense service allocation requires period_year and period_month.';
  END IF;

  SELECT COALESCE(SUM(esa.allocated_amount_clp), 0)
  INTO allocation_total
  FROM greenhouse_finance.expense_service_allocations esa
  WHERE esa.expense_id = NEW.expense_id
    AND esa.review_status != 'rejected'
    AND (TG_OP = 'INSERT' OR esa.allocation_id != NEW.allocation_id);

  IF allocation_total + NEW.allocated_amount_clp > COALESCE(expense_record.effective_cost_amount_clp, expense_record.total_amount_clp) THEN
    RAISE EXCEPTION 'Expense service allocations exceed expense total for %.', NEW.expense_id;
  END IF;

  NEW.updated_at := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_expense_service_allocation_defaults
BEFORE INSERT OR UPDATE ON greenhouse_finance.expense_service_allocations
FOR EACH ROW
EXECUTE FUNCTION greenhouse_finance.set_expense_service_allocation_defaults();

COMMENT ON TABLE greenhouse_finance.expense_service_allocations IS
  'TASK-815: explicit approved expense -> service_id allocation primitive. Feeds service attribution and GTM reclassification without heuristic service guessing.';

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.expense_service_allocations TO greenhouse_runtime, greenhouse_app;

CREATE OR REPLACE VIEW greenhouse_serving.commercial_cost_attribution_v2 AS
WITH approved_engagement_services AS (
  SELECT DISTINCT ON (s.service_id)
    s.service_id,
    s.engagement_kind
  FROM greenhouse_core.services s
  JOIN greenhouse_commercial.engagement_approvals ea
    ON ea.service_id = s.service_id
   AND ea.status = 'approved'
  WHERE s.engagement_kind IN ('pilot', 'trial', 'poc', 'discovery')
    AND s.active = TRUE
    AND s.status != 'legacy_seed_archived'
    AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  ORDER BY s.service_id, ea.approved_at DESC NULLS LAST, ea.created_at DESC
),
approved_service_allocations AS (
  SELECT
    esa.expense_id,
    SUM(esa.allocated_amount_clp)::NUMERIC AS allocated_amount_clp
  FROM greenhouse_finance.expense_service_allocations esa
  WHERE esa.review_status = 'approved'
  GROUP BY esa.expense_id
),
labor AS (
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    cla.member_id,
    cla.allocated_labor_clp::NUMERIC AS amount_clp,
    'labor'::TEXT AS cost_dimension,
    cla.fte_contribution,
    COALESCE(aes.engagement_kind, 'operational')::TEXT AS attribution_intent,
    cla.service_id
  FROM greenhouse_serving.client_labor_cost_allocation_consolidated cla
  LEFT JOIN approved_engagement_services aes
    ON aes.service_id = cla.service_id
  WHERE cla.allocated_labor_clp IS NOT NULL
),
direct_service_expenses AS (
  SELECT
    esa.period_year,
    esa.period_month,
    esa.client_id,
    NULL::TEXT AS member_id,
    esa.allocated_amount_clp::NUMERIC AS amount_clp,
    'expense_direct_service'::TEXT AS cost_dimension,
    NULL::NUMERIC AS fte_contribution,
    COALESCE(aes.engagement_kind, 'operational')::TEXT AS attribution_intent,
    esa.service_id
  FROM greenhouse_finance.expense_service_allocations esa
  JOIN greenhouse_finance.expenses e
    ON e.expense_id = esa.expense_id
  LEFT JOIN approved_engagement_services aes
    ON aes.service_id = esa.service_id
  WHERE esa.review_status = 'approved'
    AND COALESCE(e.is_annulled, FALSE) = FALSE
),
direct_client_expenses AS (
  SELECT
    EXTRACT(YEAR FROM e.payment_date)::INT AS period_year,
    EXTRACT(MONTH FROM e.payment_date)::INT AS period_month,
    e.allocated_client_id AS client_id,
    NULL::TEXT AS member_id,
    (e.total_amount_clp - COALESCE(asa.allocated_amount_clp, 0))::NUMERIC AS amount_clp,
    'expense_direct_client'::TEXT AS cost_dimension,
    NULL::NUMERIC AS fte_contribution,
    'operational'::TEXT AS attribution_intent,
    NULL::TEXT AS service_id
  FROM greenhouse_finance.expenses e
  LEFT JOIN approved_service_allocations asa
    ON asa.expense_id = e.expense_id
  WHERE e.cost_is_direct = TRUE
    AND e.allocated_client_id IS NOT NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
    AND (e.total_amount_clp - COALESCE(asa.allocated_amount_clp, 0)) > 0
),
direct_member_expenses AS (
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    e.direct_overhead_member_id AS member_id,
    (e.total_amount_clp * cla.fte_contribution)::NUMERIC AS amount_clp,
    'expense_direct_member_via_fte'::TEXT AS cost_dimension,
    cla.fte_contribution,
    COALESCE(aes.engagement_kind, 'operational')::TEXT AS attribution_intent,
    cla.service_id
  FROM greenhouse_finance.expenses e
  JOIN greenhouse_serving.client_labor_cost_allocation_consolidated cla
    ON cla.member_id = e.direct_overhead_member_id
   AND cla.period_year = EXTRACT(YEAR FROM e.payment_date)::INT
   AND cla.period_month = EXTRACT(MONTH FROM e.payment_date)::INT
  LEFT JOIN approved_engagement_services aes
    ON aes.service_id = cla.service_id
  WHERE e.cost_is_direct = TRUE
    AND e.direct_overhead_member_id IS NOT NULL
    AND e.allocated_client_id IS NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
    AND cla.fte_contribution IS NOT NULL
)
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM labor
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_service_expenses
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_client_expenses
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_member_expenses;

COMMENT ON VIEW greenhouse_serving.commercial_cost_attribution_v2 IS
  'Commercial cost attribution v2. TASK-815 adds approved expense_service_allocations as expense_direct_service and subtracts approved service allocations from residual direct-client expenses. Service intent still derives only from approved eligible engagement services.';

GRANT SELECT ON greenhouse_serving.commercial_cost_attribution_v2 TO greenhouse_runtime, greenhouse_app;

-- Down Migration

CREATE OR REPLACE VIEW greenhouse_serving.commercial_cost_attribution_v2 AS
WITH approved_engagement_services AS (
  SELECT DISTINCT ON (s.service_id)
    s.service_id,
    s.engagement_kind
  FROM greenhouse_core.services s
  JOIN greenhouse_commercial.engagement_approvals ea
    ON ea.service_id = s.service_id
   AND ea.status = 'approved'
  WHERE s.engagement_kind IN ('pilot', 'trial', 'poc', 'discovery')
    AND s.active = TRUE
    AND s.status != 'legacy_seed_archived'
    AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  ORDER BY s.service_id, ea.approved_at DESC NULLS LAST, ea.created_at DESC
),
labor AS (
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    cla.member_id,
    cla.allocated_labor_clp::NUMERIC AS amount_clp,
    'labor'::TEXT AS cost_dimension,
    cla.fte_contribution,
    COALESCE(aes.engagement_kind, 'operational')::TEXT AS attribution_intent,
    cla.service_id
  FROM greenhouse_serving.client_labor_cost_allocation_consolidated cla
  LEFT JOIN approved_engagement_services aes
    ON aes.service_id = cla.service_id
  WHERE cla.allocated_labor_clp IS NOT NULL
),
direct_client_expenses AS (
  SELECT
    EXTRACT(YEAR FROM e.payment_date)::INT AS period_year,
    EXTRACT(MONTH FROM e.payment_date)::INT AS period_month,
    e.allocated_client_id AS client_id,
    NULL::TEXT AS member_id,
    e.total_amount_clp::NUMERIC AS amount_clp,
    'expense_direct_client'::TEXT AS cost_dimension,
    NULL::NUMERIC AS fte_contribution,
    'operational'::TEXT AS attribution_intent,
    NULL::TEXT AS service_id
  FROM greenhouse_finance.expenses e
  WHERE e.cost_is_direct = TRUE
    AND e.allocated_client_id IS NOT NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
),
direct_member_expenses AS (
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    e.direct_overhead_member_id AS member_id,
    (e.total_amount_clp * cla.fte_contribution)::NUMERIC AS amount_clp,
    'expense_direct_member_via_fte'::TEXT AS cost_dimension,
    cla.fte_contribution,
    COALESCE(aes.engagement_kind, 'operational')::TEXT AS attribution_intent,
    cla.service_id
  FROM greenhouse_finance.expenses e
  JOIN greenhouse_serving.client_labor_cost_allocation_consolidated cla
    ON cla.member_id = e.direct_overhead_member_id
   AND cla.period_year = EXTRACT(YEAR FROM e.payment_date)::INT
   AND cla.period_month = EXTRACT(MONTH FROM e.payment_date)::INT
  LEFT JOIN approved_engagement_services aes
    ON aes.service_id = cla.service_id
  WHERE e.cost_is_direct = TRUE
    AND e.direct_overhead_member_id IS NOT NULL
    AND e.allocated_client_id IS NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
    AND cla.fte_contribution IS NOT NULL
)
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM labor
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_client_expenses
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_member_expenses;

DROP TRIGGER IF EXISTS set_expense_service_allocation_defaults ON greenhouse_finance.expense_service_allocations;
DROP FUNCTION IF EXISTS greenhouse_finance.set_expense_service_allocation_defaults();
DROP TABLE IF EXISTS greenhouse_finance.expense_service_allocations;
