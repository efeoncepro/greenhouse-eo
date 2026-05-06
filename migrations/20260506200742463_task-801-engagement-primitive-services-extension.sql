-- Up Migration

-- TASK-801 — Engagement Primitive: services + cost_attribution Extension
-- ========================================================================
-- Slice 1 del EPIC-014 Sample Sprints. DDL puro: extiende greenhouse_core.services
-- con engagement_kind + commitment_terms_json, agrega FK opcional service_id a
-- client_team_assignments, y propaga attribution_intent en commercial_cost_attribution
-- v1 (TABLE) y v2 (VIEW canónica post TASK-709b).
--
-- Dos ajustes pre-implementación documentados en Delta 2026-05-06 de la task:
--   1. service_id TEXT (no UUID) — services.service_id es TEXT en este repo.
--   2. v2 es VIEW (no TABLE) — usar CREATE OR REPLACE VIEW con literal
--      'operational'::TEXT AS attribution_intent. Cuando TASK-802/806 introduzcan
--      JOIN a engagement_commercial_terms, la derivación real reemplaza el literal.
--
-- Backward compat: defaults 'regular' / 'operational' preservan semántica actual.

-- 1. services: engagement_kind + commitment_terms_json
ALTER TABLE greenhouse_core.services
  ADD COLUMN engagement_kind TEXT NOT NULL DEFAULT 'regular'
    CHECK (engagement_kind IN ('regular','pilot','trial','poc','discovery')),
  ADD COLUMN commitment_terms_json JSONB;

COMMENT ON COLUMN greenhouse_core.services.engagement_kind IS
  'Sub-tipo de engagement comercial. UI brand "Sample Sprint" envuelve los 4 valores non-regular. '
  'Genérico para sobrevivir marketing pivots — ver EPIC-014.';

COMMENT ON COLUMN greenhouse_core.services.commitment_terms_json IS
  'Términos del engagement (JSONB libre): success_criteria, decision_deadline, '
  'expected_internal_cost_clp. Se formaliza en tabla engagement_commercial_terms via TASK-802.';

-- 2. client_team_assignments: service_id FK opcional (TEXT, no UUID — services.service_id es TEXT)
ALTER TABLE greenhouse_core.client_team_assignments
  ADD COLUMN service_id TEXT REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL;

COMMENT ON COLUMN greenhouse_core.client_team_assignments.service_id IS
  'FK opcional a services. NULL = asignación al cliente en general (legacy). '
  'NOT NULL = asignación a service específico (Sample Sprint, contrato puntual). '
  'Habilita distinción "Valentina en Sky en general" vs "Valentina en Sky Content Lead Sprint".';

CREATE INDEX client_team_assignments_service_idx
  ON greenhouse_core.client_team_assignments (service_id)
  WHERE service_id IS NOT NULL;

-- 3. commercial_cost_attribution v1 (TABLE): attribution_intent
ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));

COMMENT ON COLUMN greenhouse_serving.commercial_cost_attribution.attribution_intent IS
  'Dimensión de intent de atribución. operational = cobro al cliente (default). '
  'pilot/trial/poc/discovery = costo GTM Investment (no cobrado, ver gtm_investment_pnl TASK-806). '
  'overhead = costo compartido. La VIEW canónica gtm_investment_pnl filtra por este campo.';

-- 4. commercial_cost_attribution_v2 (VIEW canónica post TASK-709b): CREATE OR REPLACE
--    agregando 'operational'::TEXT AS attribution_intent en cada SELECT del UNION ALL.
--    Mirror exacto de migrations/20260428110726148_task-709b-v2-attribution-uses-consolidated.sql
--    + nueva columna. Cuando TASK-802 introduzca engagement_commercial_terms y TASK-806 derive
--    el intent, esta VIEW se actualiza para reemplazar el literal por la derivación real.

