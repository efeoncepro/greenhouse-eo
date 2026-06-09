-- Up Migration

-- TASK-999 — Organization Brand Asset Enrichment foundation.
-- This slice is intentionally additive:
--   1. captures organization website as SSOT input for future discovery;
--   2. reflects the canonical logo pointer in organization_360;
--   3. creates an append-friendly candidate review table;
--   4. seeds the granular mutation/review capability.

ALTER TABLE greenhouse_core.organizations
  ADD COLUMN IF NOT EXISTS website_url TEXT;

COMMENT ON COLUMN greenhouse_core.organizations.website_url IS
  'TASK-999 — canonical organization website URL used as input for brand-asset discovery/enrichment. Nullable; no hotlinking contract.';

COMMENT ON COLUMN greenhouse_core.organizations.logo_asset_id IS
  'TASK-999 — canonical organization logo asset pointer. For non-operating organizations this is the commercial/brand logo used by Organization 360 UI. For operating entities it remains the legal/institutional document logo and is NOT mutated by the TASK-999 enrichment flow.';

CREATE TABLE IF NOT EXISTS greenhouse_core.organization_brand_asset_candidates (
  candidate_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  asset_id TEXT
    REFERENCES greenhouse_core.assets (asset_id) ON DELETE SET NULL,
  confidence NUMERIC(5, 4),
  status TEXT NOT NULL DEFAULT 'pending_review',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by_user_id TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_brand_asset_candidates_source_check
    CHECK (source IN ('hubspot_company', 'website_metadata', 'manual_upload', 'operator_url')),
  CONSTRAINT organization_brand_asset_candidates_status_check
    CHECK (status IN ('pending_review', 'accepted', 'rejected', 'superseded', 'expired', 'failed')),
  CONSTRAINT organization_brand_asset_candidates_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

COMMENT ON TABLE greenhouse_core.organization_brand_asset_candidates IS
  'TASK-999 — append-friendly review queue for organization logo candidates. Stores provenance and review state; final accepted logo is organizations.logo_asset_id.';

CREATE INDEX IF NOT EXISTS organization_brand_asset_candidates_org_status_idx
  ON greenhouse_core.organization_brand_asset_candidates (organization_id, status, discovered_at DESC);

CREATE INDEX IF NOT EXISTS organization_brand_asset_candidates_asset_idx
  ON greenhouse_core.organization_brand_asset_candidates (asset_id)
  WHERE asset_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON greenhouse_core.organization_brand_asset_candidates
  TO greenhouse_app;

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  (
    'organization.brand_asset',
    'organization',
    ARRAY['review', 'update'],
    ARRAY['tenant', 'all'],
    'TASK-999 — revisar, aceptar, rechazar o reemplazar logos comerciales de organizaciones no-operating. No aplica a Efeonce/operating entities.',
    NOW(),
    NULL
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description,
  deprecated_at = NULL;

CREATE OR REPLACE VIEW greenhouse_serving.organization_360 AS
SELECT
  o.organization_id,
  o.public_id,
  o.organization_name,
  o.legal_name,
  o.tax_id,
  o.tax_id_type,
  o.industry,
  o.country,
  o.hubspot_company_id,
  o.status,
  o.active,
  o.notes,
  o.created_at,
  o.updated_at,
  COALESCE(o.organization_type, 'other') AS organization_type,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'spaceId', s.space_id,
      'publicId', s.public_id,
      'spaceName', s.space_name,
      'spaceType', s.space_type,
      'clientId', s.client_id,
      'status', s.status
    ) ORDER BY s.space_name)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS spaces,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'membershipId', pm.membership_id,
      'publicId', pm.public_id,
      'profileId', pm.profile_id,
      'fullName', ip.full_name,
      'canonicalEmail', ip.canonical_email,
      'membershipType', pm.membership_type,
      'roleLabel', pm.role_label,
      'department', pm.department,
      'isPrimary', pm.is_primary,
      'spaceId', pm.space_id
    ) ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST)
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip
      ON ip.profile_id = pm.profile_id
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS people,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS space_count,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS membership_count,
  (
    SELECT COUNT(DISTINCT pm.profile_id)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS unique_person_count,
  o.logo_asset_id,
  o.website_url,
  o.is_operating_entity
FROM greenhouse_core.organizations o;

GRANT SELECT ON greenhouse_serving.organization_360 TO greenhouse_app, greenhouse_runtime;

DO $$
DECLARE
  website_col_exists BOOLEAN;
  view_logo_col_exists BOOLEAN;
  candidate_table_exists BOOLEAN;
  capability_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'organizations'
      AND column_name = 'website_url'
  ) INTO website_col_exists;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'greenhouse_serving'
      AND table_name = 'organization_360'
      AND column_name = 'logo_asset_id'
  ) INTO view_logo_col_exists;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'greenhouse_core'
      AND table_name = 'organization_brand_asset_candidates'
  ) INTO candidate_table_exists;

  SELECT EXISTS (
    SELECT 1
    FROM greenhouse_core.capabilities_registry
    WHERE capability_key = 'organization.brand_asset'
      AND deprecated_at IS NULL
  ) INTO capability_exists;

  IF NOT website_col_exists THEN
    RAISE EXCEPTION 'TASK-999 anti pre-up-marker: organizations.website_url was NOT added.';
  END IF;

  IF NOT view_logo_col_exists THEN
    RAISE EXCEPTION 'TASK-999 anti pre-up-marker: organization_360.logo_asset_id was NOT exposed.';
  END IF;

  IF NOT candidate_table_exists THEN
    RAISE EXCEPTION 'TASK-999 anti pre-up-marker: candidate table was NOT created.';
  END IF;

  IF NOT capability_exists THEN
    RAISE EXCEPTION 'TASK-999 anti pre-up-marker: organization.brand_asset capability was NOT seeded.';
  END IF;
