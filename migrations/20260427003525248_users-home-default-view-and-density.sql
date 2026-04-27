-- Up Migration

-- TASK-696 Smart Home v2 — per-user UI preferences
-- - home_default_view: lets each user pin their preferred landing surface
-- - ui_density:        cozy | comfortable | compact (Salesforce/SAP Fiori pattern)
-- - home_v2_opt_out:   rollback hatch during the v2 rollout window

ALTER TABLE greenhouse_core.client_users
  ADD COLUMN IF NOT EXISTS home_default_view      TEXT NULL,
  ADD COLUMN IF NOT EXISTS ui_density             TEXT NULL,
  ADD COLUMN IF NOT EXISTS home_v2_opt_out        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preferences_updated_at TIMESTAMPTZ NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_users_ui_density_check'
  ) THEN
    ALTER TABLE greenhouse_core.client_users
      ADD CONSTRAINT client_users_ui_density_check
      CHECK (ui_density IS NULL OR ui_density IN ('cozy','comfortable','compact'));
  END IF;
END $$;

COMMENT ON COLUMN greenhouse_core.client_users.home_default_view      IS 'TASK-696 — Smart Home v2 user override of default landing surface (e.g. pulse, finance, mi-nomina, ico-board). NULL = system-resolved by audience+startup policy.';
COMMENT ON COLUMN greenhouse_core.client_users.ui_density             IS 'TASK-696 — UI density preference: cozy (default), comfortable, compact. Drives --density-scale CSS var.';
COMMENT ON COLUMN greenhouse_core.client_users.home_v2_opt_out        IS 'TASK-696 — TRUE renders legacy v1 home during v2 rollout window (4 weeks). Cleared at v1 sunset.';
COMMENT ON COLUMN greenhouse_core.client_users.preferences_updated_at IS 'TASK-696 — last time the user mutated home preferences. Drives invalidation.';

-- Down Migration

ALTER TABLE greenhouse_core.client_users
  DROP CONSTRAINT IF EXISTS client_users_ui_density_check;

ALTER TABLE greenhouse_core.client_users
  DROP COLUMN IF EXISTS preferences_updated_at,
  DROP COLUMN IF EXISTS home_v2_opt_out,
  DROP COLUMN IF EXISTS ui_density,
  DROP COLUMN IF EXISTS home_default_view;
