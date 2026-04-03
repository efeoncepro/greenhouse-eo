-- Person 360 — Contextual Serving Views
-- =====================================================
-- Creates domain-specific views anchored on identity_profiles (EO-ID).
-- Each view extends the person_360 anchor with module-specific aggregates.
--
-- Views:
--   1. person_finance_360  — compensation, payroll, expenses
--   2. person_hr_360       — leave balances, requests, supervisor chain
--   3. person_delivery_360 — projects, tasks, CRM ownership
--
-- This script is idempotent. Safe to re-run.
-- =====================================================

-- ────────────────────────────────────────────────────────────
-- 0. Supporting index (run as postgres superuser if needed)
-- ────────────────────────────────────────────────────────────
-- CREATE INDEX IF NOT EXISTS delivery_projects_owner_member_idx
--   ON greenhouse_delivery.projects (owner_member_id);
-- Note: The projects table is small (<1000 rows), sequential scan is acceptable.

-- ════════════════════════════════════════════════════════════
-- 1. person_finance_360
-- ════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS greenhouse_serving.person_finance_360;

CREATE OR REPLACE VIEW greenhouse_serving.person_finance_360 AS
SELECT
  -- ─── Identity anchor ───
  ip.profile_id               AS identity_profile_id,
  ip.public_id                AS eo_id,
  m.member_id,
  COALESCE(m.display_name, ip.full_name, 'Sin nombre')
                              AS resolved_display_name,
  m.primary_email             AS member_email,
  d.name                      AS department_name,

  -- ─── Current compensation snapshot ───
  cv.version_id               AS current_comp_version_id,
  cv.pay_regime,
  cv.currency                 AS comp_currency,
  cv.base_salary,
  cv.remote_allowance,
  cv.bonus_otd_min,
  cv.bonus_otd_max,
  cv.bonus_rpa_min,
  cv.bonus_rpa_max,
  cv.contract_type,
  cv.effective_from           AS comp_effective_from,
  cv.effective_to             AS comp_effective_to,

  -- ─── Payroll aggregates ───
  COALESCE(pay_agg.total_entries, 0)    AS total_payroll_entries,
  pay_agg.latest_year,
  pay_agg.latest_month,
  pay_agg.latest_gross,
  pay_agg.latest_net,
  pay_agg.latest_currency,

  -- ─── Expense aggregates ───
  COALESCE(exp_agg.expense_count, 0)      AS expense_count,
  COALESCE(exp_agg.paid_expense_count, 0) AS paid_expense_count,
  COALESCE(exp_agg.total_expenses_clp, 0) AS total_expenses_clp,
  exp_agg.last_expense_date

FROM greenhouse_core.identity_profiles AS ip

LEFT JOIN greenhouse_core.members AS m
  ON m.identity_profile_id = ip.profile_id

LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id

-- Current compensation version (same pattern as member_payroll_360)
LEFT JOIN LATERAL (
  SELECT
    cv_inner.version_id,
    cv_inner.pay_regime,
    cv_inner.currency,
    cv_inner.base_salary,
    cv_inner.remote_allowance,
    cv_inner.bonus_otd_min,
    cv_inner.bonus_otd_max,
    cv_inner.bonus_rpa_min,
    cv_inner.bonus_rpa_max,
    cv_inner.contract_type,
    cv_inner.effective_from,
    cv_inner.effective_to
  FROM greenhouse_payroll.compensation_versions cv_inner
  WHERE cv_inner.member_id = m.member_id
    AND cv_inner.effective_from <= CURRENT_DATE
    AND (cv_inner.effective_to IS NULL OR cv_inner.effective_to >= CURRENT_DATE)
  ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
  LIMIT 1
) AS cv ON m.member_id IS NOT NULL

