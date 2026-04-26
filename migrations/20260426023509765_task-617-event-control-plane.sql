-- Up Migration

ALTER TABLE greenhouse_sync.webhook_subscriptions
  ADD COLUMN IF NOT EXISTS sister_platform_consumer_id text,
  ADD COLUMN IF NOT EXISTS sister_platform_binding_id text,
  ADD COLUMN IF NOT EXISTS greenhouse_scope_type text,
  ADD COLUMN IF NOT EXISTS organization_id text,
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS space_id text,
  ADD COLUMN IF NOT EXISTS created_by_control_plane boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS control_plane_metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_greenhouse_scope_type_check;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  ADD CONSTRAINT webhook_subscriptions_greenhouse_scope_type_check CHECK (
    greenhouse_scope_type IS NULL
    OR greenhouse_scope_type = ANY (ARRAY['organization'::text, 'client'::text, 'space'::text, 'internal'::text])
  );

ALTER TABLE greenhouse_sync.webhook_subscriptions
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_control_plane_scope_check;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  ADD CONSTRAINT webhook_subscriptions_control_plane_scope_check CHECK (
    sister_platform_consumer_id IS NULL
    OR (
      sister_platform_binding_id IS NOT NULL
      AND greenhouse_scope_type IS NOT NULL
      AND (
        (
          greenhouse_scope_type = 'organization'
          AND organization_id IS NOT NULL
          AND client_id IS NULL
          AND space_id IS NULL
        )
        OR (
          greenhouse_scope_type = 'client'
          AND organization_id IS NOT NULL
          AND client_id IS NOT NULL
          AND space_id IS NULL
        )
        OR (
          greenhouse_scope_type = 'space'
          AND organization_id IS NOT NULL
          AND client_id IS NOT NULL
          AND space_id IS NOT NULL
        )
        OR (
          greenhouse_scope_type = 'internal'
          AND organization_id IS NULL
          AND client_id IS NULL
          AND space_id IS NULL
        )
      )
    )
  );

ALTER TABLE greenhouse_sync.webhook_subscriptions
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_consumer_fkey;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  ADD CONSTRAINT webhook_subscriptions_consumer_fkey
  FOREIGN KEY (sister_platform_consumer_id)
  REFERENCES greenhouse_core.sister_platform_consumers (sister_platform_consumer_id)
  ON DELETE SET NULL;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_binding_fkey;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  ADD CONSTRAINT webhook_subscriptions_binding_fkey
  FOREIGN KEY (sister_platform_binding_id)
  REFERENCES greenhouse_core.sister_platform_bindings (sister_platform_binding_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_control_plane_owner
  ON greenhouse_sync.webhook_subscriptions (
    sister_platform_consumer_id,
    sister_platform_binding_id,
    greenhouse_scope_type,
    active,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_control_plane_scope
  ON greenhouse_sync.webhook_subscriptions (organization_id, client_id, space_id)
  WHERE sister_platform_consumer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_created_at
  ON greenhouse_sync.webhook_deliveries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type_created_at
  ON greenhouse_sync.webhook_deliveries (event_type, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.webhook_subscriptions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.webhook_deliveries TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.webhook_delivery_attempts TO greenhouse_runtime;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.idx_webhook_deliveries_event_type_created_at;
DROP INDEX IF EXISTS greenhouse_sync.idx_webhook_deliveries_status_created_at;
DROP INDEX IF EXISTS greenhouse_sync.idx_webhook_subscriptions_control_plane_scope;
DROP INDEX IF EXISTS greenhouse_sync.idx_webhook_subscriptions_control_plane_owner;

ALTER TABLE greenhouse_sync.webhook_subscriptions
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_binding_fkey,
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_consumer_fkey,
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_control_plane_scope_check,
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_greenhouse_scope_type_check,
  DROP COLUMN IF EXISTS control_plane_metadata_json,
  DROP COLUMN IF EXISTS created_by_control_plane,
  DROP COLUMN IF EXISTS space_id,
  DROP COLUMN IF EXISTS client_id,
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS greenhouse_scope_type,
  DROP COLUMN IF EXISTS sister_platform_binding_id,
  DROP COLUMN IF EXISTS sister_platform_consumer_id;
