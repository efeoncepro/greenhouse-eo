-- Up Migration

-- TASK-873 Slice 4 — Seed canonical del viewCode `administracion.workforce_activation`
-- en `greenhouse_core.view_registry` + grants en `role_view_assignments` para
-- los 3 roles canónicos: efeonce_admin, finance_admin, hr_payroll.
--
-- **Naming canonical decidido por mockup aprobado por user 2026-05-14**:
-- el workspace se llama "Workforce Activation" (espejo del mockup
-- `src/views/greenhouse/admin/workforce-activation/mockup/`) — TASK-873
-- entrega V1 esqueleto (table + filters + drawer) y TASK-874 enriquece
-- in-place agregando readiness lanes + summary cards + right rail sin
-- renombrar la ruta ni el viewCode. La spec original de TASK-873 sugería
-- `admin.workforce.intake_queue` pero el mockup canonizado define el surface
-- como "activation" (broader scope que el solo intake transition).
--
-- **Por qué esta migration existe** (CLAUDE.md "View Registry Governance
-- Pattern" TASK-827): agregar viewCode al TS registry sin migration
-- acompañante dispara `role_view_fallback_used` Sentry warnings — bug
-- class JAVASCRIPT-NEXTJS-5A activo. Este seed cierra el loop para el
-- viewCode nuevo.
--
-- **Pattern canónico**: TASK-827 (commit `5a691485`) — INSERT view_registry
-- + INSERT role_view_assignments + DO block anti pre-up-marker check + Down
-- migration con SOFT-DELETE (UPDATE granted=FALSE) preservando audit trail.
--
-- **Decisión Q1 TASK-873** (documentada en Handoff.md 2026-05-14):
-- capability `workforce.member.complete_intake` extendida a hr_payroll role
-- además de EFEONCE_ADMIN + FINANCE_ADMIN canonical. HR es el operador
-- natural del workflow workforce activation.
--
-- Idempotency: `INSERT ... ON CONFLICT DO UPDATE` (re-runs preservan
-- admin-edited rows; updated_at + updated_by reflejan último write).

-- ─────────────────────────────────────────────────────────────
-- 1. Register el viewCode nuevo en view_registry
-- ─────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.view_registry
  (view_code, section, label, description, route_group, route_path, icon, display_order, active, updated_by)
VALUES
  ('administracion.workforce_activation',
   'administracion',
   'Workforce Activation',
   'Habilitación laboral de colaboradores: relación, cargo, compensación, pago y onboarding antes de cerrar intake.',
   'admin',
   '/admin/workforce/activation',
   'tabler-clipboard-check',
   60,
   TRUE,
   'migration:TASK-873')
ON CONFLICT (view_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  active = TRUE,
  updated_at = NOW(),
  updated_by = 'migration:TASK-873';

-- ─────────────────────────────────────────────────────────────
-- 2. Seed grants — 3 roles × 1 viewCode = 3 filas
-- ─────────────────────────────────────────────────────────────

INSERT INTO greenhouse_core.role_view_assignments
  (role_code, view_code, granted, granted_by, granted_at, updated_at, updated_by)
VALUES
  ('efeonce_admin', 'administracion.workforce_activation', true, 'migration:TASK-873', NOW(), NOW(), 'migration:TASK-873'),
  ('finance_admin', 'administracion.workforce_activation', true, 'migration:TASK-873', NOW(), NOW(), 'migration:TASK-873'),
  ('hr_payroll',    'administracion.workforce_activation', true, 'migration:TASK-873', NOW(), NOW(), 'migration:TASK-873')
ON CONFLICT (role_code, view_code) DO UPDATE SET
  granted = EXCLUDED.granted,
  updated_at = NOW(),
  updated_by = 'migration:TASK-873';

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
  WHERE view_code = 'administracion.workforce_activation' AND active = TRUE;

  IF registered_count < 1 THEN
    RAISE EXCEPTION 'TASK-873 anti pre-up-marker check: expected 1 view_registry row, got %', registered_count;
  END IF;

  SELECT COUNT(*) INTO granted_count
  FROM greenhouse_core.role_view_assignments
  WHERE view_code = 'administracion.workforce_activation'
    AND updated_by = 'migration:TASK-873'
    AND granted = TRUE;

  IF granted_count < 3 THEN
    RAISE EXCEPTION 'TASK-873 anti pre-up-marker check: expected 3 role_view_assignments rows (efeonce_admin + finance_admin + hr_payroll), got %', granted_count;
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
    updated_by = 'migration:TASK-873:revert'
WHERE updated_by = 'migration:TASK-873'
  AND view_code = 'administracion.workforce_activation';
