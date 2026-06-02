-- Up Migration
--
-- TASK-793 forward fix — Contractor Payables schema.
--
-- The original TASK-793 migration timestamp was already present in
-- public.pgmigrations in the shared dev database but its file had an empty Up
-- section. Per the migration operating contract, do not edit an applied
-- migration; add this idempotent forward fix instead.

CREATE SEQUENCE IF NOT EXISTS greenhouse_hr.seq_contractor_payable_public_id;

CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_payables (
  contractor_payable_id          TEXT PRIMARY KEY,
  public_id                      TEXT NOT NULL UNIQUE,
  contractor_engagement_id       TEXT NOT NULL
    REFERENCES greenhouse_hr.contractor_engagements(contractor_engagement_id) ON DELETE RESTRICT,
  contractor_work_submission_id  TEXT
    REFERENCES greenhouse_hr.contractor_work_submissions(contractor_work_submission_id) ON DELETE RESTRICT,
  contractor_invoice_id          TEXT,
  payable_source_kind            TEXT NOT NULL
    CHECK (payable_source_kind IN ('work_submission', 'fixed_recurring', 'invoice', 'off_cycle')),
  beneficiary_type               TEXT NOT NULL
    CHECK (beneficiary_type IN ('member', 'other')),
  beneficiary_id                 TEXT NOT NULL,
  gross_amount                   NUMERIC(18,2) NOT NULL
    CHECK (gross_amount >= 0),
  withholding_amount             NUMERIC(18,2) NOT NULL DEFAULT 0
    CHECK (withholding_amount >= 0),
  net_payable                    NUMERIC(18,2) NOT NULL
    CHECK (net_payable >= 0),
  currency                       TEXT NOT NULL
    CHECK (char_length(currency) = 3),
  payment_currency               TEXT
    CHECK (payment_currency IS NULL OR char_length(payment_currency) = 3),
  fx_policy_code                 TEXT,
  tax_compliance_owner           TEXT NOT NULL,
  tax_withholding_policy_code    TEXT,
  economic_category              TEXT NOT NULL DEFAULT 'labor_cost_external'
    CHECK (economic_category = 'labor_cost_external'),
  payroll_via                    TEXT NOT NULL,
  payment_profile_id             TEXT,
  payment_profile_waiver_reason  TEXT,
  due_date                       DATE,
  status                         TEXT NOT NULL DEFAULT 'pending_readiness'
    CHECK (status IN (
      'pending_readiness',
      'ready_for_finance',
      'obligation_created',
      'payment_order_created',
      'paid',
      'cancelled',
      'blocked'
    )),
  finance_obligation_id          TEXT,
  payment_order_id               TEXT,
  readiness_json                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id             TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contractor_payables_net_reconciles
    CHECK (ROUND(net_payable, 2) = ROUND(gross_amount - withholding_amount, 2)),
  CONSTRAINT contractor_payables_work_submission_source
    CHECK (
      (payable_source_kind = 'work_submission' AND contractor_work_submission_id IS NOT NULL)
      OR (payable_source_kind <> 'work_submission')
    )
);

