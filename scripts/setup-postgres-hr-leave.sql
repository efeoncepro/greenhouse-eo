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
  ('personal_unpaid', 'Permiso personal no remunerado', 'Permiso por gestión personal sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', TRUE),
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

-- ============================================================
-- Serving view: member_leave_360
-- Combines canonical member identity with current-year leave
-- balances and recent request counts.
-- ============================================================

CREATE OR REPLACE VIEW greenhouse_serving.member_leave_360 AS
SELECT
  m.member_id,
  m.display_name,
  m.primary_email,
  m.status AS member_status,
  m.active AS member_active,
  d.name AS department_name,
  mgr.member_id AS supervisor_member_id,
  mgr.display_name AS supervisor_name,
  COALESCE(bal.vacation_allowance, 0) AS vacation_allowance,
  COALESCE(bal.vacation_used, 0) AS vacation_used,
  COALESCE(bal.vacation_reserved, 0) AS vacation_reserved,
  COALESCE(bal.vacation_allowance, 0)
    + COALESCE(bal.vacation_carried, 0)
    - COALESCE(bal.vacation_used, 0)
    - COALESCE(bal.vacation_reserved, 0) AS vacation_available,
  COALESCE(req.pending_count, 0) AS pending_requests,
  COALESCE(req.approved_count, 0) AS approved_requests_this_year,
  COALESCE(req.total_approved_days, 0) AS total_approved_days_this_year
FROM greenhouse_core.members m
LEFT JOIN greenhouse_core.departments d ON d.department_id = m.department_id
LEFT JOIN greenhouse_core.members mgr ON mgr.member_id = m.reports_to_member_id
LEFT JOIN LATERAL (
  SELECT
    SUM(allowance_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_allowance,
    SUM(carried_over_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_carried,
    SUM(used_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_used,
    SUM(reserved_days) FILTER (WHERE leave_type_code = 'vacation') AS vacation_reserved
  FROM greenhouse_hr.leave_balances lb
  WHERE lb.member_id = m.member_id
    AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
) bal ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE status IN ('pending_supervisor', 'pending_hr')) AS pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
    COALESCE(SUM(requested_days) FILTER (WHERE status = 'approved'), 0) AS total_approved_days
  FROM greenhouse_hr.leave_requests lr
  WHERE lr.member_id = m.member_id
    AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
) req ON TRUE
WHERE m.active = TRUE;

-- Ensure serving view is accessible
GRANT SELECT ON greenhouse_serving.member_leave_360 TO greenhouse_runtime;
GRANT SELECT ON greenhouse_serving.member_leave_360 TO greenhouse_migrator;

-- ============================================================
-- Grants
-- ============================================================

GRANT USAGE ON SCHEMA greenhouse_hr TO greenhouse_runtime;
GRANT USAGE, CREATE ON SCHEMA greenhouse_hr TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greenhouse_hr TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA greenhouse_hr TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_hr
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA greenhouse_hr
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;
