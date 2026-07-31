-- Up Migration

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD COLUMN IF NOT EXISTS client_type TEXT NOT NULL DEFAULT 'confidential';

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD COLUMN IF NOT EXISTS require_human_session BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_clients_client_type_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD CONSTRAINT sister_platform_oauth_clients_client_type_check
  CHECK (client_type IN ('public', 'confidential'));

-- Down Migration

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_clients_client_type_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP COLUMN IF EXISTS client_type;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP COLUMN IF EXISTS require_human_session;

