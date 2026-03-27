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
VALUES (
  'personal_unpaid',
  'Permiso personal no remunerado',
  'Permiso por gestión personal sin goce de sueldo.',
  0,
  FALSE,
  FALSE,
  'secondary',
  TRUE
)
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
