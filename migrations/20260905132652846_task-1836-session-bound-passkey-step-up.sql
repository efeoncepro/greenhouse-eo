-- Up Migration
-- TASK-1836 D5: a UV ceremony elevates an existing session, never creates corporate provenance.
ALTER TABLE greenhouse_auth.passkey_challenges ADD COLUMN IF NOT EXISTS session_hash text;
ALTER TABLE greenhouse_auth.passkey_challenges DROP CONSTRAINT IF EXISTS passkey_challenges_purpose_check;
ALTER TABLE greenhouse_auth.passkey_challenges ADD CONSTRAINT passkey_challenges_purpose_check CHECK(purpose IN ('registration','authentication','step_up'));
ALTER TABLE greenhouse_auth.passkey_challenges DROP CONSTRAINT IF EXISTS passkey_challenges_step_up_session_check;
ALTER TABLE greenhouse_auth.passkey_challenges ADD CONSTRAINT passkey_challenges_step_up_session_check CHECK(
 (purpose='step_up' AND subject IS NOT NULL AND session_hash IS NOT NULL AND session_hash ~ '^[0-9a-f]{64}$')
 OR (purpose<>'step_up' AND session_hash IS NULL)
);
COMMENT ON COLUMN greenhouse_auth.passkey_challenges.session_hash IS 'TASK-1836: opaque session hash for step_up only; same live session checked atomically at finish. No bearer token. Ephemeral challenge retention is independent of sessions.';

-- Down Migration
-- Retain additive provenance field and consumed challenge evidence. Roll back by disabling new routes.
