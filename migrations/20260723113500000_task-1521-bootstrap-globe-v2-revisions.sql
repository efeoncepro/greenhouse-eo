-- Up Migration

-- TASK-1521 — Establish the monotonic cutover from the two historical V1
-- tenancy projections to Greenhouse-owned renewable V2 snapshots.
--
-- The revision cutoffs below were read from Globe's live, append-only V1
-- projections immediately before this migration. Advancing from these exact
-- values lets the next semantic V2 snapshot use cutoff + 1 without accepting a
-- revision rollback or rewriting Globe history.

DO $$
DECLARE
  pristine_cursor_count INTEGER;
  updated_cursor_count INTEGER;
BEGIN
  LOCK TABLE greenhouse_sync.globe_tenancy_reconciliation_state
    IN SHARE ROW EXCLUSIVE MODE;

  SELECT COUNT(*)
    INTO pristine_cursor_count
    FROM greenhouse_sync.globe_tenancy_reconciliation_state
   WHERE workspace_id IN ('efeonce-internal', 'greenhouse-org:efeonce')
     AND broker_binding_id = workspace_id
     AND workspace_revision = 0
     AND workspace_fingerprint IS NULL
     AND member_revisions = '{}'::jsonb
     AND lease_token IS NULL
     AND lease_expires_at IS NULL
     AND last_reconciliation_id IS NULL
     AND last_reconciled_at IS NULL
     AND last_error_code = 'conflict';

  IF pristine_cursor_count <> 2 THEN
    RAISE EXCEPTION
      'TASK-1521: expected two pristine V1-to-V2 reconciliation cursors, got %.',
      pristine_cursor_count;
  END IF;

  UPDATE greenhouse_sync.globe_tenancy_reconciliation_state
     SET workspace_revision = CASE workspace_id
           WHEN 'efeonce-internal' THEN 1784791541455
           WHEN 'greenhouse-org:efeonce' THEN 1784799603738
         END,
         last_error_code = NULL,
         updated_at = CURRENT_TIMESTAMP
   WHERE workspace_id IN ('efeonce-internal', 'greenhouse-org:efeonce')
     AND broker_binding_id = workspace_id
     AND workspace_revision = 0
     AND workspace_fingerprint IS NULL
     AND member_revisions = '{}'::jsonb
     AND lease_token IS NULL
     AND lease_expires_at IS NULL
     AND last_reconciliation_id IS NULL
     AND last_reconciled_at IS NULL
     AND last_error_code = 'conflict';

  GET DIAGNOSTICS updated_cursor_count = ROW_COUNT;

  IF updated_cursor_count <> 2 THEN
    RAISE EXCEPTION
      'TASK-1521: expected to bootstrap two V2 cursors, updated %.',
      updated_cursor_count;
  END IF;
END
$$;

-- Down Migration

-- Safe only before either V2 cursor has reconciled. Once a fingerprint,
-- receipt or reconciliation timestamp exists, rollback requires a new forward
-- migration so projected authority is explicitly revoked.

DO $$
DECLARE
  reverted_cursor_count INTEGER;
BEGIN
  LOCK TABLE greenhouse_sync.globe_tenancy_reconciliation_state
    IN SHARE ROW EXCLUSIVE MODE;

  IF (
    SELECT COUNT(*)
      FROM greenhouse_sync.globe_tenancy_reconciliation_state
     WHERE (
           (
             workspace_id = 'efeonce-internal'
             AND broker_binding_id = 'efeonce-internal'
             AND workspace_revision = 1784791541455
           )
           OR (
             workspace_id = 'greenhouse-org:efeonce'
             AND broker_binding_id = 'greenhouse-org:efeonce'
             AND workspace_revision = 1784799603738
           )
         )
       AND workspace_fingerprint IS NULL
       AND member_revisions = '{}'::jsonb
       AND lease_token IS NULL
       AND lease_expires_at IS NULL
       AND last_reconciliation_id IS NULL
       AND last_reconciled_at IS NULL
  ) <> 2 THEN
    RAISE EXCEPTION
      'TASK-1521 rollback: a V2 cursor has operational history; use a forward rollback migration.';
  END IF;

  UPDATE greenhouse_sync.globe_tenancy_reconciliation_state
     SET workspace_revision = 0,
         last_error_code = 'conflict',
         updated_at = CURRENT_TIMESTAMP
   WHERE (
         (
           workspace_id = 'efeonce-internal'
           AND broker_binding_id = 'efeonce-internal'
           AND workspace_revision = 1784791541455
         )
         OR (
           workspace_id = 'greenhouse-org:efeonce'
           AND broker_binding_id = 'greenhouse-org:efeonce'
           AND workspace_revision = 1784799603738
         )
       )
     AND workspace_fingerprint IS NULL
     AND member_revisions = '{}'::jsonb
     AND lease_token IS NULL
     AND lease_expires_at IS NULL
     AND last_reconciliation_id IS NULL
     AND last_reconciled_at IS NULL;

  GET DIAGNOSTICS reverted_cursor_count = ROW_COUNT;

  IF reverted_cursor_count <> 2 THEN
    RAISE EXCEPTION
      'TASK-1521 rollback: expected to restore two pristine cursors, updated %.',
      reverted_cursor_count;
  END IF;
END
$$;
