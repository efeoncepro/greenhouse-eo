-- Up Migration
-- TASK-029: HRIS Goals & OKRs — 4 tables in greenhouse_hr
-- Ref: Greenhouse_HRIS_Architecture_v1.md §4.4

-- 1. Goal Cycles
CREATE TABLE greenhouse_hr.goal_cycles (
  cycle_id            TEXT PRIMARY KEY,
  cycle_name          TEXT NOT NULL,
  cycle_type          VARCHAR(20) NOT NULL
    CHECK (cycle_type IN ('quarterly', 'semester', 'annual')),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'review', 'closed')),
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_cycles_status ON greenhouse_hr.goal_cycles (status);

-- 2. Goals
CREATE TABLE greenhouse_hr.goals (
  goal_id             TEXT PRIMARY KEY,
  cycle_id            TEXT NOT NULL
    REFERENCES greenhouse_hr.goal_cycles(cycle_id),
  owner_type          VARCHAR(20) NOT NULL
    CHECK (owner_type IN ('individual', 'department', 'company')),
  owner_member_id     TEXT
    REFERENCES greenhouse_core.members(member_id),
  owner_department_id TEXT
    REFERENCES greenhouse_core.departments(department_id),
  title               TEXT NOT NULL,
  description         TEXT,
  progress_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'behind', 'completed', 'cancelled')),
  parent_goal_id      TEXT
    REFERENCES greenhouse_hr.goals(goal_id),
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_cycle ON greenhouse_hr.goals (cycle_id);
CREATE INDEX idx_goals_owner_member ON greenhouse_hr.goals (owner_member_id) WHERE owner_member_id IS NOT NULL;
CREATE INDEX idx_goals_owner_department ON greenhouse_hr.goals (owner_department_id) WHERE owner_department_id IS NOT NULL;
CREATE INDEX idx_goals_parent ON greenhouse_hr.goals (parent_goal_id) WHERE parent_goal_id IS NOT NULL;

-- 3. Goal Key Results
CREATE TABLE greenhouse_hr.goal_key_results (
  kr_id               TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL
    REFERENCES greenhouse_hr.goals(goal_id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  target_value        NUMERIC(12,2),
  current_value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit                VARCHAR(30)
    CHECK (unit IS NULL OR unit IN ('percent', 'count', 'currency', 'score')),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_key_results_goal ON greenhouse_hr.goal_key_results (goal_id);

-- 4. Goal Progress
CREATE TABLE greenhouse_hr.goal_progress (
  progress_id         TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL
    REFERENCES greenhouse_hr.goals(goal_id) ON DELETE CASCADE,
  recorded_by         TEXT NOT NULL,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress_percent    NUMERIC(5,2) NOT NULL,
  notes               TEXT
);

CREATE INDEX idx_goal_progress_goal ON greenhouse_hr.goal_progress (goal_id, recorded_at DESC);

-- Grants for runtime user
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.goal_cycles TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.goals TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.goal_key_results TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_hr.goal_progress TO greenhouse_runtime;

-- Down Migration
DROP TABLE IF EXISTS greenhouse_hr.goal_progress;
DROP TABLE IF EXISTS greenhouse_hr.goal_key_results;
DROP TABLE IF EXISTS greenhouse_hr.goals;
DROP TABLE IF EXISTS greenhouse_hr.goal_cycles;
