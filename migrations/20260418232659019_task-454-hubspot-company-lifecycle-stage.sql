-- Up Migration

SET search_path = greenhouse_core, greenhouse_finance, public;

ALTER TABLE greenhouse_core.clients
  ADD COLUMN IF NOT EXISTS lifecyclestage text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS lifecyclestage_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifecyclestage_source text NOT NULL DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_lifecyclestage_valid'
  ) THEN
    ALTER TABLE greenhouse_core.clients
      ADD CONSTRAINT clients_lifecyclestage_valid
      CHECK (lifecyclestage IN (
        'subscriber',
        'lead',
        'marketingqualifiedlead',
        'salesqualifiedlead',
        'opportunity',
        'customer',
        'evangelist',
        'other',
        'unknown'
      )) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_lifecyclestage_source_valid'
  ) THEN
    ALTER TABLE greenhouse_core.clients
      ADD CONSTRAINT clients_lifecyclestage_source_valid
      CHECK (lifecyclestage_source IN (
        'hubspot_sync',
        'nubox_fallback',
        'manual_override',
        'unknown'
      )) NOT VALID;
  END IF;
END $$;

UPDATE greenhouse_core.clients AS c
SET lifecyclestage = 'customer',
    lifecyclestage_source = 'nubox_fallback',
    lifecyclestage_updated_at = CURRENT_TIMESTAMP
WHERE c.hubspot_company_id IS NULL
  AND c.lifecyclestage = 'unknown'
  AND EXISTS (
    SELECT 1
    FROM greenhouse_finance.income AS i
    WHERE i.client_id = c.client_id
  );

CREATE INDEX IF NOT EXISTS idx_clients_lifecyclestage
  ON greenhouse_core.clients (lifecyclestage, lifecyclestage_source);

COMMENT ON COLUMN greenhouse_core.clients.lifecyclestage IS
  'HubSpot company lifecycle stage denormalized as a compatibility bridge for legacy client-scoped consumers.';

COMMENT ON COLUMN greenhouse_core.clients.lifecyclestage_source IS
  'Origin of the client lifecycle stage bridge value: hubspot_sync, nubox_fallback, manual_override, or unknown.';

-- Down Migration

SET search_path = greenhouse_core, greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_core.idx_clients_lifecyclestage;

ALTER TABLE greenhouse_core.clients
  DROP CONSTRAINT IF EXISTS clients_lifecyclestage_valid;

ALTER TABLE greenhouse_core.clients
  DROP CONSTRAINT IF EXISTS clients_lifecyclestage_source_valid;

ALTER TABLE greenhouse_core.clients
  DROP COLUMN IF EXISTS lifecyclestage,
  DROP COLUMN IF EXISTS lifecyclestage_updated_at,
  DROP COLUMN IF EXISTS lifecyclestage_source;
