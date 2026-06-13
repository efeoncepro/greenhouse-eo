-- Up Migration

-- TASK-1110 — Extiende el CHECK whitelist de greenhouse_serving.home_rollout_flags
-- ============================================================================
-- para incluir el flag key del kill-switch de la composición Nexa de /knowledge:
--   - knowledge_composition_lens
--
-- Decisión del operador (2026-06-13): la composición se despliega HABILITADA en
-- todos los entornos, pero CON kill-switch revertible SIN code-deploy (flip de la
-- fila DB → la lente Humano vuelve a su estado actual). Por eso el seed global es
-- enabled=TRUE (NO el FALSE de las flags staged tipo TASK-612).
--
-- Reusa la plataforma TASK-780 (NO env binario). Patrón source: TASK-612
-- (extensión del CHECK + seed global). Cuando emerja una flag fuera de
-- home/workspace/knowledge, evaluar generalización a `feature_rollout_flags`.
--
-- Idempotente: DROP CONSTRAINT IF EXISTS + ADD CHECK con whitelist actualizada +
-- INSERT ON CONFLICT DO NOTHING.

ALTER TABLE greenhouse_serving.home_rollout_flags
  DROP CONSTRAINT IF EXISTS home_rollout_flags_key_check;

ALTER TABLE greenhouse_serving.home_rollout_flags
  ADD CONSTRAINT home_rollout_flags_key_check
  CHECK (flag_key IN (
    'home_v2_shell',
    'organization_workspace_shell_agency',
    'organization_workspace_shell_finance',
    'knowledge_composition_lens'
  ));

-- Seed inicial: global=TRUE (ON por defecto, decisión del operador 2026-06-13).
-- El flag existe SOLO como reversa sin deploy si la superficie viva rompe en prod.
INSERT INTO greenhouse_serving.home_rollout_flags
  (flag_key, scope_type, scope_id, enabled, reason)
VALUES
  ('knowledge_composition_lens', 'global', NULL, TRUE, 'TASK-1110 — composición Nexa in-place en /knowledge; ON por defecto, kill-switch revertible sin deploy.')
ON CONFLICT DO NOTHING;

-- Anti pre-up-marker bug guard: verifica que el CHECK quedó aplicado con los 4
-- keys esperados y que el seed row global=TRUE existe.
DO $$
DECLARE
  expected_keys CONSTANT text[] := ARRAY[
    'home_v2_shell',
    'organization_workspace_shell_agency',
    'organization_workspace_shell_finance',
    'knowledge_composition_lens'
  ];
  check_def text;
  missing_key text;
  seeded boolean;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO check_def
    FROM pg_constraint
    WHERE conname = 'home_rollout_flags_key_check'
      AND conrelid = 'greenhouse_serving.home_rollout_flags'::regclass;

  IF check_def IS NULL THEN
    RAISE EXCEPTION 'TASK-1110 verify FAILED: CHECK constraint home_rollout_flags_key_check NOT created.';
  END IF;

  FOREACH missing_key IN ARRAY expected_keys
  LOOP
    IF position(missing_key IN check_def) = 0 THEN
      RAISE EXCEPTION
        'TASK-1110 verify FAILED: CHECK constraint missing key %. Definition: %',
        missing_key, check_def;
    END IF;
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_serving.home_rollout_flags
    WHERE flag_key = 'knowledge_composition_lens'
      AND scope_type = 'global'
      AND scope_id IS NULL
  ) INTO seeded;

  IF NOT seeded THEN
    RAISE EXCEPTION 'TASK-1110 verify FAILED: seed row missing for knowledge_composition_lens.';
  END IF;
END
$$;

-- Down Migration

-- Revert al CHECK previo (sin knowledge_composition_lens) + borra el seed row.
DELETE FROM greenhouse_serving.home_rollout_flags
  WHERE flag_key = 'knowledge_composition_lens';

ALTER TABLE greenhouse_serving.home_rollout_flags
  DROP CONSTRAINT IF EXISTS home_rollout_flags_key_check;

ALTER TABLE greenhouse_serving.home_rollout_flags
  ADD CONSTRAINT home_rollout_flags_key_check
  CHECK (flag_key IN (
    'home_v2_shell',
    'organization_workspace_shell_agency',
    'organization_workspace_shell_finance'
  ));
