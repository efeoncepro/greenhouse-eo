-- Up Migration

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_clients_ttl_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD CONSTRAINT sister_platform_oauth_clients_ttl_check CHECK (
    code_ttl_seconds BETWEEN 60 AND 600
    AND access_token_ttl_seconds BETWEEN 60 AND 28800
  );

-- Down Migration

UPDATE greenhouse_core.sister_platform_oauth_clients
   SET access_token_ttl_seconds = 900,
       updated_at = CURRENT_TIMESTAMP
 WHERE access_token_ttl_seconds > 900;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  DROP CONSTRAINT IF EXISTS sister_platform_oauth_clients_ttl_check;

ALTER TABLE greenhouse_core.sister_platform_oauth_clients
  ADD CONSTRAINT sister_platform_oauth_clients_ttl_check CHECK (
    code_ttl_seconds BETWEEN 60 AND 600
    AND access_token_ttl_seconds BETWEEN 60 AND 900
  );
