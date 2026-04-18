-- Up Migration

SET search_path = greenhouse_core, greenhouse_finance, public;

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_person_legal_entity_relationship_public_id
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE TABLE IF NOT EXISTS greenhouse_core.person_legal_entity_relationships (
  relationship_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  profile_id TEXT NOT NULL
    REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE CASCADE,
  legal_entity_organization_id TEXT NOT NULL
    REFERENCES greenhouse_core.organizations(organization_id) ON DELETE CASCADE,
  space_id TEXT
    REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN (
      'shareholder',
      'founder',
      'legal_representative',
      'board_member',
      'executive',
      'employee',
      'contractor',
      'shareholder_current_account_holder',
      'lender_to_entity',
      'borrower_from_entity'
    )),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'ended')),
  source_of_truth TEXT NOT NULL,
  source_record_type TEXT,
  source_record_id TEXT,
  role_label TEXT,
  notes TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id TEXT
    REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_person_legal_entity_relationships_profile
  ON greenhouse_core.person_legal_entity_relationships (profile_id, status, relationship_type);

CREATE INDEX IF NOT EXISTS idx_person_legal_entity_relationships_legal_entity
  ON greenhouse_core.person_legal_entity_relationships (legal_entity_organization_id, status, relationship_type);

CREATE INDEX IF NOT EXISTS idx_person_legal_entity_relationships_space
  ON greenhouse_core.person_legal_entity_relationships (space_id, relationship_type)
  WHERE space_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_person_legal_entity_relationships_active_unique
  ON greenhouse_core.person_legal_entity_relationships (
    profile_id,
    legal_entity_organization_id,
    relationship_type
  )
  WHERE status = 'active' AND effective_to IS NULL;

WITH operating_entity AS (
  SELECT o.organization_id
  FROM greenhouse_core.organizations o
  WHERE o.is_operating_entity = TRUE
    AND o.active = TRUE
  ORDER BY o.updated_at DESC NULLS LAST, o.created_at DESC NULLS LAST, o.organization_id ASC
  LIMIT 1
),
operating_space AS (
  SELECT s.space_id, s.organization_id
  FROM greenhouse_core.spaces s
  INNER JOIN operating_entity oe
    ON oe.organization_id = s.organization_id
  WHERE s.active = TRUE
  ORDER BY s.created_at ASC, s.space_id ASC
  LIMIT 1
),
employee_candidates AS (
  SELECT DISTINCT
    m.identity_profile_id AS profile_id,
    oe.organization_id AS legal_entity_organization_id,
    os.space_id,
    m.role_title
  FROM greenhouse_core.members m
  CROSS JOIN operating_entity oe
  LEFT JOIN operating_space os
    ON os.organization_id = oe.organization_id
  WHERE m.active = TRUE
    AND m.identity_profile_id IS NOT NULL
),
cca_candidates AS (
  SELECT DISTINCT
    sa.profile_id,
    oe.organization_id AS legal_entity_organization_id,
    os.space_id
  FROM greenhouse_finance.shareholder_accounts sa
  CROSS JOIN operating_entity oe
  LEFT JOIN operating_space os
    ON os.organization_id = oe.organization_id
)
INSERT INTO greenhouse_core.person_legal_entity_relationships (
  relationship_id,
  public_id,
  profile_id,
  legal_entity_organization_id,
  space_id,
  relationship_type,
  status,
  source_of_truth,
  source_record_type,
  source_record_id,
  role_label,
  effective_from,
  metadata_json
)
SELECT
  'pler-' || gen_random_uuid()::text AS relationship_id,
  'EO-PLR-' || LPAD(nextval('greenhouse_core.seq_person_legal_entity_relationship_public_id')::text, 4, '0') AS public_id,
  c.profile_id,
  c.legal_entity_organization_id,
  c.space_id,
  c.relationship_type,
  'active' AS status,
  c.source_of_truth,
  c.source_record_type,
  c.source_record_id,
  c.role_label,
  CURRENT_DATE AS effective_from,
  c.metadata_json
FROM (
  SELECT
    ec.profile_id,
    ec.legal_entity_organization_id,
    ec.space_id,
    'employee'::text AS relationship_type,
    'operating_entity_member_runtime'::text AS source_of_truth,
    'identity_profile'::text AS source_record_type,
    ec.profile_id AS source_record_id,
    NULLIF(BTRIM(ec.role_title), '') AS role_label,
    jsonb_build_object('backfilledFrom', 'active_members', 'schemaVersion', 1) AS metadata_json
  FROM employee_candidates ec

  UNION ALL

  SELECT
    cc.profile_id,
    cc.legal_entity_organization_id,
    cc.space_id,
    'shareholder_current_account_holder'::text AS relationship_type,
    'shareholder_account_runtime'::text AS source_of_truth,
    'shareholder_account'::text AS source_record_type,
    cc.profile_id AS source_record_id,
    NULL::text AS role_label,
    jsonb_build_object('backfilledFrom', 'shareholder_accounts', 'schemaVersion', 1) AS metadata_json
  FROM cca_candidates cc
) c
WHERE NOT EXISTS (
  SELECT 1
  FROM greenhouse_core.person_legal_entity_relationships existing
  WHERE existing.profile_id = c.profile_id
    AND existing.legal_entity_organization_id = c.legal_entity_organization_id
    AND existing.relationship_type = c.relationship_type
    AND existing.status = 'active'
    AND existing.effective_to IS NULL
);

ALTER TABLE greenhouse_core.person_legal_entity_relationships OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_person_legal_entity_relationship_public_id OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.person_legal_entity_relationships TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.person_legal_entity_relationships TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.person_legal_entity_relationships TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.seq_person_legal_entity_relationship_public_id TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.seq_person_legal_entity_relationship_public_id TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_core.seq_person_legal_entity_relationship_public_id TO greenhouse_app;

COMMENT ON TABLE greenhouse_core.person_legal_entity_relationships IS
  'Explicit runtime layer for canonical person-to-legal-entity relationships anchored on identity_profiles and organizations.';

COMMENT ON COLUMN greenhouse_core.person_legal_entity_relationships.legal_entity_organization_id IS
  'V1 legal-entity anchor. Reuses greenhouse_core.organizations while preserving explicit legal-relationship semantics.';

-- Down Migration

SET search_path = greenhouse_core, greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_core.idx_person_legal_entity_relationships_active_unique;
DROP INDEX IF EXISTS greenhouse_core.idx_person_legal_entity_relationships_space;
DROP INDEX IF EXISTS greenhouse_core.idx_person_legal_entity_relationships_legal_entity;
DROP INDEX IF EXISTS greenhouse_core.idx_person_legal_entity_relationships_profile;
DROP TABLE IF EXISTS greenhouse_core.person_legal_entity_relationships;
DROP SEQUENCE IF EXISTS greenhouse_core.seq_person_legal_entity_relationship_public_id;
