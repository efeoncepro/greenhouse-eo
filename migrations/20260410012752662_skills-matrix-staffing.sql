-- Up Migration

SET search_path = greenhouse_core, greenhouse_serving, greenhouse_delivery, public;

CREATE TABLE IF NOT EXISTS greenhouse_core.skill_catalog (
  skill_code TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  description TEXT,
  seniority_levels TEXT[] NOT NULL DEFAULT ARRAY['junior', 'mid', 'senior', 'lead']::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT skill_catalog_category_check CHECK (
    skill_category = ANY (ARRAY[
      'design'::TEXT,
      'development'::TEXT,
      'strategy'::TEXT,
      'account'::TEXT,
      'media'::TEXT,
      'operations'::TEXT,
      'other'::TEXT
    ])
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.member_skills (
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES greenhouse_core.skill_catalog(skill_code) ON DELETE CASCADE,
  seniority_level TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, skill_code),
  CONSTRAINT member_skills_seniority_check CHECK (
    seniority_level = ANY (ARRAY['junior'::TEXT, 'mid'::TEXT, 'senior'::TEXT, 'lead'::TEXT])
  )
);

CREATE TABLE IF NOT EXISTS greenhouse_core.service_skill_requirements (
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  skill_code TEXT NOT NULL REFERENCES greenhouse_core.skill_catalog(skill_code) ON DELETE CASCADE,
  required_seniority TEXT NOT NULL,
  required_fte NUMERIC(5,3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (service_id, skill_code),
  CONSTRAINT service_skill_requirements_seniority_check CHECK (
    required_seniority = ANY (ARRAY['junior'::TEXT, 'mid'::TEXT, 'senior'::TEXT, 'lead'::TEXT])
  ),
  CONSTRAINT service_skill_requirements_fte_check CHECK (required_fte > 0)
);

CREATE INDEX IF NOT EXISTS idx_skill_catalog_category
  ON greenhouse_core.skill_catalog (skill_category, active, display_order);

CREATE INDEX IF NOT EXISTS idx_member_skills_skill_code
  ON greenhouse_core.member_skills (skill_code, seniority_level);

CREATE INDEX IF NOT EXISTS idx_service_skill_requirements_skill_code
  ON greenhouse_core.service_skill_requirements (skill_code, required_seniority);

INSERT INTO greenhouse_core.skill_catalog (
  skill_code,
  skill_name,
  skill_category,
  description,
  display_order
)
VALUES
  ('motion_design', 'Motion Design', 'design', 'Animación, edición y motion graphics.', 10),
  ('ux_research', 'UX Research', 'design', 'Investigación de usuario, entrevistas y hallazgos accionables.', 20),
  ('ux_ui_design', 'UX/UI Design', 'design', 'Diseño de experiencia e interfaz para productos digitales.', 30),
  ('brand_design', 'Brand Design', 'design', 'Sistemas visuales, branding y dirección gráfica.', 40),
  ('copywriting', 'Copywriting', 'strategy', 'Redacción estratégica y narrativa comercial.', 50),
  ('content_strategy', 'Content Strategy', 'strategy', 'Planificación editorial y estructura de contenido.', 60),
  ('account_management', 'Account Management', 'account', 'Gestión de cuenta, coordinación y relación con cliente.', 70),
  ('project_management', 'Project Management', 'operations', 'Gestión de proyecto, seguimiento y delivery operativo.', 80),
  ('paid_media', 'Paid Media', 'media', 'Planificación, ejecución y optimización de medios pagos.', 90),
  ('performance_marketing', 'Performance Marketing', 'media', 'Optimización por objetivos, funnels y growth.', 100),
  ('react_development', 'React Development', 'development', 'Implementación frontend React / Next.js.', 110),
  ('backend_development', 'Backend Development', 'development', 'APIs, modelado backend e integraciones.', 120),
  ('data_analysis', 'Data Analysis', 'strategy', 'Lectura analítica, reporting e interpretación de datos.', 130),
  ('automation', 'Automation', 'operations', 'Automatización de procesos y tooling interno.', 140)
ON CONFLICT (skill_code) DO UPDATE SET
  skill_name = EXCLUDED.skill_name,
  skill_category = EXCLUDED.skill_category,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = CURRENT_TIMESTAMP;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_core.idx_service_skill_requirements_skill_code;
DROP INDEX IF EXISTS greenhouse_core.idx_member_skills_skill_code;
DROP INDEX IF EXISTS greenhouse_core.idx_skill_catalog_category;

DROP TABLE IF EXISTS greenhouse_core.service_skill_requirements;
DROP TABLE IF EXISTS greenhouse_core.member_skills;
DROP TABLE IF EXISTS greenhouse_core.skill_catalog;
