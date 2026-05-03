-- Up Migration

-- TASK-768 Slice 4 — CHECK NOT VALID + cutover constraint para economic_category.
--
-- Patron canonico mismo que TASK-708/728/766 (account_required_after_cutover,
-- payments_amount_clp_required_after_cutover):
--   * NOT VALID al crear → no escanea filas existentes (cero downtime).
--   * Cutover_date `2026-05-03 11:00:00+00` (post-Slice-5 trigger).
--   * Cualquier INSERT/UPDATE post-cutover queda sujeto al constraint.
--   * Filas pre-cutover con economic_category NULL siguen en manual_queue
--     hasta que UI Slice 6 las resuelva. Migration follow-up hara VALIDATE
--     CONSTRAINT atomic post-cleanup del manual queue.
--
-- Con el trigger Slice 5 (populate_economic_category_default) instalado,
-- TODA fila INSERTed post-Slice-5 ya tiene economic_category != NULL via
-- el transparent map del expense_type/income_type. El CHECK aqui es
-- defense-in-depth: rechaza INSERTs anomalos donde el trigger haya sido
-- bypasseado o donde un valor mal escrito (e.g. economic_category='supplier'
-- legacy) llegue a la columna.

-- Validacion sintactica de los valores canonicos enum-style (texto sin enum
-- para mantener flexibilidad de migration futura).

ALTER TABLE greenhouse_finance.expenses
  ADD CONSTRAINT expenses_economic_category_required_after_cutover
  CHECK (
    economic_category IS NOT NULL
    OR created_at < TIMESTAMPTZ '2026-05-03 11:00:00+00'
  ) NOT VALID;

ALTER TABLE greenhouse_finance.expenses
  ADD CONSTRAINT expenses_economic_category_canonical_values
  CHECK (
    economic_category IS NULL
    OR economic_category IN (
      'labor_cost_internal',
      'labor_cost_external',
      'vendor_cost_saas',
      'vendor_cost_professional_services',
      'regulatory_payment',
      'tax',
      'financial_cost',
      'bank_fee_real',
      'overhead',
      'financial_settlement',
      'other'
    )
  ) NOT VALID;

ALTER TABLE greenhouse_finance.income
  ADD CONSTRAINT income_economic_category_required_after_cutover
  CHECK (
    economic_category IS NOT NULL
    OR created_at < TIMESTAMPTZ '2026-05-03 11:00:00+00'
  ) NOT VALID;

ALTER TABLE greenhouse_finance.income
  ADD CONSTRAINT income_economic_category_canonical_values
  CHECK (
    economic_category IS NULL
    OR economic_category IN (
      'service_revenue',
      'client_reimbursement',
      'factoring_proceeds',
      'partner_payout_offset',
      'internal_transfer_in',
      'tax_refund',
      'financial_income',
      'other'
    )
  ) NOT VALID;

-- VALIDATE de los constraints `canonical_values` ya es seguro porque ningun
-- valor existente lo viola (el trigger Slice 5 + backfill solo escriben
-- valores canonicos). Validamos atomic en esta migration.

ALTER TABLE greenhouse_finance.expenses
  VALIDATE CONSTRAINT expenses_economic_category_canonical_values;

ALTER TABLE greenhouse_finance.income
  VALIDATE CONSTRAINT income_economic_category_canonical_values;

-- Los constraints `*_required_after_cutover` quedan NOT VALID hasta que
-- el manual queue se resuelva (Slice 6 UI). Migration follow-up hara
-- VALIDATE CONSTRAINT atomic post-cleanup. Mientras tanto, post-cutover
-- INSERT/UPDATE respeta la regla; solo filas pre-cutover quedan exemptas.

COMMENT ON CONSTRAINT expenses_economic_category_required_after_cutover
  ON greenhouse_finance.expenses IS
  'TASK-768 Slice 4: NOT NULL post-cutover. NOT VALID hasta resolver manual queue '
  '(Slice 6 UI). Cutover 2026-05-03 11:00 UTC. Trigger Slice 5 garantiza valor '
  'no-NULL en INSERTs nuevos.';

COMMENT ON CONSTRAINT income_economic_category_required_after_cutover
  ON greenhouse_finance.income IS
  'TASK-768 Slice 4: idem para income.';

-- Down Migration

ALTER TABLE greenhouse_finance.income DROP CONSTRAINT IF EXISTS income_economic_category_canonical_values;
ALTER TABLE greenhouse_finance.income DROP CONSTRAINT IF EXISTS income_economic_category_required_after_cutover;
ALTER TABLE greenhouse_finance.expenses DROP CONSTRAINT IF EXISTS expenses_economic_category_canonical_values;
ALTER TABLE greenhouse_finance.expenses DROP CONSTRAINT IF EXISTS expenses_economic_category_required_after_cutover;
