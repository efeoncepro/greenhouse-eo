-- Up Migration

-- TASK-1339 Slice 1 — Growth CTA & Popup Engine foundation: 4 aggregates Tier A en
-- greenhouse_growth. Additive-only (el schema existe desde TASK-1226; no toca tablas forms).
-- State machine draft→review→published→paused→deprecated→archived vía CHECK + guard en command;
-- published versions inmutables (trigger); conversion ledger append-only (trigger, sin UPDATE/DELETE).
-- El ledger persiste también rechazos de ingest sin PII (ingest_status='rejected') como fuente PG
-- del signal growth.cta.surface_unauthorized_attempt — espejo del precedente form_submission
-- status='rejected' (TASK-1229). Tier B exposición (eligible/suppressed/viewed) queda FUERA de
-- OLTP por regla dura (arch §9.4); acá solo evidencia de conversión audit-grade.
-- Arch: GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md §§9, 11, 16, 20.

-- 1. cta_definition — identidad durable del CTA/campaña.
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_definition (
  cta_id         TEXT PRIMARY KEY DEFAULT ('cdef-' || gen_random_uuid()::text),
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  purpose        TEXT NOT NULL,
  owner_team     TEXT,
  campaign_slug  TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  default_locale TEXT NOT NULL DEFAULT 'es-CL',
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. cta_version — shape/policy inmutable una vez publicada; editar = versión nueva.
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_version (
  cta_version_id          TEXT PRIMARY KEY DEFAULT ('cver-' || gen_random_uuid()::text),
  cta_id                  TEXT NOT NULL REFERENCES greenhouse_growth.cta_definition (cta_id) ON DELETE RESTRICT,
  version                 INTEGER NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'review', 'published', 'paused', 'deprecated', 'archived')),
  locale                  TEXT NOT NULL DEFAULT 'es-CL',
  placement               TEXT NOT NULL CHECK (placement IN (
                            'embedded', 'inline_banner', 'sticky_banner',
                            'slide_in', 'popup_modal', 'floating_button')),
  style_variant           TEXT,
  copy_refs_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
  visual_asset_ref        TEXT,
  action_policy_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  targeting_policy_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  suppression_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_policy_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  analytics_policy_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  experiment_policy_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cta_id, version)
);

-- A lo sumo UNA versión published viva por CTA (paused/deprecated no compiten; el comando
-- resume revalida contra este índice — defensa en profundidad del arbiter).
CREATE UNIQUE INDEX IF NOT EXISTS cta_version_one_published_per_cta
  ON greenhouse_growth.cta_version (cta_id) WHERE status = 'published';

