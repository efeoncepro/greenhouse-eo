-- Up Migration
-- TASK-1832 (EPIC-044 U13) — carril canary externo sintético, temporal y eliminable.
-- Additive y fail-closed: registry vacío, gate runtime OFF y bindings existentes clasificados como customer.

SET LOCAL search_path = greenhouse_core, public;

-- 1. Allowlist exacta por corrida. No es una party comercial ni un catálogo de clientes.
CREATE TABLE IF NOT EXISTS greenhouse_core.external_canary_registrations (
  canary_registration_id      text PRIMARY KEY,
  run_id                      text NOT NULL UNIQUE,
  organization_id             text NOT NULL UNIQUE
    REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  environment_id              text NOT NULL
    REFERENCES greenhouse_core.external_identity_environments (environment_id) ON DELETE RESTRICT,
  external_organization_ref   text NOT NULL,
  capability                  text NOT NULL
    REFERENCES greenhouse_core.capabilities_registry (capability_key) ON DELETE RESTRICT,
  status                      text NOT NULL DEFAULT 'active',
  reason                      text NOT NULL,
  registered_by               text NOT NULL,
  registered_at               timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at                  timestamptz NOT NULL,
  revoked_by                  text,
  revoked_at                  timestamptz,
  revoke_reason               text,
  created_at                  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT external_canary_registrations_id_shape
    CHECK (canary_registration_id ~ '^xcr-[0-9a-f-]{36}$'),
  CONSTRAINT external_canary_registrations_run_id_shape
    CHECK (run_id ~ '^[a-z0-9][a-z0-9_-]{2,127}$'),
  CONSTRAINT external_canary_registrations_capability_v1
    CHECK (capability = 'growth.seo.observation.read'),
  CONSTRAINT external_canary_registrations_status_valid
    CHECK (status IN ('active', 'revoked')),
  CONSTRAINT external_canary_registrations_expiry_valid
    CHECK (expires_at >= registered_at + INTERVAL '1 hour'
      AND expires_at <= registered_at + INTERVAL '30 days'),
  CONSTRAINT external_canary_registrations_revocation_consistent
    CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS external_canary_registrations_environment_ref_uidx
  ON greenhouse_core.external_canary_registrations (environment_id, external_organization_ref);
CREATE INDEX IF NOT EXISTS external_canary_registrations_active_expiry_idx
  ON greenhouse_core.external_canary_registrations (expires_at)
  WHERE status = 'active';

-- 2. Propósito explícito. Internal nunca hereda semántica customer; canary siempre tiene registry + TTL.
ALTER TABLE greenhouse_core.external_organization_bindings
  ADD COLUMN IF NOT EXISTS binding_purpose text,
  ADD COLUMN IF NOT EXISTS canary_registration_id text
    REFERENCES greenhouse_core.external_canary_registrations (canary_registration_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE greenhouse_core.external_organization_bindings
   SET binding_purpose = CASE WHEN population = 'external' THEN 'customer' ELSE NULL END
 WHERE binding_purpose IS NULL;

ALTER TABLE greenhouse_core.external_organization_bindings
  ALTER COLUMN binding_purpose SET DEFAULT 'customer';

ALTER TABLE greenhouse_core.external_organization_bindings
  DROP CONSTRAINT IF EXISTS external_organization_bindings_purpose_valid;
ALTER TABLE greenhouse_core.external_organization_bindings
  ADD CONSTRAINT external_organization_bindings_purpose_valid CHECK (
    (population = 'internal' AND binding_purpose IS NULL AND canary_registration_id IS NULL AND expires_at IS NULL)
    OR
    (population = 'external' AND binding_purpose = 'customer' AND canary_registration_id IS NULL AND expires_at IS NULL)
    OR
    (population = 'external' AND binding_purpose = 'canary' AND canary_registration_id IS NOT NULL
      AND expires_at IS NOT NULL AND designated_admin_profile_id IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS external_organization_bindings_canary_registration_uidx
  ON greenhouse_core.external_organization_bindings (canary_registration_id)
  WHERE canary_registration_id IS NOT NULL;

-- 3. Guardas de integridad cross-row. Los commands dan errores canónicos; estas guardas impiden bypass SQL.
CREATE OR REPLACE FUNCTION greenhouse_core.guard_authority_population_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.population IS DISTINCT FROM OLD.population
     OR NEW.binding_purpose IS DISTINCT FROM OLD.binding_purpose
     OR NEW.canary_registration_id IS DISTINCT FROM OLD.canary_registration_id
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'authority population, purpose, registration and expiry are immutable';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS authority_population_immutable ON greenhouse_core.external_organization_bindings;
CREATE TRIGGER authority_population_immutable
  BEFORE UPDATE OF population, binding_purpose, canary_registration_id, expires_at
  ON greenhouse_core.external_organization_bindings
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_authority_population_immutable();

CREATE OR REPLACE FUNCTION greenhouse_core.guard_external_canary_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE registration greenhouse_core.external_canary_registrations%ROWTYPE;
BEGIN
  IF NEW.population = 'external' AND NEW.binding_purpose = 'canary' THEN
    SELECT * INTO registration
      FROM greenhouse_core.external_canary_registrations
     WHERE canary_registration_id = NEW.canary_registration_id;

    IF NOT FOUND OR registration.organization_id IS DISTINCT FROM NEW.organization_id
       OR registration.environment_id IS DISTINCT FROM NEW.environment_id
       OR registration.external_organization_ref IS DISTINCT FROM NEW.external_organization_ref
       OR registration.expires_at IS DISTINCT FROM NEW.expires_at THEN
      RAISE EXCEPTION 'canary binding requires one exact active registration';
    END IF;
    IF NEW.status = 'active' AND (registration.status <> 'active' OR registration.expires_at <= CURRENT_TIMESTAMP) THEN
      RAISE EXCEPTION 'active canary binding requires a live registration';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS external_canary_binding_guard ON greenhouse_core.external_organization_bindings;
CREATE TRIGGER external_canary_binding_guard
  BEFORE INSERT OR UPDATE OF organization_id, environment_id, external_organization_ref, status,
    binding_purpose, canary_registration_id, expires_at, designated_admin_profile_id
  ON greenhouse_core.external_organization_bindings
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_external_canary_binding();

CREATE OR REPLACE FUNCTION greenhouse_core.guard_external_canary_registration_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.run_id IS DISTINCT FROM OLD.run_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.environment_id IS DISTINCT FROM OLD.environment_id
     OR NEW.external_organization_ref IS DISTINCT FROM OLD.external_organization_ref
     OR NEW.capability IS DISTINCT FROM OLD.capability
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR OLD.status = 'revoked' THEN
    RAISE EXCEPTION 'canary registration identity and expiry are immutable; revoked is terminal';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS external_canary_registration_immutable ON greenhouse_core.external_canary_registrations;
CREATE TRIGGER external_canary_registration_immutable
  BEFORE UPDATE ON greenhouse_core.external_canary_registrations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_external_canary_registration_immutable();

CREATE OR REPLACE FUNCTION greenhouse_core.guard_external_canary_authority_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE binding_purpose text;
DECLARE binding_expiry timestamptz;
DECLARE binding_status text;
DECLARE registration_status text;
DECLARE registration_expiry timestamptz;
DECLARE profile_origin text;
BEGIN
  SELECT b.binding_purpose, b.expires_at, b.status, r.status, r.expires_at
    INTO binding_purpose, binding_expiry, binding_status, registration_status, registration_expiry
    FROM greenhouse_core.external_organization_bindings b
    LEFT JOIN greenhouse_core.external_canary_registrations r
      ON r.canary_registration_id = b.canary_registration_id
   WHERE b.binding_id = NEW.binding_id;

  IF binding_purpose = 'canary' THEN
    IF TG_TABLE_NAME = 'external_capability_grants' THEN
      IF NEW.capability <> 'growth.seo.observation.read' OR NEW.profile_id IS NULL
         OR NEW.expires_at IS NULL OR NEW.expires_at > binding_expiry THEN
        RAISE EXCEPTION 'canary grant must be personal, read-only and bounded by binding expiry';
      END IF;
    ELSE
      IF NEW.designated_admin OR NEW.expires_at > binding_expiry THEN
        RAISE EXCEPTION 'canary invitation cannot delegate authority or outlive the binding';
      END IF;
    END IF;

    IF ((TG_TABLE_NAME = 'external_capability_grants' AND NEW.status = 'active')
        OR (TG_TABLE_NAME = 'external_member_invitations' AND NEW.status IN ('issued','accepted','linked')))
       AND (binding_status <> 'active' OR binding_expiry <= CURRENT_TIMESTAMP
         OR registration_status IS DISTINCT FROM 'active' OR registration_expiry <= CURRENT_TIMESTAMP) THEN
      RAISE EXCEPTION 'active canary authority requires a live binding and registration';
    END IF;

    IF NEW.profile_id IS NOT NULL THEN
      SELECT data_origin INTO profile_origin FROM greenhouse_core.identity_profiles WHERE profile_id = NEW.profile_id;
      IF profile_origin IS DISTINCT FROM 'smoke_test' THEN
        RAISE EXCEPTION 'canary authority requires a smoke_test profile';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS external_canary_grant_guard ON greenhouse_core.external_capability_grants;
CREATE TRIGGER external_canary_grant_guard
  BEFORE INSERT OR UPDATE OF binding_id, capability, profile_id, expires_at, status
  ON greenhouse_core.external_capability_grants
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_external_canary_authority_child();

DROP TRIGGER IF EXISTS external_canary_invitation_guard ON greenhouse_core.external_member_invitations;
CREATE TRIGGER external_canary_invitation_guard
  BEFORE INSERT OR UPDATE OF binding_id, profile_id, designated_admin, expires_at, status
  ON greenhouse_core.external_member_invitations
  FOR EACH ROW EXECUTE FUNCTION greenhouse_core.guard_external_canary_authority_child();

ALTER FUNCTION greenhouse_core.guard_authority_population_immutable() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.guard_external_canary_binding() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.guard_external_canary_registration_immutable() OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_core.guard_external_canary_authority_child() OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.external_canary_registrations OWNER TO greenhouse_ops;
GRANT SELECT, INSERT, UPDATE ON greenhouse_core.external_canary_registrations TO greenhouse_runtime, greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.external_canary_registrations TO greenhouse_migrator_user;

COMMENT ON TABLE greenhouse_core.external_canary_registrations IS
  'TASK-1832 exact allowlist for synthetic external MCP certification fixtures; never a customer roster.';

-- 4. Audit/outcomes y autoridades administrativas finas.
ALTER TABLE greenhouse_core.external_identity_audit_log
  DROP CONSTRAINT external_identity_audit_log_event_type_valid;
ALTER TABLE greenhouse_core.external_identity_audit_log
  ADD CONSTRAINT external_identity_audit_log_event_type_valid CHECK(event_type IN (
    'environment_upserted','organization_bound','capability_granted','invitation_issued','invitation_linked',
    'binding_revoked','grant_revoked','member_revoked','invitation_revoked','binding_reconciled','grant_reconciled',
    'internal_member_linked','invitation_resent','invitation_token_revealed','invitation_delivery_failed',
    'invitation_delivery_bounced','designated_admin_assigned','designated_admin_cleared',
    'canary_registered','canary_revoked','canary_cleanup_completed'
  ));

ALTER TABLE greenhouse_core.external_access_resolution_log
  DROP CONSTRAINT external_access_resolution_log_outcome_valid;
ALTER TABLE greenhouse_core.external_access_resolution_log
  ADD CONSTRAINT external_access_resolution_log_outcome_valid CHECK(outcome IN (
    'bound','unbound','revoked','environment_inactive','profile_inactive','internal_population',
    'canary_disabled','canary_not_registered','canary_expired'
  ));

INSERT INTO greenhouse_core.capabilities_registry
  (capability_key, module, allowed_actions, allowed_scopes, description, introduced_at, deprecated_at)
VALUES
  ('identity.external_canary.register', 'organization', ARRAY['create'], ARRAY['tenant'],
   'TASK-1832 — Crear una organización canary no comercial y su registro temporal exacto.', NOW(), NULL),
  ('identity.external_canary.bind', 'organization', ARRAY['create'], ARRAY['tenant'],
   'TASK-1832 — Ligar exclusivamente una organización canary registrada y vigente.', NOW(), NULL),
  ('identity.external_canary.revoke', 'organization', ARRAY['execute'], ARRAY['tenant'],
   'TASK-1832 — Revocar o retirar un fixture canary exacto con auditoría y dry-run.', NOW(), NULL)
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module, allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes, description = EXCLUDED.description, deprecated_at = NULL;

-- 5. Anti pre-up-marker: no certifica un registry o purpose incompleto.
DO $$
DECLARE binding_table oid := 'greenhouse_core.external_organization_bindings'::regclass;
DECLARE registration_table oid := 'greenhouse_core.external_canary_registrations'::regclass;
DECLARE cap_count integer;
BEGIN
  IF EXISTS (SELECT 1 FROM greenhouse_core.external_organization_bindings
              WHERE population='external' AND binding_purpose IS DISTINCT FROM 'customer') THEN
    RAISE EXCEPTION 'TASK-1832: existing external bindings were not classified as customer';
  END IF;
  IF EXISTS (SELECT 1 FROM greenhouse_core.external_organization_bindings
              WHERE population='internal' AND binding_purpose IS NOT NULL) THEN
    RAISE EXCEPTION 'TASK-1832: internal binding inherited an external purpose';
  END IF;
  IF EXISTS (SELECT 1 FROM greenhouse_core.external_canary_registrations) THEN
    RAISE EXCEPTION 'TASK-1832: registry must be empty at migration time';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=binding_table
                  AND conname='external_organization_bindings_purpose_valid' AND convalidated) THEN
    RAISE EXCEPTION 'TASK-1832: purpose constraint missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=registration_table
                  AND tgname='external_canary_registration_immutable' AND tgenabled <> 'D') THEN
    RAISE EXCEPTION 'TASK-1832: registration immutability trigger missing';
  END IF;
  SELECT count(*) INTO cap_count FROM greenhouse_core.capabilities_registry
   WHERE capability_key IN ('identity.external_canary.register','identity.external_canary.bind','identity.external_canary.revoke')
     AND deprecated_at IS NULL;
  IF cap_count <> 3 THEN RAISE EXCEPTION 'TASK-1832: expected 3 active canary capabilities'; END IF;
END $$;

-- Down Migration
-- Forward-only: purpose/audit data cannot be unclassified safely. Disable both gates and revoke the
-- exact registration; a future correction must be additive.
DO $$ BEGIN
  RAISE EXCEPTION 'TASK-1832 is forward-only; disable canary gates and use governed revocation/cleanup';
END $$;
