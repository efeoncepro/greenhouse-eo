-- Up Migration
--
-- TASK-824 — Client Portal DDL: Schema + Modules + Assignments + 10 Seed Modules
-- (EPIC-015 child 3/8). Spec arquitectónica V1.4 §5.1-§5.5.
--
-- Crea:
--   - SCHEMA greenhouse_client_portal
--   - TABLE modules (catálogo append-only)
--   - TABLE module_assignments (time-versioned, UNIQUE partial active)
--   - TABLE module_assignment_events (audit append-only)
--   - 4 triggers (modules append-only check + 2 anti-UPDATE/DELETE en events)
--   - 9 indexes (hot path)
--   - ALTER engagement_commercial_terms ADD bundled_modules TEXT[]
--   - 10 seed modules verbatim del spec V1.4 §5.5
--   - Bloque DO $$ RAISE EXCEPTION anti pre-up-marker post-DDL+seed (TASK-838 pattern)
--   - Grants ownership greenhouse_ops + grants greenhouse_runtime
--
-- Decisiones canonizadas en spec V1.4 (5 versiones del verdict + Issues 6/7):
--   - applicability_scope (V1.2 rename desde business_line, NO duplicar enum 360 canónico)
--   - organization_id TEXT (V1.3 fix: tabla real es TEXT no UUID)
--   - FK → greenhouse_core.client_users(user_id) (V1.3 fix: no existe `users`)
--   - SIN campo default_for_business_lines (V1.0 Issue 4 YAGNI)
--   - view_codes + capabilities seed son FORWARD-LOOKING (V1.4 Issue 7)
--   - data_sources parity strict (TASK-824); view_codes parity → TASK-827; capabilities parity → TASK-826

CREATE SCHEMA IF NOT EXISTS greenhouse_client_portal;

-- ─────────────────────────────────────────────────────────────
-- 5.1  modules — Catálogo declarativo append-only
-- ─────────────────────────────────────────────────────────────

