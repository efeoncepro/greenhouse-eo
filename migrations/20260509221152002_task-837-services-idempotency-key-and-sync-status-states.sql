-- Up Migration

-- TASK-837 Slice 0.5c — Sample Sprint outbound projection infra
-- Adds idempotency_key column for HubSpot p_services outbound projection (Slice 4)
-- Extends hubspot_sync_status CHECK with 5 outbound state machine values
--   (outbound_pending | outbound_in_progress | ready | partial_associations | outbound_dead_letter)
-- preserving the 3 inbound values from TASK-813/836 (pending | synced | unmapped).

-- 1. idempotency_key column + UNIQUE INDEX partial WHERE NOT NULL
ALTER TABLE greenhouse_core.services
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS services_idempotency_key_unique
  ON greenhouse_core.services (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Extend hubspot_sync_status CHECK constraint with 5 outbound state machine values
--    Original (TASK-813/836): NULL | 'pending' | 'synced' | 'unmapped'
--    New (TASK-837): adds 'outbound_pending' | 'outbound_in_progress' | 'ready' |
--                         'partial_associations' | 'outbound_dead_letter'
ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_hubspot_sync_status_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_hubspot_sync_status_check
  CHECK (
    hubspot_sync_status IS NULL
    OR hubspot_sync_status = ANY (ARRAY[
      'pending',
      'synced',
      'unmapped',
      'outbound_pending',
      'outbound_in_progress',
      'ready',
      'partial_associations',
      'outbound_dead_letter'
    ]::text[])
  );

-- 3. Anti pre-up-marker bug guard (TASK-768/838 pattern): aborts if DDL didn't apply.
DO $$
DECLARE
  col_exists boolean;
  idx_exists boolean;
  check_def text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'services'
      AND column_name = 'idempotency_key'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-837 anti pre-up-marker check: services.idempotency_key was NOT created. Migration markers may be inverted.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_core'
      AND tablename = 'services'
      AND indexname = 'services_idempotency_key_unique'
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    RAISE EXCEPTION 'TASK-837 anti pre-up-marker check: services_idempotency_key_unique partial UNIQUE INDEX was NOT created.';
  END IF;

  SELECT pg_get_constraintdef(oid)
    INTO check_def
    FROM pg_constraint
    WHERE conrelid = 'greenhouse_core.services'::regclass
      AND conname = 'services_hubspot_sync_status_check';

  IF check_def IS NULL OR position('outbound_pending' in check_def) = 0 THEN
    RAISE EXCEPTION 'TASK-837 anti pre-up-marker check: services_hubspot_sync_status_check was NOT extended with outbound state machine values. Got: %', check_def;
  END IF;
END
$$;

-- 4. Grants (preserve runtime DML on new column; ownership remains with greenhouse_ops).
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.services TO greenhouse_runtime;

-- Down Migration

-- Revert CHECK constraint to original 3 inbound values (TASK-813/836).
ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_hubspot_sync_status_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_hubspot_sync_status_check
  CHECK (
    hubspot_sync_status IS NULL
    OR hubspot_sync_status = ANY (ARRAY['pending', 'synced', 'unmapped']::text[])
  );

-- Drop UNIQUE INDEX + idempotency_key column.
-- NOTE: assumes no rows have idempotency_key populated yet. If rollback is needed
-- post-Slice 3 with rows already populated, those rows must be cleared first
-- (or the down migration adapted to UPDATE ... SET idempotency_key = NULL).
DROP INDEX IF EXISTS greenhouse_core.services_idempotency_key_unique;
ALTER TABLE greenhouse_core.services DROP COLUMN IF EXISTS idempotency_key;
