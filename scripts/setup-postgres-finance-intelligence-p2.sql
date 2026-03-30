-- ============================================================================
-- Financial Intelligence Layer — Phase 2
-- FTE-weighted payroll cost allocation view
-- ============================================================================
-- Run with: npx tsx scripts/setup-postgres-finance-intelligence-p2.ts
-- ============================================================================

-- View: bridge payroll entries with client assignments to produce
-- per-client labor cost attribution for any given period.
--
-- For each approved payroll entry, distributes gross_total proportionally
-- across the member's active commercial client assignments by fte_allocation.
--
-- Internal operational workspaces like `space-efeonce` remain valid for Agency
-- and capacity views, but they must not compete as commercial clients inside
-- Finance / Cost Intelligence labor attribution.

DROP VIEW IF EXISTS greenhouse_serving.client_labor_cost_allocation;

CREATE VIEW greenhouse_serving.client_labor_cost_allocation AS
WITH payroll_period_window AS (
  SELECT
    pe.member_id,
    pe.currency,
    pe.gross_total,
    pe.net_total,
    pp.year,
    pp.month,
    MAKE_DATE(pp.year, pp.month, 1) AS period_start,
    (MAKE_DATE(pp.year, pp.month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date AS period_end
  FROM greenhouse_payroll.payroll_entries pe
  JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
  WHERE pp.status IN ('approved', 'exported')
),
assignment_overlap AS (
  SELECT
    pw.member_id,
    pw.currency,
    pw.gross_total,
    pw.net_total,
    pw.year,
    pw.month,
    a.client_id,
    a.fte_allocation
  FROM payroll_period_window pw
  JOIN greenhouse_core.client_team_assignments a
    ON a.member_id = pw.member_id
    AND COALESCE(a.start_date, DATE '1900-01-01') <= pw.period_end
    AND COALESCE(a.end_date, DATE '9999-12-31') >= pw.period_start
    AND (a.active = TRUE OR a.end_date IS NOT NULL)
  LEFT JOIN greenhouse_core.clients c
    ON c.client_id = a.client_id
  WHERE COALESCE(NULLIF(LOWER(TRIM(a.client_id)), ''), '__missing__') NOT IN ('efeonce_internal', 'client_internal', 'space-efeonce')
    AND COALESCE(NULLIF(LOWER(TRIM(c.client_name)), ''), '__missing__') NOT IN ('efeonce internal', 'efeonce')
),
member_period_total AS (
  SELECT
    member_id,
    year,
    month,
    COALESCE(SUM(fte_allocation), 0) AS total_fte
  FROM assignment_overlap
  GROUP BY member_id, year, month
)
SELECT
  ao.member_id,
  m.display_name AS member_name,
  ao.client_id,
  COALESCE(c.client_name, ao.client_id) AS client_name,
  ao.year AS period_year,
  ao.month AS period_month,
  ao.currency AS payroll_currency,
  ao.fte_allocation,
  mpt.total_fte,
  fx.rate AS exchange_rate_to_clp,
  ao.gross_total AS gross_total_source,
  ao.net_total AS net_total_source,
  -- Proportional allocation in source payroll currency.
  ROUND(ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0), 2) AS allocated_labor_source,
  ROUND(ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0), 2) AS allocated_net_source,
  -- CLP materialization is explicit: only when source currency is already CLP or a historical FX rate exists.
  CASE
    WHEN ao.currency = 'CLP' THEN ROUND(ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0), 2)
    WHEN fx.rate IS NOT NULL THEN ROUND((ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0)) * fx.rate, 2)
    ELSE NULL
  END AS allocated_labor_clp,
  CASE
    WHEN ao.currency = 'CLP' THEN ROUND(ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0), 2)
    WHEN fx.rate IS NOT NULL THEN ROUND((ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0)) * fx.rate, 2)
    ELSE NULL
  END AS allocated_net_clp,
  -- FTE contribution: member counts as fte_allocation toward this client's headcount
  ao.fte_allocation AS fte_contribution
FROM assignment_overlap ao
JOIN member_period_total mpt
  ON mpt.member_id = ao.member_id
  AND mpt.year = ao.year
  AND mpt.month = ao.month
JOIN greenhouse_core.members m ON m.member_id = ao.member_id
JOIN greenhouse_core.clients c ON c.client_id = ao.client_id
LEFT JOIN LATERAL (
  SELECT rate
  FROM greenhouse_finance.exchange_rates fx
  WHERE fx.from_currency = ao.currency
    AND fx.to_currency = 'CLP'
    AND fx.rate_date <= MAKE_DATE(ao.year, ao.month, 1) + INTERVAL '1 month' - INTERVAL '1 day'
  ORDER BY fx.rate_date DESC
  LIMIT 1
) fx ON ao.currency <> 'CLP'
WHERE mpt.total_fte > 0;

COMMENT ON VIEW greenhouse_serving.client_labor_cost_allocation IS
  'FTE-weighted allocation of payroll costs to clients via assignments overlapping each payroll period';

-- Note: supporting indexes on greenhouse_core.client_team_assignments and
-- greenhouse_payroll tables already exist from their respective setup scripts.
-- (client_assignments_member_idx, payroll_entries_member_idx, etc.)