CREATE TABLE greenhouse_client_portal.modules (
  module_key           TEXT PRIMARY KEY,
  display_label        TEXT NOT NULL,
  display_label_client TEXT NOT NULL,
  description          TEXT,
  applicability_scope  TEXT NOT NULL
                       CHECK (applicability_scope IN ('globe','wave','crm_solutions','staff_aug','cross')),
  tier                 TEXT NOT NULL
                       CHECK (tier IN ('standard','addon','pilot','enterprise','internal')),

  view_codes           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  capabilities         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  data_sources         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  pricing_kind         TEXT NOT NULL
                       CHECK (pricing_kind IN ('bundled','addon_fixed','addon_usage','pilot_no_cost','pilot_success_fee','enterprise_custom')),

  effective_from       DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to         DATE,
  metadata_json        JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON COLUMN greenhouse_client_portal.modules.applicability_scope IS
  'Categoría de aplicabilidad del módulo dentro del dominio client_portal. NO es FK al business_line canónico del 360 (greenhouse_core.service_modules.module_code WHERE module_kind=''business_line''). Mezcla dimensiones ortogonales: business_lines reales (globe, wave, crm_solutions), metavalue cross=aplicable-a-múltiples, y service_module staff_aug=dentro-de-cross. Para resolver el business_line canónico del cliente consumidor, usar greenhouse_core.business_line_metadata. Hard rule canonizada en GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md: NO duplicar enum del catalogo.';

COMMENT ON COLUMN greenhouse_client_portal.modules.view_codes IS
  'view_codes que este módulo expone al portal cliente. Forward-looking en V1.0: algunos values aún no existen en VIEW_REGISTRY — TASK-827 los materializa. Parity strict deferred a TASK-827.';

COMMENT ON COLUMN greenhouse_client_portal.modules.capabilities IS
  'capabilities granulares que el módulo declara. Forward-looking en V1.0: algunos values aún no existen en entitlements-catalog — TASK-826 los materializa. Parity strict deferred a TASK-826.';

COMMENT ON COLUMN greenhouse_client_portal.modules.data_sources IS
  'Whitelist de dominios productores que alimentan el módulo. Parity test live TS↔DB strict en src/lib/client-portal/data-sources/parity.live.test.ts (TASK-824 Slice 3) — rompe build si seed DB ↔ ClientPortalDataSource type union (src/lib/client-portal/dto/reader-meta.ts) diverge.';

CREATE INDEX modules_applicability_scope ON greenhouse_client_portal.modules (applicability_scope) WHERE effective_to IS NULL;
CREATE INDEX modules_tier ON greenhouse_client_portal.modules (tier) WHERE effective_to IS NULL;

-- Append-only trigger en modules: solo permite UPDATE de effective_to + display_label*
CREATE OR REPLACE FUNCTION greenhouse_client_portal.modules_no_update_breaking() RETURNS trigger AS $$
BEGIN
  IF NEW.module_key != OLD.module_key
     OR NEW.applicability_scope != OLD.applicability_scope
     OR NEW.tier != OLD.tier
     OR NEW.view_codes != OLD.view_codes
     OR NEW.capabilities != OLD.capabilities
     OR NEW.data_sources != OLD.data_sources
     OR NEW.pricing_kind != OLD.pricing_kind
     OR NEW.effective_from != OLD.effective_from THEN
    RAISE EXCEPTION 'modules.* fields are append-only after creation; create new module_key version instead';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modules_append_only_check
  BEFORE UPDATE ON greenhouse_client_portal.modules
  FOR EACH ROW EXECUTE FUNCTION greenhouse_client_portal.modules_no_update_breaking();

-- ─────────────────────────────────────────────────────────────
-- 5.2  module_assignments — Asignación per-cliente time-versioned
-- ─────────────────────────────────────────────────────────────

CREATE TABLE greenhouse_client_portal.module_assignments (
  assignment_id        TEXT PRIMARY KEY,
  organization_id      TEXT NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  module_key           TEXT NOT NULL REFERENCES greenhouse_client_portal.modules(module_key),

  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','active','paused','expired','pilot','churned')),

  source               TEXT NOT NULL
                       CHECK (source IN ('lifecycle_case_provision','commercial_terms_cascade','manual_admin','self_service_request','migration_backfill','default_business_line')),
  source_ref_json      JSONB DEFAULT '{}'::jsonb,

  effective_from       DATE NOT NULL,
  effective_to         DATE,
  expires_at           TIMESTAMPTZ,

  approved_by_user_id  TEXT REFERENCES greenhouse_core.client_users(user_id),
  approved_at          TIMESTAMPTZ,

  metadata_json        JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK (status != 'pilot' OR expires_at IS NOT NULL)
);

CREATE UNIQUE INDEX module_assignments_one_active
  ON greenhouse_client_portal.module_assignments (organization_id, module_key)
  WHERE effective_to IS NULL;

CREATE INDEX module_assignments_org ON greenhouse_client_portal.module_assignments (organization_id) WHERE effective_to IS NULL;
CREATE INDEX module_assignments_module ON greenhouse_client_portal.module_assignments (module_key) WHERE effective_to IS NULL;
CREATE INDEX module_assignments_status ON greenhouse_client_portal.module_assignments (status) WHERE effective_to IS NULL AND status NOT IN ('expired','churned');
CREATE INDEX module_assignments_expires_at ON greenhouse_client_portal.module_assignments (expires_at) WHERE expires_at IS NOT NULL AND status = 'pilot';

-- ─────────────────────────────────────────────────────────────
-- 5.3  module_assignment_events — Audit append-only
-- ─────────────────────────────────────────────────────────────

CREATE TABLE greenhouse_client_portal.module_assignment_events (
  event_id         TEXT PRIMARY KEY,
  assignment_id    TEXT NOT NULL REFERENCES greenhouse_client_portal.module_assignments(assignment_id),
  event_kind       TEXT NOT NULL,
  from_status      TEXT,
  to_status        TEXT,
  payload_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id    TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX module_assignment_events_assignment ON greenhouse_client_portal.module_assignment_events (assignment_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_client_portal.assignment_events_no_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'module_assignment_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_update_on_assignment_events
  BEFORE UPDATE ON greenhouse_client_portal.module_assignment_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_client_portal.assignment_events_no_update();

CREATE TRIGGER prevent_delete_on_assignment_events
  BEFORE DELETE ON greenhouse_client_portal.module_assignment_events
  FOR EACH ROW EXECUTE FUNCTION greenhouse_client_portal.assignment_events_no_update();

-- ─────────────────────────────────────────────────────────────
-- 5.4  Extension engagement_commercial_terms.bundled_modules
-- ─────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_commercial.engagement_commercial_terms
  ADD COLUMN IF NOT EXISTS bundled_modules TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN greenhouse_commercial.engagement_commercial_terms.bundled_modules IS
  'Module keys del catálogo greenhouse_client_portal.modules. Cascade en TASK-828. FK lógica via parity test + reactive consumer (NO FK física por boundary cross-schema).';

-- ─────────────────────────────────────────────────────────────
-- 5.5  Seed inicial — 10 módulos canónicos V1.0 (verbatim spec V1.4)
-- ─────────────────────────────────────────────────────────────

-- Globe (3)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('creative_hub_globe_v1', 'Creative Hub Globe (Bundle)', 'Tu Creative Hub', 'globe', 'standard',
  ARRAY['cliente.pulse','cliente.proyectos','cliente.campanas','cliente.creative_hub','cliente.equipo','cliente.reviews'],
  ARRAY['client_portal.creative_hub.read','client_portal.csc_pipeline.read','client_portal.brand_intelligence.read','client_portal.cvr.read'],
  ARRAY['agency.ico','commercial.engagements','delivery.tasks','agency.csc','agency.brand_intelligence'],
  'bundled'),
('roi_reports', 'ROI Reports + Exports', 'Reportes de impacto + exports', 'globe', 'enterprise',
  ARRAY['cliente.roi_reports','cliente.exports'],
  ARRAY['client_portal.roi.read','client_portal.exports.generate'],
  ARRAY['agency.revenue_enabled','finance.invoices','commercial.engagements'],
  'addon_fixed'),
('cvr_quarterly', 'Creative Velocity Review trimestral', 'Tu CVR trimestral', 'globe', 'addon',
  ARRAY['cliente.cvr_quarterly'],
  ARRAY['client_portal.cvr.read','client_portal.cvr.export'],
  ARRAY['agency.ico','agency.csc','agency.brand_intelligence'],
  'addon_fixed');

-- Cross-line (3)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('equipo_asignado', 'Equipo Asignado', 'Tu equipo', 'cross', 'standard',
  ARRAY['cliente.equipo'],
  ARRAY['client_portal.assigned_team.read'],
  ARRAY['assigned_team.assignments','agency.ico'],
  'bundled'),
('pulse', 'Pulse (landing)', 'Pulse', 'cross', 'standard',
  ARRAY['cliente.pulse','cliente.home'],
  ARRAY['client_portal.pulse.read'],
  ARRAY['agency.ico','commercial.engagements'],
  'bundled'),
('staff_aug_visibility', 'Staff Augmentation Visibility', 'Tu Staff Augmentation', 'staff_aug', 'standard',
  ARRAY['cliente.staff_aug'],
  ARRAY['client_portal.staff_aug.read'],
  ARRAY['assigned_team.assignments'],
  'bundled');

-- Globe addons (2)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('brand_intelligence', 'Brand Intelligence (RpA + First-Time Right)', 'Tu Brand Intelligence', 'globe', 'addon',
  ARRAY['cliente.brand_intelligence'],
  ARRAY['client_portal.brand_intelligence.read'],
  ARRAY['agency.brand_intelligence'],
  'addon_fixed'),
('csc_pipeline', 'Creative Supply Chain Pipeline', 'Tu CSC Pipeline', 'globe', 'addon',
  ARRAY['cliente.csc_pipeline'],
  ARRAY['client_portal.csc_pipeline.read'],
  ARRAY['agency.csc'],
  'addon_fixed');

-- Otros applicability_scope (2)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('crm_command_legacy', 'CRM Command (legacy, transición a Kortex)', 'Tu CRM Command', 'crm_solutions', 'standard',
  ARRAY['cliente.crm_command'],
  ARRAY['client_portal.crm_command.read'],
  ARRAY['commercial.engagements','commercial.deals'],
  'bundled'),
('web_delivery', 'Web Delivery (Wave)', 'Tu Web Delivery', 'wave', 'standard',
  ARRAY['cliente.web_delivery'],
  ARRAY['client_portal.web_delivery.read'],
  ARRAY['delivery.tasks','commercial.engagements'],
  'bundled');

-- ─────────────────────────────────────────────────────────────
-- Grants (ownership greenhouse_ops + read/write greenhouse_runtime)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE greenhouse_client_portal.modules OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_client_portal.module_assignments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_client_portal.module_assignment_events OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_client_portal OWNER TO greenhouse_ops;

GRANT USAGE ON SCHEMA greenhouse_client_portal TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_client_portal.modules TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_client_portal.module_assignments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_client_portal.module_assignment_events TO greenhouse_runtime;

-- ─────────────────────────────────────────────────────────────
-- Anti pre-up-marker check INSIDE migration (TASK-838 pattern)
-- Aborta loud si DDL/triggers/indexes/seed/extension no quedaron creados
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  expected_tables TEXT[] := ARRAY['modules', 'module_assignments', 'module_assignment_events'];
  expected_triggers TEXT[] := ARRAY[
    'modules_append_only_check',
    'prevent_update_on_assignment_events',
    'prevent_delete_on_assignment_events'
  ];
  expected_indexes TEXT[] := ARRAY[
    'modules_applicability_scope',
    'modules_tier',
    'module_assignments_one_active',
    'module_assignments_org',
    'module_assignments_module',
    'module_assignments_status',
    'module_assignments_expires_at',
    'module_assignment_events_assignment'
  ];
  missing TEXT;
  seed_count INTEGER;
  has_bundled_modules BOOLEAN;
  has_no_default_for_business_lines BOOLEAN;
BEGIN
  -- Verify schema
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'greenhouse_client_portal') THEN
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: schema greenhouse_client_portal was NOT created.';
  END IF;

  -- Verify 3 tables
  FOR missing IN
    SELECT t FROM unnest(expected_tables) AS t
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'greenhouse_client_portal' AND table_name = t
    )
  LOOP
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: table % was NOT created.', missing;
  END LOOP;

  -- Verify 3 triggers
  FOR missing IN
    SELECT t FROM unnest(expected_triggers) AS t
    WHERE NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t)
  LOOP
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: trigger % was NOT created.', missing;
  END LOOP;

  -- Verify 8 indexes
  FOR missing IN
    SELECT i FROM unnest(expected_indexes) AS i
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'greenhouse_client_portal' AND indexname = i
    )
  LOOP
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: index % was NOT created.', missing;
  END LOOP;

  -- Verify seed count = 10
  SELECT count(*) INTO seed_count FROM greenhouse_client_portal.modules WHERE effective_to IS NULL;
  IF seed_count != 10 THEN
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: expected 10 seed modules, got %.', seed_count;
  END IF;

  -- Verify bundled_modules column added to engagement_commercial_terms
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_commercial'
      AND table_name = 'engagement_commercial_terms'
      AND column_name = 'bundled_modules'
  ) INTO has_bundled_modules;

  IF NOT has_bundled_modules THEN
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: engagement_commercial_terms.bundled_modules column was NOT created.';
  END IF;

  -- Verify NO default_for_business_lines column (Issue 4 verdict — V1.0 eliminado)
  SELECT NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_client_portal'
      AND table_name = 'modules'
      AND column_name = 'default_for_business_lines'
  ) INTO has_no_default_for_business_lines;

  IF NOT has_no_default_for_business_lines THEN
    RAISE EXCEPTION 'TASK-824 anti pre-up-marker check FAILED: default_for_business_lines should NOT exist in V1.0 (verdict Issue 4 — YAGNI).';
  END IF;
END $$;


-- Down Migration

-- Reverse extension first (downstream depends on it)
ALTER TABLE greenhouse_commercial.engagement_commercial_terms DROP COLUMN IF EXISTS bundled_modules;

-- Drop schema cascades through 3 tables + triggers + indexes + functions
DROP SCHEMA IF EXISTS greenhouse_client_portal CASCADE;
