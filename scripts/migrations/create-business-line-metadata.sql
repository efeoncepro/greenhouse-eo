-- ────────────────────────────────────────────────────────────────────────
-- Migration: CREATE business_line_metadata + seed
-- Task: TASK-016 (Business Units Canonical v2)
-- Purpose: Rich metadata layer per business line (module_code anchor).
--          Colors aligned with GH_COLORS.service in greenhouse-nomenclature.ts.
-- Depends on: add-service-modules-kind-v1 (module_kind must exist)
-- ────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Create table
CREATE TABLE IF NOT EXISTS greenhouse_core.business_line_metadata (
  module_code TEXT PRIMARY KEY
    REFERENCES greenhouse_core.service_modules(module_code),

  -- Display
  label TEXT NOT NULL,
  label_full TEXT,
  claim TEXT,

  -- Ecosystem position
  loop_phase TEXT,
  loop_phase_label TEXT,

  -- Leadership
  lead_identity_profile_id TEXT,
  lead_name TEXT,

  -- Presentation (colors from GH_COLORS.service)
  color_hex TEXT NOT NULL,
  color_bg TEXT,
  icon_name TEXT,

  -- External mappings
  hubspot_enum_value TEXT NOT NULL UNIQUE,
  notion_label TEXT,

  -- State
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed data — colors from GH_COLORS.service (greenhouse-nomenclature.ts:1179-1184)
INSERT INTO greenhouse_core.business_line_metadata
  (module_code, label, label_full, claim, loop_phase, loop_phase_label,
   color_hex, color_bg, icon_name, hubspot_enum_value, notion_label,
   sort_order, description)
VALUES
  ('globe',
   'Globe',
   'Globe — Creative & Content',
   'Empower your Brand',
   'express',
   'EXPRESS',
   '#bb1954',
   'rgba(187,25,84,0.08)',
   'palette',
   'globe',
   'Globe',
   1,
   'Identidad de marca, creatividad, contenido full-funnel, producción audiovisual, campañas ATL/BTL, copywriting'),

  ('efeonce_digital',
   'Efeonce Digital',
   'Efeonce Digital — Strategy & Growth',
   'Empower your Growth',
   'tailor_evolve',
   'TAILOR + EVOLVE',
   '#023c70',
   'rgba(2,60,112,0.08)',
   'chart-dots-3',
   'efeonce_digital',
   'Efeonce Digital',
   2,
   'Estrategia GTM, Revenue Ops, CRM, SEO/AEO, redes sociales, pauta digital, analytics, Martech, AI agents'),

  ('reach',
   'Reach',
   'Reach — Media & Distribution',
   'Empower your Voice',
   'amplify',
   'AMPLIFY',
   '#ff6500',
   'rgba(255,101,0,0.08)',
   'speakerphone',
   'reach',
   'Reach',
   3,
   'Planificación y compra de medios ATL/digital, PR, influencers, negociación GRP/TRP'),

  ('wave',
   'Wave',
   'Wave — Technology & Infrastructure',
   'Empower your Engine',
   'transversal',
   'TRANSVERSAL',
   '#0375db',
   'rgba(3,117,219,0.08)',
   'code',
   'wave',
   'Wave',
   4,
   'Infraestructura digital, web performance, tracking, DSP/DMP/CDP, integraciones, automatización'),

  ('crm_solutions',
   'CRM Solutions',
   'CRM Solutions — HubSpot & Salesforce',
   'Empower your CRM',
   'tailor_evolve',
   'TAILOR + EVOLVE',
   '#633f93',
   'rgba(99,63,147,0.08)',
   'database',
   'crm_solutions',
   'CRM Solutions',
   5,
   'Licenciamiento HubSpot, implementación y onboarding, consultoría CRM')
ON CONFLICT (module_code) DO UPDATE
SET
  label = EXCLUDED.label,
  label_full = EXCLUDED.label_full,
  claim = EXCLUDED.claim,
  loop_phase = EXCLUDED.loop_phase,
  loop_phase_label = EXCLUDED.loop_phase_label,
  color_hex = EXCLUDED.color_hex,
  color_bg = EXCLUDED.color_bg,
  icon_name = EXCLUDED.icon_name,
  hubspot_enum_value = EXCLUDED.hubspot_enum_value,
  notion_label = EXCLUDED.notion_label,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. RBAC grants
GRANT SELECT ON greenhouse_core.business_line_metadata TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_core.business_line_metadata TO greenhouse_migrator;

-- 4. Migration log
INSERT INTO greenhouse_sync.schema_migrations (
  migration_id,
  migration_group,
  applied_by,
  notes
)
VALUES (
  'create-business-line-metadata-v1',
  'service_modules',
  CURRENT_USER,
  'TASK-016: Business line metadata table with seed for 5 canonical BLs. Colors from GH_COLORS.service.'
)
ON CONFLICT (migration_id) DO UPDATE
SET
  migration_group = EXCLUDED.migration_group,
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes,
  applied_at = CURRENT_TIMESTAMP;

COMMIT;
