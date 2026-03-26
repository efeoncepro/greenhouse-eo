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
-- across the member's active client assignments by fte_allocation.

CREATE OR REPLACE VIEW greenhouse_serving.client_labor_cost_allocation AS
WITH payroll_period_window AS (
  SELECT
    pe.member_id,
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
  ao.fte_allocation,
  mpt.total_fte,
  ao.gross_total,
  ao.net_total,
  -- Proportional allocation: gross * (this_assignment_fte / total_member_fte)
  ROUND(ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0), 2) AS allocated_labor_clp,
  ROUND(ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0), 2) AS allocated_net_clp,
  -- FTE contribution: member counts as fte_allocation toward this client's headcount
  ao.fte_allocation AS fte_contribution
FROM assignment_overlap ao
JOIN member_period_total mpt
  ON mpt.member_id = ao.member_id
  AND mpt.year = ao.year
  AND mpt.month = ao.month
JOIN greenhouse_core.members m ON m.member_id = ao.member_id
JOIN greenhouse_core.clients c ON c.client_id = ao.client_id
WHERE mpt.total_fte > 0;

COMMENT ON VIEW greenhouse_serving.client_labor_cost_allocation IS
  'FTE-weighted allocation of payroll costs to clients via assignments overlapping each payroll period';

-- Note: supporting indexes on greenhouse_core.client_team_assignments and
-- greenhouse_payroll tables already exist from their respective setup scripts.
-- (client_assignments_member_idx, payroll_entries_member_idx, etc.)
