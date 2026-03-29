ALTER TABLE greenhouse_payroll.compensation_versions
  ADD COLUMN IF NOT EXISTS afp_cotizacion_rate NUMERIC(6, 4),
  ADD COLUMN IF NOT EXISTS afp_comision_rate NUMERIC(6, 4);

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS chile_afp_cotizacion_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS chile_afp_comision_amount NUMERIC(14, 2);

UPDATE greenhouse_payroll.compensation_versions AS cv
SET
  afp_cotizacion_rate = COALESCE(cv.afp_cotizacion_rate, derived.cotizacion_rate),
  afp_comision_rate = COALESCE(cv.afp_comision_rate, derived.comision_rate)
FROM (
  SELECT
    version_id,
    LEAST(COALESCE(afp_rate, 0), 0.1) AS cotizacion_rate,
    GREATEST(
      COALESCE(afp_rate, 0) - LEAST(COALESCE(afp_rate, 0), 0.1),
      0
    ) AS comision_rate
  FROM greenhouse_payroll.compensation_versions
  WHERE pay_regime = 'chile'
    AND afp_rate IS NOT NULL
) AS derived
WHERE cv.version_id = derived.version_id;

UPDATE greenhouse_payroll.payroll_entries AS e
SET
  chile_afp_cotizacion_amount = COALESCE(e.chile_afp_cotizacion_amount, derived.cotizacion_amount),
  chile_afp_comision_amount = COALESCE(e.chile_afp_comision_amount, derived.comision_amount)
FROM (
  SELECT
    e2.entry_id,
    CASE
      WHEN COALESCE(cv.afp_rate, 0) > 0 THEN ROUND(
        COALESCE(e2.chile_afp_amount, 0)
        * COALESCE(cv.afp_cotizacion_rate, LEAST(COALESCE(cv.afp_rate, 0), 0.1))
        / COALESCE(cv.afp_rate, 0),
        2
      )
      ELSE 0
    END AS cotizacion_amount,
    CASE
      WHEN COALESCE(cv.afp_rate, 0) > 0 THEN ROUND(
        COALESCE(e2.chile_afp_amount, 0)
        * COALESCE(cv.afp_comision_rate, GREATEST(COALESCE(cv.afp_rate, 0) - LEAST(COALESCE(cv.afp_rate, 0), 0.1), 0))
        / COALESCE(cv.afp_rate, 0),
        2
      )
      ELSE 0
    END AS comision_amount
  FROM greenhouse_payroll.payroll_entries AS e2
  INNER JOIN greenhouse_payroll.compensation_versions AS cv
    ON cv.version_id = e2.compensation_version_id
  WHERE e2.chile_afp_amount IS NOT NULL
) AS derived
WHERE e.entry_id = derived.entry_id;