-- Payroll entry aggregates
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS total_entries,
    MAX(pp.year)  AS latest_year,
    (ARRAY_AGG(pp.month ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_month,
    (ARRAY_AGG(pe.gross_total ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_gross,
    (ARRAY_AGG(pe.net_total ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_net,
    (ARRAY_AGG(pe.currency ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_currency
  FROM greenhouse_payroll.payroll_entries pe
  JOIN greenhouse_payroll.payroll_periods pp ON pp.period_id = pe.period_id
  WHERE pe.member_id = m.member_id
) AS pay_agg ON m.member_id IS NOT NULL

-- Expense aggregates
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS expense_count,
    COUNT(*) FILTER (WHERE e.payment_status = 'paid')::int AS paid_expense_count,
    COALESCE(SUM(e.total_amount_clp), 0) AS total_expenses_clp,
    MAX(COALESCE(e.payment_date, e.document_date)) AS last_expense_date
  FROM greenhouse_finance.expenses e
  WHERE e.member_id = m.member_id
) AS exp_agg ON m.member_id IS NOT NULL;

-- Grants
GRANT SELECT ON greenhouse_serving.person_finance_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.person_finance_360 TO greenhouse_migrator;

-- ════════════════════════════════════════════════════════════
-- 2. person_hr_360
-- ════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS greenhouse_serving.person_hr_360;

CREATE OR REPLACE VIEW greenhouse_serving.person_hr_360 AS
SELECT
  -- ─── Identity anchor ───
  ip.profile_id               AS identity_profile_id,
  ip.public_id                AS eo_id,
  m.member_id,
  COALESCE(m.display_name, ip.full_name, 'Sin nombre')
                              AS resolved_display_name,
  m.primary_email             AS member_email,
  d.name                      AS department_name,

  -- ─── Member profile ───
  m.job_level,
  m.employment_type,
  m.contract_type,
  m.pay_regime,
  m.payroll_via,
  m.hire_date,
  m.contract_end_date,
  m.daily_required,
  m.daily_required            AS schedule_required,
  m.deel_contract_id,
  m.reports_to_member_id,
  mgr.display_name            AS supervisor_name,

  -- ─── Leave balances (current year) ───
  COALESCE(bal.vacation_allowance, 0)   AS vacation_allowance,
  COALESCE(bal.vacation_carried, 0)     AS vacation_carried,
  COALESCE(bal.vacation_used, 0)        AS vacation_used,
  COALESCE(bal.vacation_reserved, 0)    AS vacation_reserved,
  COALESCE(bal.vacation_allowance, 0)
    + COALESCE(bal.vacation_progressive, 0)
    + COALESCE(bal.vacation_carried, 0)
    + COALESCE(bal.vacation_adjustment, 0)
    - COALESCE(bal.vacation_used, 0)
    - COALESCE(bal.vacation_reserved, 0) AS vacation_available,
  COALESCE(bal.personal_allowance, 0)   AS personal_allowance,
  COALESCE(bal.personal_used, 0)        AS personal_used,

  -- ─── Leave requests (current year) ───
  COALESCE(req.pending_count, 0)        AS pending_requests,
  COALESCE(req.approved_count, 0)       AS approved_requests_this_year,
  COALESCE(req.total_approved_days, 0)  AS total_approved_days_this_year,

  -- ─── Compensation snapshot (for HR context) ───
  cv.pay_regime               AS compensation_pay_regime,
  cv.currency                 AS comp_currency,
  cv.base_salary,
  cv.contract_type            AS compensation_contract_type

FROM greenhouse_core.identity_profiles AS ip

LEFT JOIN greenhouse_core.members AS m
  ON m.identity_profile_id = ip.profile_id

LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id

LEFT JOIN greenhouse_core.members AS mgr
  ON mgr.member_id = m.reports_to_member_id

-- Leave balances: current year (same pattern as member_leave_360)
LEFT JOIN LATERAL (
  SELECT
    SUM(lb.allowance_days) FILTER (WHERE lb.leave_type_code = 'vacation')      AS vacation_allowance,
    SUM(lb.progressive_extra_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_progressive,
    SUM(lb.carried_over_days) FILTER (WHERE lb.leave_type_code = 'vacation')   AS vacation_carried,
    SUM(lb.adjustment_days) FILTER (WHERE lb.leave_type_code = 'vacation')     AS vacation_adjustment,
    SUM(lb.used_days) FILTER (WHERE lb.leave_type_code = 'vacation')           AS vacation_used,
    SUM(lb.reserved_days) FILTER (WHERE lb.leave_type_code = 'vacation')       AS vacation_reserved,
    SUM(lb.allowance_days) FILTER (WHERE lb.leave_type_code = 'personal')      AS personal_allowance,
    SUM(lb.used_days) FILTER (WHERE lb.leave_type_code = 'personal')           AS personal_used
  FROM greenhouse_hr.leave_balances lb
  WHERE lb.member_id = m.member_id
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
) AS bal ON m.member_id IS NOT NULL

-- Leave requests: current year (same pattern as member_leave_360)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE lr.status IN ('pending_supervisor', 'pending_hr'))::int AS pending_count,
    COUNT(*) FILTER (WHERE lr.status = 'approved')::int AS approved_count,
    COALESCE(SUM(lr.requested_days) FILTER (WHERE lr.status = 'approved'), 0)     AS total_approved_days
  FROM greenhouse_hr.leave_requests lr
  WHERE lr.member_id = m.member_id
    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
) AS req ON m.member_id IS NOT NULL

-- Compensation snapshot (lightweight, for HR context)
LEFT JOIN LATERAL (
  SELECT
    cv_inner.pay_regime,
    cv_inner.currency,
    cv_inner.base_salary,
    cv_inner.contract_type
  FROM greenhouse_payroll.compensation_versions cv_inner
  WHERE cv_inner.member_id = m.member_id
    AND cv_inner.effective_from <= CURRENT_DATE
    AND (cv_inner.effective_to IS NULL OR cv_inner.effective_to >= CURRENT_DATE)
  ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
  LIMIT 1
) AS cv ON m.member_id IS NOT NULL;

-- Grants
GRANT SELECT ON greenhouse_serving.person_hr_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.person_hr_360 TO greenhouse_migrator;

-- ════════════════════════════════════════════════════════════
-- 3. person_delivery_360
-- ════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS greenhouse_serving.person_delivery_360;

CREATE OR REPLACE VIEW greenhouse_serving.person_delivery_360 AS
SELECT
  -- ─── Identity anchor ───
  ip.profile_id               AS identity_profile_id,
  ip.public_id                AS eo_id,
  m.member_id,
  COALESCE(m.display_name, ip.full_name, 'Sin nombre')
                              AS resolved_display_name,
  m.primary_email             AS member_email,
  d.name                      AS department_name,

  -- ─── Project ownership ───
  COALESCE(proj.owned_count, 0)         AS owned_projects_count,
  COALESCE(proj.active_owned_count, 0)  AS active_owned_projects,

  -- ─── Task assignments ───
  COALESCE(tasks.total_assigned, 0)     AS total_assigned_tasks,
  COALESCE(tasks.active_tasks, 0)       AS active_tasks,
  COALESCE(tasks.completed_30d, 0)      AS completed_tasks_30d,
  COALESCE(tasks.overdue_tasks, 0)      AS overdue_tasks,
  tasks.avg_rpa_30d,
  tasks.on_time_pct_30d,

  -- ─── CRM ownership ───
  COALESCE(crm_agg.owned_companies, 0)    AS owned_companies_count,
  COALESCE(crm_agg.owned_deals, 0)        AS owned_deals_count,
  COALESCE(crm_agg.open_deals_amount, 0)  AS open_deals_amount

FROM greenhouse_core.identity_profiles AS ip

LEFT JOIN greenhouse_core.members AS m
  ON m.identity_profile_id = ip.profile_id

LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id

-- Project ownership
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS owned_count,
    COUNT(*) FILTER (WHERE p.active AND NOT p.is_deleted)::int AS active_owned_count
  FROM greenhouse_delivery.projects p
  WHERE p.owner_member_id = m.member_id
) AS proj ON m.member_id IS NOT NULL

-- Task assignments (30-day window for metrics)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS total_assigned,
    COUNT(*) FILTER (
      WHERE t.task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled')
        AND NOT t.is_deleted
    )::int AS active_tasks,
    COUNT(*) FILTER (
      WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
        AND NOT t.is_deleted
    )::int AS completed_30d,
    COUNT(*) FILTER (
      WHERE t.due_date < CURRENT_DATE
        AND t.task_status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado', 'Cancelado', 'Cancelada', 'Cancelled', 'Canceled')
        AND NOT t.is_deleted
    )::int AS overdue_tasks,
    AVG(t.rpa_value) FILTER (
      WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
        AND t.rpa_value IS NOT NULL
        AND t.rpa_value > 0
        AND NOT t.is_deleted
    ) AS avg_rpa_30d,
    CASE
      WHEN COUNT(*) FILTER (
        WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
          AND t.completed_at IS NOT NULL
          AND t.due_date IS NOT NULL
          AND NOT t.is_deleted
      ) = 0 THEN NULL
      ELSE ROUND(
        100.0 * COUNT(*) FILTER (
          WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
            AND t.completed_at <= (t.due_date + INTERVAL '1 day')
            AND NOT t.is_deleted
        )::numeric / NULLIF(COUNT(*) FILTER (
          WHERE t.completed_at >= (CURRENT_DATE - INTERVAL '30 days')
            AND t.completed_at IS NOT NULL
            AND t.due_date IS NOT NULL
            AND NOT t.is_deleted
        ), 0), 1
      )
    END AS on_time_pct_30d
  FROM greenhouse_delivery.tasks t
  WHERE t.assignee_member_id = m.member_id
) AS tasks ON m.member_id IS NOT NULL

-- CRM ownership (companies + deals)
LEFT JOIN LATERAL (
  SELECT
    (SELECT COUNT(*)::int FROM greenhouse_crm.companies co
     WHERE co.owner_member_id = m.member_id AND NOT co.is_deleted) AS owned_companies,
    COUNT(*)::int AS owned_deals,
    COALESCE(SUM(dl.amount) FILTER (
      WHERE NOT dl.is_closed_won AND NOT dl.is_closed_lost AND NOT dl.is_deleted
    ), 0) AS open_deals_amount
  FROM greenhouse_crm.deals dl
  WHERE dl.owner_member_id = m.member_id
    AND NOT dl.is_deleted
) AS crm_agg ON m.member_id IS NOT NULL;

-- Grants
GRANT SELECT ON greenhouse_serving.person_delivery_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.person_delivery_360 TO greenhouse_migrator;
