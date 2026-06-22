-- Up Migration

SET search_path = greenhouse_commercial, public;

DO $$
DECLARE
  missing_skus text;
BEGIN
  SELECT string_agg(expected.role_sku, ', ' ORDER BY expected.role_sku)
  INTO missing_skus
  FROM (VALUES ('ECG-004'), ('ECG-017'), ('ECG-018')) AS expected(role_sku)
  LEFT JOIN greenhouse_commercial.sellable_roles sr
    ON sr.role_sku = expected.role_sku
  WHERE sr.role_id IS NULL;

  IF missing_skus IS NOT NULL THEN
    RAISE EXCEPTION 'ISSUE-055 migration missing reviewed role SKU(s): %', missing_skus;
  END IF;
END $$;

WITH reviewed_roles AS (
  SELECT *
  FROM (VALUES
    ('ECG-004', 'indefinido_clp', DATE '2026-04-18', 550.00, 0.00, 0.00, 150.00, 100.00, 150.00, 49.00, 0.00, 180, 0.0000, 0.0000),
    ('ECG-017', 'indefinido_clp', DATE '2026-04-18', 1300.00, 200.00, 100.00, 50.00, 150.00, 100.00, 49.00, 0.00, 180, 0.0000, 0.0000),
    ('ECG-018', 'indefinido_clp', DATE '2026-04-18', 1200.00, 200.00, 100.00, 50.00, 150.00, 100.00, 49.00, 0.00, 180, 0.0000, 0.0000)
  ) AS row(
    role_sku,
    employment_type_code,
    effective_from,
    base_salary_usd,
    bonus_jit_usd,
    bonus_rpa_usd,
    bonus_ar_usd,
    bonus_sobrecumplimiento_usd,
    gastos_previsionales_usd,
    fee_deel_usd,
    fee_eor_usd,
    hours_per_fte_month,
    direct_overhead_pct,
    shared_overhead_pct
  )
),
resolved_roles AS (
  SELECT
    sr.role_id,
    rr.*
  FROM reviewed_roles rr
  JOIN greenhouse_commercial.sellable_roles sr
    ON sr.role_sku = rr.role_sku
),
cleared_defaults AS (
  UPDATE greenhouse_commercial.role_employment_compatibility rec
  SET is_default = FALSE
  FROM resolved_roles rr
  WHERE rec.role_id = rr.role_id
    AND rec.employment_type_code <> rr.employment_type_code
  RETURNING rec.role_id
),
compatibility_upsert AS (
  INSERT INTO greenhouse_commercial.role_employment_compatibility (
    role_id,
    employment_type_code,
    is_default,
    allowed,
    notes
  )
  SELECT
    role_id,
    employment_type_code,
    TRUE,
    TRUE,
    'ISSUE-055 reviewed default: staff Chile cost basis with explicit Deel fee component'
  FROM resolved_roles
  ON CONFLICT (role_id, employment_type_code)
  DO UPDATE SET
    is_default = TRUE,
    allowed = TRUE,
    notes = EXCLUDED.notes
  RETURNING role_id
),
cost_component_upsert AS (
  INSERT INTO greenhouse_commercial.sellable_role_cost_components (
    role_id,
    employment_type_code,
    effective_from,
    base_salary_usd,
    bonus_jit_usd,
    bonus_rpa_usd,
    bonus_ar_usd,
    bonus_sobrecumplimiento_usd,
    gastos_previsionales_usd,
    fee_deel_usd,
    fee_eor_usd,
    hours_per_fte_month,
    direct_overhead_pct,
    shared_overhead_pct,
    source_kind,
    source_ref,
    confidence_score,
    notes
  )
  SELECT
    role_id,
    employment_type_code,
    effective_from,
    base_salary_usd,
    bonus_jit_usd,
    bonus_rpa_usd,
    bonus_ar_usd,
    bonus_sobrecumplimiento_usd,
    gastos_previsionales_usd,
    fee_deel_usd,
    fee_eor_usd,
    hours_per_fte_month,
    direct_overhead_pct,
    shared_overhead_pct,
    'admin_manual',
    'ISSUE-055 reviewed sellable-roles-pricing.csv staff override',
    0.7500,
    'ISSUE-055: reviewed ambiguous TASK-464a staff row; preserves CSV cost stack'
  FROM resolved_roles
  ON CONFLICT (role_id, employment_type_code, effective_from)
  DO UPDATE SET
    base_salary_usd = EXCLUDED.base_salary_usd,
    bonus_jit_usd = EXCLUDED.bonus_jit_usd,
    bonus_rpa_usd = EXCLUDED.bonus_rpa_usd,
    bonus_ar_usd = EXCLUDED.bonus_ar_usd,
    bonus_sobrecumplimiento_usd = EXCLUDED.bonus_sobrecumplimiento_usd,
    gastos_previsionales_usd = EXCLUDED.gastos_previsionales_usd,
    fee_deel_usd = EXCLUDED.fee_deel_usd,
    fee_eor_usd = EXCLUDED.fee_eor_usd,
    hours_per_fte_month = EXCLUDED.hours_per_fte_month,
    direct_overhead_pct = EXCLUDED.direct_overhead_pct,
    shared_overhead_pct = EXCLUDED.shared_overhead_pct,
    source_kind = EXCLUDED.source_kind,
    source_ref = EXCLUDED.source_ref,
    confidence_score = EXCLUDED.confidence_score,
    notes = EXCLUDED.notes
  RETURNING role_id
)
SELECT
  'ok' AS issue_055_reviewed_staff_role_cost_basis,
  (SELECT COUNT(*) FROM compatibility_upsert) AS compatibility_rows,
  (SELECT COUNT(*) FROM cost_component_upsert) AS cost_component_rows;

-- Down Migration

DELETE FROM greenhouse_commercial.sellable_role_cost_components srcc
USING greenhouse_commercial.sellable_roles sr
WHERE srcc.role_id = sr.role_id
  AND sr.role_sku IN ('ECG-004', 'ECG-017', 'ECG-018')
  AND srcc.employment_type_code = 'indefinido_clp'
  AND srcc.effective_from = DATE '2026-04-18'
  AND srcc.source_ref = 'ISSUE-055 reviewed sellable-roles-pricing.csv staff override';

DELETE FROM greenhouse_commercial.role_employment_compatibility rec
USING greenhouse_commercial.sellable_roles sr
WHERE rec.role_id = sr.role_id
  AND sr.role_sku IN ('ECG-004', 'ECG-017', 'ECG-018')
  AND rec.employment_type_code = 'indefinido_clp'
  AND rec.notes = 'ISSUE-055 reviewed default: staff Chile cost basis with explicit Deel fee component';
