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
SELECT
  pe.member_id,
  m.display_name AS member_name,
  a.client_id,
  COALESCE(c.client_name, a.client_id) AS client_name,
  pp.year AS period_year,
  pp.month AS period_month,
  a.fte_allocation,
  member_total.total_fte,
  pe.gross_total,
  pe.net_total,
  -- Proportional allocation: gross * (this_assignment_fte / total_member_fte)
  ROUND(pe.gross_total * a.fte_allocation / NULLIF(member_total.total_fte, 0), 2) AS allocated_labor_clp,
  ROUND(pe.net_total * a.fte_allocation / NULLIF(member_total.total_fte, 0), 2) AS allocated_net_clp,
  -- FTE contribution: member counts as fte_allocation toward this client's headcount
  a.fte_allocation AS fte_contribution
FROM greenhouse_payroll.payroll_entries pe
JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
JOIN greenhouse_core.members m ON m.member_id = pe.member_id
JOIN greenhouse_core.client_team_assignments a
  ON a.member_id = pe.member_id
  AND a.active = TRUE
  AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE)
JOIN greenhouse_core.clients c ON c.client_id = a.client_id
CROSS JOIN LATERAL (
  SELECT COALESCE(SUM(a2.fte_allocation), 0) AS total_fte
  FROM greenhouse_core.client_team_assignments a2
  WHERE a2.member_id = pe.member_id
    AND a2.active = TRUE
    AND (a2.end_date IS NULL OR a2.end_date >= CURRENT_DATE)
) member_total
WHERE pp.status IN ('approved', 'exported')
  AND member_total.total_fte > 0;

COMMENT ON VIEW greenhouse_serving.client_labor_cost_allocation IS
  'FTE-weighted allocation of payroll costs to clients via active assignments';

-- Note: supporting indexes on greenhouse_core.client_team_assignments and
-- greenhouse_payroll tables already exist from their respective setup scripts.
-- (client_assignments_member_idx, payroll_entries_member_idx, etc.)