CREATE OR REPLACE VIEW greenhouse_serving.commercial_cost_attribution_v2 AS
WITH labor AS (
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    cla.member_id,
    cla.allocated_labor_clp::NUMERIC AS amount_clp,
    'labor'::TEXT AS cost_dimension,
    cla.fte_contribution,
    'operational'::TEXT AS attribution_intent
  FROM greenhouse_serving.client_labor_cost_allocation_consolidated cla
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
    'operational'::TEXT AS attribution_intent
  FROM greenhouse_finance.expenses e
  WHERE e.cost_is_direct = TRUE
    AND e.allocated_client_id IS NOT NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
),
direct_member_expenses AS (
  -- Direct member costs prorrateados a clientes según fte_contribution de la
  -- consolidada (1 row por member × client × period). Sin duplicación
  -- arquitectónica (TASK-709b).
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    e.direct_overhead_member_id AS member_id,
    (e.total_amount_clp * cla.fte_contribution)::NUMERIC AS amount_clp,
    'expense_direct_member_via_fte'::TEXT AS cost_dimension,
    cla.fte_contribution,
    'operational'::TEXT AS attribution_intent
  FROM greenhouse_finance.expenses e
  JOIN greenhouse_serving.client_labor_cost_allocation_consolidated cla
    ON cla.member_id = e.direct_overhead_member_id
   AND cla.period_year = EXTRACT(YEAR FROM e.payment_date)::INT
   AND cla.period_month = EXTRACT(MONTH FROM e.payment_date)::INT
  WHERE e.cost_is_direct = TRUE
    AND e.direct_overhead_member_id IS NOT NULL
    AND e.allocated_client_id IS NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
    AND cla.fte_contribution IS NOT NULL
)
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent FROM labor
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent FROM direct_client_expenses
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent FROM direct_member_expenses;

COMMENT ON VIEW greenhouse_serving.commercial_cost_attribution_v2 IS
  'TASK-708 + TASK-709b + TASK-801. Atribución comercial canónica con consolidated labor '
  '(anti double-counting) + 3 dimensiones de costo. Columna attribution_intent (TASK-801) '
  'queda en literal operational hasta que TASK-802/806 introduzcan JOIN a engagement_commercial_terms.';

-- Down Migration

-- 4. Restaurar VIEW v2 al estado pre-TASK-801 (= TASK-709b: sin attribution_intent)
CREATE OR REPLACE VIEW greenhouse_serving.commercial_cost_attribution_v2 AS
WITH labor AS (
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    cla.member_id,
    cla.allocated_labor_clp::NUMERIC AS amount_clp,
    'labor'::TEXT AS cost_dimension,
    cla.fte_contribution
  FROM greenhouse_serving.client_labor_cost_allocation_consolidated cla
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
    NULL::NUMERIC AS fte_contribution
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
    cla.fte_contribution
  FROM greenhouse_finance.expenses e
  JOIN greenhouse_serving.client_labor_cost_allocation_consolidated cla
    ON cla.member_id = e.direct_overhead_member_id
   AND cla.period_year = EXTRACT(YEAR FROM e.payment_date)::INT
   AND cla.period_month = EXTRACT(MONTH FROM e.payment_date)::INT
  WHERE e.cost_is_direct = TRUE
    AND e.direct_overhead_member_id IS NOT NULL
    AND e.allocated_client_id IS NULL
    AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL
    AND e.is_annulled = FALSE
    AND cla.fte_contribution IS NOT NULL
)
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution FROM labor
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution FROM direct_client_expenses
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution FROM direct_member_expenses;

-- 3. Drop attribution_intent en v1
ALTER TABLE greenhouse_serving.commercial_cost_attribution
  DROP COLUMN attribution_intent;

-- 2. Drop client_team_assignments.service_id (índice se elimina con la columna)
DROP INDEX IF EXISTS greenhouse_core.client_team_assignments_service_idx;
ALTER TABLE greenhouse_core.client_team_assignments
  DROP COLUMN service_id;

-- 1. Drop services columns
ALTER TABLE greenhouse_core.services
  DROP COLUMN commitment_terms_json,
  DROP COLUMN engagement_kind;
