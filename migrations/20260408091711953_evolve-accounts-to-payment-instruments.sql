-- Up Migration
-- TASK-281: Evolve accounts to payment instruments + FX tracking in payment tables

-- ============================================================
-- 1. Evolve greenhouse_finance.accounts → payment instruments
-- ============================================================

ALTER TABLE greenhouse_finance.accounts
  ADD COLUMN IF NOT EXISTS instrument_category TEXT NOT NULL DEFAULT 'bank_account',
  ADD COLUMN IF NOT EXISTS provider_slug TEXT,
  ADD COLUMN IF NOT EXISTS provider_identifier TEXT,
  ADD COLUMN IF NOT EXISTS card_last_four TEXT,
  ADD COLUMN IF NOT EXISTS card_network TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS responsible_user_id TEXT,
  ADD COLUMN IF NOT EXISTS default_for TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}';

-- Constraints (separate statements for IF NOT EXISTS safety)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_instrument_category_check'
  ) THEN
    ALTER TABLE greenhouse_finance.accounts
      ADD CONSTRAINT accounts_instrument_category_check
      CHECK (instrument_category IN (
        'bank_account', 'credit_card', 'fintech',
        'payment_platform', 'cash', 'payroll_processor'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_card_network_check'
  ) THEN
    ALTER TABLE greenhouse_finance.accounts
      ADD CONSTRAINT accounts_card_network_check
      CHECK (card_network IS NULL OR card_network IN ('visa', 'mastercard', 'amex', 'diners'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_instrument_category
  ON greenhouse_finance.accounts(instrument_category);
CREATE INDEX IF NOT EXISTS idx_accounts_provider_slug
  ON greenhouse_finance.accounts(provider_slug) WHERE provider_slug IS NOT NULL;

-- Backfill instrument_category from existing account_type
UPDATE greenhouse_finance.accounts
SET instrument_category = CASE
  WHEN account_type = 'paypal' THEN 'fintech'
  WHEN account_type = 'wise' THEN 'fintech'
  ELSE 'bank_account'
END
WHERE instrument_category = 'bank_account'
  AND account_type NOT IN ('checking', 'savings');

-- Backfill provider_slug from bank_name for known Chilean banks
UPDATE greenhouse_finance.accounts
SET provider_slug = CASE
  WHEN LOWER(bank_name) LIKE '%bci%' THEN 'bci'
  WHEN LOWER(bank_name) LIKE '%chile%' THEN 'banco-chile'
  WHEN LOWER(bank_name) LIKE '%estado%' THEN 'banco-estado'
  WHEN LOWER(bank_name) LIKE '%santander%' THEN 'santander'
  WHEN LOWER(bank_name) LIKE '%scotiabank%' THEN 'scotiabank'
  WHEN LOWER(bank_name) LIKE '%itau%' OR LOWER(bank_name) LIKE '%itaú%' THEN 'itau'
  WHEN LOWER(bank_name) LIKE '%bice%' THEN 'bice'
  WHEN LOWER(bank_name) LIKE '%security%' THEN 'security'
  WHEN LOWER(bank_name) LIKE '%falabella%' THEN 'falabella'
  WHEN LOWER(bank_name) LIKE '%ripley%' THEN 'ripley'
  ELSE NULL
END
WHERE provider_slug IS NULL;

-- Backfill provider_slug for fintech types
UPDATE greenhouse_finance.accounts
SET provider_slug = account_type
WHERE instrument_category = 'fintech'
  AND provider_slug IS NULL
  AND account_type IN ('paypal', 'wise');

-- ============================================================
-- 2. FX tracking columns in income_payments
-- ============================================================

ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS exchange_rate_at_payment NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS amount_clp NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fx_gain_loss_clp NUMERIC(14,2);

-- ============================================================
-- 3. FX tracking columns in expense_payments
-- ============================================================

ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS exchange_rate_at_payment NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS amount_clp NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fx_gain_loss_clp NUMERIC(14,2);

-- ============================================================
-- 4. Grants
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.accounts TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.accounts TO greenhouse_app;

-- ============================================================
-- 5. Comments
-- ============================================================

COMMENT ON COLUMN greenhouse_finance.accounts.instrument_category IS
  'Payment instrument type: bank_account, credit_card, fintech, payment_platform, cash, payroll_processor';
COMMENT ON COLUMN greenhouse_finance.accounts.provider_slug IS
  'Canonical slug for the provider (bci, banco-chile, paypal, deel, etc.) — maps to logo catalog';
COMMENT ON COLUMN greenhouse_finance.accounts.default_for IS
  'Array of default-use tags: supplier_payment, payroll, tax, client_collection, etc.';
COMMENT ON COLUMN greenhouse_finance.income_payments.exchange_rate_at_payment IS
  'USD/CLP exchange rate at the time of payment (from Mindicador/exchange_rates). NULL for CLP payments.';
COMMENT ON COLUMN greenhouse_finance.income_payments.amount_clp IS
  'Payment amount converted to CLP at exchange_rate_at_payment. For CLP payments, equals amount.';
COMMENT ON COLUMN greenhouse_finance.income_payments.fx_gain_loss_clp IS
  'FX gain/loss vs document rate: amount_clp - (amount * document.exchange_rate_to_clp). Positive = gain.';

-- Down Migration

ALTER TABLE greenhouse_finance.income_payments
  DROP COLUMN IF EXISTS exchange_rate_at_payment,
  DROP COLUMN IF EXISTS amount_clp,
  DROP COLUMN IF EXISTS fx_gain_loss_clp;

ALTER TABLE greenhouse_finance.expense_payments
  DROP COLUMN IF EXISTS exchange_rate_at_payment,
  DROP COLUMN IF EXISTS amount_clp,
  DROP COLUMN IF EXISTS fx_gain_loss_clp;

ALTER TABLE greenhouse_finance.accounts
  DROP CONSTRAINT IF EXISTS accounts_instrument_category_check,
  DROP CONSTRAINT IF EXISTS accounts_card_network_check,
  DROP COLUMN IF EXISTS instrument_category,
  DROP COLUMN IF EXISTS provider_slug,
  DROP COLUMN IF EXISTS provider_identifier,
  DROP COLUMN IF EXISTS card_last_four,
  DROP COLUMN IF EXISTS card_network,
  DROP COLUMN IF EXISTS credit_limit,
  DROP COLUMN IF EXISTS responsible_user_id,
  DROP COLUMN IF EXISTS default_for,
  DROP COLUMN IF EXISTS display_order,
  DROP COLUMN IF EXISTS metadata_json;
