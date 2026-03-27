-- HR Core backend foundation
-- Reference SQL bootstrap aligned with src/lib/hr-core/schema.ts

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS department_id STRING;

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS reports_to STRING;

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS job_level STRING;

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS hire_date DATE;

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS contract_end_date DATE;

ALTER TABLE `efeonce-group.greenhouse.team_members`
ADD COLUMN IF NOT EXISTS daily_required BOOL;

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.departments` (
  department_id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  parent_department_id STRING,
  head_member_id STRING,
  business_unit STRING NOT NULL,
  active BOOL,
  sort_order INT64,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.member_profiles` (
  member_id STRING NOT NULL,
  identity_document_type STRING,
  identity_document_number STRING,
  emergency_contact_name STRING,
  emergency_contact_phone STRING,
  health_system STRING,
  isapre_name STRING,
  bank_name STRING,
  bank_account_type STRING,
  bank_account_number STRING,
  cv_url STRING,
  linkedin_url STRING,
  portfolio_url STRING,
  skills ARRAY<STRING>,
  tools ARRAY<STRING>,
  ai_suites ARRAY<STRING>,
  strengths ARRAY<STRING>,
  improvement_areas ARRAY<STRING>,
  piece_types ARRAY<STRING>,
  avg_monthly_volume FLOAT64,
  throughput_avg_30d FLOAT64,
  rpa_avg_30d FLOAT64,
  otd_percent_30d FLOAT64,
  notes STRING,
  updated_by STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_types` (
  leave_type_code STRING NOT NULL,
  leave_type_name STRING NOT NULL,
  description STRING,
  default_annual_allowance_days INT64,
  requires_attachment BOOL,
  is_paid BOOL,
  color_token STRING,
  active BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_balances` (
  balance_id STRING NOT NULL,
  member_id STRING NOT NULL,
  leave_type_code STRING NOT NULL,
  year INT64 NOT NULL,
  allowance_days FLOAT64,
  carried_over_days FLOAT64,
  used_days FLOAT64,
  reserved_days FLOAT64,
  updated_by STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_requests` (
  request_id STRING NOT NULL,
  member_id STRING NOT NULL,
  leave_type_code STRING NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requested_days FLOAT64 NOT NULL,
  status STRING NOT NULL,
  reason STRING,
  attachment_url STRING,
  supervisor_member_id STRING,
  hr_reviewer_user_id STRING,
  decided_at TIMESTAMP,
  decided_by STRING,
  notes STRING,
  created_by STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.leave_request_actions` (
  action_id STRING NOT NULL,
  request_id STRING NOT NULL,
  action STRING NOT NULL,
  actor_user_id STRING,
  actor_member_id STRING,
  actor_name STRING,
  notes STRING,
  created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse.attendance_daily` (
  attendance_id STRING NOT NULL,
  member_id STRING NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_status STRING NOT NULL,
  source_system STRING NOT NULL,
  source_reference STRING,
  check_in_at TIMESTAMP,
  meeting_joined_at TIMESTAMP,
  meeting_left_at TIMESTAMP,
  minutes_present INT64,
  notes STRING,
  recorded_by STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

MERGE `efeonce-group.greenhouse.roles` AS target
USING (
  SELECT
    'employee' AS role_code,
    'Employee' AS role_name,
    'internal' AS role_family,
    'Internal employee self-service access for HR core.' AS description,
    'efeonce_internal' AS tenant_type,
    FALSE AS is_admin,
    TRUE AS is_internal,
    ['internal', 'employee'] AS route_group_scope,
    CURRENT_TIMESTAMP() AS created_at,
    CURRENT_TIMESTAMP() AS updated_at
) AS source
ON target.role_code = source.role_code
WHEN MATCHED THEN
  UPDATE SET
    role_name = source.role_name,
    role_family = source.role_family,
    description = source.description,
    tenant_type = source.tenant_type,
    is_admin = source.is_admin,
    is_internal = source.is_internal,
    route_group_scope = source.route_group_scope,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    role_code,
    role_name,
    role_family,
    description,
    tenant_type,
    is_admin,
    is_internal,
    route_group_scope,
    created_at,
    updated_at
  )
  VALUES (
    source.role_code,
    source.role_name,
    source.role_family,
    source.description,
    source.tenant_type,
    source.is_admin,
    source.is_internal,
    source.route_group_scope,
    source.created_at,
    source.updated_at
  );

MERGE `efeonce-group.greenhouse.leave_types` AS target
USING (
  SELECT 'vacation' AS leave_type_code, 'Vacaciones' AS leave_type_name, 'Vacaciones anuales pagadas.' AS description, 15 AS default_annual_allowance_days, FALSE AS requires_attachment, TRUE AS is_paid, 'success' AS color_token, TRUE AS active UNION ALL
  SELECT 'personal', 'Permiso personal', 'Permiso administrativo o personal.', 5, FALSE, TRUE, 'primary', TRUE UNION ALL
  SELECT 'personal_unpaid', 'Permiso personal no remunerado', 'Permiso por gestión personal sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', TRUE UNION ALL
  SELECT 'medical', 'Licencia medica', 'Ausencia por licencia o reposo medico.', 0, TRUE, TRUE, 'warning', TRUE UNION ALL
  SELECT 'unpaid', 'Permiso sin goce', 'Ausencia sin goce de sueldo.', 0, FALSE, FALSE, 'secondary', TRUE
) AS source
ON target.leave_type_code = source.leave_type_code
WHEN MATCHED THEN
  UPDATE SET
    leave_type_name = source.leave_type_name,
    description = source.description,
    default_annual_allowance_days = source.default_annual_allowance_days,
    requires_attachment = source.requires_attachment,
    is_paid = source.is_paid,
    color_token = source.color_token,
    active = source.active,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN
  INSERT (
    leave_type_code,
    leave_type_name,
    description,
    default_annual_allowance_days,
    requires_attachment,
    is_paid,
    color_token,
    active,
    created_at,
    updated_at
  )
  VALUES (
    source.leave_type_code,
    source.leave_type_name,
    source.description,
    source.default_annual_allowance_days,
    source.requires_attachment,
    source.is_paid,
    source.color_token,
    source.active,
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP()
  );
