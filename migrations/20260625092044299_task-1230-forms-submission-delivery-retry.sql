-- Up Migration

-- TASK-1230 — Retry scheduling de la entrega async del motor Growth Forms.
-- Additive: delivery_attempts (contador) + next_attempt_at (backoff+jitter) en
-- form_submission. El dispatcher reintenta solo submissions cuyo next_attempt_at
-- venció; tras N intentos retryables → dead_letter. At-most-once: nunca re-entrega
-- una submission 'delivered' (HubSpot secure-submit NO es idempotente).
ALTER TABLE greenhouse_growth.form_submission
  ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE greenhouse_growth.form_submission
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS form_submission_next_attempt_idx
  ON greenhouse_growth.form_submission (next_attempt_at)
  WHERE status IN ('accepted', 'retrying');

-- Anti pre-up-marker bug guard (ISSUE-068).
DO $$
DECLARE col_count integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'greenhouse_growth'
    AND table_name = 'form_submission'
    AND column_name IN ('delivery_attempts', 'next_attempt_at');

  IF col_count <> 2 THEN
    RAISE EXCEPTION 'TASK-1230 anti pre-up-marker: form_submission delivery retry cols NOT created (count=%). Markers may be inverted.', col_count;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_growth.form_submission_next_attempt_idx;
ALTER TABLE greenhouse_growth.form_submission DROP COLUMN IF EXISTS next_attempt_at;
ALTER TABLE greenhouse_growth.form_submission DROP COLUMN IF EXISTS delivery_attempts;
