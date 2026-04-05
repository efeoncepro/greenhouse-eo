-- Up Migration
-- TASK-227: Operational Responsibility Registry
-- Canonical registry for scoped operational responsibilities (account lead, delivery lead, etc.)
-- Architecture ref: docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md § 4

SET search_path = greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_core.operational_responsibilities (
  responsibility_id     TEXT        PRIMARY KEY,
  member_id             TEXT        NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  scope_type            TEXT        NOT NULL CHECK (scope_type IN ('organization', 'space', 'project', 'department')),
  scope_id              TEXT        NOT NULL,
  responsibility_type   TEXT        NOT NULL CHECK (responsibility_type IN ('account_lead', 'delivery_lead', 'finance_reviewer', 'approval_delegate', 'operations_lead')),
  is_primary            BOOLEAN     NOT NULL DEFAULT FALSE,
  effective_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to          TIMESTAMPTZ,
  active                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE greenhouse_core.operational_responsibilities IS
  'TASK-227: Canonical registry of scoped operational responsibilities. Plane 4 of GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.';

-- Lookup by member
CREATE INDEX IF NOT EXISTS idx_opresp_member_id
  ON greenhouse_core.operational_responsibilities (member_id);

-- Lookup by scope
CREATE INDEX IF NOT EXISTS idx_opresp_scope
  ON greenhouse_core.operational_responsibilities (scope_type, scope_id);

-- Lookup by type within a scope
CREATE INDEX IF NOT EXISTS idx_opresp_scope_type
  ON greenhouse_core.operational_responsibilities (scope_id, responsibility_type);

-- Partial index: only active responsibilities
CREATE INDEX IF NOT EXISTS idx_opresp_active
  ON greenhouse_core.operational_responsibilities (active) WHERE active = TRUE;

-- Enforce at most one primary per scope + responsibility_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_opresp_unique_primary
  ON greenhouse_core.operational_responsibilities (scope_type, scope_id, responsibility_type)
  WHERE is_primary = TRUE AND active = TRUE;

-- Prevent duplicate active assignments: same member + scope + type + effective_from
CREATE UNIQUE INDEX IF NOT EXISTS idx_opresp_no_dup_assignment
  ON greenhouse_core.operational_responsibilities (member_id, scope_type, scope_id, responsibility_type, effective_from)
  WHERE active = TRUE;

ALTER TABLE greenhouse_core.operational_responsibilities OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.operational_responsibilities TO greenhouse_runtime;


-- Down Migration

DROP TABLE IF EXISTS greenhouse_core.operational_responsibilities;
