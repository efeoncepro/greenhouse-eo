ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS fixed_bonus_label TEXT;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS fixed_bonus_label TEXT;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS fixed_bonus_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS adjusted_fixed_bonus_amount NUMERIC(14, 2);

CREATE OR REPLACE VIEW greenhouse_serving.member_payroll_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.job_level,
  m.employment_type,
  m.status AS member_status,
  m.active AS member_active,
  d.name AS department_name,
  cv.version_id AS current_compensation_version_id,
  cv.pay_regime,
  cv.currency,
  cv.base_salary,
  cv.remote_allowance,
  cv.fixed_bonus_label,
  cv.fixed_bonus_amount,
  cv.contract_type,
  cv.effective_from AS compensation_effective_from,
  cv.effective_to AS compensation_effective_to,
  (SELECT COUNT(*) FROM greenhouse_payroll.compensation_versions cv2 WHERE cv2.member_id = m.member_id) AS total_compensation_versions,
  (SELECT COUNT(*) FROM greenhouse_payroll.payroll_entries pe WHERE pe.member_id = m.member_id) AS total_payroll_entries
FROM greenhouse_core.members m
LEFT JOIN greenhouse_core.departments d ON d.department_id = m.department_id
LEFT JOIN LATERAL (
  SELECT *
  FROM greenhouse_payroll.compensation_versions cv_inner
  WHERE cv_inner.member_id = m.member_id
    AND cv_inner.effective_from <= CURRENT_DATE
    AND (cv_inner.effective_to IS NULL OR cv_inner.effective_to >= CURRENT_DATE)
  ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
  LIMIT 1
) cv ON TRUE
WHERE m.active = TRUE;