-- 3. cta_surface_binding — dónde puede renderizar un CTA (surface + origin + embed key).
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_surface_binding (
  surface_id             TEXT PRIMARY KEY DEFAULT ('csur-' || gen_random_uuid()::text),
  surface_kind           TEXT NOT NULL CHECK (surface_kind IN (
                           'wordpress', 'astro', 'think', 'nextjs', 'generic_html')),
  surface_name           TEXT NOT NULL,
  origin_allowlist_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_cta_slugs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  embed_key_id           TEXT,
  embed_key_hash         TEXT,
  renderer_channel       TEXT NOT NULL DEFAULT 'stable'
                           CHECK (renderer_channel IN ('stable', 'beta', 'preview')),
  status                 TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. cta_conversion_event — Tier A: evidencia de conversión audit-grade, append-only.
-- Solo trust_level='server_confirmed' cuenta como conversión (arch §9.4/§16.1); lo browser
-- es direccional. Rechazos de ingest (forja/mismatch) se persisten sin PII con
-- ingest_status='rejected' + rejection_reason_class y NUNCA cuentan en reportes.
CREATE TABLE IF NOT EXISTS greenhouse_growth.cta_conversion_event (
  event_id               TEXT PRIMARY KEY DEFAULT ('cevt-' || gen_random_uuid()::text),
  cta_id                 TEXT REFERENCES greenhouse_growth.cta_definition (cta_id) ON DELETE RESTRICT,
  cta_version_id         TEXT REFERENCES greenhouse_growth.cta_version (cta_version_id) ON DELETE RESTRICT,
  surface_id             TEXT REFERENCES greenhouse_growth.cta_surface_binding (surface_id) ON DELETE SET NULL,
  page_uri               TEXT,
  placement              TEXT,
  trigger_kind           TEXT,
  variant_id             TEXT,
  action_kind            TEXT,
  event_kind             TEXT NOT NULL CHECK (event_kind IN (
                           'clicked', 'action_started', 'action_completed',
                           'form_opened', 'form_submitted', 'dismissed', 'error')),
  visitor_key_hash       TEXT,
  session_key_hash       TEXT,
  ip_hash                TEXT,
  consent_state          TEXT,
  consent_source         TEXT,
  utm_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  referrer_domain        TEXT,
  trust_level            TEXT NOT NULL DEFAULT 'browser_reported'
                           CHECK (trust_level IN ('browser_reported', 'server_confirmed')),
  ingest_status          TEXT NOT NULL DEFAULT 'accepted' CHECK (ingest_status IN ('accepted', 'rejected')),
  rejection_reason_class TEXT,
  dedupe_fingerprint     TEXT,
  form_submission_id     TEXT,
  event_payload_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- filas aceptadas siempre apuntan a un CTA/versión reales; rechazadas pueden no
  -- (la versión forjada puede no existir — lo reclamado va allowlisted en payload).
  CONSTRAINT cta_conversion_event_accepted_refs CHECK (
    ingest_status = 'rejected' OR (cta_id IS NOT NULL AND cta_version_id IS NOT NULL)
  ),
  CONSTRAINT cta_conversion_event_rejected_reason CHECK (
    ingest_status = 'accepted' OR rejection_reason_class IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS cta_version_cta_idx ON greenhouse_growth.cta_version (cta_id);
CREATE INDEX IF NOT EXISTS cta_version_status_idx ON greenhouse_growth.cta_version (status);
CREATE INDEX IF NOT EXISTS cta_conversion_event_version_idx
  ON greenhouse_growth.cta_conversion_event (cta_version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cta_conversion_event_created_idx
  ON greenhouse_growth.cta_conversion_event (created_at DESC);
CREATE INDEX IF NOT EXISTS cta_conversion_event_kind_idx
  ON greenhouse_growth.cta_conversion_event (event_kind);
CREATE INDEX IF NOT EXISTS cta_conversion_event_rejected_idx
  ON greenhouse_growth.cta_conversion_event (created_at DESC) WHERE ingest_status = 'rejected';
CREATE INDEX IF NOT EXISTS cta_conversion_event_dedupe_idx
  ON greenhouse_growth.cta_conversion_event (dedupe_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS cta_conversion_event_ip_idx
  ON greenhouse_growth.cta_conversion_event (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS cta_conversion_event_visitor_idx
  ON greenhouse_growth.cta_conversion_event (visitor_key_hash, created_at DESC);

-- touch updated_at (función compartida del schema, creada por TASK-1229).
DROP TRIGGER IF EXISTS trg_cta_definition_touch ON greenhouse_growth.cta_definition;
CREATE TRIGGER trg_cta_definition_touch
  BEFORE UPDATE ON greenhouse_growth.cta_definition
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cta_surface_binding_touch ON greenhouse_growth.cta_surface_binding;
CREATE TRIGGER trg_cta_surface_binding_touch
  BEFORE UPDATE ON greenhouse_growth.cta_surface_binding
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.touch_updated_at();

-- cta_version: publicada (o más allá) = inmutable. Solo status puede transicionar;
-- contenido/policies/published_at quedan congelados. Editar un CTA vivo crea versión nueva.
CREATE OR REPLACE FUNCTION greenhouse_growth.block_published_cta_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('published', 'paused', 'deprecated', 'archived') THEN
    IF NEW.version IS DISTINCT FROM OLD.version
       OR NEW.cta_id IS DISTINCT FROM OLD.cta_id
       OR NEW.locale IS DISTINCT FROM OLD.locale
       OR NEW.placement IS DISTINCT FROM OLD.placement
       OR NEW.style_variant IS DISTINCT FROM OLD.style_variant
       OR NEW.copy_refs_json IS DISTINCT FROM OLD.copy_refs_json
       OR NEW.content_json IS DISTINCT FROM OLD.content_json
       OR NEW.visual_asset_ref IS DISTINCT FROM OLD.visual_asset_ref
       OR NEW.action_policy_json IS DISTINCT FROM OLD.action_policy_json
       OR NEW.targeting_policy_json IS DISTINCT FROM OLD.targeting_policy_json
       OR NEW.suppression_policy_json IS DISTINCT FROM OLD.suppression_policy_json
       OR NEW.priority_policy_json IS DISTINCT FROM OLD.priority_policy_json
       OR NEW.analytics_policy_json IS DISTINCT FROM OLD.analytics_policy_json
       OR NEW.experiment_policy_json IS DISTINCT FROM OLD.experiment_policy_json
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
    THEN
      RAISE EXCEPTION 'greenhouse_growth.cta_version % es inmutable (status=%): editar un CTA publicado crea una versión nueva (TASK-1339).', OLD.cta_version_id, OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cta_version_published_immutable ON greenhouse_growth.cta_version;
CREATE TRIGGER trg_cta_version_published_immutable
  BEFORE UPDATE ON greenhouse_growth.cta_version
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_published_cta_version_mutation();

-- cta_conversion_event: append-only estricto (evidencia). Bloquea UPDATE y DELETE.
CREATE OR REPLACE FUNCTION greenhouse_growth.block_cta_conversion_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'greenhouse_growth.cta_conversion_event es append-only (TASK-1339): % bloqueado.', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_cta_conversion_event_immutable ON greenhouse_growth.cta_conversion_event;
CREATE TRIGGER trg_cta_conversion_event_immutable
  BEFORE UPDATE OR DELETE ON greenhouse_growth.cta_conversion_event
  FOR EACH ROW EXECUTE FUNCTION greenhouse_growth.block_cta_conversion_event_mutation();

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si los 4 aggregates no quedaron creados
-- o si falta el índice parcial de published única.
DO $$
DECLARE
  table_count INTEGER;
  published_idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_growth'
    AND table_name IN ('cta_definition', 'cta_version', 'cta_surface_binding', 'cta_conversion_event');

  IF table_count <> 4 THEN
    RAISE EXCEPTION 'TASK-1339 anti pre-up-marker: expected 4 cta tables, got %. Markers may be inverted.', table_count;
  END IF;

  SELECT COUNT(*) INTO published_idx_count
  FROM pg_indexes
  WHERE schemaname = 'greenhouse_growth' AND indexname = 'cta_version_one_published_per_cta';

  IF published_idx_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1339 anti pre-up-marker: partial unique index cta_version_one_published_per_cta missing.';
  END IF;
END
$$;

-- Ownership + GRANTs (espeja TASK-1229/1226).
ALTER TABLE greenhouse_growth.cta_definition OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.cta_version OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.cta_surface_binding OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_growth.cta_conversion_event OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_definition TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_definition TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_definition TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_version TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_version TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_version TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_surface_binding TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_surface_binding TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_surface_binding TO greenhouse_migrator_user;
-- conversion ledger: solo SELECT/INSERT para runtime (trigger bloquea UPDATE/DELETE — defensa en profundidad).
GRANT SELECT, INSERT ON greenhouse_growth.cta_conversion_event TO greenhouse_runtime;
GRANT SELECT, INSERT ON greenhouse_growth.cta_conversion_event TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_growth.cta_conversion_event TO greenhouse_migrator_user;

GRANT EXECUTE ON FUNCTION greenhouse_growth.block_published_cta_version_mutation() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_growth.block_cta_conversion_event_mutation() TO greenhouse_runtime;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_growth.cta_conversion_event CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.cta_version CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.cta_surface_binding CASCADE;
DROP TABLE IF EXISTS greenhouse_growth.cta_definition CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_published_cta_version_mutation() CASCADE;
DROP FUNCTION IF EXISTS greenhouse_growth.block_cta_conversion_event_mutation() CASCADE;
