-- Up Migration

SET search_path = greenhouse_finance, greenhouse_core, public;

ALTER TABLE greenhouse_finance.accounts
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.settlement_groups
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.settlement_legs
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.account_balances
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

ALTER TABLE greenhouse_finance.reconciliation_periods
  ADD COLUMN IF NOT EXISTS space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;

DO $$
DECLARE
  v_internal_space_id text;
BEGIN
  SELECT s.space_id
    INTO v_internal_space_id
  FROM greenhouse_core.spaces s
  WHERE s.space_id = 'space-efeonce'
     OR s.client_id = 'space-efeonce'
     OR s.space_type = 'internal_space'
  ORDER BY
    CASE
      WHEN s.space_id = 'space-efeonce' THEN 0
      WHEN s.client_id = 'space-efeonce' THEN 1
      WHEN s.space_type = 'internal_space' THEN 2
      ELSE 3
    END,
    s.updated_at DESC NULLS LAST,
    s.created_at DESC NULLS LAST,
    s.space_id ASC
  LIMIT 1;

  IF v_internal_space_id IS NOT NULL THEN
    UPDATE greenhouse_finance.accounts
       SET space_id = v_internal_space_id
     WHERE space_id IS NULL;

    UPDATE greenhouse_finance.income_payments ip
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE ip.payment_account_id = a.account_id
       AND ip.space_id IS NULL;

    UPDATE greenhouse_finance.expense_payments ep
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE ep.payment_account_id = a.account_id
       AND ep.space_id IS NULL;

    UPDATE greenhouse_finance.settlement_groups sg
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE sg.primary_instrument_id = a.account_id
       AND sg.space_id IS NULL;

    UPDATE greenhouse_finance.settlement_legs sl
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE sl.instrument_id = a.account_id
       AND sl.space_id IS NULL;

    UPDATE greenhouse_finance.settlement_legs sl
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE sl.counterparty_instrument_id = a.account_id
       AND sl.space_id IS NULL;

    UPDATE greenhouse_finance.settlement_legs sl
       SET space_id = COALESCE(sg.space_id, v_internal_space_id)
      FROM greenhouse_finance.settlement_groups sg
     WHERE sl.settlement_group_id = sg.settlement_group_id
       AND sl.space_id IS NULL;

    UPDATE greenhouse_finance.account_balances ab
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE ab.account_id = a.account_id
       AND ab.space_id IS NULL;

    UPDATE greenhouse_finance.reconciliation_periods rp
       SET space_id = COALESCE(a.space_id, v_internal_space_id)
      FROM greenhouse_finance.accounts a
     WHERE rp.account_id = a.account_id
       AND rp.space_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS accounts_space_id_idx
  ON greenhouse_finance.accounts (space_id, is_active, display_order, account_name);

CREATE INDEX IF NOT EXISTS income_payments_space_payment_account_idx
  ON greenhouse_finance.income_payments (space_id, payment_account_id);

CREATE INDEX IF NOT EXISTS expense_payments_space_payment_account_idx
  ON greenhouse_finance.expense_payments (space_id, payment_account_id);

CREATE INDEX IF NOT EXISTS settlement_groups_space_primary_instrument_idx
  ON greenhouse_finance.settlement_groups (space_id, primary_instrument_id);

CREATE INDEX IF NOT EXISTS settlement_legs_space_instrument_idx
  ON greenhouse_finance.settlement_legs (space_id, instrument_id, counterparty_instrument_id);

CREATE INDEX IF NOT EXISTS account_balances_space_account_date_idx
  ON greenhouse_finance.account_balances (space_id, account_id, balance_date DESC);

CREATE INDEX IF NOT EXISTS reconciliation_periods_space_account_period_idx
  ON greenhouse_finance.reconciliation_periods (space_id, account_id, year DESC, month DESC);

CREATE TABLE IF NOT EXISTS greenhouse_finance.payment_instrument_admin_audit_log (
  audit_id text PRIMARY KEY DEFAULT ('pia_' || replace(gen_random_uuid()::text, '-', '')),
  space_id text REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  account_id text NOT NULL REFERENCES greenhouse_finance.accounts(account_id) ON DELETE CASCADE,
  actor_user_id text,
  action text NOT NULL,
  field_name text,
  reason text,
  diff_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_instrument_admin_audit_action_chk
    CHECK (action IN ('updated', 'revealed_sensitive', 'deactivated', 'reactivated', 'created'))
);

CREATE INDEX IF NOT EXISTS payment_instrument_admin_audit_account_idx
  ON greenhouse_finance.payment_instrument_admin_audit_log (space_id, account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_instrument_admin_audit_actor_idx
  ON greenhouse_finance.payment_instrument_admin_audit_log (actor_user_id, created_at DESC);

COMMENT ON COLUMN greenhouse_finance.accounts.space_id IS
  'TASK-697: tenant boundary for payment instruments. Backfilled to the internal Efeonce space during rollout.';

COMMENT ON TABLE greenhouse_finance.payment_instrument_admin_audit_log IS
  'TASK-697: redacted admin audit trail for payment instrument updates, deactivation/reactivation, and sensitive reveal events.';

GRANT SELECT, INSERT, UPDATE ON greenhouse_finance.payment_instrument_admin_audit_log TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_finance.payment_instrument_admin_audit_log TO greenhouse_migrator;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_finance.payment_instrument_admin_audit_log;

DROP INDEX IF EXISTS greenhouse_finance.reconciliation_periods_space_account_period_idx;
DROP INDEX IF EXISTS greenhouse_finance.account_balances_space_account_date_idx;
DROP INDEX IF EXISTS greenhouse_finance.settlement_legs_space_instrument_idx;
DROP INDEX IF EXISTS greenhouse_finance.settlement_groups_space_primary_instrument_idx;
DROP INDEX IF EXISTS greenhouse_finance.expense_payments_space_payment_account_idx;
DROP INDEX IF EXISTS greenhouse_finance.income_payments_space_payment_account_idx;
DROP INDEX IF EXISTS greenhouse_finance.accounts_space_id_idx;

ALTER TABLE greenhouse_finance.reconciliation_periods DROP COLUMN IF EXISTS space_id;
ALTER TABLE greenhouse_finance.account_balances DROP COLUMN IF EXISTS space_id;
ALTER TABLE greenhouse_finance.settlement_legs DROP COLUMN IF EXISTS space_id;
ALTER TABLE greenhouse_finance.settlement_groups DROP COLUMN IF EXISTS space_id;
ALTER TABLE greenhouse_finance.expense_payments DROP COLUMN IF EXISTS space_id;
ALTER TABLE greenhouse_finance.income_payments DROP COLUMN IF EXISTS space_id;
ALTER TABLE greenhouse_finance.accounts DROP COLUMN IF EXISTS space_id;
