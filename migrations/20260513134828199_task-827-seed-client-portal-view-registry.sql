-- Up Migration

-- TASK-827 Slice 0 hardening — Seed canonical de los 11 viewCodes nuevos
-- del Client Portal Composition Layer en `greenhouse_core.view_registry` +
-- grants en `role_view_assignments` para los 3 client roles + efeonce_admin.
--
-- **Por qué esta migration existe**:
--
-- TASK-727 (gobernanza view_access) seeded los 12 internal roles + 3 client
-- roles × las views existentes en VIEW_REGISTRY. Cualquier viewCode NUEVO
-- agregado a `VIEW_REGISTRY` (TS) sin migración acompañante de seed dispara
-- el telemetry warning `role_view_fallback_used` (Sentry domain=identity)
-- cuando el fallback heurístico `roleCanAccessViewFallback` resuelve
-- `granted=true` por route_group match.
--
-- En TASK-827 Slice 0 (commit `5a691485`, 2026-05-13) agregué 11 entries
-- al `VIEW_REGISTRY` TS:
--   1. cliente.home
--   2. cliente.creative_hub
--   3. cliente.reviews
--   4. cliente.roi_reports
--   5. cliente.exports
--   6. cliente.cvr_quarterly
--   7. cliente.staff_aug
--   8. cliente.brand_intelligence
--   9. cliente.csc_pipeline
--   10. cliente.crm_command
--   11. cliente.web_delivery
--
-- Sin seed en `role_view_assignments`, cada vez que un cliente (con role
-- CLIENT_EXECUTIVE/MANAGER/SPECIALIST) accede al portal, el fallback se
-- invoca por cada viewCode nuevo → 11 warnings Sentry por sesión.
--
-- Esta migration es la **solución canónica** (NO parche): seed permanente
-- de las 33 filas (11 viewCodes × 3 client roles) + 11 filas para
-- efeonce_admin (para soporte/visibilidad internal) + register los view_codes
-- en `greenhouse_core.view_registry` (gobernanza persistida).
--
-- **Pattern canónico**: TASK-750 (seed finanzas.ordenes_pago) + TASK-749
-- (seed payment-profiles) — `INSERT ... ON CONFLICT DO UPDATE` para
-- idempotencia (re-run seguro, preserva admin-edited assignments
-- vía `ON CONFLICT DO UPDATE` con `updated_by` audit trail).
--
-- **Defense in depth contra recurrencia**:
--   - CLAUDE.md regla nueva (post TASK-827): "cualquier viewCode agregado a
--     VIEW_REGISTRY TS requiere migration acompañante de seed en
--     role_view_assignments"
--   - Spec V1 TASK-827 documenta el contract
--   - Telemetry warning `role_view_fallback_used` sigue funcionando como
--     signal de gobernanza pendiente cuando emerja drift futuro
--
-- Idempotency: re-runs preservan admin-edited rows; updated_at +
-- updated_by reflejan último write.

-- ─────────────────────────────────────────────────────────────
-- 1. Register los 11 viewCodes nuevos en view_registry
-- ─────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('cliente.home',
   'cliente',
   'Inicio',
   'Home terminator del client tenant — siempre accesible, renderiza 5-state contract (zero/denied/error/normal).',
   'client',
   '/home',
   'tabler-home',
   100,
   TRUE,
   'migration:TASK-827'),
  ('cliente.creative_hub',
   'cliente',
   'Creative Hub',
   'Hub de operación creativa Globe (16 cards canonical V3.0). Bundle creative_hub_globe_v1.',
   'client',
   '/creative-hub',
   'tabler-palette',
   110,
   TRUE,
   'migration:TASK-827'),
  ('cliente.reviews',
   'cliente',
   'Revisiones (canonical)',
   'Queue de revisiones con naming canonical seed TASK-824. Coexiste con cliente.revisiones legacy apuntando a /reviews.',
   'client',
   '/reviews',
   'tabler-git-pull-request',
   120,
   TRUE,
   'migration:TASK-827'),
  ('cliente.roi_reports',
   'cliente',
   'ROI Reports',
   'Reportes de impacto y ROI del servicio (módulo addon Globe Enterprise).',
   'client',
   '/roi-reports',
   'tabler-report-money',
   130,
   TRUE,
   'migration:TASK-827'),
  ('cliente.exports',
   'cliente',
   'Exports',
   'Generación de exports operativos (PDF, Excel, CSV) — incluido en ROI Reports addon.',
   'client',
   '/exports',
   'tabler-file-export',
   140,
   TRUE,
   'migration:TASK-827'),
  ('cliente.cvr_quarterly',
   'cliente',
   'CVR trimestral',
   'Creative Velocity Review trimestral. Addon Globe.',
   'client',
   '/cvr-quarterly',
   'tabler-presentation-analytics',
   150,
   TRUE,
   'migration:TASK-827'),
  ('cliente.staff_aug',
   'cliente',
   'Staff Augmentation',
   'Visibilidad Staff Augmentation — equipo asignado y capacidad.',
   'client',
   '/staff-augmentation',
   'tabler-users-group',
   160,
   TRUE,
   'migration:TASK-827'),
  ('cliente.brand_intelligence',
   'cliente',
   'Brand Intelligence',
   'Brand Intelligence: RpA + First-Time Right. Addon Globe.',
   'client',
   '/brand-intelligence',
   'tabler-bulb',
   170,
   TRUE,
   'migration:TASK-827'),
  ('cliente.csc_pipeline',
   'cliente',
   'CSC Pipeline',
   'Creative Supply Chain Pipeline. Addon Globe.',
   'client',
   '/csc-pipeline',
   'tabler-route',
   180,
   TRUE,
   'migration:TASK-827'),
  ('cliente.crm_command',
   'cliente',
   'CRM Command',
   'CRM Command (legacy, transición a Kortex). Módulo crm_solutions.',
   'client',
   '/crm-command',
   'tabler-address-book',
   190,
   TRUE,
   'migration:TASK-827'),
  ('cliente.web_delivery',
   'cliente',
   'Web Delivery',
   'Web Delivery operativo. Módulo Wave.',
   'client',
   '/web-delivery',
   'tabler-world-www',
   200,
   TRUE,
   'migration:TASK-827')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-827';

