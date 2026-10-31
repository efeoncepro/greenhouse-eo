-- Up Migration
SET search_path = greenhouse_auth, greenhouse_core, public;
-- TASK-2067: ephemeral issuer challenges and aggregate abuse budgets. No raw codes/email/URLs/proofs.
CREATE TABLE greenhouse_auth.email_otp_challenges (
  state_key text PRIMARY KEY CHECK (state_key ~ '^[0-9a-f]{64}$'),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) = 'object'
    AND value ?& ARRAY['binding', 'challengeId', 'requestIdHash', 'codeMac', 'recipientHash', 'createdAt', 'expiresAt', 'status']
    AND value->>'status' IN ('pending_delivery', 'ready', 'failed', 'consumed')
    AND value->>'codeMac' ~ '^[0-9a-f]{64}$'
    AND NOT value ?| ARRAY['code', 'email', 'invitationUrl', 'proof']),
  expires_at timestamptz NOT NULL
);
CREATE INDEX email_otp_challenges_expiry ON greenhouse_auth.email_otp_challenges (expires_at);
CREATE TABLE greenhouse_auth.email_otp_budgets (
  state_key text PRIMARY KEY CHECK (state_key ~ '^[0-9a-f]{64}$'),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) = 'object'
    AND value ?& ARRAY['startedAt', 'count', 'expiresAt'] AND (value->>'count')::integer >= 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX email_otp_budgets_expiry ON greenhouse_auth.email_otp_budgets (expires_at);
ALTER TABLE greenhouse_auth.email_otp_challenges OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_auth.email_otp_budgets OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_auth.email_otp_challenges, greenhouse_auth.email_otp_budgets TO greenhouse_runtime, greenhouse_app;
COMMENT ON TABLE greenhouse_auth.email_otp_challenges IS 'TASK-2067 issuer invitation OTP state; HMAC only, no raw code/email/link/proof';
COMMENT ON TABLE greenhouse_auth.email_otp_budgets IS 'TASK-2067 aggregate budgets survive resend and invitation version changes';

INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled, paused_reason)
VALUES ('auth_server_rooms_invitation_otp', FALSE, 'TASK-2067 rollout and canary pending')
ON CONFLICT (email_type) DO NOTHING;

-- Bounded maintenance primitive; runtime has no direct DELETE. Existing GC operator invokes explicitly.
CREATE FUNCTION greenhouse_auth.gc_invitation_email_otp(batch_size integer DEFAULT 500, dry_run boolean DEFAULT TRUE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,greenhouse_auth AS $$
DECLARE challenge_count integer; budget_count integer; cutoff timestamptz := now()-interval '30 days';
BEGIN
  IF batch_size IS NULL OR dry_run IS NULL OR batch_size < 1 OR batch_size > 500 THEN
    RAISE EXCEPTION 'invitation_email_otp_gc_invalid_batch';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('greenhouse_auth.gc_invitation_email_otp'));
  SELECT count(*) INTO challenge_count FROM
    (SELECT state_key FROM greenhouse_auth.email_otp_challenges WHERE expires_at < cutoff LIMIT batch_size) t;
  SELECT count(*) INTO budget_count FROM
    (SELECT state_key FROM greenhouse_auth.email_otp_budgets WHERE expires_at < cutoff LIMIT batch_size) t;
  IF NOT dry_run THEN
    DELETE FROM greenhouse_auth.email_otp_challenges WHERE state_key IN
      (SELECT state_key FROM greenhouse_auth.email_otp_challenges WHERE expires_at < cutoff ORDER BY expires_at LIMIT batch_size);
    DELETE FROM greenhouse_auth.email_otp_budgets WHERE state_key IN
      (SELECT state_key FROM greenhouse_auth.email_otp_budgets WHERE expires_at < cutoff ORDER BY expires_at LIMIT batch_size);
  END IF;
  RETURN jsonb_build_object('dryRun',dry_run,'challenges',challenge_count,'budgets',budget_count);
END $$;
ALTER FUNCTION greenhouse_auth.gc_invitation_email_otp(integer,boolean) OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_auth.gc_invitation_email_otp(integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION greenhouse_auth.gc_invitation_email_otp(integer,boolean) TO greenhouse_runtime,greenhouse_app;

-- Guard against an inverted/misplaced migration marker.
DO $$
BEGIN
  IF to_regclass('greenhouse_auth.email_otp_challenges') IS NULL
    OR to_regclass('greenhouse_auth.email_otp_budgets') IS NULL
    OR to_regprocedure('greenhouse_auth.gc_invitation_email_otp(integer,boolean)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM greenhouse_notifications.email_type_config WHERE email_type='auth_server_rooms_invitation_otp')
  THEN RAISE EXCEPTION 'TASK-2067 up verification failed'; END IF;
END $$;

-- Down Migration
SET search_path = greenhouse_auth, greenhouse_core, public;
DROP FUNCTION greenhouse_auth.gc_invitation_email_otp(integer,boolean);
UPDATE greenhouse_notifications.email_type_config SET enabled = FALSE,
  paused_reason = 'TASK-2067 rollback' WHERE email_type = 'auth_server_rooms_invitation_otp';
DROP TABLE greenhouse_auth.email_otp_budgets;
DROP TABLE greenhouse_auth.email_otp_challenges;

DO $$
BEGIN
  IF to_regclass('greenhouse_auth.email_otp_challenges') IS NOT NULL
    OR to_regclass('greenhouse_auth.email_otp_budgets') IS NOT NULL
    OR to_regprocedure('greenhouse_auth.gc_invitation_email_otp(integer,boolean)') IS NOT NULL
    OR EXISTS (SELECT 1 FROM greenhouse_notifications.email_type_config WHERE email_type='auth_server_rooms_invitation_otp' AND enabled)
  THEN RAISE EXCEPTION 'TASK-2067 down verification failed'; END IF;
END $$;
