-- Up Migration
-- Identity Profile Merge Support
-- Adds merge tracking column, audit log table, and backfill data fix.

-- ── 1. Merge tracking column ─────────────────────────────────────────
ALTER TABLE greenhouse_core.identity_profiles
  ADD COLUMN IF NOT EXISTS merged_into_profile_id TEXT
    REFERENCES greenhouse_core.identity_profiles(profile_id);

CREATE INDEX IF NOT EXISTS identity_profiles_merged_into_idx
  ON greenhouse_core.identity_profiles (merged_into_profile_id)
  WHERE merged_into_profile_id IS NOT NULL;

-- ── 2. Merge audit log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS greenhouse_sync.identity_profile_merge_log (
  merge_id                TEXT PRIMARY KEY,
  source_profile_id       TEXT NOT NULL,
  target_profile_id       TEXT NOT NULL
                            REFERENCES greenhouse_core.identity_profiles(profile_id),
  merged_by               TEXT NOT NULL,
  merge_reason            TEXT,
  source_links_moved      INT NOT NULL DEFAULT 0,
  client_users_moved      INT NOT NULL DEFAULT 0,
  members_moved           INT NOT NULL DEFAULT 0,
  memberships_moved       INT NOT NULL DEFAULT 0,
  memberships_deduped     INT NOT NULL DEFAULT 0,
  contacts_moved          INT NOT NULL DEFAULT 0,
  source_profile_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT ON greenhouse_sync.identity_profile_merge_log TO greenhouse_app;
GRANT SELECT ON greenhouse_sync.identity_profile_merge_log TO greenhouse_runtime;

-- ── 3. Data fix: merge orphan HubSpot profile into canonical Julio Reyes ──
DO $$
DECLARE
  v_source CONSTANT TEXT := 'identity-hubspot-crm-owner-75788512';
  v_target CONSTANT TEXT := 'identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes';
  v_source_exists BOOLEAN;
  v_target_exists BOOLEAN;
  v_already_merged BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM greenhouse_core.identity_profiles WHERE profile_id = v_source
  ) INTO v_source_exists;

  SELECT EXISTS(
    SELECT 1 FROM greenhouse_core.identity_profiles
    WHERE profile_id = v_target AND active = TRUE
  ) INTO v_target_exists;

  SELECT EXISTS(
    SELECT 1 FROM greenhouse_core.identity_profiles
    WHERE profile_id = v_source AND status = 'merged'
  ) INTO v_already_merged;

  IF NOT v_source_exists OR NOT v_target_exists OR v_already_merged THEN
    RAISE NOTICE 'Skipping merge: source_exists=%, target_exists=%, already_merged=%',
      v_source_exists, v_target_exists, v_already_merged;
    RETURN;
  END IF;

  -- 3a. Deactivate conflicting source links (same source already on target)
  UPDATE greenhouse_core.identity_profile_source_links
  SET active = FALSE, updated_at = NOW()
  WHERE profile_id = v_source
    AND (source_system, source_object_type, source_object_id) IN (
      SELECT source_system, source_object_type, source_object_id
      FROM greenhouse_core.identity_profile_source_links
      WHERE profile_id = v_target
    );

  -- 3b. Reparent remaining source links
  UPDATE greenhouse_core.identity_profile_source_links
  SET profile_id = v_target, updated_at = NOW()
  WHERE profile_id = v_source AND active = TRUE;

  -- 3c. Reparent client_users
  UPDATE greenhouse_core.client_users
  SET identity_profile_id = v_target, updated_at = NOW()
  WHERE identity_profile_id = v_source;

  -- 3d. Reparent members
  UPDATE greenhouse_core.members
  SET identity_profile_id = v_target, updated_at = NOW()
  WHERE identity_profile_id = v_source;

  -- 3e. Reparent person_memberships
  UPDATE greenhouse_core.person_memberships
  SET profile_id = v_target, updated_at = NOW()
  WHERE profile_id = v_source;

  -- 3f. Deduplicate memberships to same org after reparent
  WITH ranked AS (
    SELECT membership_id,
           ROW_NUMBER() OVER (
             PARTITION BY profile_id, organization_id
             ORDER BY is_primary DESC, start_date ASC NULLS LAST, created_at ASC
           ) AS rn
    FROM greenhouse_core.person_memberships
    WHERE profile_id = v_target
      AND active = TRUE
      AND organization_id IS NOT NULL
  )
  UPDATE greenhouse_core.person_memberships
  SET active = FALSE, status = 'deduped_merge', updated_at = NOW()
  WHERE membership_id IN (SELECT membership_id FROM ranked WHERE rn > 1);

  -- 3g. Reparent CRM contacts
  UPDATE greenhouse_crm.contacts
  SET linked_identity_profile_id = v_target, updated_at = NOW()
  WHERE linked_identity_profile_id = v_source;

  -- 3h. Reparent shareholder accounts
  UPDATE greenhouse_finance.shareholder_accounts
  SET profile_id = v_target, updated_at = NOW()
  WHERE profile_id = v_source;

  -- 3i. Mark source as merged
  UPDATE greenhouse_core.identity_profiles
  SET status = 'merged',
      active = FALSE,
      merged_into_profile_id = v_target,
      updated_at = NOW()
  WHERE profile_id = v_source;

  -- 3j. Audit log
  INSERT INTO greenhouse_sync.identity_profile_merge_log (
    merge_id, source_profile_id, target_profile_id, merged_by, merge_reason
  ) VALUES (
    'merge-migration-julio-reyes-' || to_char(NOW(), 'YYYYMMDD'),
    v_source, v_target, 'migration', 'Orphan HubSpot CRM owner profile merged into canonical profile'
  );

  RAISE NOTICE 'Merged profile % into %', v_source, v_target;
END $$;


-- Down Migration
DROP TABLE IF EXISTS greenhouse_sync.identity_profile_merge_log;

ALTER TABLE greenhouse_core.identity_profiles
  DROP COLUMN IF EXISTS merged_into_profile_id;
