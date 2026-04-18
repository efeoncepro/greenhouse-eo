-- Up Migration
-- TASK-031: Performance Evaluations — 5 tables in greenhouse_hr

-- 1. Competency catalog
CREATE TABLE greenhouse_hr.eval_competencies (
  competency_id TEXT PRIMARY KEY,
  competency_name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(40) NOT NULL CHECK (category IN ('core', 'technical', 'leadership', 'delivery')),
  applicable_levels TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Evaluation cycles
CREATE TABLE greenhouse_hr.eval_cycles (
  eval_cycle_id TEXT PRIMARY KEY,
  cycle_name TEXT NOT NULL,
  cycle_type VARCHAR(20) NOT NULL CHECK (cycle_type IN ('quarterly', 'semester', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_eval_deadline DATE,
  peer_eval_deadline DATE,
  manager_deadline DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'self_eval', 'peer_eval', 'manager_review', 'calibration', 'closed')),
  competency_ids TEXT[] DEFAULT '{}',
  min_tenure_days INTEGER NOT NULL DEFAULT 90,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_eval_cycles_status ON greenhouse_hr.eval_cycles (status);

-- 3. Assignments
CREATE TABLE greenhouse_hr.eval_assignments (
  assignment_id TEXT PRIMARY KEY,
  eval_cycle_id TEXT NOT NULL REFERENCES greenhouse_hr.eval_cycles(eval_cycle_id),
  evaluatee_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  evaluator_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  eval_type VARCHAR(20) NOT NULL CHECK (eval_type IN ('self', 'peer', 'manager', 'direct_report')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'skipped')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_eval_assignments_cycle ON greenhouse_hr.eval_assignments (eval_cycle_id);
CREATE INDEX idx_eval_assignments_evaluatee ON greenhouse_hr.eval_assignments (evaluatee_id);
CREATE INDEX idx_eval_assignments_evaluator ON greenhouse_hr.eval_assignments (evaluator_id);

-- 4. Responses
CREATE TABLE greenhouse_hr.eval_responses (
  response_id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES greenhouse_hr.eval_assignments(assignment_id) ON DELETE CASCADE,
  competency_id TEXT NOT NULL REFERENCES greenhouse_hr.eval_competencies(competency_id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_eval_responses_assignment ON greenhouse_hr.eval_responses (assignment_id);

-- 5. Summaries
CREATE TABLE greenhouse_hr.eval_summaries (
  summary_id TEXT PRIMARY KEY,
  eval_cycle_id TEXT NOT NULL REFERENCES greenhouse_hr.eval_cycles(eval_cycle_id),
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  overall_rating NUMERIC(3,2),
  self_rating NUMERIC(3,2),
  peer_rating NUMERIC(3,2),
  manager_rating NUMERIC(3,2),
  ico_rpa_avg NUMERIC(5,2),
  ico_otd_percent NUMERIC(5,2),
  goal_completion_pct NUMERIC(5,2),
  strengths TEXT,
  development_areas TEXT,
  hr_notes TEXT,
  finalized_by TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (eval_cycle_id, member_id)
);
CREATE INDEX idx_eval_summaries_cycle ON greenhouse_hr.eval_summaries (eval_cycle_id);
CREATE INDEX idx_eval_summaries_member ON greenhouse_hr.eval_summaries (member_id);

-- Seed initial competencies
INSERT INTO greenhouse_hr.eval_competencies (competency_id, competency_name, description, category, applicable_levels, sort_order) VALUES
('comp-quality', 'Calidad de entrega', 'Consistencia y precision en el trabajo entregado.', 'delivery', '{}', 1),
('comp-communication', 'Comunicacion', 'Claridad, oportunidad y efectividad en la comunicacion.', 'core', '{}', 2),
('comp-collaboration', 'Colaboracion', 'Capacidad de trabajar con otros y aportar al equipo.', 'core', '{}', 3),
('comp-initiative', 'Iniciativa', 'Proactividad para identificar y resolver problemas.', 'core', '{}', 4),
('comp-technical', 'Competencia tecnica', 'Dominio de herramientas y metodologias del rol.', 'technical', '{}', 5),
('comp-time-mgmt', 'Gestion del tiempo', 'Cumplimiento de plazos y priorizacion efectiva.', 'delivery', '{}', 6),
('comp-adaptability', 'Adaptabilidad', 'Capacidad de ajustarse a cambios y nuevos contextos.', 'core', '{}', 7),
('comp-leadership', 'Liderazgo', 'Capacidad de guiar, motivar e influir positivamente.', 'leadership', ARRAY['senior', 'lead', 'manager', 'director'], 8);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.eval_competencies TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.eval_cycles TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.eval_assignments TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.eval_responses TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.eval_summaries TO greenhouse_runtime;

-- Down Migration
DROP TABLE IF EXISTS greenhouse_hr.eval_responses;
DROP TABLE IF EXISTS greenhouse_hr.eval_summaries;
DROP TABLE IF EXISTS greenhouse_hr.eval_assignments;
DROP TABLE IF EXISTS greenhouse_hr.eval_cycles;
DROP TABLE IF EXISTS greenhouse_hr.eval_competencies;