END
$$;

-- Down Migration

DROP VIEW IF EXISTS greenhouse_serving.organization_360;

CREATE OR REPLACE VIEW greenhouse_serving.organization_360 AS
SELECT
  o.organization_id,
  o.public_id,
  o.organization_name,
  o.legal_name,
  o.tax_id,
  o.tax_id_type,
  o.industry,
  o.country,
  o.hubspot_company_id,
  o.status,
  o.active,
  o.notes,
  o.created_at,
  o.updated_at,
  COALESCE(o.organization_type, 'other') AS organization_type,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'spaceId', s.space_id,
      'publicId', s.public_id,
      'spaceName', s.space_name,
      'spaceType', s.space_type,
      'clientId', s.client_id,
      'status', s.status
    ) ORDER BY s.space_name)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS spaces,
  (
    SELECT JSON_AGG(JSON_BUILD_OBJECT(
      'membershipId', pm.membership_id,
      'publicId', pm.public_id,
      'profileId', pm.profile_id,
      'fullName', ip.full_name,
      'canonicalEmail', ip.canonical_email,
      'membershipType', pm.membership_type,
      'roleLabel', pm.role_label,
      'department', pm.department,
      'isPrimary', pm.is_primary,
      'spaceId', pm.space_id
    ) ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST)
    FROM greenhouse_core.person_memberships pm
    JOIN greenhouse_core.identity_profiles ip
      ON ip.profile_id = pm.profile_id
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS people,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.spaces s
    WHERE s.organization_id = o.organization_id
      AND s.active = TRUE
  ) AS space_count,
  (
    SELECT COUNT(*)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS membership_count,
  (
    SELECT COUNT(DISTINCT pm.profile_id)
    FROM greenhouse_core.person_memberships pm
    WHERE pm.organization_id = o.organization_id
      AND pm.active = TRUE
  ) AS unique_person_count
FROM greenhouse_core.organizations o;

GRANT SELECT ON greenhouse_serving.organization_360 TO greenhouse_app, greenhouse_runtime;

DROP TABLE IF EXISTS greenhouse_core.organization_brand_asset_candidates;

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key = 'organization.brand_asset';

ALTER TABLE greenhouse_core.organizations
  DROP COLUMN IF EXISTS website_url;

COMMENT ON COLUMN greenhouse_core.organizations.logo_asset_id IS
  'TASK-862 — Logo del empleador (legal entity) renderizado en el header de documentos legales (finiquito, contrato, anexo). Resuelto desde greenhouse_core.assets via /api/assets/private/<id>. Fallback a logo Greenhouse hardcoded cuando null.';
