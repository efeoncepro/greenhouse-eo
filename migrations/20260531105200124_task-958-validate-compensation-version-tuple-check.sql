-- Up Migration

-- TASK-958 Slice 2 — validar el CHECK `compensation_versions_contract_pay_regime_check`
-- que estaba NOT VALID (nunca verificó filas existentes → la fila vieja de Melkin y de
-- otros contractors Deel quedó grandfathered con tupla `(indefinido, international)`).
--
-- Slice 1 reconcilió todos los violadores (vigentes + históricos) de forma payroll-neutral
-- (verificado: payroll_entries pagados byte-idénticos antes/después). Este VALIDATE promueve
-- el CHECK a VALID → enforce la consistencia `(contract_type, pay_regime)` para TODAS las
-- filas (existentes + nuevas) → cierra el drift class permanentemente.

-- Anti pre-up-marker / safety: abortar si queda algún violador (fuerza el orden Slice 1 → 2).
DO $$
DECLARE violators INTEGER;
BEGIN
  SELECT COUNT(*) INTO violators
  FROM greenhouse_payroll.compensation_versions cv
  WHERE NOT (
    (cv.contract_type IN ('indefinido', 'plazo_fijo', 'honorarios') AND cv.pay_regime = 'chile')
    OR (cv.contract_type IN ('contractor', 'eor', 'international_internal') AND cv.pay_regime = 'international')
  );

  IF violators > 0 THEN
    RAISE EXCEPTION 'TASK-958: % compensation_versions violan la tupla (contract_type, pay_regime). Remediar antes de VALIDATE via scripts/payroll/reconcile-compensation-version-tuple.ts --include-historical --apply.', violators;
  END IF;
END
$$;

ALTER TABLE greenhouse_payroll.compensation_versions
  VALIDATE CONSTRAINT compensation_versions_contract_pay_regime_check;

-- Verificación post-VALIDATE: el constraint quedó convalidated.
DO $$
DECLARE is_validated BOOLEAN;
BEGIN
  SELECT con.convalidated INTO is_validated
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'greenhouse_payroll'
    AND rel.relname = 'compensation_versions'
    AND con.conname = 'compensation_versions_contract_pay_regime_check';

  IF is_validated IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'TASK-958: compensation_versions_contract_pay_regime_check no quedó validado (convalidated=%).', is_validated;
  END IF;
END
$$;

-- Down Migration

-- VALIDATE no es trivialmente reversible. Para volver a NOT VALID se re-crea el constraint:
-- DROP + ADD ... NOT VALID con la definición original (grandfathering de filas existentes).
ALTER TABLE greenhouse_payroll.compensation_versions
  DROP CONSTRAINT IF EXISTS compensation_versions_contract_pay_regime_check;

ALTER TABLE greenhouse_payroll.compensation_versions
  ADD CONSTRAINT compensation_versions_contract_pay_regime_check CHECK (
    (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios') AND pay_regime = 'chile')
    OR (contract_type IN ('contractor', 'eor', 'international_internal') AND pay_regime = 'international')
  ) NOT VALID;
