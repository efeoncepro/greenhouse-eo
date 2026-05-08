-- Up Migration

-- TASK-612 — Extend home_rollout_flags CHECK constraint para incluir las dos
-- ============================================================================
-- flag keys nuevos del Organization Workspace shell:
--   - organization_workspace_shell_agency
--   - organization_workspace_shell_finance
--
-- El registry de TASK-780 hoy whitelist solo 'home_v2_shell'. En lugar de
-- crear una `feature_rollout_flags` table genérica (sería over-engineering
-- en V1), extendemos la whitelist existente. Patrón source: TASK-780 +
-- recalibración V1.1 V1 spec V1 organization workspace projection §4.6.
--
-- Cuando emerja una 4a flag fuera de home/workspace, evaluar generalización
-- a `feature_rollout_flags` como follow-up TASK derivada.
--
-- Idempotente: DROP CONSTRAINT IF EXISTS + ADD CHECK con whitelist actualizada.
-- Down: revert al CHECK previo con sólo 'home_v2_shell'.

ALTER TABLE greenhouse_serving.home_rollout_flags
  DROP CONSTRAINT IF EXISTS home_rollout_flags_key_check;

ALTER TABLE greenhouse_serving.home_rollout_flags
  ADD CONSTRAINT home_rollout_flags_key_check
  CHECK (flag_key IN (
    'home_v2_shell',
    'organization_workspace_shell_agency',
    'organization_workspace_shell_finance'
  ));

-- Seed initial: ambas flags como global=FALSE (staged rollout default).
-- TASK-780 pattern: ON CONFLICT DO NOTHING para idempotencia.
INSERT INTO greenhouse_serving.home_rollout_flags
  (flag_key, scope_type, scope_id, enabled, reason)
VALUES
  ('organization_workspace_shell_agency', 'global', NULL, FALSE, 'TASK-612 staged rollout default; enable per-user/role progresivamente.'),
  ('organization_workspace_shell_finance', 'global', NULL, FALSE, 'TASK-612 + TASK-613 staged rollout default; TASK-613 activará Finance entrypoint.')
ON CONFLICT DO NOTHING;

-- Anti pre-up-marker bug guard: verifica que el CHECK quedó correctamente
-- aplicado y los 2 seed rows están presentes.
DO $$
DECLARE
  expected_keys CONSTANT text[] := ARRAY[
    'home_v2_shell',
    'organization_workspace_shell_agency',
    'organization_workspace_shell_finance'
  ];
  check_def text;
  missing_seed text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO check_def
    FROM pg_constraint
    WHERE conname = 'home_rollout_flags_key_check'
      AND conrelid = 'greenhouse_serving.home_rollout_flags'::regclass;

  IF check_def IS NULL THEN
    RAISE EXCEPTION 'TASK-612 verify FAILED: CHECK constraint home_rollout_flags_key_check NOT created.';
  END IF;

  -- Verifica que el CHECK definition contiene los 3 keys esperados.
  FOREACH missing_seed IN ARRAY expected_keys
  LOOP
    IF position(missing_seed IN check_def) = 0 THEN
      RAISE EXCEPTION
        'TASK-612 verify FAILED: CHECK constraint missing key %. Definition: %',
        missing_seed, check_def;
    END IF;
  END LOOP;

  -- Verifica que los 2 seed rows nuevos existen (global, NULL scope_id).
  FOR missing_seed IN
    SELECT k FROM unnest(ARRAY[
      'organization_workspace_shell_agency',
      'organization_workspace_shell_finance'
    ]) AS k
    WHERE NOT EXISTS (
      SELECT 1 FROM greenhouse_serving.home_rollout_flags
      WHERE flag_key = k AND scope_type = 'global' AND scope_id IS NULL
    )
  LOOP
    RAISE EXCEPTION
      'TASK-612 verify FAILED: seed row missing for flag_key %.',
      missing_seed;
  END LOOP;
END
$$;

-- Down Migration

-- Revert al CHECK previo con sólo 'home_v2_shell'. Los seed rows nuevos
-- pueden quedar (DROP CONSTRAINT no falla por ello), pero los borramos en down
-- para limpieza explícita.
ALTER TABLE greenhouse_serving.home_rollout_flags
  DROP CONSTRAINT IF EXISTS home_rollout_flags_key_check;

ALTER TABLE greenhouse_serving.home_rollout_flags
  ADD CONSTRAINT home_rollout_flags_key_check
  CHECK (flag_key IN ('home_v2_shell'));

DELETE FROM greenhouse_serving.home_rollout_flags
  WHERE flag_key IN (
    'organization_workspace_shell_agency',
    'organization_workspace_shell_finance'
  );
