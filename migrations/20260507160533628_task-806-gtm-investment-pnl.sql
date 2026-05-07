-- Up Migration

-- TASK-806 — GTM Investment P&L View + reclassification primitive
-- ========================================================================
-- Management-accounting view for Sample Sprints / no-cost commercial
-- engagements. This migration keeps the existing serving chain compatible by
-- appending service_id to the existing VIEW shapes, then derives
-- attribution_intent from approved eligible services.
--
-- Guardrails:
-- - direct client expenses stay operational because they have no canonical
--   service anchor.
-- - non-regular service costs only leave operational attribution when an
--   engagement approval exists with status='approved' (TASK-804).
-- - inactive, legacy_seed_archived and unmapped services are excluded from the
--   non-operational intent lane (TASK-813).
-- - gtm_investment_pnl filters no_cost terms at read time; it is management
--   reporting only, not client-facing audit evidence.

CREATE OR REPLACE VIEW greenhouse_serving.client_labor_cost_allocation AS
WITH payroll_period_window AS (
  SELECT
    pe.member_id,
    pe.currency,
    pe.gross_total,
    pe.net_total,
    pp.year,
    pp.month,
    make_date(pp.year, pp.month, 1) AS period_start,
    (make_date(pp.year, pp.month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS period_end
  FROM greenhouse_payroll.payroll_entries pe
  JOIN greenhouse_payroll.payroll_periods pp
    ON pp.period_id = pe.period_id
  WHERE pp.status = ANY (ARRAY['approved'::TEXT, 'exported'::TEXT])
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
    a.fte_allocation,
    a.service_id
  FROM payroll_period_window pw
  JOIN greenhouse_core.client_team_assignments a
    ON a.member_id = pw.member_id
   AND COALESCE(a.start_date, '1900-01-01'::DATE) <= pw.period_end
   AND COALESCE(a.end_date, '9999-12-31'::DATE) >= pw.period_start
   AND (a.active = TRUE OR a.end_date IS NOT NULL)
  LEFT JOIN greenhouse_core.clients c_1
    ON c_1.client_id = a.client_id
  WHERE COALESCE(NULLIF(LOWER(TRIM(BOTH FROM a.client_id)), ''), '__missing__') <> ALL (
      ARRAY['efeonce_internal'::TEXT, 'client_internal'::TEXT, 'space-efeonce'::TEXT]
    )
    AND COALESCE(NULLIF(LOWER(TRIM(BOTH FROM c_1.client_name)), ''), '__missing__') <> ALL (
      ARRAY['efeonce internal'::TEXT, 'efeonce'::TEXT]
    )
),
member_period_total AS (
  SELECT
    member_id,
    year,
    month,
    COALESCE(SUM(fte_allocation), 0::NUMERIC) AS total_fte
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
  ROUND(ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0::NUMERIC), 2) AS allocated_labor_source,
  ROUND(ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0::NUMERIC), 2) AS allocated_net_source,
  CASE
    WHEN ao.currency = 'CLP'::TEXT THEN ROUND(ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0::NUMERIC), 2)
    WHEN fx.rate IS NOT NULL THEN ROUND(ao.gross_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0::NUMERIC) * fx.rate, 2)
    ELSE NULL::NUMERIC
  END AS allocated_labor_clp,
  CASE
    WHEN ao.currency = 'CLP'::TEXT THEN ROUND(ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0::NUMERIC), 2)
    WHEN fx.rate IS NOT NULL THEN ROUND(ao.net_total * ao.fte_allocation / NULLIF(mpt.total_fte, 0::NUMERIC) * fx.rate, 2)
    ELSE NULL::NUMERIC
  END AS allocated_net_clp,
  ao.fte_allocation AS fte_contribution,
  ao.service_id
FROM assignment_overlap ao
JOIN member_period_total mpt
  ON mpt.member_id = ao.member_id
 AND mpt.year = ao.year
 AND mpt.month = ao.month
JOIN greenhouse_core.members m
  ON m.member_id = ao.member_id
JOIN greenhouse_core.clients c
  ON c.client_id = ao.client_id
LEFT JOIN LATERAL (
  SELECT fx_1.rate
  FROM greenhouse_finance.exchange_rates fx_1
  WHERE fx_1.from_currency = ao.currency
    AND fx_1.to_currency = 'CLP'::TEXT
    AND fx_1.rate_date <= (make_date(ao.year, ao.month, 1) + INTERVAL '1 month' - INTERVAL '1 day')
  ORDER BY fx_1.rate_date DESC
  LIMIT 1
) fx ON ao.currency <> 'CLP'::TEXT
WHERE mpt.total_fte > 0::NUMERIC;

COMMENT ON VIEW greenhouse_serving.client_labor_cost_allocation IS
  'Canonical payroll-to-client labor allocation view. TASK-806 appends service_id from client_team_assignments so management reclassification can distinguish operational client work from approved no-cost engagement work.';

