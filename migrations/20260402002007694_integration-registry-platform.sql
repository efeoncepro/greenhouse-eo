-- Up Migration

SET search_path = greenhouse_sync, greenhouse_core, public;

-- ── TASK-188: Evolve integration_registry from catalog to control plane ──

ALTER TABLE greenhouse_sync.integration_registry
  ADD COLUMN IF NOT EXISTS sync_endpoint TEXT;

ALTER TABLE greenhouse_sync.integration_registry
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

ALTER TABLE greenhouse_sync.integration_registry
  ADD COLUMN IF NOT EXISTS paused_reason TEXT;

ALTER TABLE greenhouse_sync.integration_registry
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ;

UPDATE greenhouse_sync.integration_registry
SET sync_endpoint = '/api/cron/sync-conformed'
WHERE integration_key = 'notion' AND sync_endpoint IS NULL;

UPDATE greenhouse_sync.integration_registry
SET sync_endpoint = '/api/cron/services-sync'
WHERE integration_key = 'hubspot' AND sync_endpoint IS NULL;

UPDATE greenhouse_sync.integration_registry
SET sync_endpoint = '/api/cron/nubox-sync'
WHERE integration_key = 'nubox' AND sync_endpoint IS NULL;

GRANT SELECT ON greenhouse_sync.integration_registry TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.integration_registry TO greenhouse_migrator;

-- Down Migration

ALTER TABLE greenhouse_sync.integration_registry
  DROP COLUMN IF EXISTS last_health_check_at;

ALTER TABLE greenhouse_sync.integration_registry
  DROP COLUMN IF EXISTS paused_reason;

ALTER TABLE greenhouse_sync.integration_registry
  DROP COLUMN IF EXISTS paused_at;

ALTER TABLE greenhouse_sync.integration_registry
  DROP COLUMN IF EXISTS sync_endpoint;
