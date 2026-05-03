-- Up Migration

-- TASK-745b — fixed_deduction y manual_override deben ser self-describing.
--
-- Problema: V1 persistia fixed_deduction.amount como numero plano sin moneda.
-- Para entries USD (Deel/internacionales) el descuento "95" se interpretaba
-- como 95 USD por colocacion (porque compute-net resta del neto en la moneda
-- del entry), pero la UI decia "CLP" y el payload no era self-describing.
-- Si la moneda del entry cambia o se evolucinan los outbox events para
-- Finance, el adjustment queda ambiguo.
--
-- Esta migration:
-- 1) Backfill de payloads existentes: agrega `currency` al payload usando
--    `entry.currency` como fuente de verdad.
-- 2) Trigger `assert_payload_currency_matches_entry`: rechaza nuevos rows
--    fixed_deduction o manual_override cuyo `payload.currency` no coincida
--    con `payroll_entries.currency`. Para gross_factor y exclude no aplica
--    (no tienen monto absoluto).
-- 3) Trigger se ejecuta junto al compliance Chile dependiente, sin reemplazarlo.

-- Backfill: rows existentes
UPDATE greenhouse_payroll.payroll_adjustments pa
SET payload = pa.payload || jsonb_build_object('currency', pe.currency)
FROM greenhouse_payroll.payroll_entries pe
WHERE pa.payroll_entry_id = pe.entry_id
  AND pa.kind IN ('fixed_deduction', 'manual_override')
  AND NOT (pa.payload ? 'currency');

-- Trigger function: valida coherencia currency-entry para kinds con monto absoluto
CREATE OR REPLACE FUNCTION greenhouse_payroll.assert_adjustment_payload_currency_coherent()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_currency TEXT;
  v_payload_currency TEXT;
BEGIN
  IF NEW.kind NOT IN ('fixed_deduction', 'manual_override') THEN
    RETURN NEW;
  END IF;

  SELECT currency INTO v_entry_currency
    FROM greenhouse_payroll.payroll_entries
   WHERE entry_id = NEW.payroll_entry_id;

  IF v_entry_currency IS NULL THEN
    RAISE EXCEPTION 'payroll entry % not found while validating adjustment payload currency', NEW.payroll_entry_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_payload_currency := NEW.payload ->> 'currency';

  IF v_payload_currency IS NULL THEN
    RAISE EXCEPTION 'adjustment kind=% requires payload.currency (entry.currency=%); got payload=%', NEW.kind, v_entry_currency, NEW.payload
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_payload_currency <> v_entry_currency THEN
    RAISE EXCEPTION 'adjustment payload.currency=% no coincide con entry.currency=% para kind=%. Los descuentos absolutos deben expresarse en la misma moneda del entry.', v_payload_currency, v_entry_currency, NEW.kind
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payroll_adjustment_payload_currency_trigger ON greenhouse_payroll.payroll_adjustments;

CREATE TRIGGER payroll_adjustment_payload_currency_trigger
  BEFORE INSERT OR UPDATE OF kind, payload
  ON greenhouse_payroll.payroll_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_payroll.assert_adjustment_payload_currency_coherent();

COMMENT ON FUNCTION greenhouse_payroll.assert_adjustment_payload_currency_coherent() IS
  'TASK-745b - Asegura que fixed_deduction y manual_override declaren payload.currency coherente con payroll_entries.currency. Self-describing payloads + safety net para outbox a Finance.';


-- Down Migration

DROP TRIGGER IF EXISTS payroll_adjustment_payload_currency_trigger ON greenhouse_payroll.payroll_adjustments;
DROP FUNCTION IF EXISTS greenhouse_payroll.assert_adjustment_payload_currency_coherent();
