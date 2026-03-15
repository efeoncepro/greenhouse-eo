CREATE SCHEMA IF NOT EXISTS greenhouse_hr;

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_types (
  leave_type_code TEXT PRIMARY KEY,
  leave_type_name TEXT NOT NULL,
  description TEXT,
  default_annual_allowance_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  color_token TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_balances (
  balance_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code),
  year INTEGER NOT NULL,
  allowance_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  used_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reserved_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
  updated_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_balances_member_type_year_unique UNIQUE (member_id, leave_type_code, year)
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_requests (
  request_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE,
  leave_type_code TEXT NOT NULL REFERENCES greenhouse_hr.leave_types(leave_type_code),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requested_days NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_supervisor', 'pending_hr', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  attachment_url TEXT,
  supervisor_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  hr_reviewer_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  notes TEXT,
  created_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_hr.leave_request_actions (
  action_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES greenhouse_hr.leave_requests(request_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submit', 'approve', 'reject', 'cancel')),
  actor_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  actor_member_id TEXT REFERENCES greenhouse_core.members(member_id),
  actor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS leave_balances_member_year_idx
  ON greenhouse_hr.leave_balances (member_id, year);

CREATE INDEX IF NOT EXISTS leave_balances_type_year_idx
  ON greenhouse_hr.leave_balances (leave_type_code, year);

CREATE INDEX IF NOT EXISTS leave_requests_member_created_idx
  ON greenhouse_hr.leave_requests (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_requests_supervisor_status_idx
  ON greenhouse_hr.leave_requests (supervisor_member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS leave_requests_status_start_idx
  ON greenhouse_hr.leave_requests (status, start_date DESC);

CREATE INDEX IF NOT EXISTS leave_request_actions_request_idx
  ON greenhouse_hr.leave_request_actions (request_id, created_at DESC);

INSERT INTO greenhouse_hr.leave_types (
  leave_type_code,
  leave_type_name,
  description,
  default_annual_allowance_days,
  requires_attachment,
  is_paid,
  color_token,
  active
)
VALUES
  ('vacation', 'Vacaciones', 'Vacaciones anuales pagadas.', 15, FALSE, TRUE, 'success', TRUE),
  ('personal', 'Permiso personal', 'Permiso administrativo o personal.', 5, FALSE, TRUE, 'primary', TRUE),
  ('medical', 'Licencia medica', 'Ausencia por licencia o reposo medico.', 0, TRUE, TRUE, 'warning', TRUE),
  ('unpaid', 'Permiso sin goce', 'Ausencia sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', TRUE)
ON CONFLICT (leave_type_code) DO UPDATE
SET
  leave_type_name = EXCLUDED.leave_type_name,
  description = EXCLUDED.description,
  default_annual_allowance_days = EXCLUDED.default_annual_allowance_days,
  requires_attachment = EXCLUDED.requires_attachment,
  is_paid = EXCLUDED.is_paid,
  color_token = EXCLUDED.color_token,
  active = EXCLUDED.active,
  updated_at = CURRENT_TIMESTAMP;

GRANT USAGE ON SCHEMA greenhouse_hr TO greenhouse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_hr TO greenhouse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_hr
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_app;
