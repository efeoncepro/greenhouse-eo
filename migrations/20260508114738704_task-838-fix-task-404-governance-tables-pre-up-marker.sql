-- Up Migration

-- TASK-838 / ISSUE-068 — Forward fix de TASK-404 governance tables.
-- ============================================================================
-- Causa raíz: migration `20260417044741101_task-404-entitlements-governance.sql`
-- tiene los 3 CREATE TABLE bajo `-- Down Migration`. node-pg-migrate parseó la
-- sección Up vacía, registró la migration como aplicada en pgmigrations, pero
-- nunca ejecutó el SQL. Las 3 governance tables nunca existieron en PG.
--
-- Esta migration crea las 3 tablas con schema idéntico al SQL legacy, agrega
-- bloque DO con RAISE EXCEPTION post-apply (anti pre-up-marker bug), y es
-- idempotente vía `IF NOT EXISTS` para que un re-run no falle.
--
-- NO se edita la migration legacy (`20260417044741101`) — está registrada en
-- pgmigrations. Editar legacy rompería environments fresh. Patrón canónico
-- forward fix: misma técnica que TASK-768 Slice 1.
--
-- Schema preservado idéntico al spec original de TASK-404
-- (docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md
-- Delta 2026-04-17).

-- 1. role_entitlement_defaults — defaults por (space_id, role_code, capability, action, scope)
CREATE TABLE IF NOT EXISTS greenhouse_core.role_entitlement_defaults (
  default_id  text PRIMARY KEY,
  space_id    text NOT NULL,
  role_code   text NOT NULL REFERENCES greenhouse_core.roles(role_code),
  capability  text NOT NULL,
  action      text NOT NULL,
  scope       text NOT NULL,
  effect      text NOT NULL CHECK (effect IN ('grant', 'revoke')),
  reason      text,
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by  text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS role_entitlement_defaults_unique_scope
  ON greenhouse_core.role_entitlement_defaults (space_id, role_code, capability, action, scope);

CREATE INDEX IF NOT EXISTS idx_role_entitlement_defaults_role
  ON greenhouse_core.role_entitlement_defaults (space_id, role_code, updated_at DESC);

-- 2. user_entitlement_overrides — overrides por (space_id, user_id, capability, action, scope)
CREATE TABLE IF NOT EXISTS greenhouse_core.user_entitlement_overrides (
  override_id  text PRIMARY KEY,
  space_id     text NOT NULL,
  user_id      text NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  capability   text NOT NULL,
  action       text NOT NULL,
  scope        text NOT NULL,
  effect       text NOT NULL CHECK (effect IN ('grant', 'revoke')),
  reason       text NOT NULL,
  expires_at   timestamptz,
  granted_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS user_entitlement_overrides_unique_scope
  ON greenhouse_core.user_entitlement_overrides (space_id, user_id, capability, action, scope);

CREATE INDEX IF NOT EXISTS idx_user_entitlement_overrides_active
  ON greenhouse_core.user_entitlement_overrides (space_id, user_id, expires_at);

-- 3. entitlement_governance_audit_log — append-only audit
CREATE TABLE IF NOT EXISTS greenhouse_core.entitlement_governance_audit_log (
  audit_id          text PRIMARY KEY,
  space_id          text NOT NULL,
  change_type       text NOT NULL CHECK (
    change_type IN (
      'role_default_grant',
      'role_default_revoke',
      'user_override_grant',
      'user_override_revoke',
      'startup_policy_update'
    )
  ),
  target_role       text,
  target_user       text,
  capability        text,
  action            text,
  scope             text,
  effect            text CHECK (effect IN ('grant', 'revoke')),
  policy_key        text,
  configured_path   text,
  performed_by      text NOT NULL,
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entitlement_governance_audit_log_scope
  ON greenhouse_core.entitlement_governance_audit_log (space_id, created_at DESC);

-- Append-only enforcement (TASK-742 / TASK-784 audit log pattern).
CREATE OR REPLACE FUNCTION greenhouse_core.entitlement_governance_audit_log_prevent_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'entitlement_governance_audit_log is append-only. % blocked.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_update_entitlement_governance_audit_log
  ON greenhouse_core.entitlement_governance_audit_log;

CREATE TRIGGER prevent_update_entitlement_governance_audit_log
  BEFORE UPDATE ON greenhouse_core.entitlement_governance_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.entitlement_governance_audit_log_prevent_mutation();

DROP TRIGGER IF EXISTS prevent_delete_entitlement_governance_audit_log
  ON greenhouse_core.entitlement_governance_audit_log;

CREATE TRIGGER prevent_delete_entitlement_governance_audit_log
  BEFORE DELETE ON greenhouse_core.entitlement_governance_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.entitlement_governance_audit_log_prevent_mutation();

-- Anti pre-up-marker bug guard: verifica que las 3 tablas + 5 indexes realmente
-- quedaron creados en information_schema. Si falta cualquier objeto, aborta
-- la migration con mensaje accionable.
DO $$
DECLARE
  expected_tables CONSTANT text[] := ARRAY[
    'role_entitlement_defaults',
    'user_entitlement_overrides',
    'entitlement_governance_audit_log'
  ];
  expected_indexes CONSTANT text[] := ARRAY[
    'role_entitlement_defaults_unique_scope',
    'idx_role_entitlement_defaults_role',
    'user_entitlement_overrides_unique_scope',
    'idx_user_entitlement_overrides_active',
    'idx_entitlement_governance_audit_log_scope'
  ];
  missing_table  text;
  missing_index  text;
BEGIN
  FOR missing_table IN
    SELECT t FROM unnest(expected_tables) AS t
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'greenhouse_core' AND table_name = t
    )
  LOOP
    RAISE EXCEPTION
      'TASK-838 anti pre-up-marker check FAILED: table greenhouse_core.% was NOT created. Migration markers may be inverted.',
      missing_table;
  END LOOP;

  FOR missing_index IN
    SELECT i FROM unnest(expected_indexes) AS i
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'greenhouse_core' AND indexname = i
    )
  LOOP
    RAISE EXCEPTION
      'TASK-838 anti pre-up-marker check FAILED: index greenhouse_core.% was NOT created.',
      missing_index;
  END LOOP;
END
$$;

-- GRANTs idénticos al spec original de TASK-404 (Delta 2026-04-17).
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.role_entitlement_defaults TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.user_entitlement_overrides TO greenhouse_runtime;
-- audit_log: read + insert (append-only enforced también por triggers PG).
GRANT SELECT, INSERT ON greenhouse_core.entitlement_governance_audit_log TO greenhouse_runtime;

-- Down Migration

DROP TRIGGER IF EXISTS prevent_delete_entitlement_governance_audit_log
  ON greenhouse_core.entitlement_governance_audit_log;
DROP TRIGGER IF EXISTS prevent_update_entitlement_governance_audit_log
  ON greenhouse_core.entitlement_governance_audit_log;
DROP FUNCTION IF EXISTS greenhouse_core.entitlement_governance_audit_log_prevent_mutation();

DROP TABLE IF EXISTS greenhouse_core.entitlement_governance_audit_log;
DROP TABLE IF EXISTS greenhouse_core.user_entitlement_overrides;
DROP TABLE IF EXISTS greenhouse_core.role_entitlement_defaults;
