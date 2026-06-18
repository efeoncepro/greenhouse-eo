-- Up Migration

-- TASK-1079 — Nexa interaction mode (per-user preference)
-- El usuario elige cómo conversar con Nexa: dock (compacto A), expandible (panel B)
-- o lane (sidecar full-height C). NULL = system default (resuelto en runtime → dock).
-- Sigue el patrón de preferencias per-usuario de TASK-696 (columna en client_users,
-- NO env var ni home_rollout_flags que son operator-facing).

ALTER TABLE greenhouse_core.client_users
  ADD COLUMN IF NOT EXISTS nexa_interaction_mode TEXT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_users_nexa_interaction_mode_check'
  ) THEN
    ALTER TABLE greenhouse_core.client_users
      ADD CONSTRAINT client_users_nexa_interaction_mode_check
      CHECK (nexa_interaction_mode IS NULL OR nexa_interaction_mode IN ('dock','expandible','lane'));
  END IF;
END $$;

-- Anti pre-up-marker bug guard: aborta si la columna o la constraint NO quedaron creadas.
DO $$
DECLARE column_exists boolean; constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core' AND table_name = 'client_users' AND column_name = 'nexa_interaction_mode'
  ) INTO column_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_users_nexa_interaction_mode_check'
  ) INTO constraint_exists;

  IF NOT column_exists OR NOT constraint_exists THEN
    RAISE EXCEPTION 'TASK-1079 anti pre-up-marker check: nexa_interaction_mode column/constraint was NOT created. Migration markers may be inverted.';
  END IF;
END
$$;

COMMENT ON COLUMN greenhouse_core.client_users.nexa_interaction_mode IS 'TASK-1079 — Nexa interaction mode preference: dock (compacto), expandible (panel), lane (sidecar full-height). NULL = system default (dock). Las 3 modalidades comparten runtime/persistencia/historial (greenhouse_ai.nexa_threads/nexa_messages).';

-- Down Migration

ALTER TABLE greenhouse_core.client_users
  DROP CONSTRAINT IF EXISTS client_users_nexa_interaction_mode_check;

ALTER TABLE greenhouse_core.client_users
  DROP COLUMN IF EXISTS nexa_interaction_mode;
