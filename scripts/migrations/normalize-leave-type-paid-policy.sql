UPDATE greenhouse_hr.leave_types
SET
  leave_type_name = 'Permiso personal',
  description = 'Permiso por gestión personal sin goce de sueldo.',
  default_annual_allowance_days = 0,
  requires_attachment = FALSE,
  is_paid = FALSE,
  color_token = 'secondary',
  active = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE leave_type_code = 'personal';

UPDATE greenhouse_hr.leave_types
SET
  leave_type_name = 'Permiso personal no remunerado',
  description = 'Alias legacy para permiso personal sin goce de sueldo.',
  default_annual_allowance_days = 0,
  requires_attachment = FALSE,
  is_paid = FALSE,
  color_token = 'secondary',
  active = FALSE,
  updated_at = CURRENT_TIMESTAMP
WHERE leave_type_code = 'personal_unpaid';

UPDATE greenhouse_hr.leave_types
SET
  leave_type_name = 'Permiso médico / cita médica',
  description = 'Permiso breve remunerado por atención o control médico justificado.',
  default_annual_allowance_days = 0,
  requires_attachment = TRUE,
  is_paid = TRUE,
  color_token = 'warning',
  active = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE leave_type_code = 'medical';
