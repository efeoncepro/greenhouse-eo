-- Up Migration

-- TASK-1229 Slice 1 — Motor Growth Forms: 7 aggregates canónicos en greenhouse_growth.
-- Additive-only. Sin formularios publicados (default state = disabled/test-only).
-- State machines vía CHECK; published versions inmutables (trigger); consent snapshot
-- y destination attempts append-only (no DELETE). Espeja el patrón de TASK-1226.
-- Arch: GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md §§8-21.

-- 1. form_definition — identidad durable del formulario.
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_definition (
  form_id        TEXT PRIMARY KEY DEFAULT ('fdef-' || gen_random_uuid()::text),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  form_kind      TEXT NOT NULL CHECK (form_kind IN (
                   'subscribe', 'lead_magnet', 'contact', 'diagnostic_intake',
                   'quote_request', 'pricing_simulation', 'document_upload',
                   'event_registration', 'survey', 'preference', 'application')),
  purpose        TEXT NOT NULL,
  risk_profile   TEXT NOT NULL DEFAULT 'low'
                   CHECK (risk_profile IN ('low', 'medium', 'high', 'restricted')),
  owner_team     TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  default_locale TEXT NOT NULL DEFAULT 'es-CL',
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. form_version — shape draft/published inmutable.
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_version (
  form_version_id           TEXT PRIMARY KEY DEFAULT ('fver-' || gen_random_uuid()::text),
  form_id                   TEXT NOT NULL REFERENCES greenhouse_growth.form_definition (form_id) ON DELETE RESTRICT,
  version                   INTEGER NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'review', 'published', 'deprecated', 'archived')),
  locale                    TEXT NOT NULL DEFAULT 'es-CL',
  field_schema_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_schema_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  copy_refs_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  style_variant             TEXT,
  ui_policy_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_behavior_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_policy_version    TEXT,
  data_classification_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  destination_policy_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  analytics_policy_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  retention_policy_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  commercial_handoff_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, version)
);

