-- Up Migration
--
-- TASK-573 — Quote Builder Deal Birth Contract Completion
--
-- Closes the contract gaps of inline deal birth by persisting contact/type/
-- priority resolution, extending scoped defaults, and materializing the
-- minimal HubSpot property metadata mirror needed for governance.

SET search_path = greenhouse_commercial, greenhouse_core, public;

ALTER TABLE greenhouse_commercial.deal_create_attempts
  ADD COLUMN IF NOT EXISTS contact_identity_profile_id text
    REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text,
  ADD COLUMN IF NOT EXISTS deal_type text,
  ADD COLUMN IF NOT EXISTS priority text;

CREATE INDEX IF NOT EXISTS idx_deal_create_attempts_contact_profile
  ON greenhouse_commercial.deal_create_attempts (contact_identity_profile_id)
  WHERE contact_identity_profile_id IS NOT NULL;

ALTER TABLE greenhouse_commercial.deals
  ADD COLUMN IF NOT EXISTS contact_identity_profile_id text
    REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hubspot_contact_id text,
  ADD COLUMN IF NOT EXISTS priority text;

CREATE INDEX IF NOT EXISTS idx_commercial_deals_contact_profile
  ON greenhouse_commercial.deals (contact_identity_profile_id)
  WHERE contact_identity_profile_id IS NOT NULL;

ALTER TABLE greenhouse_commercial.hubspot_deal_pipeline_defaults
  ADD COLUMN IF NOT EXISTS deal_type text,
  ADD COLUMN IF NOT EXISTS priority text;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.hubspot_deal_property_config (
  property_name text PRIMARY KEY,
  hubspot_property_name text NOT NULL UNIQUE,
  label text,
  description text,
  property_type text,
  field_type text,
  options_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_in_hubspot boolean NOT NULL DEFAULT FALSE,
  synced_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_hubspot_deal_property_config_missing
  ON greenhouse_commercial.hubspot_deal_property_config (missing_in_hubspot, property_name);

ALTER TABLE greenhouse_commercial.hubspot_deal_property_config OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.hubspot_deal_property_config TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.hubspot_deal_property_config TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.hubspot_deal_property_config TO greenhouse_app;

COMMENT ON TABLE greenhouse_commercial.hubspot_deal_property_config IS
  'TASK-573: minimal mirror of HubSpot deal property metadata used by Greenhouse governance for create-deal defaults and validation.';

COMMENT ON COLUMN greenhouse_commercial.hubspot_deal_property_config.property_name IS
  'Greenhouse-facing semantic property key, e.g. dealType or priority.';

COMMENT ON COLUMN greenhouse_commercial.hubspot_deal_property_config.hubspot_property_name IS
  'HubSpot internal property name, e.g. dealtype or hs_priority.';

COMMENT ON COLUMN greenhouse_commercial.hubspot_deal_property_config.options_json IS
  'HubSpot options snapshot as JSON array; empty array when the property has no enumerated options.';

-- Down Migration

SET search_path = greenhouse_commercial, greenhouse_core, public;

DROP INDEX IF EXISTS greenhouse_commercial.idx_hubspot_deal_property_config_missing;
DROP TABLE IF EXISTS greenhouse_commercial.hubspot_deal_property_config;

DROP INDEX IF EXISTS greenhouse_commercial.idx_commercial_deals_contact_profile;
ALTER TABLE greenhouse_commercial.deals
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS hubspot_contact_id,
  DROP COLUMN IF EXISTS contact_identity_profile_id;

DROP INDEX IF EXISTS greenhouse_commercial.idx_deal_create_attempts_contact_profile;
ALTER TABLE greenhouse_commercial.deal_create_attempts
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS deal_type,
  DROP COLUMN IF EXISTS hubspot_contact_id,
  DROP COLUMN IF EXISTS contact_identity_profile_id;

ALTER TABLE greenhouse_commercial.hubspot_deal_pipeline_defaults
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS deal_type;
