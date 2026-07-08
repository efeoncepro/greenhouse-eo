-- Up Migration

-- TASK-1360 Slice 1 — Assessment Engine: motor de evaluación por competencias en greenhouse_hiring.
-- Additive-only. Extiende la foundation de TASK-353 (reusa greenhouse_hiring.touch_updated_at()).
-- Modelo: competency (category × level ortogonales) → question bank (answer_key SENSIBLE, separada)
-- → template (composición ponderada) → instance (candidate_test | interviewer_scorecard, tokenizada)
-- → response → competency_result (rollup a hiring_application, ADVISORY nunca auto-rechaza).
-- Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md §Delta 2026-07-08.

CREATE SEQUENCE IF NOT EXISTS greenhouse_hiring.hiring_assessment_public_seq;

-- 1. hiring_competency — catálogo reutilizable. Ejes ORTOGONALES: category × level (level vive en
--    question/template, no en la competencia — la competencia es agnóstica del nivel).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_competency (
  competency_id  TEXT PRIMARY KEY DEFAULT ('cmp-' || gen_random_uuid()::text),
  key            TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN ('attitudinal', 'aptitude', 'skill')),
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. hiring_question — banco de preguntas por competencia+nivel. answer_key_json/rubric_json SENSIBLE
--    (nunca en el payload candidate-facing). SME gate: draft → sme_review → active → retired.
--    Política (validez, Sackett 2022): skill@intermedio+ default work-sample/situational, no MCQ.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_question (
  question_id      TEXT PRIMARY KEY DEFAULT ('qst-' || gen_random_uuid()::text),
  competency_id    TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_competency (competency_id) ON DELETE RESTRICT,
  level            TEXT NOT NULL CHECK (level IN ('nociones', 'intermedio', 'avanzado')),
  type             TEXT NOT NULL CHECK (type IN ('single_choice', 'multi_choice', 'likert', 'situational', 'open_text')),
  prompt           TEXT NOT NULL,
  options_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_key_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  rubric_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sme_review', 'active', 'retired')),
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. hiring_assessment_template — plantilla nombrada = composición de competencias por rol.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_template (
  template_id  TEXT PRIMARY KEY DEFAULT ('atpl-' || gen_random_uuid()::text),
  name         TEXT NOT NULL,
  role_hint    TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. hiring_assessment_template_module — módulo de la plantilla (competencia + nivel objetivo + peso).
--    target_level nullable (attitudinal no lleva nivel). UNIQUE(template, competency).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_template_module (
  module_id      TEXT PRIMARY KEY DEFAULT ('atmd-' || gen_random_uuid()::text),
  template_id    TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment_template (template_id) ON DELETE CASCADE,
  competency_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_competency (competency_id) ON DELETE RESTRICT,
  target_level   TEXT CHECK (target_level IN ('nociones', 'intermedio', 'avanzado')),
  weight         NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (weight >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, competency_id)
);

-- 5. hiring_assessment — instancia. method: candidate_test (rinde el candidato, tokenizado) |
--    interviewer_scorecard (un evaluador humano). Pertenece a exactamente una hiring_application.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment (
  assessment_id       TEXT PRIMARY KEY DEFAULT ('asmt-' || gen_random_uuid()::text),
  public_id           TEXT NOT NULL UNIQUE
                        DEFAULT ('EO-ASM-' || lpad(nextval('greenhouse_hiring.hiring_assessment_public_seq')::text, 4, '0')),
  application_id      TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application (application_id) ON DELETE CASCADE,
  template_id         TEXT REFERENCES greenhouse_hiring.hiring_assessment_template (template_id) ON DELETE SET NULL,
  method              TEXT NOT NULL DEFAULT 'candidate_test' CHECK (method IN ('candidate_test', 'interviewer_scorecard')),
  evaluator_user_id   TEXT,
  status              TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN (
                        'assigned', 'sent', 'in_progress', 'submitted', 'scored', 'expired')),
  access_token_hash   TEXT,
  time_limit_minutes  INTEGER,
  accommodations_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at          TIMESTAMPTZ,
  submitted_at        TIMESTAMPTZ,
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. hiring_assessment_response — respuesta por pregunta (candidate_test) o rating por competencia
--    (interviewer_scorecard, question_id NULL). auto_score objetivo; needs_human_rating para abiertas.
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_assessment_response (
  response_id        TEXT PRIMARY KEY DEFAULT ('arsp-' || gen_random_uuid()::text),
  assessment_id      TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment (assessment_id) ON DELETE CASCADE,
  question_id        TEXT REFERENCES greenhouse_hiring.hiring_question (question_id) ON DELETE SET NULL,
  competency_id      TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_competency (competency_id) ON DELETE RESTRICT,
  answer_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_score         NUMERIC(6, 2),
  needs_human_rating BOOLEAN NOT NULL DEFAULT FALSE,
  human_score        NUMERIC(6, 2),
  scored_by          TEXT,
  scored_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. hiring_competency_result — resultado por competencia de una instancia (rollup source).
--    El detalle por pregunta vive en hiring_assessment_response. UNIQUE(assessment, competency).
CREATE TABLE IF NOT EXISTS greenhouse_hiring.hiring_competency_result (
  result_id      TEXT PRIMARY KEY DEFAULT ('acrs-' || gen_random_uuid()::text),
  assessment_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_assessment (assessment_id) ON DELETE CASCADE,
  competency_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_competency (competency_id) ON DELETE RESTRICT,
  score          NUMERIC(6, 2) NOT NULL DEFAULT 0,
  level_achieved TEXT CHECK (level_achieved IN ('nociones', 'intermedio', 'avanzado')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, competency_id)
);

-- Índices por FK / filtro.
CREATE INDEX IF NOT EXISTS hiring_competency_category_idx ON greenhouse_hiring.hiring_competency (category);
CREATE INDEX IF NOT EXISTS hiring_question_competency_idx ON greenhouse_hiring.hiring_question (competency_id);
CREATE INDEX IF NOT EXISTS hiring_question_status_idx ON greenhouse_hiring.hiring_question (status);
CREATE INDEX IF NOT EXISTS hiring_question_level_type_idx ON greenhouse_hiring.hiring_question (level, type);
CREATE INDEX IF NOT EXISTS hiring_template_module_template_idx ON greenhouse_hiring.hiring_assessment_template_module (template_id);
CREATE INDEX IF NOT EXISTS hiring_assessment_application_idx ON greenhouse_hiring.hiring_assessment (application_id);
CREATE INDEX IF NOT EXISTS hiring_assessment_status_idx ON greenhouse_hiring.hiring_assessment (status);
CREATE INDEX IF NOT EXISTS hiring_assessment_method_idx ON greenhouse_hiring.hiring_assessment (method);
CREATE INDEX IF NOT EXISTS hiring_response_assessment_idx ON greenhouse_hiring.hiring_assessment_response (assessment_id);
CREATE INDEX IF NOT EXISTS hiring_response_rating_idx ON greenhouse_hiring.hiring_assessment_response (needs_human_rating) WHERE needs_human_rating = TRUE;
CREATE INDEX IF NOT EXISTS hiring_competency_result_assessment_idx ON greenhouse_hiring.hiring_competency_result (assessment_id);

-- Triggers touch_updated_at (reusa la función del schema de TASK-353).
DROP TRIGGER IF EXISTS trg_hiring_competency_touch ON greenhouse_hiring.hiring_competency;
CREATE TRIGGER trg_hiring_competency_touch BEFORE UPDATE ON greenhouse_hiring.hiring_competency
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();
DROP TRIGGER IF EXISTS trg_hiring_question_touch ON greenhouse_hiring.hiring_question;
CREATE TRIGGER trg_hiring_question_touch BEFORE UPDATE ON greenhouse_hiring.hiring_question
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();
DROP TRIGGER IF EXISTS trg_hiring_template_touch ON greenhouse_hiring.hiring_assessment_template;
CREATE TRIGGER trg_hiring_template_touch BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_template
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();
DROP TRIGGER IF EXISTS trg_hiring_assessment_touch ON greenhouse_hiring.hiring_assessment;
CREATE TRIGGER trg_hiring_assessment_touch BEFORE UPDATE ON greenhouse_hiring.hiring_assessment
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();
DROP TRIGGER IF EXISTS trg_hiring_response_touch ON greenhouse_hiring.hiring_assessment_response;
CREATE TRIGGER trg_hiring_response_touch BEFORE UPDATE ON greenhouse_hiring.hiring_assessment_response
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();
DROP TRIGGER IF EXISTS trg_hiring_competency_result_touch ON greenhouse_hiring.hiring_competency_result;
CREATE TRIGGER trg_hiring_competency_result_touch BEFORE UPDATE ON greenhouse_hiring.hiring_competency_result
  FOR EACH ROW EXECUTE FUNCTION greenhouse_hiring.touch_updated_at();

-- Seed del catálogo de competencias (revisado con greenhouse-talent-people-operator).
INSERT INTO greenhouse_hiring.hiring_competency (key, name, category, description) VALUES
  ('seo', 'SEO', 'skill', 'Nociones de posicionamiento orgánico y lectura de reportes SEO.'),
  ('copywriting', 'Copywriting', 'skill', 'Redacción persuasiva y crítica de copy para marca/demanda.'),
  ('project_management', 'Project Management', 'skill', 'Planificación, coordinación y seguimiento de entregas.'),
  ('community_management', 'Community Management', 'skill', 'Gestión de comunidad y social care.'),
  ('leadership', 'Liderazgo', 'skill', 'Liderar equipos y clientes con criterio y empatía.'),
  ('vendor_management', 'Vendor Management', 'skill', 'Coordinación y negociación con proveedores/medios.'),
  ('client_relationship_comm', 'Relación con el cliente y comunicación', 'skill', 'Dueño de la relación; comunicación clara y proactiva.'),
  ('commercial_acumen', 'Acumen comercial / crecimiento de cuenta', 'skill', 'Detectar upsell/cross-sell y hacer crecer la cuenta.'),
  ('delivery_coordination', 'Coordinación de entrega', 'skill', 'Coordinar la entrega del pod con el cliente.'),
  ('ownership', 'Ownership y accountability', 'attitudinal', 'Se hace dueño del resultado, no del task.'),
  ('communication', 'Comunicación', 'attitudinal', 'Comunicación clara, oportuna y honesta.'),
  ('collaboration', 'Colaboración', 'attitudinal', 'Trabaja bien en equipo multidisciplinario.'),
  ('composure_pressure', 'Compostura bajo presión', 'attitudinal', 'Mantiene la calma y el criterio ante presión del cliente.'),
  ('numerical', 'Razonamiento numérico', 'aptitude', 'Razonamiento cuantitativo aplicado.'),
  ('verbal', 'Razonamiento verbal', 'aptitude', 'Comprensión y razonamiento verbal.'),
  ('logical', 'Razonamiento lógico', 'aptitude', 'Razonamiento lógico/abstracto.')
ON CONFLICT (key) DO NOTHING;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si las 7 tablas + el seed no quedaron.
DO $$
DECLARE table_count INTEGER; comp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'greenhouse_hiring'
    AND table_name IN ('hiring_competency', 'hiring_question', 'hiring_assessment_template',
      'hiring_assessment_template_module', 'hiring_assessment', 'hiring_assessment_response',
      'hiring_competency_result');
  IF table_count <> 7 THEN
    RAISE EXCEPTION 'TASK-1360 anti pre-up-marker: expected 7 assessment tables, got %. Markers may be inverted.', table_count;
  END IF;
  SELECT COUNT(*) INTO comp_count FROM greenhouse_hiring.hiring_competency;
  IF comp_count < 16 THEN
    RAISE EXCEPTION 'TASK-1360 anti pre-up-marker: expected >=16 seeded competencies, got %.', comp_count;
  END IF;
END
$$;

-- Ownership + GRANTs (espeja TASK-353). Aggregates mutables → DML completo a runtime.
ALTER TABLE greenhouse_hiring.hiring_competency OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_question OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_assessment_template OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_assessment_template_module OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_assessment OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_assessment_response OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hiring.hiring_competency_result OWNER TO greenhouse_ops;

GRANT USAGE ON SEQUENCE greenhouse_hiring.hiring_assessment_public_seq TO greenhouse_runtime;
GRANT USAGE ON SEQUENCE greenhouse_hiring.hiring_assessment_public_seq TO greenhouse_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_competency TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_competency TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_competency TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_question TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_question TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_question TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_template TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_template TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_template TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_template_module TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_template_module TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_template_module TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_response TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_response TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_assessment_response TO greenhouse_migrator_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_competency_result TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_competency_result TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hiring.hiring_competency_result TO greenhouse_migrator_user;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_hiring.hiring_competency_result CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_response CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_template_module CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_assessment_template CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_question CASCADE;
DROP TABLE IF EXISTS greenhouse_hiring.hiring_competency CASCADE;
DROP SEQUENCE IF EXISTS greenhouse_hiring.hiring_assessment_public_seq CASCADE;
