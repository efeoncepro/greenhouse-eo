-- Up Migration

-- TASK-1521 — Align the canonical Greenhouse sister-platform binding with the
-- commercial Globe workspace already used by Producer sessions, credits,
-- generations and tenancy projections.
--
-- Keep the stable binding/public identifiers. The reconciliation loop will
-- project the canonical workspace and revoke the no-longer-bound legacy scope.

DO $$
DECLARE
  conflicting_binding_count INTEGER;
  updated_binding_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO conflicting_binding_count
    FROM greenhouse_core.sister_platform_bindings
   WHERE sister_platform_key = 'globe'
     AND binding_status = 'active'
     AND external_scope_id = 'greenhouse-org:efeonce'
     AND public_id <> 'EO-SPB-0003';

  IF conflicting_binding_count <> 0 THEN
    RAISE EXCEPTION
      'TASK-1521: canonical Globe workspace already belongs to another active binding (count=%).',
      conflicting_binding_count;
  END IF;

  UPDATE greenhouse_core.sister_platform_bindings
     SET external_scope_id = 'greenhouse-org:efeonce',
         external_display_name = 'Efeonce',
         metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object(
           'workspaceCanonicalization',
           jsonb_build_object(
             'taskId', 'TASK-1521',
             'previousExternalScopeId', 'efeonce-internal',
             'canonicalExternalScopeId', 'greenhouse-org:efeonce'
           )
         ),
         updated_at = CURRENT_TIMESTAMP
   WHERE public_id = 'EO-SPB-0003'
     AND sister_platform_key = 'globe'
     AND external_scope_type = 'workspace'
     AND greenhouse_scope_type = 'internal'
     AND binding_status = 'active'
     AND external_scope_id = 'efeonce-internal';

  GET DIAGNOSTICS updated_binding_count = ROW_COUNT;

  IF updated_binding_count <> 1 THEN
    RAISE EXCEPTION
      'TASK-1521: expected exactly one legacy Globe workspace binding to canonicalize, updated %.',
      updated_binding_count;
  END IF;
END
$$;

-- Down Migration

DO $$
DECLARE
  conflicting_binding_count INTEGER;
  reverted_binding_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO conflicting_binding_count
    FROM greenhouse_core.sister_platform_bindings
   WHERE sister_platform_key = 'globe'
     AND binding_status = 'active'
     AND external_scope_id = 'efeonce-internal'
     AND public_id <> 'EO-SPB-0003';

  IF conflicting_binding_count <> 0 THEN
    RAISE EXCEPTION
      'TASK-1521 rollback: legacy Globe workspace belongs to another active binding (count=%).',
      conflicting_binding_count;
  END IF;

  UPDATE greenhouse_core.sister_platform_bindings
     SET external_scope_id = 'efeonce-internal',
         external_display_name = 'Efeonce Internal',
         metadata_json = metadata_json - 'workspaceCanonicalization',
         updated_at = CURRENT_TIMESTAMP
   WHERE public_id = 'EO-SPB-0003'
     AND sister_platform_key = 'globe'
     AND external_scope_type = 'workspace'
     AND greenhouse_scope_type = 'internal'
     AND binding_status = 'active'
     AND external_scope_id = 'greenhouse-org:efeonce'
     AND metadata_json @> jsonb_build_object(
       'workspaceCanonicalization',
       jsonb_build_object(
         'taskId', 'TASK-1521',
         'previousExternalScopeId', 'efeonce-internal',
         'canonicalExternalScopeId', 'greenhouse-org:efeonce'
       )
     );

  GET DIAGNOSTICS reverted_binding_count = ROW_COUNT;

  IF reverted_binding_count <> 1 THEN
    RAISE EXCEPTION
      'TASK-1521 rollback: expected exactly one canonical Globe workspace binding to revert, updated %.',
      reverted_binding_count;
  END IF;
END
$$;
