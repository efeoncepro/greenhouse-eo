-- Authorized by Julio 2026-10-18: additive schema repair only; no deploy/GTM publication/replay.
-- Compatible shared ops-worker already serves 9a8f1e1bf063762fb60ef8c3a527b48c3f48de21.
-- See docs/audits/releases/2026-10-18-candidate-89d70ec13-review.md.
-- Up Migration
SET search_path = greenhouse_growth, greenhouse_core, public;

-- Native evidence is independent of external_id (historically a local hsforms-fsub-* label).
ALTER TABLE greenhouse_growth.form_destination_attempt
  ADD COLUMN IF NOT EXISTS provider_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_receipt_json JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='form_attempt_provider_receipt_object_ck'
    AND conrelid='greenhouse_growth.form_destination_attempt'::regclass) THEN
    ALTER TABLE greenhouse_growth.form_destination_attempt ADD CONSTRAINT form_attempt_provider_receipt_object_ck
      CHECK (jsonb_typeof(provider_receipt_json)='object');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='form_attempt_native_submission_ck'
    AND conrelid='greenhouse_growth.form_destination_attempt'::regclass) THEN
    ALTER TABLE greenhouse_growth.form_destination_attempt ADD CONSTRAINT form_attempt_native_submission_ck CHECK (
      ((provider_receipt_json->>'contract'='hubspot-form-receipt.v1'
        AND provider_receipt_json->>'status'='verified') IS TRUE) = (provider_submission_id IS NOT NULL)
      AND (provider_submission_id IS NULL OR (
        provider='hubspot' AND status='succeeded'
        AND (provider_submission_id ~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
          OR provider_submission_id ~ '^[0-9]{1,40}$')
        AND provider_receipt_json->>'contract'='hubspot-form-receipt.v1'
        AND provider_receipt_json->>'status'='verified'
        AND provider_receipt_json->>'markerValue'=submission_id
        AND provider_receipt_json->>'portalId'='48713323'
        AND provider_receipt_json->>'markerProperty'='ef_greenhouse_submission_id'
        AND provider_receipt_json->>'paginationComplete'='true'
      ) IS TRUE)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS form_attempt_hubspot_receipt_pending_idx
  ON greenhouse_growth.form_destination_attempt (created_at,attempt_id)
  WHERE provider='hubspot' AND status='succeeded' AND provider_submission_id IS NULL
    AND provider_receipt_json->>'status'='pending';

CREATE OR REPLACE FUNCTION greenhouse_growth.guard_hubspot_form_receipt_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.provider_receipt_json->>'contract'='hubspot-form-receipt.v1' THEN
    IF OLD.provider_receipt_json->>'status'<>'pending' AND
      (NEW.provider_receipt_json IS DISTINCT FROM OLD.provider_receipt_json OR
       NEW.provider_submission_id IS DISTINCT FROM OLD.provider_submission_id) THEN
      RAISE EXCEPTION 'hubspot_form_receipt_terminal_immutable';
    END IF;
    IF (NEW.provider_receipt_json->>'contract',NEW.provider_receipt_json->>'portalId',
        NEW.provider_receipt_json->>'formGuid',NEW.provider_receipt_json->>'markerProperty',
        NEW.provider_receipt_json->>'markerValue') IS DISTINCT FROM
       (OLD.provider_receipt_json->>'contract',OLD.provider_receipt_json->>'portalId',
        OLD.provider_receipt_json->>'formGuid',OLD.provider_receipt_json->>'markerProperty',
        OLD.provider_receipt_json->>'markerValue') THEN
      RAISE EXCEPTION 'hubspot_form_receipt_identity_immutable';
    END IF;
  END IF;
  IF OLD.provider_submission_id IS NOT NULL AND NEW.provider_submission_id IS DISTINCT FROM OLD.provider_submission_id THEN
    RAISE EXCEPTION 'hubspot_native_submission_immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hubspot_form_receipt_update ON greenhouse_growth.form_destination_attempt;
CREATE TRIGGER trg_hubspot_form_receipt_update BEFORE UPDATE ON greenhouse_growth.form_destination_attempt
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.guard_hubspot_form_receipt_update();

-- Anti pre-up-marker: every new column, constraint, index, function and trigger must exist.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='greenhouse_growth'
      AND table_name='form_destination_attempt' AND column_name='provider_submission_id' AND data_type='text')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='greenhouse_growth'
      AND table_name='form_destination_attempt' AND column_name='provider_receipt_json' AND data_type='jsonb' AND is_nullable='NO'
      AND column_default='''{}''::jsonb')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='form_attempt_provider_receipt_object_ck'
      AND conrelid='greenhouse_growth.form_destination_attempt'::regclass)
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='form_attempt_native_submission_ck'
      AND conrelid='greenhouse_growth.form_destination_attempt'::regclass)
    OR to_regclass('greenhouse_growth.form_attempt_hubspot_receipt_pending_idx') IS NULL
    OR to_regprocedure('greenhouse_growth.guard_hubspot_form_receipt_update()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_hubspot_form_receipt_update'
      AND tgrelid='greenhouse_growth.form_destination_attempt'::regclass AND NOT tgisinternal)
  THEN RAISE EXCEPTION 'Incomplete HubSpot native form receipt migration'; END IF;
END $$;

-- Down Migration
DO $$ BEGIN RAISE EXCEPTION 'Forward-only: preserve native HubSpot receipts; disable reconciliation with compatible runtime'; END $$;
