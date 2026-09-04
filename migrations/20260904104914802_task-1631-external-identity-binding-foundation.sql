-- Up Migration
-- TASK-1631 (EPIC-044 U04) — External identity binding foundation (provider-neutral).
--
-- Schema aditivo diseñado en el Slice 0 (ADR EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1
-- §"Slice 0 binding design proposal") y confirmado por el ADR nativo
-- (EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1 §Decision 5).
--
-- Grafo: organización canónica (Account 360) → binding a un environment de identidad externa →
-- grants por capability namespaceada → personas ligadas por invitación aceptada, cuyo subject vive
-- en `identity_profile_source_links` con `source_system = 'external_idp:<environment_id>'`.
--
-- Invariantes que este DDL hace cumplir:
--   · La organización de Account 360 es el único ancla (FK a greenhouse_core.organizations; sin
--     columnas comerciales ni de provider en el binding).
--   · Un subject externo activo resuelve a UN solo identity_profile (índice único parcial sobre
--     source links external_idp — el UNIQUE existente incluye profile_id y no lo garantizaba).
--   · Las filas durables se llavean por environment_id, nunca por el issuer crudo (la rotación de
--     issuer es un UPDATE auditado sobre el registry).
--   · Audit y resolution log son append-only (triggers).
--   · Sin backfill, sin grants de clientes: la cohorte entra por commands auditados.

SET search_path TO public, greenhouse_core;