CREATE INDEX IF NOT EXISTS idx_contractor_payables_engagement
  ON greenhouse_hr.contractor_payables (contractor_engagement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_payables_status
  ON greenhouse_hr.contractor_payables (status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_payables_work_submission_unique
  ON greenhouse_hr.contractor_payables (contractor_work_submission_id)
  WHERE contractor_work_submission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_payables_finance_obligation_unique
  ON greenhouse_hr.contractor_payables (finance_obligation_id)
  WHERE finance_obligation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_payables_ready_for_finance_lag
  ON greenhouse_hr.contractor_payables (updated_at)
  WHERE status = 'ready_for_finance' AND finance_obligation_id IS NULL;

CREATE TABLE IF NOT EXISTS greenhouse_hr.contractor_payable_events (
  event_id                       TEXT PRIMARY KEY,
  contractor_payable_id          TEXT NOT NULL
    REFERENCES greenhouse_hr.contractor_payables(contractor_payable_id) ON DELETE CASCADE,
  event_type                     TEXT NOT NULL
    CHECK (event_type IN (
      'created',
      'ready_for_finance',
      'obligation_created',
      'blocked',
      'cancelled',
      'updated'
    )),
  from_status                    TEXT,
  to_status                      TEXT,
  actor_user_id                  TEXT,
  reason                         TEXT,
  metadata_json                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_payable_events_payable
  ON greenhouse_hr.contractor_payable_events (contractor_payable_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hr'
      AND table_name = 'contractor_work_submissions'
      AND column_name = 'consumed_by_payable_id'
  ) THEN
    ALTER TABLE greenhouse_hr.contractor_work_submissions
      DROP CONSTRAINT IF EXISTS contractor_work_submissions_consumed_by_payable_fkey;

    ALTER TABLE greenhouse_hr.contractor_work_submissions
      ADD CONSTRAINT contractor_work_submissions_consumed_by_payable_fkey
      FOREIGN KEY (consumed_by_payable_id)
      REFERENCES greenhouse_hr.contractor_payables(contractor_payable_id)
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE greenhouse_finance.payment_obligations
  DROP CONSTRAINT IF EXISTS payment_obligations_source_kind_check;

ALTER TABLE greenhouse_finance.payment_obligations
  ADD CONSTRAINT payment_obligations_source_kind_check
  CHECK (source_kind IN (
    'payroll',
    'supplier_invoice',
    'tax_obligation',
    'manual',
    'reliquidation_delta',
    'contractor_payable'
  ));

CREATE OR REPLACE FUNCTION greenhouse_hr.touch_contractor_payables_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contractor_payables_touch_updated_at ON greenhouse_hr.contractor_payables;

CREATE TRIGGER trg_contractor_payables_touch_updated_at
BEFORE UPDATE ON greenhouse_hr.contractor_payables
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.touch_contractor_payables_updated_at();

CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_payables_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending_readiness'     AND NEW.status IN ('ready_for_finance', 'blocked', 'cancelled')) OR
    (OLD.status = 'ready_for_finance'     AND NEW.status IN ('obligation_created', 'blocked', 'cancelled')) OR
    (OLD.status = 'obligation_created'    AND NEW.status IN ('payment_order_created', 'cancelled')) OR
    (OLD.status = 'payment_order_created' AND NEW.status IN ('paid', 'cancelled')) OR
    (OLD.status = 'blocked'               AND NEW.status IN ('pending_readiness', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'contractor_payables: invalid status transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contractor_payables_validate_transition ON greenhouse_hr.contractor_payables;

CREATE TRIGGER trg_contractor_payables_validate_transition
BEFORE UPDATE ON greenhouse_hr.contractor_payables
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_payables_validate_transition();

CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_payable_events_prevent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_payable_events is append-only; UPDATE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE OR REPLACE FUNCTION greenhouse_hr.contractor_payable_events_prevent_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'contractor_payable_events is append-only; DELETE is not allowed'
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_contractor_payable_events_no_update ON greenhouse_hr.contractor_payable_events;
DROP TRIGGER IF EXISTS trg_contractor_payable_events_no_delete ON greenhouse_hr.contractor_payable_events;

CREATE TRIGGER trg_contractor_payable_events_no_update
BEFORE UPDATE ON greenhouse_hr.contractor_payable_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_payable_events_prevent_update();

CREATE TRIGGER trg_contractor_payable_events_no_delete
BEFORE DELETE ON greenhouse_hr.contractor_payable_events
FOR EACH ROW
EXECUTE FUNCTION greenhouse_hr.contractor_payable_events_prevent_delete();

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_payables TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_payables TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_payables TO greenhouse_migrator_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_payable_events TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_payable_events TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.contractor_payable_events TO greenhouse_migrator_user;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_payable_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_payable_public_id TO greenhouse_app;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_hr.seq_contractor_payable_public_id TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_contractor_payables_updated_at() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_contractor_payables_updated_at() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_hr.touch_contractor_payables_updated_at() TO greenhouse_migrator_user;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payables_validate_transition() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payables_validate_transition() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payables_validate_transition() TO greenhouse_migrator_user;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payable_events_prevent_update() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payable_events_prevent_update() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payable_events_prevent_update() TO greenhouse_migrator_user;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payable_events_prevent_delete() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payable_events_prevent_delete() TO greenhouse_app;
GRANT EXECUTE ON FUNCTION greenhouse_hr.contractor_payable_events_prevent_delete() TO greenhouse_migrator_user;

COMMENT ON TABLE greenhouse_hr.contractor_payables IS
  'TASK-793 - HR-side contractor payable. Generated from approved work submissions or governed off-cycle commands; bridged once to greenhouse_finance.payment_obligations(source_kind=contractor_payable).';

COMMENT ON COLUMN greenhouse_hr.contractor_payables.economic_category IS
  'Always labor_cost_external. Contractor payables do not feed dependent payroll.';

COMMENT ON COLUMN greenhouse_hr.contractor_payables.readiness_json IS
  'Fail-closed readiness snapshot used before emitting the Finance obligation bridge.';

DO $$
DECLARE
  has_table              boolean;
  has_events             boolean;
  has_work_submission_fk boolean;
  has_transition         boolean;
  has_source_kind        boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_payables'
  ) INTO has_table;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_hr' AND table_name = 'contractor_payable_events'
  ) INTO has_events;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'greenhouse_hr'
      AND table_name = 'contractor_work_submissions'
      AND constraint_name = 'contractor_work_submissions_consumed_by_payable_fkey'
  ) INTO has_work_submission_fk;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'greenhouse_hr'
      AND p.proname = 'contractor_payables_validate_transition'
  ) INTO has_transition;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'greenhouse_finance'
      AND t.relname = 'payment_obligations'
      AND c.conname = 'payment_obligations_source_kind_check'
      AND pg_get_constraintdef(c.oid) LIKE '%contractor_payable%'
  ) INTO has_source_kind;

  IF NOT has_table THEN
    RAISE EXCEPTION 'TASK-793 forward fix: greenhouse_hr.contractor_payables was NOT created.';
  END IF;
  IF NOT has_events THEN
    RAISE EXCEPTION 'TASK-793 forward fix: greenhouse_hr.contractor_payable_events was NOT created.';
  END IF;
  IF NOT has_work_submission_fk THEN
    RAISE EXCEPTION 'TASK-793 forward fix: contractor_work_submissions consumed_by_payable FK was NOT created.';
  END IF;
  IF NOT has_transition THEN
    RAISE EXCEPTION 'TASK-793 forward fix: transition-validation trigger fn was NOT created.';
  END IF;
  IF NOT has_source_kind THEN
    RAISE EXCEPTION 'TASK-793 forward fix: payment_obligations.source_kind does not include contractor_payable.';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hr.contractor_work_submissions
  DROP CONSTRAINT IF EXISTS contractor_work_submissions_consumed_by_payable_fkey;

