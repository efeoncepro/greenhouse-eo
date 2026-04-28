-- Up Migration

-- TASK-708 — Commercial Cost Attribution V2 (unified VIEW).
-- ========================================================================
-- Hasta TASK-708, la vista "Atribución comercial" leía SOLO de
-- greenhouse_serving.client_labor_cost_allocation (costo laboral por
-- staffing % FTE). Eso ignoraba 100% de los expenses atribuidos via
-- TASK-705 rules (Adobe team, Vercel, Notion, Deel payroll, Metricool→
-- Motogas, etc.).
--
-- Esta VIEW une las 3 dimensiones canónicas de costo atribuible a un
-- cliente sin duplicar lógica ni materializar projections derivadas:
--
--   1. labor                          — costo laboral (payroll planificado
--                                        × staffing % FTE), ya canónico.
--   2. expense_direct_client          — gastos directos atribuidos a un
--                                        cliente específico (Metricool →
--                                        Motogas, etc.) vía TASK-705.
--   3. expense_direct_member_via_fte  — gastos directos a un miembro
--                                        (Adobe team, Deel payroll), prorrateados
--                                        a sus clientes según staffing % FTE
--                                        del mismo período.
--
-- Anti-DELETE / anti-projection-drift: VIEW (no materialized). Lee de
-- tablas autoritativas (client_labor_cost_allocation + finance.expenses).
-- Cualquier cambio en regla, staffing, o atribución refleja al instante
-- sin re-materialización ni cron.
--
-- Extensible: futuras dimensiones (FX losses, infra costs, depreciation,
-- factoring fees) se agregan como CTE adicional. Cero refactor de
-- consumers downstream.
--
-- Degradación honesta: si labor allocation está vacía para un período, la
-- VIEW devuelve solo expenses y los consumers reportan attribution
-- parcial — never silent zero.

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
  FROM greenhouse_serving.client_labor_cost_allocation cla
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
  -- Direct member costs (Adobe per seat, Envato per seat, Deel payroll a
  -- miembro, Global66 payroll a miembro) prorrateados a clientes según
  -- staffing % FTE del mismo período. Si el miembro no tiene staffing en
  -- ese período, no entra (degrade silently per-member, not per-client).
  SELECT
    cla.period_year,
    cla.period_month,
    cla.client_id,
    e.direct_overhead_member_id AS member_id,
    (e.total_amount_clp * cla.fte_contribution)::NUMERIC AS amount_clp,
    'expense_direct_member_via_fte'::TEXT AS cost_dimension,
    cla.fte_contribution
  FROM greenhouse_finance.expenses e
  JOIN greenhouse_serving.client_labor_cost_allocation cla
    ON cla.member_id = e.direct_overhead_member_id
   AND cla.period_year = EXTRACT(YEAR FROM e.payment_date)::INT
   AND cla.period_month = EXTRACT(MONTH FROM e.payment_date)::INT
  WHERE e.cost_is_direct = TRUE
    AND e.direct_overhead_member_id IS NOT NULL
    AND e.allocated_client_id IS NULL  -- if it's also assigned to a client, the direct_client CTE handles it
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
  'TASK-708: VIEW unificada que une labor allocation + expense_direct_client + expense_direct_member_via_fte. Source-of-truth de lectura para Cost Allocations. Anti-projection-drift: deriva de tablas autoritativas, refleja cambios al instante. Extensible: futuras dimensiones de costo se agregan como CTE adicional sin refactor.';

-- Index para acelerar JOIN de direct_member_expenses (filtro por
-- direct_overhead_member_id + payment_date partial).
CREATE INDEX IF NOT EXISTS idx_expenses_direct_member_attribution
  ON greenhouse_finance.expenses (direct_overhead_member_id, payment_date)
  WHERE cost_is_direct = TRUE AND direct_overhead_member_id IS NOT NULL AND is_annulled = FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_direct_client_attribution
  ON greenhouse_finance.expenses (allocated_client_id, payment_date)
  WHERE cost_is_direct = TRUE AND allocated_client_id IS NOT NULL AND is_annulled = FALSE;

-- Down Migration

DROP VIEW IF EXISTS greenhouse_serving.commercial_cost_attribution_v2 CASCADE;
DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_direct_member_attribution;
DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_direct_client_attribution;
