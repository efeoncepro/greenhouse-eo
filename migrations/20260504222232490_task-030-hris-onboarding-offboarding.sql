-- Up Migration
CREATE TABLE IF NOT EXISTS greenhouse_hr.onboarding_templates (
  template_id                 TEXT PRIMARY KEY,
  template_name               TEXT NOT NULL,
  template_type               VARCHAR(20) NOT NULL CHECK (template_type IN ('onboarding', 'offboarding')),
  description                 TEXT,
  applicable_contract_types   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active                      BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json               JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  updated_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.onboarding_template_items (
  item_id                     TEXT PRIMARY KEY,
  template_id                 TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_templates(template_id) ON DELETE CASCADE,
  item_title                  TEXT NOT NULL,
  item_description            TEXT,
  assigned_role               VARCHAR(30) NOT NULL CHECK (assigned_role IN ('hr', 'it', 'supervisor', 'collaborator', 'payroll', 'delivery')),
  due_days_offset             INTEGER NOT NULL DEFAULT 0,
  required                    BOOLEAN NOT NULL DEFAULT TRUE,
  display_order               INTEGER NOT NULL DEFAULT 0,
  metadata_json               JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.onboarding_instances (
  instance_id                 TEXT PRIMARY KEY,
  template_id                 TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_templates(template_id) ON DELETE RESTRICT,
  member_id                   TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE RESTRICT,
  offboarding_case_id         TEXT REFERENCES greenhouse_hr.work_relationship_offboarding_cases(offboarding_case_id) ON DELETE SET NULL,
  instance_type               VARCHAR(20) NOT NULL CHECK (instance_type IN ('onboarding', 'offboarding')),
  status                      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_date                  DATE NOT NULL,
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  cancellation_reason         TEXT,
  source                      VARCHAR(30) NOT NULL DEFAULT 'manual_hr' CHECK (source IN ('manual_hr', 'member_event', 'offboarding_case', 'scim', 'system')),
  source_ref                  JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata_json               JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  updated_by_user_id          TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.onboarding_instance_items (
  instance_item_id            TEXT PRIMARY KEY,
  instance_id                 TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_instances(instance_id) ON DELETE CASCADE,
  template_item_id            TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_template_items(item_id) ON DELETE RESTRICT,
  item_title_snapshot         TEXT NOT NULL,
  item_description_snapshot   TEXT,
  assigned_role_snapshot      VARCHAR(30) NOT NULL CHECK (assigned_role_snapshot IN ('hr', 'it', 'supervisor', 'collaborator', 'payroll', 'delivery')),
  due_date                    DATE,
  required_snapshot           BOOLEAN NOT NULL DEFAULT TRUE,
  display_order_snapshot      INTEGER NOT NULL DEFAULT 0,
  status                      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped', 'blocked')),
  completed_at                TIMESTAMPTZ,
  completed_by_user_id        TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  notes                       TEXT,
  metadata_json               JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_templates_type_name_unique_idx
  ON greenhouse_hr.onboarding_templates (template_type, lower(template_name));

CREATE INDEX IF NOT EXISTS onboarding_template_items_template_order_idx
  ON greenhouse_hr.onboarding_template_items (template_id, display_order, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_instances_one_active_member_type_idx
  ON greenhouse_hr.onboarding_instances (member_id, instance_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS onboarding_instances_member_created_idx
  ON greenhouse_hr.onboarding_instances (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_instances_case_idx
  ON greenhouse_hr.onboarding_instances (offboarding_case_id)
  WHERE offboarding_case_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS onboarding_instance_items_instance_order_idx
  ON greenhouse_hr.onboarding_instance_items (instance_id, display_order_snapshot, created_at);

CREATE INDEX IF NOT EXISTS onboarding_instance_items_status_due_idx
  ON greenhouse_hr.onboarding_instance_items (status, due_date);

CREATE OR REPLACE FUNCTION greenhouse_hr.touch_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_templates_touch_updated_at
  ON greenhouse_hr.onboarding_templates;

CREATE TRIGGER trg_onboarding_templates_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.onboarding_templates
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_hr.touch_onboarding_updated_at();

DROP TRIGGER IF EXISTS trg_onboarding_template_items_touch_updated_at
  ON greenhouse_hr.onboarding_template_items;

CREATE TRIGGER trg_onboarding_template_items_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.onboarding_template_items
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_hr.touch_onboarding_updated_at();

DROP TRIGGER IF EXISTS trg_onboarding_instances_touch_updated_at
  ON greenhouse_hr.onboarding_instances;

CREATE TRIGGER trg_onboarding_instances_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.onboarding_instances
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_hr.touch_onboarding_updated_at();

DROP TRIGGER IF EXISTS trg_onboarding_instance_items_touch_updated_at
  ON greenhouse_hr.onboarding_instance_items;

CREATE TRIGGER trg_onboarding_instance_items_touch_updated_at
  BEFORE UPDATE ON greenhouse_hr.onboarding_instance_items
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_hr.touch_onboarding_updated_at();

INSERT INTO greenhouse_hr.onboarding_templates (
  template_id,
  template_name,
  template_type,
  description,
  applicable_contract_types,
  metadata_json
)
VALUES
  (
    'onboarding-template-efeonce-team',
    'Onboarding - Equipo Efeonce',
    'onboarding',
    'Checklist base para colaboradores dependientes y EOR.',
    ARRAY['indefinido', 'plazo_fijo', 'eor'],
    '{"seededBy":"TASK-030"}'::JSONB
  ),
  (
    'onboarding-template-contractor',
    'Onboarding - Contractor',
    'onboarding',
    'Checklist base para honorarios y contractors.',
    ARRAY['honorarios', 'contractor'],
    '{"seededBy":"TASK-030"}'::JSONB
  ),
  (
    'offboarding-template-standard',
    'Offboarding - Estandar',
    'offboarding',
    'Checklist operativo de salida. No reemplaza el caso canonico de offboarding.',
    ARRAY[]::TEXT[],
    '{"seededBy":"TASK-030","canonicalBoundary":"work_relationship_offboarding_case"}'::JSONB
  )
ON CONFLICT (template_id) DO UPDATE
SET
  template_name = EXCLUDED.template_name,
  description = EXCLUDED.description,
  applicable_contract_types = EXCLUDED.applicable_contract_types,
  metadata_json = greenhouse_hr.onboarding_templates.metadata_json || EXCLUDED.metadata_json,
  updated_at = NOW();

INSERT INTO greenhouse_hr.onboarding_template_items (
  item_id,
  template_id,
  item_title,
  assigned_role,
  due_days_offset,
  required,
  display_order
)
VALUES
  ('onboarding-team-item-01', 'onboarding-template-efeonce-team', 'Crear perfil en Greenhouse', 'hr', 0, TRUE, 1),
  ('onboarding-team-item-02', 'onboarding-template-efeonce-team', 'Firmar contrato de trabajo', 'hr', 0, TRUE, 2),
  ('onboarding-team-item-03', 'onboarding-template-efeonce-team', 'Registrar datos bancarios y previsionales', 'hr', 0, TRUE, 3),
  ('onboarding-team-item-04', 'onboarding-template-efeonce-team', 'Crear cuenta Microsoft 365', 'it', 0, TRUE, 4),
  ('onboarding-team-item-05', 'onboarding-template-efeonce-team', 'Asignar licencias de herramientas', 'it', 0, TRUE, 5),
  ('onboarding-team-item-06', 'onboarding-template-efeonce-team', 'Configurar acceso a Notion workspace', 'it', 1, TRUE, 6),
  ('onboarding-team-item-07', 'onboarding-template-efeonce-team', 'Reunion de bienvenida y contexto', 'supervisor', 1, TRUE, 7),
  ('onboarding-team-item-08', 'onboarding-template-efeonce-team', 'Asignar a Spaces y proyectos iniciales', 'supervisor', 1, TRUE, 8),
  ('onboarding-team-item-09', 'onboarding-template-efeonce-team', 'Completar perfil profesional', 'collaborator', 3, TRUE, 9),
  ('onboarding-team-item-10', 'onboarding-template-efeonce-team', 'Subir documentos de identidad', 'collaborator', 3, TRUE, 10),
  ('onboarding-team-item-11', 'onboarding-template-efeonce-team', 'Verificar documentos subidos', 'hr', 5, TRUE, 11),
  ('onboarding-team-item-12', 'onboarding-template-efeonce-team', 'Check-in de primera quincena', 'supervisor', 15, TRUE, 12),
  ('onboarding-team-item-13', 'onboarding-template-efeonce-team', 'Evaluacion de periodo de prueba', 'hr', 30, FALSE, 13),
  ('onboarding-contractor-item-01', 'onboarding-template-contractor', 'Registrar en Greenhouse', 'hr', 0, TRUE, 1),
  ('onboarding-contractor-item-02', 'onboarding-template-contractor', 'Firmar contrato o NDA', 'hr', 0, TRUE, 2),
  ('onboarding-contractor-item-03', 'onboarding-template-contractor', 'Crear accesos necesarios', 'it', 0, TRUE, 3),
  ('onboarding-contractor-item-04', 'onboarding-template-contractor', 'Briefing de proyecto y alcance', 'supervisor', 0, TRUE, 4),
  ('onboarding-contractor-item-05', 'onboarding-template-contractor', 'Completar perfil profesional', 'collaborator', 1, TRUE, 5),
  ('onboarding-contractor-item-06', 'onboarding-template-contractor', 'Check-in primera semana', 'supervisor', 7, FALSE, 6),
  ('offboarding-standard-item-01', 'offboarding-template-standard', 'Notificar al equipo', 'supervisor', 0, TRUE, 1),
  ('offboarding-standard-item-02', 'offboarding-template-standard', 'Plan de transferencia de proyectos', 'supervisor', 0, TRUE, 2),
  ('offboarding-standard-item-03', 'offboarding-template-standard', 'Revocar acceso a Notion', 'it', 0, TRUE, 3),
  ('offboarding-standard-item-04', 'offboarding-template-standard', 'Revocar licencias de herramientas', 'it', 0, TRUE, 4),
  ('offboarding-standard-item-05', 'offboarding-template-standard', 'Desactivar cuenta Microsoft 365', 'it', 1, TRUE, 5),
  ('offboarding-standard-item-06', 'offboarding-template-standard', 'Preparar documentos de termino', 'hr', 1, TRUE, 6),
  ('offboarding-standard-item-07', 'offboarding-template-standard', 'Coordinar lane de finiquito o liquidacion final', 'payroll', 3, TRUE, 7),
  ('offboarding-standard-item-08', 'offboarding-template-standard', 'Entregar equipos y accesos pendientes', 'collaborator', 3, TRUE, 8),
  ('offboarding-standard-item-09', 'offboarding-template-standard', 'Cerrar perfil operativo en Greenhouse', 'hr', 5, TRUE, 9)
ON CONFLICT (item_id) DO UPDATE
SET
  item_title = EXCLUDED.item_title,
  assigned_role = EXCLUDED.assigned_role,
  due_days_offset = EXCLUDED.due_days_offset,
  required = EXCLUDED.required,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

ALTER TABLE greenhouse_hr.onboarding_templates OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.onboarding_template_items OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.onboarding_instances OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.onboarding_instance_items OWNER TO greenhouse_ops;
ALTER FUNCTION greenhouse_hr.touch_onboarding_updated_at() OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_templates TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_template_items TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_instances TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_instance_items TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_templates TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_template_items TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_instances TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_instance_items TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_templates TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_template_items TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_instances TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.onboarding_instance_items TO greenhouse_migrator;

COMMENT ON TABLE greenhouse_hr.onboarding_templates IS
  'TASK-030: HRIS checklist templates for onboarding/offboarding operational execution.';

COMMENT ON COLUMN greenhouse_hr.onboarding_instances.offboarding_case_id IS
  'Optional link to the canonical WorkRelationshipOffboardingCase. Checklist does not define the workforce exit event.';

-- Down Migration
DROP TRIGGER IF EXISTS trg_onboarding_instance_items_touch_updated_at
  ON greenhouse_hr.onboarding_instance_items;
DROP TRIGGER IF EXISTS trg_onboarding_instances_touch_updated_at
  ON greenhouse_hr.onboarding_instances;
DROP TRIGGER IF EXISTS trg_onboarding_template_items_touch_updated_at
  ON greenhouse_hr.onboarding_template_items;
DROP TRIGGER IF EXISTS trg_onboarding_templates_touch_updated_at
  ON greenhouse_hr.onboarding_templates;

DROP FUNCTION IF EXISTS greenhouse_hr.touch_onboarding_updated_at();
DROP TABLE IF EXISTS greenhouse_hr.onboarding_instance_items;
DROP TABLE IF EXISTS greenhouse_hr.onboarding_instances;
DROP TABLE IF EXISTS greenhouse_hr.onboarding_template_items;
DROP TABLE IF EXISTS greenhouse_hr.onboarding_templates;
