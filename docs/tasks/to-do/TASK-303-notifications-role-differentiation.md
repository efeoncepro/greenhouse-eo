## Delta 2026-04-16

- TASK-285 completada — roles diferenciados via `role_view_assignments`. Blocker resuelto.

# TASK-303 — Notifications Role Differentiation

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo-Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `19`
- Domain: `platform`
- Blocked by: `none` (TASK-285 completada 2026-04-16)
- Branch: `task/TASK-303-notifications-role-differentiation`

## Summary

Diferenciar el contenido de notificaciones por rol de cliente: executive recibe KPI threshold alerts, manager recibe stuck/deadline alerts, specialist recibe review request alerts. Hoy todos reciben las mismas notificaciones.

## Why This Task Exists

Un VP Marketing no necesita alertas de "nuevo item para revisar" — eso es para el specialist. Un specialist no necesita alertas de "OTD cayo bajo 90%" — eso es para el executive. Las notificaciones indiferenciadas son ruido que reduce la confianza en el sistema.

## Goal

- Reglas de enrutamiento por rol
- Contenido diferenciado por tipo de alerta

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.2 M9
- `src/config/notification-categories.ts`

## Dependencies & Impact

### Depends on

- TASK-285 (role differentiation) — roles diferenciados
- Notification system funcional

### Files owned

- `src/config/notification-categories.ts` (modificar)
- Notification dispatch logic

## Scope

### Slice 1 — Audience rules por rol

- Extender notification categories con audience rules por rol:
  - `feedback_requested` → `client_specialist` + `client_manager`
  - `delivery_update` → `client_manager`
  - `ico_alert` (si se habilita para clientes) → `client_executive`
  - `sprint_milestone` → `client_manager`
  - `report_ready` → `client_executive` + `client_manager`
- Actualizar dispatch logic para filtrar por rol

## Out of Scope

- Notification preferences per-user
- Push notifications
- Email notifications (ya definidas en channels)

## Acceptance Criteria

- [ ] Executive no recibe alerts de review request
- [ ] Specialist no recibe alerts de KPI threshold
- [ ] Manager recibe stuck/deadline alerts
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
