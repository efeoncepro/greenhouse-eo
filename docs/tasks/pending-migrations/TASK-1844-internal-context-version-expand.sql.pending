-- TASK-1844 phase 1: deploy with v2 OFF. Keep legacy uniqueness until EVERY writer is compatible.
-- Reintroduce with pnpm migrate:create and a fresh timestamp only after rollout approval.
-- Up Migration
SET search_path = greenhouse_auth, greenhouse_core, public;
ALTER TABLE greenhouse_auth.authorization_contexts
  DROP CONSTRAINT authorization_contexts_context_version_check,
  ADD CONSTRAINT authorization_contexts_context_version_check CHECK (context_version IN (1, 2));

CREATE UNIQUE INDEX authorization_contexts_session_client_version_uidx
  ON greenhouse_auth.authorization_contexts (session_hash, client_id, binding_id, issuer, audience, context_version)
  WHERE revoked_at IS NULL;

CREATE FUNCTION greenhouse_auth.prevent_authorization_context_version_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.context_version IS DISTINCT FROM OLD.context_version THEN
    RAISE EXCEPTION 'authorization_context_version_immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER authorization_context_version_immutable
BEFORE UPDATE OF context_version ON greenhouse_auth.authorization_contexts
FOR EACH ROW EXECUTE FUNCTION greenhouse_auth.prevent_authorization_context_version_change();

-- Refuse a recorded migration unless every object removed by Down really exists.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='greenhouse_auth.authorization_contexts'::regclass
      AND conname='authorization_contexts_context_version_check' AND convalidated)
    OR NOT EXISTS (SELECT 1 FROM pg_index
      WHERE indexrelid=to_regclass('greenhouse_auth.authorization_contexts_session_client_version_uidx')
        AND indisunique AND indisvalid)
    OR to_regprocedure('greenhouse_auth.prevent_authorization_context_version_change()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid='greenhouse_auth.authorization_contexts'::regclass
        AND tgname='authorization_context_version_immutable' AND tgenabled='O'
        AND tgfoid=to_regprocedure('greenhouse_auth.prevent_authorization_context_version_change()'))
  THEN RAISE EXCEPTION 'internal_context_version_expand_incomplete'; END IF;
END $$;

-- Down Migration
-- Operational rollback retains schema and audit. An intentional schema reversal must have no v2 history.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_auth.authorization_contexts WHERE context_version = 2) THEN
    RAISE EXCEPTION 'retain_v2_context_history';
  END IF;
END $$;
DROP TRIGGER authorization_context_version_immutable ON greenhouse_auth.authorization_contexts;
DROP FUNCTION greenhouse_auth.prevent_authorization_context_version_change();
DROP INDEX greenhouse_auth.authorization_contexts_session_client_version_uidx;
ALTER TABLE greenhouse_auth.authorization_contexts
  DROP CONSTRAINT authorization_contexts_context_version_check,
  ADD CONSTRAINT authorization_contexts_context_version_check CHECK (context_version = 1);
