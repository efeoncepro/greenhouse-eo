-- Up Migration

-- 2026-04-26 — Persist `incident_domain_tag` in the reliability registry seed
-- table so the DB-aware reader (`getReliabilityRegistry`) returns module
-- definitions WITH the tag set. Without this column, `hydrateDomainIncidents`
-- saw zero tagged modules and never produced per-domain incident signals,
-- leaving finance/notion/delivery with `missingSignalKinds: ['incident']`
-- and lower confidence on the dashboard.
--
-- Source of truth remains `STATIC_RELIABILITY_REGISTRY` in code; the seeder
-- (`ensureReliabilityRegistrySeed`) keeps the table in sync via INSERT ...
-- ON CONFLICT DO UPDATE.

ALTER TABLE greenhouse_core.reliability_module_registry
  ADD COLUMN IF NOT EXISTS incident_domain_tag TEXT;

COMMENT ON COLUMN greenhouse_core.reliability_module_registry.incident_domain_tag IS
  'Sentry tag value used to filter incidents per module (e.g. ''finance'', ''cloud''). NULL means the module does not consume domain-tagged Sentry incidents.';

-- Backfill from the static registry contract — keeps the table coherent
-- before the next deploy runs the seeder.
UPDATE greenhouse_core.reliability_module_registry
   SET incident_domain_tag = CASE module_key
       WHEN 'finance' THEN 'finance'
       WHEN 'integrations.notion' THEN 'integrations.notion'
       WHEN 'cloud' THEN 'cloud'
       WHEN 'delivery' THEN 'delivery'
       ELSE NULL
     END,
       updated_at = NOW()
 WHERE incident_domain_tag IS DISTINCT FROM CASE module_key
       WHEN 'finance' THEN 'finance'
       WHEN 'integrations.notion' THEN 'integrations.notion'
       WHEN 'cloud' THEN 'cloud'
       WHEN 'delivery' THEN 'delivery'
       ELSE NULL
     END;


-- Down Migration

ALTER TABLE greenhouse_core.reliability_module_registry
  DROP COLUMN IF EXISTS incident_domain_tag;