-- ─────────────────────────────────────────────────────────────
-- 2. Seed grants para los 3 client roles × 11 viewCodes (33 filas)
--    + efeonce_admin × 11 viewCodes (11 filas) — total 44 filas
-- ─────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  -- efeonce_admin: full access para soporte/visibilidad internal
  ('efeonce_admin', 'cliente.home',                true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.creative_hub',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.reviews',             true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.roi_reports',         true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.exports',             true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.cvr_quarterly',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.staff_aug',           true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.brand_intelligence',  true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.csc_pipeline',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.crm_command',         true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('efeonce_admin', 'cliente.web_delivery',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),

  -- client_executive: full access (3 client roles same baseline grants V1.0;
  -- gating fino real lo hace el module resolver, NO view_access)
  ('client_executive', 'cliente.home',               true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.creative_hub',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.reviews',            true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.roi_reports',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.exports',            true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.cvr_quarterly',      true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.staff_aug',          true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.brand_intelligence', true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.csc_pipeline',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.crm_command',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_executive', 'cliente.web_delivery',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),

  -- client_manager
  ('client_manager', 'cliente.home',               true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.creative_hub',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.reviews',            true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.roi_reports',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.exports',            true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.cvr_quarterly',      true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.staff_aug',          true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.brand_intelligence', true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.csc_pipeline',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.crm_command',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_manager', 'cliente.web_delivery',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),

  -- client_specialist
  ('client_specialist', 'cliente.home',               true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.creative_hub',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.reviews',            true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.roi_reports',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.exports',            true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.cvr_quarterly',      true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.staff_aug',          true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.brand_intelligence', true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.csc_pipeline',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.crm_command',        true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827'),
  ('client_specialist', 'cliente.web_delivery',       true, 'migration:TASK-827', NOW(), NOW(), 'migration:TASK-827')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-827';

-- ─────────────────────────────────────────────────────────────
-- 3. Anti pre-up-marker bug check (CLAUDE.md regla migration markers)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  registered_count INTEGER;
  granted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count
  FROM greenhouse_core.view_registry
  WHERE view_code IN (
    'cliente.home', 'cliente.creative_hub', 'cliente.reviews', 'cliente.roi_reports',
    'cliente.exports', 'cliente.cvr_quarterly', 'cliente.staff_aug', 'cliente.brand_intelligence',
    'cliente.csc_pipeline', 'cliente.crm_command', 'cliente.web_delivery'
  );

  IF registered_count < 11 THEN
    RAISE EXCEPTION 'TASK-827 anti pre-up-marker check: expected 11 view_registry rows, got %', registered_count;
  END IF;

  SELECT COUNT(*) INTO granted_count
  FROM greenhouse_core.role_view_assignments
  WHERE updated_by = 'migration:TASK-827' AND granted = TRUE;

  IF granted_count < 44 THEN
    RAISE EXCEPTION 'TASK-827 anti pre-up-marker check: expected 44 role_view_assignments rows (11 viewCodes × 4 roles), got %', granted_count;
  END IF;
END
$$;

-- Down Migration

-- Idempotent rollback: marca el seed como NOT granted preservando audit trail.
-- NO eliminamos filas (append-only de gobernanza). NO eliminamos del view_registry
-- (otros consumers pueden depender). Para full rollback operacional: ALTER VIEW
-- registry → active=FALSE en migration nueva, no aquí.

UPDATE greenhouse_core.role_view_assignments
SET granted = FALSE,
    updated_at = NOW(),
    updated_by = 'migration:TASK-827:revert'
WHERE updated_by = 'migration:TASK-827';