-- ---------------------------------------------------------------------------------------------
-- 1. Registry de environments (absorbe la rotación de issuer)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_core.external_identity_environments (
  environment_id            text PRIMARY KEY,
  display_name              text NOT NULL,
  provider                  text NOT NULL,
  provider_environment_ref  text,
  issuer_url                text NOT NULL,
  jwks_uri                  text NOT NULL,
  audience                  text NOT NULL,
  issuer_class              text NOT NULL,
  subject_type              text NOT NULL DEFAULT 'public',
  status                    text NOT NULL DEFAULT 'draft',
  notes                     text,
  created_by                text,
  updated_by                text,
  created_at                timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_identity_environments_id_shape
    CHECK (environment_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  CONSTRAINT external_identity_environments_provider_shape
    CHECK (provider ~ '^[a-z][a-z0-9_]{1,31}$'),
  CONSTRAINT external_identity_environments_issuer_https
    CHECK (issuer_url ~ '^https://[^\s/]+(/[^\s]*)?$'),
  CONSTRAINT external_identity_environments_jwks_https
    CHECK (jwks_uri ~ '^https://[^\s]+$'),
  CONSTRAINT external_identity_environments_issuer_class_valid
    CHECK (issuer_class IN ('internal', 'external')),
  CONSTRAINT external_identity_environments_subject_type_valid
    CHECK (subject_type IN ('public', 'pairwise')),
  CONSTRAINT external_identity_environments_status_valid
    CHECK (status IN ('draft', 'active', 'suspended', 'retired'))
);

-- Un issuer vivo pertenece a un único environment.
CREATE UNIQUE INDEX IF NOT EXISTS external_identity_environments_issuer_live_uidx
  ON greenhouse_core.external_identity_environments (issuer_url)
  WHERE status <> 'retired';

-- ---------------------------------------------------------------------------------------------
-- 2. Binding organización externa ↔ organización canónica
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_core.external_organization_bindings (
  binding_id                    text PRIMARY KEY,
  organization_id               text NOT NULL
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  environment_id                text NOT NULL
    REFERENCES greenhouse_core.external_identity_environments (environment_id) ON DELETE RESTRICT,
  external_organization_ref     text NOT NULL,
  status                        text NOT NULL DEFAULT 'active',
  grants_version                integer NOT NULL DEFAULT 1,
  designated_admin_profile_id   text
    REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE SET NULL,
  reason                        text,
  bound_by                      text NOT NULL,
  bound_at                      timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by                    text,
  revoked_at                    timestamptz,
  revoke_reason                 text,
  created_at                    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_organization_bindings_status_valid
    CHECK (status IN ('active', 'revoked')),
  CONSTRAINT external_organization_bindings_grants_version_positive
    CHECK (grants_version >= 1),
  CONSTRAINT external_organization_bindings_revocation_consistent
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

-- Una organización canónica tiene a lo sumo un binding activo por environment...
CREATE UNIQUE INDEX IF NOT EXISTS external_organization_bindings_org_env_active_uidx
  ON greenhouse_core.external_organization_bindings (organization_id, environment_id)
  WHERE status = 'active';

-- ...y una referencia externa activa apunta a una sola organización canónica por environment.
CREATE UNIQUE INDEX IF NOT EXISTS external_organization_bindings_external_ref_active_uidx
  ON greenhouse_core.external_organization_bindings (environment_id, external_organization_ref)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS external_organization_bindings_org_idx
  ON greenhouse_core.external_organization_bindings (organization_id, status);

-- ---------------------------------------------------------------------------------------------
-- 3. Grants por capability (provider-neutral; profile_id NULL = todos los miembros del binding)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_core.external_capability_grants (
  grant_id        text PRIMARY KEY,
  binding_id      text NOT NULL
    REFERENCES greenhouse_core.external_organization_bindings (binding_id) ON DELETE RESTRICT,
  capability      text NOT NULL,
  profile_id      text
    REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  status          text NOT NULL DEFAULT 'active',
  reason          text,
  granted_by      text NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by      text,
  revoked_at      timestamptz,
  revoke_reason   text,
  created_at      timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_capability_grants_capability_shape
    CHECK (capability ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  CONSTRAINT external_capability_grants_status_valid
    CHECK (status IN ('active', 'revoked')),
  CONSTRAINT external_capability_grants_revocation_consistent
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS external_capability_grants_active_uidx
  ON greenhouse_core.external_capability_grants (binding_id, capability, COALESCE(profile_id, ''))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS external_capability_grants_binding_idx
  ON greenhouse_core.external_capability_grants (binding_id, status);

-- ---------------------------------------------------------------------------------------------
-- 4. Invitaciones (ciclo auditado; la fila 'linked' ES la membership de acceso externo)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_core.external_member_invitations (
  invitation_id       text PRIMARY KEY,
  binding_id          text NOT NULL
    REFERENCES greenhouse_core.external_organization_bindings (binding_id) ON DELETE RESTRICT,
  profile_id          text
    REFERENCES greenhouse_core.identity_profiles (profile_id) ON DELETE RESTRICT,
  email               text NOT NULL,
  email_normalized    text NOT NULL,
  designated_admin    boolean NOT NULL DEFAULT false,
  token_hash          text NOT NULL,
  status              text NOT NULL DEFAULT 'issued',
  reason              text,
  issued_by           text NOT NULL,
  issued_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          timestamptz NOT NULL,
  accepted_at         timestamptz,
  linked_at           timestamptz,
  link_id             text
    REFERENCES greenhouse_core.identity_profile_source_links (link_id) ON DELETE SET NULL,
  revoked_by          text,
  revoked_at          timestamptz,
  revoke_reason       text,
  created_at          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_member_invitations_status_valid
    CHECK (status IN ('issued', 'accepted', 'linked', 'revoked', 'expired')),
  CONSTRAINT external_member_invitations_email_normalized_shape
    CHECK (email_normalized = lower(btrim(email_normalized)) AND email_normalized ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  CONSTRAINT external_member_invitations_token_hash_shape
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT external_member_invitations_linked_consistent
    CHECK ((status = 'linked') = (linked_at IS NOT NULL AND profile_id IS NOT NULL AND link_id IS NOT NULL)),
  CONSTRAINT external_member_invitations_revocation_consistent
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS external_member_invitations_token_hash_uidx
  ON greenhouse_core.external_member_invitations (token_hash);

-- Una sola invitación abierta por email y binding (idempotencia del command).
CREATE UNIQUE INDEX IF NOT EXISTS external_member_invitations_open_uidx
  ON greenhouse_core.external_member_invitations (binding_id, email_normalized)
  WHERE status IN ('issued', 'accepted');

-- La membership de acceso externo: una persona ligada una sola vez por binding.
CREATE UNIQUE INDEX IF NOT EXISTS external_member_invitations_linked_uidx
  ON greenhouse_core.external_member_invitations (binding_id, profile_id)
  WHERE status = 'linked';

CREATE INDEX IF NOT EXISTS external_member_invitations_profile_idx
  ON greenhouse_core.external_member_invitations (profile_id, status);

-- ---------------------------------------------------------------------------------------------
-- 5. Audit append-only de binding/grant/invitación/revocación/environment
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_core.external_identity_audit_log (
  audit_id          text PRIMARY KEY,
  event_type        text NOT NULL,
  environment_id    text,
  binding_id        text,
  grant_id          text,
  invitation_id     text,
  organization_id   text,
  profile_id        text,
  performed_by      text NOT NULL,
  reason            text,
  outcome           text NOT NULL DEFAULT 'applied',
  metadata_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_identity_audit_log_event_type_valid CHECK (event_type IN (
    'environment_upserted',
    'organization_bound',
    'capability_granted',
    'invitation_issued',
    'invitation_linked',
    'binding_revoked',
    'grant_revoked',
    'member_revoked',
    'invitation_revoked'
  )),
  CONSTRAINT external_identity_audit_log_outcome_valid CHECK (outcome IN ('applied', 'noop'))
);

CREATE INDEX IF NOT EXISTS external_identity_audit_log_binding_idx
  ON greenhouse_core.external_identity_audit_log (binding_id, created_at DESC);

CREATE INDEX IF NOT EXISTS external_identity_audit_log_org_idx
  ON greenhouse_core.external_identity_audit_log (organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_core.external_identity_audit_log_prevent_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'external_identity_audit_log is append-only. % blocked.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_update_external_identity_audit_log
  ON greenhouse_core.external_identity_audit_log;
CREATE TRIGGER prevent_update_external_identity_audit_log
  BEFORE UPDATE ON greenhouse_core.external_identity_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.external_identity_audit_log_prevent_mutation();

DROP TRIGGER IF EXISTS prevent_delete_external_identity_audit_log
  ON greenhouse_core.external_identity_audit_log;
CREATE TRIGGER prevent_delete_external_identity_audit_log
  BEFORE DELETE ON greenhouse_core.external_identity_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.external_identity_audit_log_prevent_mutation();

-- ---------------------------------------------------------------------------------------------
-- 6. Resolution log (append-only; SÓLO denials — alimenta unbound_dispatch_attempt y
--    revoked_still_dispatching sin telemetría cross-runtime; el subject se guarda hasheado)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS greenhouse_core.external_access_resolution_log (
  resolution_id     text PRIMARY KEY,
  environment_id    text NOT NULL,
  subject_hash      text NOT NULL,
  client_id         text,
  outcome           text NOT NULL,
  binding_id        text,
  profile_id        text,
  grants_version    integer,
  resolved_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_access_resolution_log_outcome_valid CHECK (outcome IN (
    'bound',
    'unbound',
    'revoked',
    'environment_inactive',
    'profile_inactive'
  )),
  CONSTRAINT external_access_resolution_log_subject_hash_shape
    CHECK (subject_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS external_access_resolution_log_outcome_time_idx
  ON greenhouse_core.external_access_resolution_log (outcome, resolved_at DESC);

CREATE INDEX IF NOT EXISTS external_access_resolution_log_binding_time_idx
  ON greenhouse_core.external_access_resolution_log (binding_id, resolved_at DESC)
  WHERE binding_id IS NOT NULL;

CREATE OR REPLACE FUNCTION greenhouse_core.external_access_resolution_log_prevent_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'external_access_resolution_log is append-only. % blocked.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_update_external_access_resolution_log
  ON greenhouse_core.external_access_resolution_log;
CREATE TRIGGER prevent_update_external_access_resolution_log
  BEFORE UPDATE ON greenhouse_core.external_access_resolution_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.external_access_resolution_log_prevent_mutation();

DROP TRIGGER IF EXISTS prevent_delete_external_access_resolution_log
  ON greenhouse_core.external_access_resolution_log;
CREATE TRIGGER prevent_delete_external_access_resolution_log
  BEFORE DELETE ON greenhouse_core.external_access_resolution_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.external_access_resolution_log_prevent_mutation();

-- ---------------------------------------------------------------------------------------------
-- 7. Un subject externo activo → UN solo identity_profile (y lookup inverso por subject)
-- ---------------------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS identity_profile_source_links_external_idp_subject_uidx
  ON greenhouse_core.identity_profile_source_links (source_system, source_object_type, source_object_id)
  WHERE active AND source_system LIKE 'external_idp:%';

-- ---------------------------------------------------------------------------------------------
-- 8. person_360.linked_systems ve los links external_idp (la función devolvía NULL = oculto)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION greenhouse_core.canonical_source_system(raw TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN raw IN ('azure_ad', 'azure-ad', 'microsoft_sso', 'entra') THEN 'microsoft'
    WHEN raw IN ('hubspot', 'hubspot_crm')                         THEN 'hubspot'
    WHEN raw = 'notion'                                             THEN 'notion'
    WHEN raw IN ('google', 'google_oauth', 'google_workspace')     THEN 'google'
    WHEN raw IN ('deel', 'deel_hr', 'deel_com')                    THEN 'deel'
    WHEN raw LIKE 'external_idp:%'                                  THEN 'external_idp'
    ELSE NULL  -- internal systems (greenhouse_auth, greenhouse_team, etc.) are not shown
  END;
$$ LANGUAGE sql IMMUTABLE;

-- ---------------------------------------------------------------------------------------------
-- 9. Capabilities dedicadas (una por autoridad; NUNCA un cajón identity.admin)
-- ---------------------------------------------------------------------------------------------
INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('identity.external_environment.manage', 'organization', ARRAY['create', 'update'], ARRAY['tenant'],
   'TASK-1631 — Registrar/actualizar un environment de identidad externa (issuer, JWKS, audience, clase).', NOW(), NULL),
  ('identity.external_binding.read', 'organization', ARRAY['read'], ARRAY['tenant'],
   'TASK-1631 — Leer environments, bindings, grants, invitaciones y elegibilidad de organizaciones cliente.', NOW(), NULL),
  ('identity.external_binding.bind', 'organization', ARRAY['create'], ARRAY['tenant'],
   'TASK-1631 — Ligar una organización cliente existente de Account 360 a un environment externo.', NOW(), NULL),
  ('identity.external_grant.issue', 'organization', ARRAY['create'], ARRAY['tenant'],
   'TASK-1631 — Otorgar una capability namespaceada a un binding (o a una persona del binding).', NOW(), NULL),
  ('identity.external_invitation.issue', 'organization', ARRAY['create'], ARRAY['tenant'],
   'TASK-1631 — Emitir una invitación auditada a una persona de la organización ligada.', NOW(), NULL),
  ('identity.external_access.revoke', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1631 — Revocar binding, grant o membership externa (bump de grants_version, fail-closed).', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions, allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description, deprecated_at = NULL;

-- ---------------------------------------------------------------------------------------------
-- 10. Anti pre-up-marker guard: aborta si el DDL no quedó aplicado
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  tables_count integer;
  index_exists boolean;
  seeded_count integer;
  fn_label text;
BEGIN
  SELECT count(*) INTO tables_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_core'
    AND table_name IN (
      'external_identity_environments',
      'external_organization_bindings',
      'external_capability_grants',
      'external_member_invitations',
      'external_identity_audit_log',
      'external_access_resolution_log'
    );
  IF tables_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1631 anti pre-up-marker check: se esperaban 6 tablas external_* y hay %.', tables_count;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_core'
      AND indexname = 'identity_profile_source_links_external_idp_subject_uidx'
  ) INTO index_exists;
  IF NOT index_exists THEN
    RAISE EXCEPTION 'TASK-1631 anti pre-up-marker check: falta el índice único parcial de subjects external_idp.';
  END IF;

  SELECT count(*) INTO seeded_count
  FROM greenhouse_core.capabilities_registry
  WHERE capability_key IN (
    'identity.external_environment.manage',
    'identity.external_binding.read',
    'identity.external_binding.bind',
    'identity.external_grant.issue',
    'identity.external_invitation.issue',
    'identity.external_access.revoke'
  ) AND deprecated_at IS NULL;
  IF seeded_count <> 6 THEN
    RAISE EXCEPTION 'TASK-1631 anti pre-up-marker check: se esperaban 6 capabilities activas y hay %.', seeded_count;
  END IF;

  SELECT greenhouse_core.canonical_source_system('external_idp:efeonce-auth') INTO fn_label;
  IF fn_label IS DISTINCT FROM 'external_idp' THEN
    RAISE EXCEPTION 'TASK-1631 anti pre-up-marker check: canonical_source_system no reconoce external_idp:*.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------------------------
-- 11. Ownership + grants
-- ---------------------------------------------------------------------------------------------
ALTER TABLE greenhouse_core.external_identity_environments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_organization_bindings OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_capability_grants OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_member_invitations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_identity_audit_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_access_resolution_log OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_core.external_identity_environments TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.external_organization_bindings TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.external_capability_grants TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.external_member_invitations TO greenhouse_runtime, greenhouse_app;
-- Append-only: el runtime sólo lee e inserta.
GRANT SELECT, INSERT ON greenhouse_core.external_identity_audit_log TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT ON greenhouse_core.external_access_resolution_log TO greenhouse_runtime, greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_core.external_identity_environments,
     greenhouse_core.external_organization_bindings,
     greenhouse_core.external_capability_grants,
     greenhouse_core.external_member_invitations,
     greenhouse_core.external_identity_audit_log,
     greenhouse_core.external_access_resolution_log
  TO greenhouse_migrator;

GRANT EXECUTE ON FUNCTION greenhouse_core.canonical_source_system(TEXT) TO greenhouse_runtime, greenhouse_migrator, greenhouse_app;

-- Down Migration

-- SÓLO undo. Las capabilities se deprecan, nunca se borran (patrón TASK-840).
UPDATE greenhouse_core.capabilities_registry
   SET deprecated_at = NOW()
 WHERE capability_key IN (
   'identity.external_environment.manage',
   'identity.external_binding.read',
   'identity.external_binding.bind',
   'identity.external_grant.issue',
   'identity.external_invitation.issue',
   'identity.external_access.revoke'
 );

CREATE OR REPLACE FUNCTION greenhouse_core.canonical_source_system(raw TEXT)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN raw IN ('azure_ad', 'azure-ad', 'microsoft_sso', 'entra') THEN 'microsoft'
    WHEN raw IN ('hubspot', 'hubspot_crm')                         THEN 'hubspot'
    WHEN raw = 'notion'                                             THEN 'notion'
    WHEN raw IN ('google', 'google_oauth', 'google_workspace')     THEN 'google'
    WHEN raw IN ('deel', 'deel_hr', 'deel_com')                    THEN 'deel'
    ELSE NULL
  END;
$$ LANGUAGE sql IMMUTABLE;

DROP INDEX IF EXISTS greenhouse_core.identity_profile_source_links_external_idp_subject_uidx;

DROP TABLE IF EXISTS greenhouse_core.external_access_resolution_log;
DROP FUNCTION IF EXISTS greenhouse_core.external_access_resolution_log_prevent_mutation();
DROP TABLE IF EXISTS greenhouse_core.external_identity_audit_log;
DROP FUNCTION IF EXISTS greenhouse_core.external_identity_audit_log_prevent_mutation();
DROP TABLE IF EXISTS greenhouse_core.external_member_invitations;
DROP TABLE IF EXISTS greenhouse_core.external_capability_grants;
DROP TABLE IF EXISTS greenhouse_core.external_organization_bindings;
DROP TABLE IF EXISTS greenhouse_core.external_identity_environments;
