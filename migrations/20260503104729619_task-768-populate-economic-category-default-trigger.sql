-- Up Migration

-- TASK-768 Slice 5 — Trigger PG canonico que poblar economic_category al INSERT
-- desde un transparent map del accounting_type (legacy expense_type / income_type).
--
-- Approach: cero modificacion a 12 canonical writers existentes. El trigger
-- se ejecuta BEFORE INSERT y poblar la columna con un default razonable basado
-- en accounting_type. Casos de baja confidence se enrutan a manual queue
-- post-INSERT via reliability signal (Slice 7) + UI reclassify (Slice 6).
--
-- Reglas del transparent map (mirror de las primeras rules del resolver TS):
--   * tax (expense)              → tax
--   * social_security (expense)  → regulatory_payment
--   * financial_cost (expense)   → financial_cost
--   * bank_fee (expense)         → bank_fee_real
--   * payroll (expense)          → labor_cost_internal (default ECG; international se reclasifica via UI o resolver)
--   * supplier (expense)         → vendor_cost_saas (default; operator reclasifica si es professional services)
--   * miscellaneous (expense)    → other (low confidence; trigger manual review)
--   * factoring (income)         → factoring_proceeds
--   * tax_refund (income)        → tax_refund
--   * client_reimbursement       → client_reimbursement
--   * invoice/service/quote      → service_revenue (default razonable)
--   * NULL/unknown               → NULL (cae a CHECK constraint si post-cutover; pre-cutover queda NULL para backfill)
--
-- Importante: el trigger NO sobrescribe valores ya poblados. Si un writer
-- pasa economic_category explicito (ej. UI reclassify, backfill script,
-- futuro test), respeta ese valor.

CREATE OR REPLACE FUNCTION greenhouse_finance.populate_expense_economic_category_default()
RETURNS TRIGGER AS $$
BEGIN
  -- No sobrescribir valores explicitos.
  IF NEW.economic_category IS NOT NULL THEN
    RETURN NEW;
  END IF;

  NEW.economic_category := CASE
    WHEN NEW.expense_type = 'tax' THEN 'tax'
    WHEN NEW.expense_type = 'social_security' THEN 'regulatory_payment'
    WHEN NEW.expense_type = 'financial_cost' THEN 'financial_cost'
    WHEN NEW.expense_type = 'bank_fee' THEN 'bank_fee_real'
    WHEN NEW.expense_type = 'payroll' THEN 'labor_cost_internal'
    WHEN NEW.expense_type = 'supplier' THEN 'vendor_cost_saas'
    WHEN NEW.expense_type = 'miscellaneous' THEN 'other'
    ELSE NULL
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_populate_economic_category_default_trigger
  BEFORE INSERT ON greenhouse_finance.expenses
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.populate_expense_economic_category_default();

CREATE OR REPLACE FUNCTION greenhouse_finance.populate_income_economic_category_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.economic_category IS NOT NULL THEN
    RETURN NEW;
  END IF;

  NEW.economic_category := CASE
    WHEN NEW.income_type = 'factoring' THEN 'factoring_proceeds'
    WHEN NEW.income_type = 'tax_refund' THEN 'tax_refund'
    WHEN NEW.income_type = 'iva_refund' THEN 'tax_refund'
    WHEN NEW.income_type = 'client_reimbursement' THEN 'client_reimbursement'
    WHEN NEW.income_type = 'reimbursement' THEN 'client_reimbursement'
    WHEN NEW.income_type = 'financial_income' THEN 'financial_income'
    WHEN NEW.income_type = 'interest' THEN 'financial_income'
    WHEN NEW.income_type = 'internal_transfer' THEN 'internal_transfer_in'
    WHEN NEW.income_type = 'invoice' THEN 'service_revenue'
    WHEN NEW.income_type = 'service' THEN 'service_revenue'
    WHEN NEW.income_type = 'service_fee' THEN 'service_revenue'
    WHEN NEW.income_type = 'quote' THEN 'service_revenue'
    ELSE 'service_revenue'  -- default razonable; income raramente es non-service
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER income_populate_economic_category_default_trigger
  BEFORE INSERT ON greenhouse_finance.income
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.populate_income_economic_category_default();

COMMENT ON FUNCTION greenhouse_finance.populate_expense_economic_category_default() IS
  'TASK-768 Slice 5: trigger BEFORE INSERT que poblar economic_category default '
  'desde transparent map del expense_type. NO sobrescribe valores explicitos. '
  'Casos low-confidence (vendor_cost_saas, other) son refinables via Slice 6 UI '
  'o re-corrida del backfill script.';

COMMENT ON FUNCTION greenhouse_finance.populate_income_economic_category_default() IS
  'TASK-768 Slice 5: idem para income. Mapping del income_type → economic_category.';

-- Down Migration

DROP TRIGGER IF EXISTS income_populate_economic_category_default_trigger ON greenhouse_finance.income;
DROP TRIGGER IF EXISTS expenses_populate_economic_category_default_trigger ON greenhouse_finance.expenses;
DROP FUNCTION IF EXISTS greenhouse_finance.populate_income_economic_category_default();
DROP FUNCTION IF EXISTS greenhouse_finance.populate_expense_economic_category_default();
