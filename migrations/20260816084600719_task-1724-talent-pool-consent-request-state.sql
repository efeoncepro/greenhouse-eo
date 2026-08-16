-- Up Migration

-- TASK-1724: a checked future-opportunities opt-in first creates a verification
-- request. Only the token-bound candidate confirmation creates `granted`.
ALTER TABLE greenhouse_hiring.talent_pool_consent_event
  DROP CONSTRAINT IF EXISTS talent_pool_consent_event_action_check;

ALTER TABLE greenhouse_hiring.talent_pool_consent_event
  ADD CONSTRAINT talent_pool_consent_event_action_check
  CHECK (action IN ('requested', 'granted', 'paused', 'resumed', 'withdrawn', 'expired', 'corrected'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'greenhouse_hiring.talent_pool_consent_event'::regclass
       AND conname = 'talent_pool_consent_event_action_check'
       AND pg_get_constraintdef(oid) LIKE '%requested%'
  ) THEN
    RAISE EXCEPTION 'TASK-1724 consent request state is not accepted by the canonical ledger.';
  END IF;
END $$;

-- Down Migration

-- Expand-only by design. Rollback disables self-service/request flags and retains
-- append-only `requested` evidence; contracting the enum would require deleting history.