ALTER TABLE greenhouse_finance.payment_obligations
  DROP CONSTRAINT IF EXISTS payment_obligations_source_kind_check;

ALTER TABLE greenhouse_finance.payment_obligations
  ADD CONSTRAINT payment_obligations_source_kind_check
  CHECK (source_kind IN (
    'payroll',
    'supplier_invoice',
    'tax_obligation',
    'manual',
    'reliquidation_delta'
  ));

DROP TRIGGER IF EXISTS trg_contractor_payable_events_no_delete ON greenhouse_hr.contractor_payable_events;
DROP TRIGGER IF EXISTS trg_contractor_payable_events_no_update ON greenhouse_hr.contractor_payable_events;
DROP TRIGGER IF EXISTS trg_contractor_payables_validate_transition ON greenhouse_hr.contractor_payables;
DROP TRIGGER IF EXISTS trg_contractor_payables_touch_updated_at ON greenhouse_hr.contractor_payables;

DROP FUNCTION IF EXISTS greenhouse_hr.contractor_payable_events_prevent_delete();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_payable_events_prevent_update();
DROP FUNCTION IF EXISTS greenhouse_hr.contractor_payables_validate_transition();
DROP FUNCTION IF EXISTS greenhouse_hr.touch_contractor_payables_updated_at();

DROP TABLE IF EXISTS greenhouse_hr.contractor_payable_events;
DROP TABLE IF EXISTS greenhouse_hr.contractor_payables;

DROP SEQUENCE IF EXISTS greenhouse_hr.seq_contractor_payable_public_id;
