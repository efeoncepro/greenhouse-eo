<!-- Deltas precede the canonical h1 below; they accumulate top-down. -->

## Delta 2026-04-27 — Smart Home v2 role-aware composer cubre el patrón canónico (TASK-696 Wave 6)

El Home v2 implementa el patrón completo de role-differentiation server-side:

- `HOME_BLOCK_REGISTRY` declara `audiences[]` + `requires: { capability, action, scope }` por bloque.
- El composer (`src/lib/home/compose-home-snapshot.ts`) pasa por **dos gates** antes de invocar el loader: (1) audience filter, (2) `can(entitlements, capability, action, scope)`. Bloque hidden si falla cualquiera — payload nunca cruza el wire.
- Wave 6 agregó 7 nuevas capabilities (`home.runway`, `home.briefing.daily`, `home.atrisk.spaces|invoices|members|projects`) bound en `getTenantEntitlements()` por role. CEO ve todo; finance/hr/delivery ven el subset role-scoped.
- Patrón aplicable a notifications: cuando esta task se reactive, replicar el shape — capability per notification kind + composer gate + role-aware payload. Reusar `can()` de `@/lib/entitlements/runtime`, no inventar nuevo binding.

El blocker original ya está resuelto. Esta task ahora debería re-enfocarse a notifications (no a la home), aplicando el mismo pattern.

## Delta 2026-04-16

- TASK-285 completada — roles diferenciados via `role_view_assignments`. Blocker resuelto.

## Delta 2026-04-26 — converge con Notification Hub (TASK-690 / TASK-693)

**No deprecada — ahora se materializa via las preferences del Hub.** El concepto "executive recibe KPI threshold alerts, manager recibe stuck/deadline, specialist recibe review request" es exactamente lo que el `notification_preferences` table del Hub permite expresar (`member_id × event_kind × channel → enabled + min_severity`).

**Scope ajustado:**

- La diferenciación per-rol se implementa como **defaults en el seed** de `notification_preferences` cuando un user con role `client_executive` se onboarda. Plantillas de defaults por rol viven en `src/lib/notifications/hub/role-defaults.ts` (NUEVO, parte de esta task).
- Los `event_kind` glob para los 3 roles:
  - `client_executive` → `kpi.threshold.*` enabled all channels; `task.stuck.*` disabled.
  - `client_manager` → `task.stuck.*`, `deadline.approaching.*` enabled; `kpi.threshold.*` disabled.
  - `client_specialist` → `review.requested.*`, `feedback.received.*` enabled.
- El user puede override esos defaults desde la UI `/settings/notifications` (TASK-693).
- **Bloqueada por TASK-692** (cutover del Hub donde `notification_preferences` empieza a impactar el routing).

## Orden de implementación recomendado

1. **TASK-690** Notification Hub Architecture Contract — establece `notification_preferences` table.
2. **TASK-691** Shadow + **TASK-692** Cutover — projection canónica activa, preferences empiezan a impactar el routing.
3. **TASK-693** Notification Hub Bidireccional + UI + Mentions — UI `/settings/notifications` permite override individual.
4. **ESTA task (TASK-303)** — entrega `role-defaults.ts` con los defaults per-rol que se aplican al onboarding de un user, y el seed que pobla `notification_preferences` cuando un user nuevo se asigna un role específico.

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