CREATE OR REPLACE VIEW greenhouse_serving.client_labor_cost_allocation_consolidated AS
SELECT
  period_year,
  period_month,
  member_id,
  MAX(member_name) AS member_name,
  client_id,
  MAX(client_name) AS client_name,
  MAX(payroll_currency) AS payroll_currency,
  MAX(fte_contribution) AS fte_contribution,
  MAX(total_fte) AS total_fte,
  SUM(allocated_labor_clp) AS allocated_labor_clp,
  SUM(allocated_net_clp) AS allocated_net_clp,
  SUM(allocated_labor_source) AS allocated_labor_source,
  SUM(allocated_net_source) AS allocated_net_source,
  SUM(gross_total_source) AS gross_total_source,
  SUM(net_total_source) AS net_total_source,
  COUNT(*) AS source_payroll_entry_count,
  MAX(exchange_rate_to_clp) AS exchange_rate_to_clp,
  service_id
FROM greenhouse_serving.client_labor_cost_allocation cla
WHERE period_year IS NOT NULL
  AND period_month IS NOT NULL
  AND member_id IS NOT NULL
  AND client_id IS NOT NULL
GROUP BY period_year, period_month, member_id, client_id, service_id;

COMMENT ON VIEW greenhouse_serving.client_labor_cost_allocation_consolidated IS
  'Consolidated labor allocation by period, member, client and service_id. service_id is appended by TASK-806; NULL preserves legacy client-level assignments.';

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

COMMENT ON VIEW greenhouse_serving.commercial_cost_attribution_v2 IS
  'Commercial cost attribution v2. TASK-806 appends service_id and derives attribution_intent for approved eligible pilot/trial/poc/discovery service-linked labor/direct-member costs. Direct client expenses remain operational unless a future canonical service anchor exists.';

CREATE OR REPLACE VIEW greenhouse_serving.gtm_investment_pnl AS
SELECT
  cca.period_year,
  cca.period_month,
  cca.client_id,
  c.client_name,
  cca.service_id,
  s.name AS service_name,
  s.engagement_kind,
  cca.member_id,
  m.display_name AS member_name,
  cca.cost_dimension,
  cca.amount_clp::NUMERIC AS gtm_investment_clp,
  cca.fte_contribution,
  cca.attribution_intent,
  t.terms_kind,
  t.effective_from AS terms_effective_from,
  t.effective_to AS terms_effective_to
FROM greenhouse_serving.commercial_cost_attribution_v2 cca
JOIN greenhouse_core.services s
  ON s.service_id = cca.service_id
JOIN greenhouse_commercial.engagement_commercial_terms t
  ON t.service_id = s.service_id
 AND t.terms_kind = 'no_cost'
 AND t.effective_from <= make_date(cca.period_year, cca.period_month, 1)
 AND (t.effective_to IS NULL OR t.effective_to > make_date(cca.period_year, cca.period_month, 1))
LEFT JOIN greenhouse_core.clients c
  ON c.client_id = cca.client_id
LEFT JOIN greenhouse_core.members m
  ON m.member_id = cca.member_id
WHERE cca.attribution_intent IN ('pilot', 'trial', 'poc', 'discovery')
  AND s.engagement_kind IN ('pilot', 'trial', 'poc', 'discovery')
  AND s.active = TRUE
  AND s.status != 'legacy_seed_archived'
  AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  AND EXISTS (
    SELECT 1
    FROM greenhouse_commercial.engagement_approvals ea
    WHERE ea.service_id = s.service_id
      AND ea.status = 'approved'
  );

COMMENT ON VIEW greenhouse_serving.gtm_investment_pnl IS
  'Management-accounting view for approved no-cost Sample Sprint GTM investment. Not client-facing audit evidence, not fiscal/legal accounting, and not a replacement for source cost attribution records.';

GRANT SELECT ON greenhouse_serving.client_labor_cost_allocation TO greenhouse_runtime, greenhouse_app;
GRANT SELECT ON greenhouse_serving.client_labor_cost_allocation_consolidated TO greenhouse_runtime, greenhouse_app;
GRANT SELECT ON greenhouse_serving.commercial_cost_attribution_v2 TO greenhouse_runtime, greenhouse_app;
GRANT SELECT ON greenhouse_serving.gtm_investment_pnl TO greenhouse_runtime, greenhouse_app;

-- Down Migration

DROP VIEW IF EXISTS greenhouse_serving.gtm_investment_pnl;

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
    'operational'::TEXT AS attribution_intent,
    NULL::TEXT AS service_id
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
    'operational'::TEXT AS attribution_intent,
    NULL::TEXT AS service_id
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
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM labor
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_client_expenses
UNION ALL
SELECT period_year, period_month, client_id, member_id, amount_clp, cost_dimension, fte_contribution, attribution_intent, service_id FROM direct_member_expenses;
