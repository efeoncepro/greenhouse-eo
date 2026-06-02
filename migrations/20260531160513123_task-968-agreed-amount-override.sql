-- Up Migration
--
-- TASK-968 Slice 3 — Agreed-amount guardrail override.
--
-- Additive: a governed override that lets Finance push a payable whose gross
-- EXCEEDS the engagement's HR-set agreed amount past the `payment_exceeds_agreed_amount`
-- readiness gate. Mirrors the `payment_profile_waiver_reason` waiver pattern (TASK-793):
-- the reason lives on the payable; the actor + timestamp live in the append-only
-- `contractor_payable_events` audit. Maker-checker is enforced at the capability layer
-- (`finance.contractor_payable.override_agreed_amount`, admin-only) — distinct from the
-- HR capability that SETS the amount (SoD: HR fija ≠ Finance paga).

ALTER TABLE greenhouse_hr.contractor_payables
  ADD COLUMN IF NOT EXISTS agreed_amount_override_reason TEXT NULL;

-- Anti pre-up-marker guard: abort if the column was not actually created.
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_hr'
      AND table_name = 'contractor_payables'
      AND column_name = 'agreed_amount_override_reason'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-968 anti pre-up-marker: agreed_amount_override_reason was NOT created on greenhouse_hr.contractor_payables';
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_hr.contractor_payables
  DROP COLUMN IF EXISTS agreed_amount_override_reason;
