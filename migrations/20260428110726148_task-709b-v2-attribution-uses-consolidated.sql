-- Up Migration

-- TASK-709b — V2 attribution VIEW uses consolidated cla.
-- ========================================================================
-- Replaces commercial_cost_attribution_v2 to JOIN against the consolidated
-- VIEW (greenhouse_serving.client_labor_cost_allocation_consolidated, from
-- TASK-709) instead of the raw cla. This eliminates the "double counting"
-- bug observed for Sky Airline marzo 2026.
--
-- Diferencia con la versión TASK-708:
--   - labor CTE: ahora SELECT directamente de la consolidada (1 row por
--     period × member × client) en lugar de cla cruda.
--   - direct_member_expenses CTE: JOIN con la consolidada en lugar de cla
--     cruda. fte_contribution viene normalizado.
--   - direct_client_expenses CTE: sin cambios.
--
-- Sky marzo 2026 esperado post-fix:
--   - labor: $2,623,478 (3 miembros × 1 row consolidado)
--   - expense_direct_member_via_fte: $2,561,128 (mitad del valor previo)
--   - Total Sky: $5,184,606 (vs $7,745,734 pre-fix).

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
  -- Direct member costs prorrateados a clientes según fte_contribution
  -- de la consolidada (1 row por member × client × period). Sin
  -- duplicación arquitectónica.
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

COMMENT ON VIEW greenhouse_serving.commercial_cost_attribution_v2 IS
  'TASK-708 + TASK-709b: VIEW unificada que une labor + expense_direct_client + expense_direct_member_via_fte. Lee de client_labor_cost_allocation_consolidated (TASK-709) para evitar duplicate-row inflation. Single source-of-truth de Cost Allocations comercial.';

-- Down Migration

-- Reverts to the TASK-708 version (joining raw cla — has the duplicate bug)
CREATE OR REPLACE VIEW greenhouse_serving.commercial_cost_attribution_v2 AS
WITH labor AS (
  SELECT cla.period_year, cla.period_month, cla.client_id, cla.member_id,
         cla.allocated_labor_clp::NUMERIC AS amount_clp,
         'labor'::TEXT AS cost_dimension, cla.fte_contribution
  FROM greenhouse_serving.client_labor_cost_allocation cla
  WHERE cla.allocated_labor_clp IS NOT NULL
),
direct_client_expenses AS (
  SELECT EXTRACT(YEAR FROM e.payment_date)::INT, EXTRACT(MONTH FROM e.payment_date)::INT,
         e.allocated_client_id, NULL::TEXT,
         e.total_amount_clp::NUMERIC, 'expense_direct_client'::TEXT, NULL::NUMERIC
  FROM greenhouse_finance.expenses e
  WHERE e.cost_is_direct = TRUE AND e.allocated_client_id IS NOT NULL
    AND e.payment_date IS NOT NULL AND e.total_amount_clp IS NOT NULL AND e.is_annulled = FALSE
),
direct_member_expenses AS (
  SELECT cla.period_year, cla.period_month, cla.client_id, e.direct_overhead_member_id,
         (e.total_amount_clp * cla.fte_contribution)::NUMERIC,
         'expense_direct_member_via_fte'::TEXT, cla.fte_contribution
  FROM greenhouse_finance.expenses e
  JOIN greenhouse_serving.client_labor_cost_allocation cla
    ON cla.member_id = e.direct_overhead_member_id
   AND cla.period_year = EXTRACT(YEAR FROM e.payment_date)::INT
   AND cla.period_month = EXTRACT(MONTH FROM e.payment_date)::INT
  WHERE e.cost_is_direct = TRUE AND e.direct_overhead_member_id IS NOT NULL
    AND e.allocated_client_id IS NULL AND e.payment_date IS NOT NULL
    AND e.total_amount_clp IS NOT NULL AND e.is_annulled = FALSE
    AND cla.fte_contribution IS NOT NULL
)
SELECT * FROM labor
UNION ALL SELECT * FROM direct_client_expenses
UNION ALL SELECT * FROM direct_member_expenses;
