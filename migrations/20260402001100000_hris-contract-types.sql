-- Up Migration
SET search_path = greenhouse_core, greenhouse_payroll, greenhouse_serving, greenhouse_delivery, greenhouse_sync, public;

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'indefinido',
  ADD COLUMN IF NOT EXISTS pay_regime TEXT NOT NULL DEFAULT 'chile',
  ADD COLUMN IF NOT EXISTS payroll_via TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS deel_contract_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_contract_type_check'
      AND conrelid = 'greenhouse_core.members'::regclass
  ) THEN
    ALTER TABLE greenhouse_core.members
      ADD CONSTRAINT members_contract_type_check
      CHECK (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_pay_regime_check'
      AND conrelid = 'greenhouse_core.members'::regclass
  ) THEN
    ALTER TABLE greenhouse_core.members
      ADD CONSTRAINT members_pay_regime_check
      CHECK (pay_regime IN ('chile', 'international'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_payroll_via_check'
      AND conrelid = 'greenhouse_core.members'::regclass
  ) THEN
    ALTER TABLE greenhouse_core.members
      ADD CONSTRAINT members_payroll_via_check
      CHECK (payroll_via IN ('internal', 'deel'));
  END IF;
END $$;

ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_type_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD CONSTRAINT compensation_versions_contract_type_check
  CHECK (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor'));

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS payroll_via TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS deel_contract_id TEXT,
  ADD COLUMN IF NOT EXISTS sii_retention_rate NUMERIC(6, 4),
  ADD COLUMN IF NOT EXISTS sii_retention_amount NUMERIC(14, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payroll_entries_payroll_via_check'
      AND conrelid = 'greenhouse_payroll.payroll_entries'::regclass
  ) THEN
    ALTER TABLE greenhouse_payroll.payroll_entries
      ADD CONSTRAINT payroll_entries_payroll_via_check
      CHECK (payroll_via IN ('internal', 'deel'));
  END IF;
END $$;

WITH current_compensation AS (
  SELECT DISTINCT ON (cv.member_id)
    cv.member_id,
    cv.version_id,
    cv.pay_regime,
    cv.contract_type,
    cv.effective_from,
    cv.version
  FROM greenhouse_payroll.compensation_versions AS cv
  WHERE cv.effective_from <= CURRENT_DATE
    AND (cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE)
  ORDER BY cv.member_id, cv.effective_from DESC, cv.version DESC
),
placement_signal AS (
  SELECT DISTINCT ON (p.member_id)
    p.member_id,
    p.provider_relationship_type,
    p.external_contract_ref
  FROM greenhouse_delivery.staff_aug_placements AS p
  WHERE p.status <> 'cancelled'
  ORDER BY p.member_id, p.updated_at DESC
)
UPDATE greenhouse_core.members AS m
SET
  contract_type = CASE
    WHEN cc.pay_regime = 'international' AND ps.provider_relationship_type = 'eor' THEN 'eor'
    WHEN cc.pay_regime = 'international' THEN 'contractor'
    WHEN cc.contract_type IN ('honorarios', 'contractor', 'eor') THEN cc.contract_type
    WHEN cc.contract_type = 'plazo_fijo' THEN 'plazo_fijo'
    ELSE 'indefinido'
  END,
  pay_regime = CASE
    WHEN cc.pay_regime IN ('chile', 'international') THEN cc.pay_regime
    WHEN cc.contract_type IN ('contractor', 'eor') THEN 'international'
    ELSE 'chile'
  END,
  payroll_via = CASE
    WHEN cc.pay_regime = 'international' OR cc.contract_type IN ('contractor', 'eor') THEN 'deel'
    ELSE 'internal'
  END,
  deel_contract_id = CASE
    WHEN cc.pay_regime = 'international' OR cc.contract_type IN ('contractor', 'eor')
      THEN COALESCE(m.deel_contract_id, ps.external_contract_ref)
    ELSE NULL
  END,
  daily_required = CASE
    WHEN cc.pay_regime = 'international' OR cc.contract_type IN ('honorarios', 'contractor', 'eor')
      THEN FALSE
    ELSE COALESCE(m.daily_required, TRUE)
  END
FROM current_compensation AS cc
LEFT JOIN placement_signal AS ps
  ON ps.member_id = cc.member_id
WHERE cc.member_id = m.member_id;

UPDATE greenhouse_payroll.payroll_entries AS e
SET
  payroll_via = COALESCE(m.payroll_via, 'internal'),
  deel_contract_id = m.deel_contract_id
FROM greenhouse_core.members AS m
WHERE m.member_id = e.member_id;

DROP VIEW IF EXISTS greenhouse_serving.member_360;
CREATE OR REPLACE VIEW greenhouse_serving.member_360 AS
SELECT
  m.member_id,
  m.public_id,
  m.display_name,
  m.primary_email,
  m.phone,
  m.job_level,
  m.employment_type,
  m.contract_type,
  m.pay_regime,
  m.payroll_via,
  m.daily_required,
  m.daily_required AS schedule_required,
  m.deel_contract_id,
  m.hire_date,
  m.contract_end_date,
  m.status,
  m.active,
  m.identity_profile_id,
  ip.public_id AS identity_public_id,
  ip.canonical_email,
  ip.full_name AS identity_full_name,
  ip.profile_type,
  d.department_id,
  d.name AS department_name,
  manager.member_id AS reports_to_member_id,
  manager.display_name AS reports_to_member_name,
  COUNT(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS linked_user_count,
  m.created_at,
  m.updated_at
FROM greenhouse_core.members AS m
LEFT JOIN greenhouse_core.identity_profiles AS ip
  ON ip.profile_id = m.identity_profile_id
LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id
LEFT JOIN greenhouse_core.members AS manager
  ON manager.member_id = m.reports_to_member_id
LEFT JOIN greenhouse_core.client_users AS cu
  ON cu.identity_profile_id = m.identity_profile_id
GROUP BY
  m.member_id,
  m.public_id,
  m.display_name,
  m.primary_email,
  m.phone,
  m.job_level,
  m.employment_type,
  m.contract_type,
  m.pay_regime,
  m.payroll_via,
  m.daily_required,
  m.deel_contract_id,
  m.hire_date,
  m.contract_end_date,
  m.status,
  m.active,
  m.identity_profile_id,
  ip.public_id,
  ip.canonical_email,
  ip.full_name,
  ip.profile_type,
  d.department_id,
  d.name,
  manager.member_id,
  manager.display_name,
  m.created_at,
  m.updated_at;

DROP VIEW IF EXISTS greenhouse_serving.member_payroll_360;
CREATE OR REPLACE VIEW greenhouse_serving.member_payroll_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.job_level,
  m.employment_type,
  m.contract_type,
  m.pay_regime,
  m.payroll_via,
  m.daily_required,
  m.daily_required AS schedule_required,
  m.deel_contract_id,
  m.status AS member_status,
  m.active AS member_active,
  d.name AS department_name,
  cv.version_id AS current_compensation_version_id,
  cv.pay_regime AS compensation_pay_regime,
  cv.currency,
  cv.base_salary,
  cv.remote_allowance,
  cv.fixed_bonus_label,
  cv.fixed_bonus_amount,
  cv.contract_type AS compensation_contract_type,
  cv.effective_from AS compensation_effective_from,
  cv.effective_to AS compensation_effective_to,
  (SELECT COUNT(*) FROM greenhouse_payroll.compensation_versions cv2 WHERE cv2.member_id = m.member_id) AS total_compensation_versions,
  (SELECT COUNT(*) FROM greenhouse_payroll.payroll_entries pe WHERE pe.member_id = m.member_id) AS total_payroll_entries
FROM greenhouse_core.members AS m
LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id
LEFT JOIN LATERAL (
  SELECT *
  FROM greenhouse_payroll.compensation_versions AS cv_inner
  WHERE cv_inner.member_id = m.member_id
    AND cv_inner.effective_from <= CURRENT_DATE
    AND (cv_inner.effective_to IS NULL OR cv_inner.effective_to >= CURRENT_DATE)
  ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
  LIMIT 1
) AS cv ON TRUE
WHERE m.active = TRUE;

DROP VIEW IF EXISTS greenhouse_serving.person_hr_360;
CREATE OR REPLACE VIEW greenhouse_serving.person_hr_360 AS
SELECT
  ip.profile_id AS identity_profile_id,
  ip.public_id AS eo_id,
  m.member_id,
  COALESCE(m.display_name, ip.full_name, 'Sin nombre') AS resolved_display_name,
  m.primary_email AS member_email,
  d.name AS department_name,
  m.job_level,
  m.employment_type,
  m.contract_type,
  m.pay_regime,
  m.payroll_via,
  m.hire_date,
  m.contract_end_date,
  m.daily_required,
  m.daily_required AS schedule_required,
  m.deel_contract_id,
  m.reports_to_member_id,
  mgr.display_name AS supervisor_name,
  COALESCE(bal.vacation_allowance, 0) AS vacation_allowance,
  COALESCE(bal.vacation_carried, 0) AS vacation_carried,
  COALESCE(bal.vacation_used, 0) AS vacation_used,
  COALESCE(bal.vacation_reserved, 0) AS vacation_reserved,
  COALESCE(bal.vacation_allowance, 0)
    + COALESCE(bal.vacation_progressive, 0)
    + COALESCE(bal.vacation_carried, 0)
    + COALESCE(bal.vacation_adjustment, 0)
    - COALESCE(bal.vacation_used, 0)
    - COALESCE(bal.vacation_reserved, 0) AS vacation_available,
  COALESCE(bal.personal_allowance, 0) AS personal_allowance,
  COALESCE(bal.personal_used, 0) AS personal_used,
  COALESCE(req.pending_count, 0) AS pending_requests,
  COALESCE(req.approved_count, 0) AS approved_requests_this_year,
  COALESCE(req.total_approved_days, 0) AS total_approved_days_this_year,
  cv.currency AS comp_currency,
  cv.base_salary,
  cv.contract_type AS compensation_contract_type
FROM greenhouse_core.identity_profiles AS ip
LEFT JOIN greenhouse_core.members AS m
  ON m.identity_profile_id = ip.profile_id
LEFT JOIN greenhouse_core.departments AS d
  ON d.department_id = m.department_id
LEFT JOIN greenhouse_core.members AS mgr
  ON mgr.member_id = m.reports_to_member_id
LEFT JOIN LATERAL (
  SELECT
    SUM(lb.allowance_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_allowance,
    SUM(lb.progressive_extra_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_progressive,
    SUM(lb.carried_over_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_carried,
    SUM(lb.adjustment_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_adjustment,
    SUM(lb.used_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_used,
    SUM(lb.reserved_days) FILTER (WHERE lb.leave_type_code = 'vacation') AS vacation_reserved,
    SUM(lb.allowance_days) FILTER (WHERE lb.leave_type_code = 'personal') AS personal_allowance,
    SUM(lb.used_days) FILTER (WHERE lb.leave_type_code = 'personal') AS personal_used
  FROM greenhouse_hr.leave_balances AS lb
  WHERE lb.member_id = m.member_id
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
) AS bal ON m.member_id IS NOT NULL
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE lr.status IN ('pending_supervisor', 'pending_hr'))::int AS pending_count,
    COUNT(*) FILTER (WHERE lr.status = 'approved')::int AS approved_count,
    COALESCE(SUM(lr.requested_days) FILTER (WHERE lr.status = 'approved'), 0) AS total_approved_days
  FROM greenhouse_hr.leave_requests AS lr
  WHERE lr.member_id = m.member_id
    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
) AS req ON m.member_id IS NOT NULL
LEFT JOIN LATERAL (
  SELECT
    cv_inner.currency,
    cv_inner.base_salary,
    cv_inner.contract_type
  FROM greenhouse_payroll.compensation_versions AS cv_inner
  WHERE cv_inner.member_id = m.member_id
    AND cv_inner.effective_from <= CURRENT_DATE
    AND (cv_inner.effective_to IS NULL OR cv_inner.effective_to >= CURRENT_DATE)
  ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
  LIMIT 1
) AS cv ON m.member_id IS NOT NULL;

GRANT SELECT ON greenhouse_serving.member_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.member_360 TO greenhouse_migrator;
GRANT SELECT ON greenhouse_serving.member_payroll_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.member_payroll_360 TO greenhouse_migrator;
GRANT SELECT ON greenhouse_serving.person_hr_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.person_hr_360 TO greenhouse_migrator;

-- Down Migration
SET search_path = greenhouse_core, greenhouse_payroll, greenhouse_serving, greenhouse_delivery, greenhouse_sync, public;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_payroll_via_check;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP COLUMN IF EXISTS sii_retention_amount,
  DROP COLUMN IF EXISTS sii_retention_rate,
  DROP COLUMN IF EXISTS deel_contract_id,
  DROP COLUMN IF EXISTS payroll_via;

ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_type_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD CONSTRAINT compensation_versions_contract_type_check
  CHECK (contract_type IN ('indefinido', 'plazo_fijo'));

ALTER TABLE greenhouse_core.members
  DROP CONSTRAINT IF EXISTS members_payroll_via_check,
  DROP CONSTRAINT IF EXISTS members_pay_regime_check,
  DROP CONSTRAINT IF EXISTS members_contract_type_check;

ALTER TABLE greenhouse_core.members
  DROP COLUMN IF EXISTS deel_contract_id,
  DROP COLUMN IF EXISTS payroll_via,
  DROP COLUMN IF EXISTS pay_regime,
  DROP COLUMN IF EXISTS contract_type;
