-- Up Migration

-- TASK-555: Commercial Access Model Foundation.
-- Adds the broad `commercial` route group to existing transitional roles and
-- seeds target commercial view codes while legacy `/finance/...` paths remain.

WITH target_roles(role_code) AS (
  VALUES
    ('efeonce_admin'),
    ('efeonce_account'),
    ('finance_admin'),
    ('finance_analyst'),
    ('finance_manager')
)
UPDATE greenhouse_core.roles AS roles
SET
  route_group_scope = (
    SELECT ARRAY(
      SELECT DISTINCT route_group
      FROM unnest(COALESCE(roles.route_group_scope, ARRAY[]::text[]) || ARRAY['commercial']::text[]) AS route_group
      ORDER BY route_group
    )
  ),
  updated_at = NOW()
FROM target_roles
WHERE roles.role_code = target_roles.role_code
  AND NOT ('commercial' = ANY(COALESCE(roles.route_group_scope, ARRAY[]::text[])));

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('comercial.pipeline',
   'comercial',
   'Pipeline comercial',
   'Forecast, deals y oportunidades comerciales. Mantiene ruta legacy de inteligencia financiera hasta TASK-557.',
   'commercial',
   '/finance/intelligence',
   'tabler-chart-arrows-vertical',
   40,
   TRUE,
   'migration:TASK-555'),
  ('comercial.cotizaciones',
   'comercial',
   'Cotizaciones',
   'Propuestas comerciales, pricing, aprobaciones y seguimiento quote-to-cash.',
   'commercial',
   '/finance/quotes',
   'tabler-file-dollar',
   41,
   TRUE,
   'migration:TASK-555'),
  ('comercial.contratos',
   'comercial',
   'Contratos',
   'Contratos comerciales, SOWs transicionales y renovaciones activas.',
   'commercial',
   '/finance/contracts',
   'tabler-file-description',
   42,
   TRUE,
   'migration:TASK-555'),
  ('comercial.sow',
   'comercial',
   'SOW',
   'Statements of Work agrupados bajo contratos mientras no exista ruta propia.',
   'commercial',
   '/finance/contracts',
   'tabler-file-text',
   43,
   TRUE,
   'migration:TASK-555'),
  ('comercial.acuerdos_marco',
   'comercial',
   'Acuerdos marco',
   'MSAs, cláusulas maestras y contratos vinculados.',
   'commercial',
   '/finance/master-agreements',
   'tabler-file-certificate',
   44,
   TRUE,
   'migration:TASK-555'),
  ('comercial.productos',
   'comercial',
   'Productos',
   'Catálogo vendible sincronizado con HubSpot Products y fuentes comerciales Greenhouse.',
   'commercial',
   '/finance/products',
   'tabler-packages',
   45,
   TRUE,
   'migration:TASK-555')
ON CONFLICT (view_code) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_group = EXCLUDED.route_group,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-555';

WITH target_roles(role_code) AS (
  SELECT role_code
  FROM greenhouse_core.roles
  WHERE role_code IN (
    'efeonce_admin',
    'efeonce_account',
    'finance_admin',
    'finance_analyst',
    'finance_manager'
  )
),
target_views(view_code) AS (
  VALUES
    ('comercial.pipeline'),
    ('comercial.cotizaciones'),
    ('comercial.contratos'),
    ('comercial.sow'),
    ('comercial.acuerdos_marco'),
    ('comercial.productos')
)
INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
SELECT
  target_roles.role_code,
  target_views.view_code,
  TRUE,
  'migration:TASK-555',
  NOW(),
  NOW(),
  'migration:TASK-555'
FROM target_roles
CROSS JOIN target_views
ON CONFLICT (role_code, view_code) DO NOTHING;

-- Down Migration

DELETE FROM greenhouse_core.role_view_assignments
WHERE view_code IN (
    'comercial.pipeline',
    'comercial.cotizaciones',
    'comercial.contratos',
    'comercial.sow',
    'comercial.acuerdos_marco',
    'comercial.productos'
  )
  AND granted_by = 'migration:TASK-555';

DELETE FROM greenhouse_core.view_registry
WHERE view_code IN (
    'comercial.pipeline',
    'comercial.cotizaciones',
    'comercial.contratos',
    'comercial.sow',
    'comercial.acuerdos_marco',
    'comercial.productos'
  )
  AND updated_by = 'migration:TASK-555';

WITH target_roles(role_code) AS (
  VALUES
    ('efeonce_admin'),
    ('efeonce_account'),
    ('finance_admin'),
    ('finance_analyst'),
    ('finance_manager')
)
UPDATE greenhouse_core.roles AS roles
SET
  route_group_scope = array_remove(COALESCE(roles.route_group_scope, ARRAY[]::text[]), 'commercial'),
  updated_at = NOW()
FROM target_roles
WHERE roles.role_code = target_roles.role_code;
