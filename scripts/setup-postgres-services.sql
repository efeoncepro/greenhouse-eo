-- ════════════════════════════════════════════════════════════════════════════
-- Services Architecture — PostgreSQL DDL
-- ════════════════════════════════════════════════════════════════════════════
--
-- This migration:
--   1. Creates greenhouse_core.services (atomic commercial unit)
--   2. Creates greenhouse_core.v_client_active_modules (derived capabilities view)
--   3. Creates greenhouse_core.service_history (audit trail)
--   4. Creates greenhouse_sync.service_sync_queue (async write-back to HubSpot)
--   5. Creates PostgreSQL sequence for EO-SVC public IDs
--   6. Seeds the service_modules catalog with 14 services + 5 business lines
--   7. Grants RBAC permissions
--
-- Safe to run multiple times (all operations are idempotent).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Core table: services ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.services (
  service_id TEXT PRIMARY KEY,
  public_id TEXT UNIQUE,
  hubspot_service_id TEXT UNIQUE,
  name TEXT NOT NULL,

  -- Relations
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id),
  organization_id TEXT REFERENCES greenhouse_core.organizations(organization_id),
  hubspot_company_id TEXT,
  hubspot_deal_id TEXT,

  -- Pipeline (6 stages)
  pipeline_stage TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (pipeline_stage IN (
      'onboarding', 'active', 'renewal_pending',
      'renewed', 'closed', 'paused'
    )),

  -- Temporal
  start_date DATE,
  target_end_date DATE,

  -- Financial
  total_cost NUMERIC(14,2),
  amount_paid NUMERIC(14,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CLP',

  -- Classification
  linea_de_servicio TEXT NOT NULL
    CHECK (linea_de_servicio IN (
      'globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions'
    )),
  servicio_especifico TEXT NOT NULL,
  modalidad TEXT DEFAULT 'continua'
    CHECK (modalidad IN ('continua', 'sprint', 'proyecto')),
  billing_frequency TEXT DEFAULT 'monthly'
    CHECK (billing_frequency IN ('monthly', 'quarterly', 'project')),
  country TEXT DEFAULT 'CL',

  -- Operations
  notion_project_id TEXT,

  -- HubSpot sync
  hubspot_last_synced_at TIMESTAMPTZ,
  hubspot_sync_status TEXT DEFAULT 'pending',

  -- Metadata
  active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices for frequent query patterns
CREATE INDEX IF NOT EXISTS idx_services_space_id ON greenhouse_core.services(space_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id ON greenhouse_core.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_pipeline_stage ON greenhouse_core.services(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_services_linea ON greenhouse_core.services(linea_de_servicio);
CREATE INDEX IF NOT EXISTS idx_services_servicio ON greenhouse_core.services(servicio_especifico);
CREATE INDEX IF NOT EXISTS idx_services_hubspot_id ON greenhouse_core.services(hubspot_service_id);

-- ── 2. Derived capabilities view ───────────────────────────────────────
-- Replaces manual client_service_modules population.
-- Capabilities are derived from active services assigned to a Space/Client.

CREATE OR REPLACE VIEW greenhouse_core.v_client_active_modules AS
SELECT DISTINCT
  s.space_id,
  sp.client_id,
  sm.module_id,
  sm.module_code,
  sm.business_line
FROM greenhouse_core.services s
JOIN greenhouse_core.spaces sp ON sp.space_id = s.space_id
JOIN greenhouse_core.service_modules sm
  ON sm.module_code = s.servicio_especifico AND sm.active = TRUE
WHERE s.active = TRUE
  AND s.pipeline_stage IN ('active', 'renewal_pending', 'renewed');

-- ── 3. Service history (audit trail) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_core.service_history (
  history_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_history_service ON greenhouse_core.service_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_history_changed_at ON greenhouse_core.service_history(changed_at DESC);

-- ── 4. Sync queue (async write-back to HubSpot) ───────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_sync.service_sync_queue (
  queue_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status
  ON greenhouse_sync.service_sync_queue(status) WHERE status = 'pending';

-- ── 5. Sequence for EO-SVC public IDs ──────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS greenhouse_core.seq_service_public_id
  START WITH 1 INCREMENT BY 1 NO CYCLE;

-- ── 6. Seed service_modules catalog ────────────────────────────────────
-- 14 service-specific modules + 5 business line entries

INSERT INTO greenhouse_core.service_modules (module_id, module_code, module_name, business_line, description)
VALUES
  ('sm-lic-hubspot',      'licenciamiento_hubspot',       'Licenciamiento HubSpot',         'crm_solutions',    'Licencias y suscripciones HubSpot'),
  ('sm-impl-onboarding',  'implementacion_onboarding',    'Implementación & Onboarding',    'crm_solutions',    'Setup inicial y onboarding de plataforma'),
  ('sm-consultoria-crm',  'consultoria_crm',              'Consultoría CRM',                'crm_solutions',    'Asesoría estratégica CRM'),
  ('sm-desarrollo-web',   'desarrollo_web',               'Desarrollo Web',                 'wave',             'Desarrollo y mantenimiento de sitios web'),
  ('sm-diseno-ux',        'diseno_ux',                    'Diseño UX',                      'wave',             'Diseño de experiencia de usuario'),
  ('sm-agencia-creativa', 'agencia_creativa',              'Agencia Creativa',               'globe',            'Producción creativa integral'),
  ('sm-produccion-av',    'produccion_audiovisual',        'Producción Audiovisual',         'globe',            'Video, fotografía y contenido audiovisual'),
  ('sm-social-media',     'social_media_content',          'Social Media & Content',         'globe',            'Gestión de redes sociales y contenido'),
  ('sm-social-care',      'social_care_sac',               'Social Care / SAC',              'globe',            'Servicio al cliente en canales digitales'),
  ('sm-performance',      'performance_paid_media',        'Performance & Paid Media',       'efeonce_digital',  'Campañas de medios pagados'),
  ('sm-seo-aeo',          'seo_aeo',                       'SEO / AEO',                      'efeonce_digital',  'Optimización para buscadores y AI'),
  ('sm-email-auto',       'email_marketing_automation',    'Email Marketing & Automation',   'efeonce_digital',  'Automatización de marketing por email'),
  ('sm-data-analytics',   'data_analytics',                'Data & Analytics',               'reach',            'Análisis de datos y business intelligence'),
  ('sm-research',         'research_estrategia',           'Research & Estrategia',          'reach',            'Investigación y estrategia de mercado')
ON CONFLICT (module_id) DO NOTHING;

-- Business line entries
INSERT INTO greenhouse_core.service_modules (module_id, module_code, module_name, business_line)
VALUES
  ('bl-globe',            'globe',            'Globe',            'globe'),
  ('bl-efeonce-digital',  'efeonce_digital',  'Efeonce Digital',  'efeonce_digital'),
  ('bl-reach',            'reach',            'Reach',            'reach'),
  ('bl-wave',             'wave',             'Wave',             'wave'),
  ('bl-crm',              'crm_solutions',    'CRM Solutions',    'crm_solutions')
ON CONFLICT (module_id) DO NOTHING;

-- ── 7. RBAC grants ─────────────────────────────────────────────────────

-- services: full CRUD for runtime (app writes services)
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.services TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.services TO greenhouse_migrator;

-- service_history: full CRUD for runtime (app logs changes)
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.service_history TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.service_history TO greenhouse_migrator;

-- v_client_active_modules: read-only derived view
GRANT SELECT ON greenhouse_core.v_client_active_modules TO greenhouse_runtime;
GRANT SELECT ON greenhouse_core.v_client_active_modules TO greenhouse_migrator;

-- service_sync_queue: full CRUD (sync schema already has broad grants, but explicit is safe)
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.service_sync_queue TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_sync.service_sync_queue TO greenhouse_migrator;

-- sequence for public IDs
GRANT USAGE ON SEQUENCE greenhouse_core.seq_service_public_id TO greenhouse_runtime;
GRANT USAGE ON SEQUENCE greenhouse_core.seq_service_public_id TO greenhouse_migrator;

-- ── 8. Migration log ───────────────────────────────────────────────────

INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'services-architecture-v1',
  'services',
  CURRENT_USER,
  'Services Architecture v1: core table, derived capabilities view, history, sync queue, catalog seed.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;
