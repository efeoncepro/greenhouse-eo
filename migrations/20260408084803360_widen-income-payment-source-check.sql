-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_payment_source_check;

ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_payment_source_check
  CHECK (payment_source IN ('client_direct', 'factoring_proceeds', 'nubox_bank_sync'));

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_payment_source_check;

ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_payment_source_check
  CHECK (payment_source IN ('client_direct', 'factoring_proceeds'));
