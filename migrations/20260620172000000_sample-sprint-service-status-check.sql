-- Up Migration

-- Sample Sprints are declared as greenhouse_core.services rows with
-- status='pending_approval'. TASK-836 added services_status_check after the
-- engagement architecture was written, but did not include that lifecycle
-- state, causing declareSampleSprint() to fail at INSERT time.

ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN (
    'pending_approval',
    'active',
    'closed',
    'paused',
    'legacy_seed_archived'
  ));

DO $$
DECLARE
  check_def text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO check_def
    FROM pg_constraint
    WHERE conrelid = 'greenhouse_core.services'::regclass
      AND conname = 'services_status_check';

  IF check_def IS NULL OR position('pending_approval' in check_def) = 0 THEN
    RAISE EXCEPTION 'Sample Sprint status check drift: services_status_check does not admit pending_approval. Got: %', check_def;
  END IF;
END
$$;

-- Down Migration

ALTER TABLE greenhouse_core.services
  DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_status_check
  CHECK (status IN (
    'active',
    'closed',
    'paused',
    'legacy_seed_archived'
  ));
