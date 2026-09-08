-- TASK-1844 phase 2: execute ONLY after all writers use version-aware ON CONFLICT DO NOTHING.
-- Applied 2026-09-08 after verified phase-1 rollout; retain this timestamp and do not recreate it.
-- Up Migration
SET search_path = greenhouse_auth, greenhouse_core, public;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index
    WHERE indexrelid=to_regclass('greenhouse_auth.authorization_contexts_session_client_version_uidx')
      AND indisunique AND indisvalid)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid='greenhouse_auth.authorization_contexts'::regclass
        AND tgname='authorization_context_version_immutable' AND tgenabled='O')
  THEN RAISE EXCEPTION 'internal_context_version_expand_required'; END IF;
END $$;
DROP INDEX greenhouse_auth.authorization_contexts_session_client_uidx;
DO $$ BEGIN
  IF to_regclass('greenhouse_auth.authorization_contexts_session_client_uidx') IS NOT NULL
    OR to_regclass('greenhouse_auth.authorization_contexts_session_client_version_uidx') IS NULL
  THEN RAISE EXCEPTION 'internal_context_version_contract_incomplete'; END IF;
END $$;

-- Down Migration
-- Roll back flags/code to a COMPATIBLE writer; never collapse context/consent history.
DO $$ BEGIN
  RAISE EXCEPTION 'contract_rollback_requires_compatible_writer_keep_versioned_index';
END $$;
