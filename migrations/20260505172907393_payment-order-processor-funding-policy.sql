-- Up Migration

-- TASK-799 follow-up — processor funding policy for payment orders.
--
-- Keeps processors/rails (Deel, Global66, future Wise/PayPal/etc.) separate
-- from the real instrument that funds the order. This table is intentionally
-- small and declarative: code resolves options from here instead of hardcoding
-- account ids in TS.

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_order_processor_funding_policies (
  policy_id TEXT PRIMARY KEY,
  processor_slug TEXT,
  payment_method TEXT,
  order_currency TEXT CHECK (order_currency IS NULL OR order_currency IN ('CLP', 'USD')),
  source_account_id TEXT NOT NULL REFERENCES greenhouse_finance.accounts(account_id),
  intermediary_account_id TEXT REFERENCES greenhouse_finance.accounts(account_id),
  settlement_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (settlement_mode IN ('direct', 'via_intermediary')),
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (processor_slug IS NOT NULL OR payment_method IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS payment_order_processor_funding_policy_lookup_idx
  ON greenhouse_finance.payment_order_processor_funding_policies (
    is_active,
    processor_slug,
    payment_method,
    order_currency,
    priority
  );

COMMENT ON TABLE greenhouse_finance.payment_order_processor_funding_policies IS
  'Payment Orders funding policy. Maps a processor/rail to the real source instrument and optional intermediary instrument. Processors are not cash sources.';

COMMENT ON COLUMN greenhouse_finance.payment_order_processor_funding_policies.source_account_id IS
  'Real account, fintech, card or instrument that funds/debits the order.';

COMMENT ON COLUMN greenhouse_finance.payment_order_processor_funding_policies.intermediary_account_id IS
  'Optional processor/intermediary instrument used as counterparty evidence, never as source_account_id.';

INSERT INTO greenhouse_finance.payment_order_processor_funding_policies (
  policy_id,
  processor_slug,
  payment_method,
  order_currency,
  source_account_id,
  intermediary_account_id,
  settlement_mode,
  priority,
  notes,
  metadata_json
)
VALUES
  (
    'popfp-deel-usd-santander-corp',
    'deel',
    'deel',
    'USD',
    'santander-corp-clp',
    'deel-clp',
    'via_intermediary',
    10,
    'Deel USD payroll is funded by Santander Corp card; Deel executes worker payout.',
    '{"decision":"processor_not_source","counterparty_only":true}'::jsonb
  ),
  (
    'popfp-deel-clp-santander-corp',
    'deel',
    'deel',
    'CLP',
    'santander-corp-clp',
    'deel-clp',
    'via_intermediary',
    20,
    'Deel CLP payroll is funded by Santander Corp card; Deel executes worker payout.',
    '{"decision":"processor_not_source","counterparty_only":true}'::jsonb
  )
ON CONFLICT (policy_id) DO UPDATE SET
  source_account_id = EXCLUDED.source_account_id,
  intermediary_account_id = EXCLUDED.intermediary_account_id,
  settlement_mode = EXCLUDED.settlement_mode,
  priority = EXCLUDED.priority,
  is_active = TRUE,
  notes = EXCLUDED.notes,
  metadata_json = EXCLUDED.metadata_json,
  updated_at = now();

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_order_processor_funding_policies TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_order_processor_funding_policies TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_order_processor_funding_policies TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.payment_order_processor_funding_policies;