-- 3. form_destination — dónde van las submissions aceptadas.
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_destination (
  destination_id            TEXT PRIMARY KEY DEFAULT ('fdst-' || gen_random_uuid()::text),
  form_version_id           TEXT NOT NULL REFERENCES greenhouse_growth.form_version (form_version_id) ON DELETE RESTRICT,
  provider                  TEXT NOT NULL CHECK (provider IN (
                              'hubspot', 'crm_contact', 'email', 'webhook', 'greenhouse_only')),
  adapter_kind              TEXT NOT NULL DEFAULT 'fake_echo',
  adapter_version           TEXT NOT NULL DEFAULT 'fake-v1',
  endpoint_status           TEXT NOT NULL DEFAULT 'supported',
  enabled                   BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_mode             TEXT NOT NULL DEFAULT 'direct'
                              CHECK (delivery_mode IN ('direct', 'after_review', 'manual_only', 'disabled')),
  mapping_json              JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_requirements_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_policy_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. form_host_surface — runtime aprobado para renderizar (WordPress/Astro/Next).
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_host_surface (
  surface_id            TEXT PRIMARY KEY DEFAULT ('fhsf-' || gen_random_uuid()::text),
  surface_kind          TEXT NOT NULL CHECK (surface_kind IN ('wordpress', 'astro', 'nextjs', 'generic_html')),
  surface_name          TEXT NOT NULL,
  origin_allowlist_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_form_slugs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  embed_key_id          TEXT,
  embed_key_hash        TEXT,
  renderer_channel      TEXT NOT NULL DEFAULT 'stable'
                          CHECK (renderer_channel IN ('stable', 'beta', 'preview')),
  csp_requirements_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. form_submission — submission aceptada/rechazada del visitante.
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_submission (
  submission_id          TEXT PRIMARY KEY DEFAULT ('fsub-' || gen_random_uuid()::text),
  form_id                TEXT NOT NULL REFERENCES greenhouse_growth.form_definition (form_id) ON DELETE RESTRICT,
  form_version_id        TEXT NOT NULL REFERENCES greenhouse_growth.form_version (form_version_id) ON DELETE RESTRICT,
  surface_id             TEXT REFERENCES greenhouse_growth.form_host_surface (surface_id) ON DELETE SET NULL,
  page_uri               TEXT,
  page_name              TEXT,
  lead_email_hash        TEXT,
  normalized_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                 TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
                           'received', 'validated', 'accepted', 'rejected',
                           'routed', 'delivered', 'destination_failed', 'retrying', 'dead_letter')),
  rejection_reason_class TEXT,
  dedupe_fingerprint     TEXT,
  request_id             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. form_submission_consent_snapshot — evidencia de consentimiento inmutable (1:1).
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_submission_consent_snapshot (
  submission_id                    TEXT PRIMARY KEY
                                     REFERENCES greenhouse_growth.form_submission (submission_id) ON DELETE RESTRICT,
  consent_policy_version           TEXT NOT NULL,
  legal_basis                      TEXT NOT NULL DEFAULT 'consent',
  checkboxes_json                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  notice_text_hash                 TEXT,
  privacy_url                      TEXT,
  hubspot_legal_consent_options_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. form_destination_attempt — un intento de entrega a un destino (append-only: no DELETE).
CREATE TABLE IF NOT EXISTS greenhouse_growth.form_destination_attempt (
  attempt_id      TEXT PRIMARY KEY DEFAULT ('fatt-' || gen_random_uuid()::text),
  submission_id   TEXT NOT NULL REFERENCES greenhouse_growth.form_submission (submission_id) ON DELETE RESTRICT,
  destination_id  TEXT NOT NULL REFERENCES greenhouse_growth.form_destination (destination_id) ON DELETE RESTRICT,
  provider        TEXT NOT NULL,
  adapter_version TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'succeeded', 'retrying', 'failed', 'dead_letter')),
  external_id     TEXT,
  http_status     INTEGER,
  error_class     TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS form_version_form_idx ON greenhouse_growth.form_version (form_id);
CREATE INDEX IF NOT EXISTS form_version_status_idx ON greenhouse_growth.form_version (status);
CREATE INDEX IF NOT EXISTS form_destination_version_idx ON greenhouse_growth.form_destination (form_version_id);
CREATE INDEX IF NOT EXISTS form_submission_form_idx ON greenhouse_growth.form_submission (form_id);
CREATE INDEX IF NOT EXISTS form_submission_status_idx ON greenhouse_growth.form_submission (status);
CREATE INDEX IF NOT EXISTS form_submission_created_idx ON greenhouse_growth.form_submission (created_at DESC);
CREATE INDEX IF NOT EXISTS form_submission_surface_idx ON greenhouse_growth.form_submission (surface_id);
CREATE INDEX IF NOT EXISTS form_destination_attempt_submission_idx ON greenhouse_growth.form_destination_attempt (submission_id);
CREATE INDEX IF NOT EXISTS form_destination_attempt_status_idx ON greenhouse_growth.form_destination_attempt (status);

-- touch updated_at (reusa la función del schema si existe; idempotente).
CREATE OR REPLACE FUNCTION greenhouse_growth.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_definition_touch ON greenhouse_growth.form_definition;
CREATE TRIGGER trg_form_definition_touch
  BEFORE UPDATE ON greenhouse_growth.form_definition
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

DROP TRIGGER IF EXISTS trg_form_host_surface_touch ON greenhouse_growth.form_host_surface;
CREATE TRIGGER trg_form_host_surface_touch
  BEFORE UPDATE ON greenhouse_growth.form_host_surface
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

DROP TRIGGER IF EXISTS trg_form_submission_touch ON greenhouse_growth.form_submission;
CREATE TRIGGER trg_form_submission_touch
  BEFORE UPDATE ON greenhouse_growth.form_submission
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- form_version: published versions inmutables — solo status + published_at pueden cambiar
-- una vez status alcanza published/deprecated/archived. El contenido/policy queda congelado.
CREATE OR REPLACE FUNCTION greenhouse_growth.block_published_form_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('published', 'deprecated', 'archived') THEN
    IF NEW.version IS DISTINCT FROM OLD.version
       OR NEW.locale IS DISTINCT FROM OLD.locale
       OR NEW.field_schema_json IS DISTINCT FROM OLD.field_schema_json
       OR NEW.validation_schema_json IS DISTINCT FROM OLD.validation_schema_json
       OR NEW.copy_refs_json IS DISTINCT FROM OLD.copy_refs_json
       OR NEW.style_variant IS DISTINCT FROM OLD.style_variant
       OR NEW.ui_policy_json IS DISTINCT FROM OLD.ui_policy_json
       OR NEW.success_behavior_json IS DISTINCT FROM OLD.success_behavior_json
       OR NEW.consent_policy_version IS DISTINCT FROM OLD.consent_policy_version
       OR NEW.data_classification_json IS DISTINCT FROM OLD.data_classification_json
       OR NEW.destination_policy_json IS DISTINCT FROM OLD.destination_policy_json
       OR NEW.analytics_policy_json IS DISTINCT FROM OLD.analytics_policy_json
       OR NEW.retention_policy_json IS DISTINCT FROM OLD.retention_policy_json
       OR NEW.commercial_handoff_policy_json IS DISTINCT FROM OLD.commercial_handoff_policy_json
    THEN
      RAISE EXCEPTION 'greenhouse_growth.form_version % es inmutable (status=%): editar un form publicado crea una versión nueva (TASK-1229).', OLD.form_version_id, OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_version_published_immutable ON greenhouse_growth.form_version;
CREATE TRIGGER trg_form_version_published_immutable
  BEFORE UPDATE ON greenhouse_growth.form_version
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_published_form_version_mutation();

-- consent snapshot: inmutable (evidencia). Bloquea UPDATE/DELETE.
CREATE OR REPLACE FUNCTION greenhouse_growth.block_consent_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.form_submission_consent_snapshot es inmutable (TASK-1229): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_snapshot_immutable ON greenhouse_growth.form_submission_consent_snapshot;
CREATE TRIGGER trg_consent_snapshot_immutable
  BEFORE UPDATE OR DELETE ON greenhouse_growth.form_submission_consent_snapshot
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_consent_snapshot_mutation();

-- destination attempts: append-only a nivel ledger (la fila transiciona a su estado
-- terminal, pero NUNCA se borra). Bloquea DELETE; permite UPDATE (pending -> terminal).
CREATE OR REPLACE FUNCTION greenhouse_growth.block_attempt_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.form_destination_attempt es append-only (TASK-1229): DELETE bloqueado.';
END;
$$;

DROP TRIGGER IF EXISTS trg_form_destination_attempt_no_delete ON greenhouse_growth.form_destination_attempt;
CREATE TRIGGER trg_form_destination_attempt_no_delete
  BEFORE DELETE ON greenhouse_growth.form_destination_attempt
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_attempt_delete();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los 7 aggregates no quedaron creados.
DO $$
DECLARE table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN (
      'form_definition', 'form_version', 'form_destination', 'form_host_surface',
      'form_submission', 'form_submission_consent_snapshot', 'form_destination_attempt');

  IF table_count <> 7 THEN
    RAISE EXCEPTION 'TASK-1229 anti pre-up-marker: expected 7 forms tables, got %. Markers may be inverted.', table_count;
  END IF;
END
$$;

-- Ownership + GRANTs (espeja TASK-1226).
ALTER TABLE greenhouse_growth.form_definition OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.form_version OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.form_destination OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.form_host_surface OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.form_submission OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.form_submission_consent_snapshot OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.form_destination_attempt OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_definition TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_definition TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_definition TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_version TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_version TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_version TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_destination TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_destination TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_destination TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_host_surface TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_host_surface TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_host_surface TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_submission TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_submission TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_submission TO greenhouse_migrator_user;
-- consent snapshot: INSERT/SELECT (trigger bloquea UPDATE/DELETE — defensa en profundidad).
GRANT SELECT, INSERT ON greenhouse_growth.form_submission_consent_snapshot TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.form_submission_consent_snapshot TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_submission_consent_snapshot TO greenhouse_migrator_user;
-- attempts: SELECT/INSERT/UPDATE (pending->terminal); DELETE bloqueado por trigger.
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.form_destination_attempt TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE ON greenhouse_growth.form_destination_attempt TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.form_destination_attempt TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_published_form_version_mutation() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_growth.block_consent_snapshot_mutation() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_growth.block_attempt_delete() TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.form_destination_attempt CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.form_submission_consent_snapshot CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.form_submission CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.form_destination CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.form_host_surface CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.form_version CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.form_definition CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_published_form_version_mutation() CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_consent_snapshot_mutation() CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_attempt_delete() CASCADE;
