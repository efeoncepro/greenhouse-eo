-- Up Migration
-- TASK-1836: bounded ephemeral-state maintenance. This function is the only cleanup authority.
-- No runtime DELETE grant is added. Audit/attempts/authenticators/client registry are untouched.
CREATE OR REPLACE FUNCTION greenhouse_auth.gc_ephemeral_state(
 p_batch_size integer DEFAULT 500, p_retention_days integer DEFAULT 30, p_dry_run boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
SET lock_timeout = '2s'
SET statement_timeout = '15s'
AS $gc$
DECLARE
 v_cutoff timestamptz;
 v_count integer;
 v_counts jsonb := '{}'::jsonb;
 v_locked boolean;
BEGIN
 IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 500 THEN RAISE EXCEPTION 'auth_gc_invalid_batch'; END IF;
 IF p_retention_days IS NULL OR p_retention_days < 30 OR p_retention_days > 3650 THEN RAISE EXCEPTION 'auth_gc_invalid_retention'; END IF;
 IF p_dry_run IS NULL THEN RAISE EXCEPTION 'auth_gc_invalid_mode'; END IF;
 v_cutoff := CURRENT_TIMESTAMP - make_interval(days => p_retention_days);
 v_locked := pg_try_advisory_xact_lock(hashtext('greenhouse_auth.ephemeral_gc.v1'));
 IF NOT v_locked THEN
  RETURN jsonb_build_object('dryRun',p_dry_run,'locked',false,'cutoff',v_cutoff,'batchSize',p_batch_size,'counts',v_counts);
 END IF;

 -- passkey_challenges: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.challenge_hash FROM greenhouse_auth.passkey_challenges t WHERE t.expires_at < v_cutoff
  ORDER BY t.challenge_hash LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.passkey_challenges target USING candidates c
  WHERE NOT p_dry_run AND target.challenge_hash=c.challenge_hash RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('passkey_challenges',v_count);

 -- magic_link_tokens: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.token_id FROM greenhouse_auth.magic_link_tokens t WHERE t.expires_at < v_cutoff
  ORDER BY t.token_id LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.magic_link_tokens target USING candidates c
  WHERE NOT p_dry_run AND target.token_id=c.token_id RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('magic_link_tokens',v_count);

 -- auth_rate_limits: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.bucket_key FROM greenhouse_auth.auth_rate_limits t WHERE t.updated_at < v_cutoff AND (t.locked_until IS NULL OR t.locked_until < v_cutoff)
  ORDER BY t.bucket_key LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.auth_rate_limits target USING candidates c
  WHERE NOT p_dry_run AND target.bucket_key=c.bucket_key RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('auth_rate_limits',v_count);

 -- internal_login_transactions: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.transaction_id FROM greenhouse_auth.internal_login_transactions t WHERE t.expires_at < v_cutoff
  ORDER BY t.transaction_id LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.internal_login_transactions target USING candidates c
  WHERE NOT p_dry_run AND target.transaction_id=c.transaction_id RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('internal_login_transactions',v_count);

 -- authorization_codes: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.code_hash FROM greenhouse_auth.authorization_codes t WHERE t.expires_at < v_cutoff AND NOT EXISTS (
   SELECT 1 FROM greenhouse_auth.refresh_tokens r WHERE r.grant_id=t.grant_id
    AND (r.expires_at >= v_cutoff OR r.absolute_expires_at >= v_cutoff))
  ORDER BY t.code_hash LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.authorization_codes target USING candidates c
  WHERE NOT p_dry_run AND target.code_hash=c.code_hash RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('authorization_codes',v_count);

 -- access_tokens: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.jti FROM greenhouse_auth.access_tokens t WHERE t.expires_at < v_cutoff
  ORDER BY t.jti LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.access_tokens target USING candidates c
  WHERE NOT p_dry_run AND target.jti=c.jti RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('access_tokens',v_count);

 -- refresh_tokens: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.token_hash FROM greenhouse_auth.refresh_tokens t WHERE t.expires_at < v_cutoff AND t.absolute_expires_at < v_cutoff
 AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.refresh_tokens r WHERE r.grant_id=t.grant_id
   AND (r.expires_at >= v_cutoff OR r.absolute_expires_at >= v_cutoff))
 AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.authorization_codes c WHERE c.grant_id=t.grant_id AND c.expires_at >= v_cutoff)
 AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.access_tokens a WHERE a.grant_id=t.grant_id AND a.expires_at >= v_cutoff)
  ORDER BY t.token_hash LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.refresh_tokens target USING candidates c
  WHERE NOT p_dry_run AND target.token_hash=c.token_hash RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('refresh_tokens',v_count);

 -- client_consents: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.consent_id FROM greenhouse_auth.client_consents t WHERE t.granted_at < v_cutoff AND (t.revoked_at IS NULL OR t.revoked_at < v_cutoff) AND t.authorization_context_id IS NOT NULL AND EXISTS (
 SELECT 1 FROM greenhouse_auth.authorization_contexts c WHERE c.context_id=t.authorization_context_id
 AND c.expires_at < v_cutoff AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.authorization_codes ac WHERE ac.authorization_context_id=c.context_id) AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.access_tokens at WHERE at.authorization_context_id=c.context_id) AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.refresh_tokens rt WHERE rt.authorization_context_id=c.context_id))
  ORDER BY t.consent_id LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.client_consents target USING candidates c
  WHERE NOT p_dry_run AND target.consent_id=c.consent_id RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('client_consents',v_count);

 -- authorization_contexts: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.context_id FROM greenhouse_auth.authorization_contexts t WHERE t.expires_at < v_cutoff AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.authorization_codes ac WHERE ac.authorization_context_id=t.context_id) AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.access_tokens at WHERE at.authorization_context_id=t.context_id) AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.refresh_tokens rt WHERE rt.authorization_context_id=t.context_id)
 AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.client_consents cc WHERE cc.authorization_context_id=t.context_id)
  ORDER BY t.context_id LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.authorization_contexts target USING candidates c
  WHERE NOT p_dry_run AND target.context_id=c.context_id RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('authorization_contexts',v_count);

 -- corporate_session_evidence: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.session_hash FROM greenhouse_auth.corporate_session_evidence t WHERE NOT EXISTS (
 SELECT 1 FROM greenhouse_auth.authorization_contexts c WHERE c.session_hash=t.session_hash)
 AND EXISTS(SELECT 1 FROM greenhouse_auth.sessions s WHERE s.session_hash=t.session_hash AND s.absolute_expires_at < v_cutoff)
  ORDER BY t.session_hash LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.corporate_session_evidence target USING candidates c
  WHERE NOT p_dry_run AND target.session_hash=c.session_hash RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('corporate_session_evidence',v_count);

 -- sessions: at most p_batch_size rows, chosen and locked in this transaction.
 WITH candidates AS MATERIALIZED (
  SELECT t.session_hash FROM greenhouse_auth.sessions t WHERE t.absolute_expires_at < v_cutoff
 AND NOT EXISTS(SELECT 1 FROM greenhouse_auth.corporate_session_evidence e WHERE e.session_hash=t.session_hash)
  ORDER BY t.session_hash LIMIT p_batch_size FOR UPDATE OF t
 ), removed AS (
  DELETE FROM greenhouse_auth.sessions target USING candidates c
  WHERE NOT p_dry_run AND target.session_hash=c.session_hash RETURNING 1
 ) SELECT CASE WHEN p_dry_run THEN (SELECT COUNT(*) FROM candidates) ELSE (SELECT COUNT(*) FROM removed) END INTO v_count;
 v_counts := v_counts || jsonb_build_object('sessions',v_count);

 RETURN jsonb_build_object('dryRun',p_dry_run,'locked',true,'cutoff',v_cutoff,'batchSize',p_batch_size,'counts',v_counts);
END;
$gc$;
ALTER FUNCTION greenhouse_auth.gc_ephemeral_state(integer,integer,boolean) OWNER TO greenhouse_ops;
REVOKE ALL ON FUNCTION greenhouse_auth.gc_ephemeral_state(integer,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION greenhouse_auth.gc_ephemeral_state(integer,integer,boolean) TO greenhouse_app, greenhouse_runtime, greenhouse_migrator_user;
COMMENT ON FUNCTION greenhouse_auth.gc_ephemeral_state(integer,integer,boolean) IS
 'TASK-1836: bounded cleanup of expired ephemeral auth state; default dry-run; min retention 30 days; max 500 per table; preserves live refresh families and audit.';

-- Down Migration
REVOKE EXECUTE ON FUNCTION greenhouse_auth.gc_ephemeral_state(integer,integer,boolean) FROM greenhouse_app, greenhouse_runtime, greenhouse_migrator_user;
DROP FUNCTION greenhouse_auth.gc_ephemeral_state(integer,integer,boolean);
