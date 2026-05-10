-- Up Migration

-- TASK-850 — Production Preflight CLI: 3 sub-capabilities granulares.
--
-- Single source of truth en `src/config/entitlements-catalog.ts` (TASK-611
-- canonical pattern). La parity test `src/lib/capabilities-registry/parity.live.test.ts`
-- detecta drift TS↔DB en CI con PG.
--
-- Sub-capabilities:
--   * `platform.release.preflight.execute` — disparar CLI / orchestrator.
--     EFEONCE_ADMIN + DEVOPS_OPERATOR.
--   * `platform.release.preflight.read_results` — leer JSON output del CLI
--     desde dashboards futuros (TASK-855). EFEONCE_ADMIN + DEVOPS_OPERATOR
--     + FINANCE_ADMIN (observabilidad).
--   * `platform.release.preflight.override_batch_policy` — break-glass para
--     skip check `release_batch_policy` decision=`error|requires_break_glass`.
--     EFEONCE_ADMIN solo. Requires reason >= 20 chars + audit row.
--
-- Mismo patron que TASK-848 (`platform.release.{execute,rollback,bypass_preflight}`)
-- y TASK-849 (`platform.release.watchdog.read`). NO platform.admin catch-all.

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description)
VALUES
  ('platform.release.preflight.execute', 'platform', ARRAY['execute'], ARRAY['all'],
   'Disparar CLI production-preflight desde local o orchestrator workflow. Reservado para EFEONCE_ADMIN + DEVOPS_OPERATOR. Read-mostly check suite, no efecto secundario en production state.'),
  ('platform.release.preflight.read_results', 'platform', ARRAY['read'], ARRAY['all'],
   'Leer JSON output de production-preflight desde dashboards (TASK-855) o admin endpoints. EFEONCE_ADMIN + DEVOPS_OPERATOR + FINANCE_ADMIN (observabilidad cross-domain).'),
  ('platform.release.preflight.override_batch_policy', 'platform', ARRAY['update'], ARRAY['all'],
   'Break-glass override del check release_batch_policy decision=error|requires_break_glass. EFEONCE_ADMIN solo. Requires reason >= 20 chars + audit row obligatoria. Patron mirror TASK-848 platform.release.bypass_preflight.')
ON CONFLICT (capability_key) DO UPDATE SET
  module          = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes  = EXCLUDED.allowed_scopes,
  description     = EXCLUDED.description,
  deprecated_at   = NULL;

-- Anti pre-up-marker bug guard (ISSUE-068 lesson): RAISE EXCEPTION si los
-- 3 inserts no quedaron persistidos. Aborta la tx para que `pnpm migrate:up`
-- NO marque la fila como aplicada en `pgmigrations` cuando el SQL real fallo
-- silente. Defense in depth sobre el CI gate de markers.
DO $$
DECLARE
  capability_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO capability_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'platform.release.preflight.execute',
    'platform.release.preflight.read_results',
    'platform.release.preflight.override_batch_policy'
  ) AND deprecated_at IS NULL;

  IF capability_count <> 3 THEN
    RAISE EXCEPTION 'TASK-850 anti pre-up-marker check: expected 3 platform.release.preflight.* capabilities, found %', capability_count;
  END IF;
END
$$;

-- Down Migration

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN (
  'platform.release.preflight.execute',
  'platform.release.preflight.read_results',
  'platform.release.preflight.override_batch_policy'
);
