-- Up Migration

-- TASK-1010 — el canal de Teams de un cliente se scopea al Space (espeja space_notion_sources).
-- La spec de TASK-997 asumía que teams_notification_channels ya tenía space_id; el schema real
-- NO lo tenía (registry global keyed por channel_code). Esta columna aditiva nullable lo hace
-- space-scoped sin romper los canales globales existentes (ops-alerts/finance-alerts/etc → space_id NULL).
ALTER TABLE greenhouse_core.teams_notification_channels
  ADD COLUMN IF NOT EXISTS space_id text;

-- FK al backbone canónico de Spaces (ON DELETE SET NULL: borrar un Space no borra el registro de canal,
-- solo lo des-scopea — append-only-friendly; el canal sigue auditable).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'greenhouse_core'
      AND table_name = 'teams_notification_channels'
      AND constraint_name = 'teams_notification_channels_space_fk'
  ) THEN
    ALTER TABLE greenhouse_core.teams_notification_channels
      ADD CONSTRAINT teams_notification_channels_space_fk
      FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces (space_id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Index parcial para resolver "el canal de este Space" sin scan.
CREATE INDEX IF NOT EXISTS teams_notification_channels_space_idx
  ON greenhouse_core.teams_notification_channels (space_id)
  WHERE space_id IS NOT NULL;

-- Anti pre-up-marker check: aborta si la columna no quedó creada (CLAUDE.md migration markers).
DO $$
DECLARE col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'teams_notification_channels'
      AND column_name = 'space_id'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'TASK-1010 anti pre-up-marker: teams_notification_channels.space_id NOT created. Markers may be inverted.';
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.teams_notification_channels_space_idx;
ALTER TABLE greenhouse_core.teams_notification_channels
  DROP CONSTRAINT IF EXISTS teams_notification_channels_space_fk;
ALTER TABLE greenhouse_core.teams_notification_channels
  DROP COLUMN IF EXISTS space_id;
