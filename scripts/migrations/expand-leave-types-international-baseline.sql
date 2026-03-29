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
  ('floating_holiday', 'Día libre flotante', 'Día libre remunerado otorgado por política interna.', 1, FALSE, TRUE, 'info', TRUE),
  ('bereavement', 'Permiso por duelo', 'Permiso remunerado breve por fallecimiento de familiar.', 3, FALSE, TRUE, 'dark', TRUE),
  ('civic_duty', 'Permiso por deber cívico', 'Permiso remunerado por deberes cívicos o comparecencias obligatorias.', 2, TRUE, TRUE, 'primary', TRUE),
  ('parental', 'Permiso parental', 'Permiso prolongado por maternidad, paternidad o cuidado parental; no remunerado por defecto en la política base.', 0, TRUE, FALSE, 'warning', TRUE),
  ('study', 'Permiso por estudio', 'Permiso por formación, exámenes o actividades académicas; no remunerado por defecto.', 0, FALSE, FALSE, 'info', TRUE)
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
