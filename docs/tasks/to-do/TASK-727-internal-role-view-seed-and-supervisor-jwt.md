# TASK-727 — Internal Role × View Matrix Seed + Supervisor Scope en JWT

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-727-internal-role-view-seed-and-supervisor-jwt`

## Summary

Cierra dos fugas de autorización detectadas en la sesión de Daniela Ferreira (Creative Lead):
(1) ve la vista "Economía de la agencia" global aunque su rol no debería abrir P&L institucional, y
(2) NO ve el surface "Aprobar permisos del equipo" aunque es supervisora con 3 reports directos.
El fix consolida la matriz canónica `role × view` extendiendo el patrón de TASK-285 a los 12 roles
internos hoy vacíos en `role_view_assignments`, y eleva `supervisorAccess` derivado de
`reporting_lines` al JWT/session para que el menú deje de inferirlo desde `default_portal_home_path`.

## Why This Task Exists

El sistema tiene 4 puntos de decisión sobre "puede X ver la vista Y":

1. `greenhouse_core.role_view_assignments` (canónico, persistido, auditado)
2. `roleCanAccessViewFallback` (heurística de código que rellena cuando #1 está vacío)
3. `fallback: tenant.routeGroups.includes('internal') || …` ad-hoc en cada page gate
4. `canSeeView(code, fallbackBoolean)` ad-hoc en cada item del menú

TASK-285 solo seedó los 3 roles cliente. Los 12 roles internos siguen cayendo a #2, donde la regla
`role.routeGroups.includes(view.routeGroup)` concede a `efeonce_operations` (route_groups=['internal'])
**todas** las vistas `gestion.*` (incluida `gestion.economia`, que es financiera).

Adicionalmente, el menú decide "¿muestro `/hr/approvals`?" mirando si `default_portal_home_path` ∈
`['/hr','/hr/team','/hr/approvals']` ([VerticalMenu.tsx:77-80](src/components/layout/vertical/VerticalMenu.tsx#L77-L80)).
Daniela tiene `default_portal_home_path = NULL` → cae a `/home` → menú la oculta. Pero el page guard
([hr/approvals/page.tsx:14-19](src/app/(dashboard)/hr/approvals/page.tsx#L14-L19)) sí la dejaría
entrar porque `getSupervisorScopeForTenant` detecta sus reports. Es decir: la página la deja entrar,
el menú la oculta. Necesitamos que ambos consulten la misma fuente.

## Goal

- Eliminar `gestion.economia` (y otras vistas financieras `gestion.*`) del set efectivo de
  `efeonce_operations`, `efeonce_account`, `collaborator`, `employee`, `hr_*`, `people_viewer`,
  `ai_tooling_admin` mediante seed explícito en DB (reusando el patrón TASK-285 con
  `granted = false` cuando aplica).
- Que cualquier supervisor (≥1 direct report en `reporting_lines` o `approval_delegate` activo)
  vea `/hr/approvals` y `/hr/team` en el menú independiente de su `default_portal_home_path`.
- Convertir `roleCanAccessViewFallback` en safety net con telemetría: steady state = 0 invocaciones
  para los 15 roles existentes.
- Que toda decisión "puede ver vista X" sea respondible mirando un solo lugar (DB) — sin booleans
  inline en page gates ni menú.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — modelo de identidad y resolución de sesión
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — modelo canónico
  routeGroups + authorizedViews + entitlements
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — supervisorías y reporting_lines
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — flujo de aprobación de permisos

Reglas obligatorias:

- Las assignments seedadas deben pasar por `INSERT … ON CONFLICT (role_code, view_code) DO UPDATE`
  con `updated_by = 'migration:TASK-727'` — idempotente, re-aplicable sin perder ediciones admin.
- Toda fila escrita debe disparar la entrada paralela en `view_access_log` (mismo patrón que
  [TASK-285](migrations/20260416095444700_seed-client-role-view-assignments.sql)).
- `efeonce_admin` mantiene acceso a TODO (sin denials).
- `supervisorAccess` en JWT no debe persistir `visibleMemberIds` (lista variable de tamaño) — solo
  flags + counts. `visibleMemberIds` se resuelve on-demand en API routes con cache.
- No tocar el modelo `entitlements` capability-based hasta que la migration `task-404-entitlements-governance`
  esté efectivamente aplicada en dev (hoy no lo está). Esta task vive en el plano `views`.

## Normative Docs

- [migrations/20260416095444700_seed-client-role-view-assignments.sql](migrations/20260416095444700_seed-client-role-view-assignments.sql)
  — patrón exacto a replicar.
- [src/lib/admin/view-access-catalog.ts](src/lib/admin/view-access-catalog.ts) — `VIEW_REGISTRY`
  declarativo con las 69 vistas y sus `routeGroup`.

## Dependencies & Impact

### Depends on

- `greenhouse_core.role_view_assignments` (existe, poblada para 3 roles cliente)
- `greenhouse_core.view_access_log` (existe)
- `greenhouse_core.user_view_overrides` (existe — overrides personales no se tocan)
- `greenhouse_core.reporting_lines` (existe, poblada para Daniela y el resto del equipo)
- `getSupervisorScopeForTenant` en [src/lib/reporting-hierarchy/access.ts](src/lib/reporting-hierarchy/access.ts)
  (existe, retorna `canAccessSupervisorLeave/People`)

### Blocks / Impacts

- TASK-672 (Platform Health Contract): el `safeMode.agentAutomationSafe` puede leer del mismo
  `supervisorAccess` para decidir aprobaciones automáticas → no es bloqueante.
- Cualquier futuro surface "para supervisores" (workload del equipo, vacaciones del equipo,
  evaluaciones cross) → consume el mismo flag, cero lógica nueva.
- Vistas de `gestion.staff_augmentation` → revisar si `efeonce_operations` debería verla
  (decisión de producto). Por defecto en este seed se deja `granted = false` para evitar fugas
  económicas; se puede habilitar después con un PATCH desde Admin UI sin migración.

### Files owned

- `migrations/<timestamp>_task-727-seed-internal-role-view-assignments.sql` (nueva)
- `src/lib/auth.ts` (extender JWT/session callbacks)
- `next-auth.d.ts` (tipo `supervisorAccess`)
- `src/lib/tenant/get-tenant-context.ts` (exponer `supervisorAccess`)
- `src/lib/tenant/authorization.ts` (simplificar `hasAuthorizedViewCode`)
- `src/components/layout/vertical/VerticalMenu.tsx` (limpiar `hasSupervisorWorkspaceLanding` y
  fallback booleans)
- `src/app/(dashboard)/agency/economics/page.tsx` (quitar fallback `internal||admin`)
- `src/app/(dashboard)/agency/spaces/page.tsx` y otros pages `gestion.*` con fallback similar
  (auditar)
- `src/lib/admin/view-access-store.ts` (`roleCanAccessViewFallback` con telemetría)
- `src/lib/admin/view-access-catalog.test.ts` (extender)
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` (actualizar matriz canónica)

## Current Repo State

### Already exists

- `VIEW_REGISTRY` con 69 vistas declarativas: [src/lib/admin/view-access-catalog.ts](src/lib/admin/view-access-catalog.ts)
- Tabla `view_registry` sincronizada con código (verificado en DB)
- Tabla `role_view_assignments` con audit log y patrón ON CONFLICT auditable
- Admin UI funcional `/admin/views` y `/admin/roles` con APIs CRUD
  ([src/app/api/admin/views/assignments/route.ts](src/app/api/admin/views/assignments/route.ts),
  `/api/admin/views/overrides`, `/api/admin/views/sets`)
- `getSupervisorScopeForTenant` operativa contra `reporting_lines` y `operational_responsibilities`
  con cascade de delegaciones
- Helper `hasBroadHrLeaveAccess` + `resolveHrLeaveAccessContext` ya consultan supervisor scope
  en server-side; el page guard de `/hr/approvals` ya funciona correctamente
- TASK-285 seedó 3 roles cliente con `granted = false` explícito para `client_specialist` —
  patrón directo a replicar
- 15 roles definidos en `greenhouse_core.roles` con `route_group_scope` declarativo

### Gap

- `role_view_assignments` está **vacía para los 12 roles internos** → todos caen a fallback
  heurístico de código → fugas como `efeonce_operations` viendo `gestion.economia`.
- `supervisorAccess` se calcula en cada request server-side desde `reporting_lines`, pero
  **no se propaga al JWT/session** → cliente no puede consumirlo → menú decide visibilidad de
  `/hr/approvals` por proxy frágil (`default_portal_home_path` whitelist).
- `hasAuthorizedViewCode` recibe parámetro `fallback: boolean` que page gates llenan ad-hoc
  con expresiones tipo `tenant.routeGroups.includes('internal')` → comportamiento depende de
  cuán bien escrito esté cada page gate; sin convención uniforme.
- Sin telemetría en `roleCanAccessViewFallback` → no podemos detectar regresiones (nuevos roles
  o vistas sin seed).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Seed canónico de internal roles × views

- Migration `task-727-seed-internal-role-view-assignments.sql` con `INSERT … ON CONFLICT DO UPDATE`
  + audit log replicando exactamente el patrón de TASK-285.
- Cobertura: 12 roles internos × N vistas relevantes — ver tabla en Detailed Spec.
- Down migration: `DELETE WHERE updated_by = 'migration:TASK-727'`.
- Verificar con query: `SELECT role_code, COUNT(*) FROM role_view_assignments WHERE granted = true
  GROUP BY role_code` debe dar 15 roles cubiertos (3 cliente + 12 internos).

### Slice 2 — Supervisor scope al JWT/session

- Extender `auth.ts` JWT callback para inyectar `token.supervisorAccess` desde
  `getSupervisorScopeForTenant` cuando el token se materializa por primera vez para un usuario
  internal con `member_id`.
- Mismo patrón en session callback → `session.user.supervisorAccess`.
- Tipo `SupervisorAccessSummary = { hasDirectReports, hasDelegatedAuthority, canAccessSupervisorLeave,
  canAccessSupervisorPeople, directReportCount, delegatedSupervisorCount }` — sin `visibleMemberIds`.
- TTL implícito: el JWT se refresca al login y al rotar; agregar refresh forzado si
  `reporting_lines` cambia es follow-up (outbox event ya existe).

### Slice 3 — Limpieza de fallback booleans

- `hasAuthorizedViewCode({ tenant, viewCode })` sin parámetro `fallback`. Si `authorizedViews` está
  vacío → retorna `false`. Cualquier `tenant` correctamente resuelto post-seed tendrá lista
  poblada.
- Refactor de page gates `/agency/economics`, `/agency/spaces`, `/agency/staff-augmentation`,
  `/agency/services`, `/agency/operations`, `/agency/delivery`, `/agency/campaigns`,
  `/agency/organizations`, `/agency/team`, `/agency/capacity` — auditar cada uno y quitar el
  fallback inline.
- Refactor de `VerticalMenu.tsx`:
  - Eliminar `hasSupervisorWorkspaceLanding` (definición + uso)
  - `canSeeHrTeamWorkspace = Boolean(memberId) && (hasHrAccess || supervisorAccess?.canAccessSupervisorLeave)`
  - `canSeeView(viewCode)` sin parámetro `fallback` (consume `authorizedViews` directo)
  - Filtros de items idem (sin `, true` en cada llamada)

### Slice 4 — Fallback telemetry como safety net

- `roleCanAccessViewFallback` envuelto con `captureWithDomain(new Error('role_view_fallback_used'),
  'identity', { tags: { roleCode, viewCode }, level: 'warning' })` cuando se invoca con grant=true.
- No bloquea el grant — solo emite señal. Steady-state = 0 invocaciones.
- Detector en `getReliabilityOverview` (registry `identity` o nuevo subsystem `identity_governance`):
  signal `role_view_fallback_invocations` con threshold = 0 → warning.

### Slice 5 — Tests + documentación

- Tests vitest en [view-access-resolution.test.ts](src/lib/admin/view-access-resolution.test.ts):
  - `efeonce_operations` NO ve `gestion.economia` ni `gestion.staff_augmentation`
  - `efeonce_operations` SÍ ve `gestion.delivery`, `gestion.operaciones`, `gestion.capacidad`
  - `finance_admin` y `finance_analyst` SÍ ven `gestion.economia` y `finanzas.*`
  - `collaborator` SOLO ve `mi_ficha.*` (10 vistas)
  - `efeonce_admin` ve TODAS las 69 vistas
- Test de paridad seed↔DB: parsea la migration o snapshot esperado y compara con
  `SELECT * FROM role_view_assignments` — falla en CI si divergen.
- Test JWT: stub `getSupervisorScopeForTenant`, verificar que `session.user.supervisorAccess` se
  propaga.
- Test menú: render `VerticalMenu` con `supervisorAccess.canAccessSupervisorLeave = true` y
  `dashboardHref = '/home'` → debe mostrar `/hr/approvals` y `/hr/team`.
- Actualizar [docs/documentation/identity/sistema-identidad-roles-acceso.md](docs/documentation/identity/sistema-identidad-roles-acceso.md)
  con la matriz post-seed.
- Verificación staging: agent session como Daniela → `/hr/approvals` visible; `/agency/economics`
  redirect a `portalHomePath`.

## Out of Scope

- Migración a entitlements capability-based (`role_entitlement_defaults`) — vive en
  `task-404-entitlements-governance`, no aplicada en dev. Cuando esté aplicada, una task
  posterior deprecará `authorizedViews` como gate y migrará a `can('module.capability.action')`.
- Refresh on-demand del JWT cuando `reporting_lines` cambia — se acepta latencia hasta el
  próximo login. Follow-up con outbox listener si el lag se vuelve problema.
- Rediseñar `default_portal_home_path` por rol — ortogonal. La task elimina la dependencia del
  menú sobre este campo.
- Habilitar `gestion.staff_augmentation` para `efeonce_operations` (decisión de producto: pedir
  a Cesar/Julio antes de incluir).

## Detailed Spec

### Matriz propuesta (Slice 1)

Por simplicidad, se documenta el set granted; la migración escribe TODAS las filas relevantes
(grant=true y grant=false explícito para denials importantes como `efeonce_operations` ×
`gestion.economia`).

| Rol | route_group_scope | Vistas grant=true |
|---|---|---|
| `efeonce_admin` | internal+admin | TODAS las 69 (mantiene poder absoluto) |
| `efeonce_operations` | internal | `gestion.agencia`, `gestion.spaces`, `gestion.equipo`, `gestion.delivery`, `gestion.campanas`, `gestion.operaciones`, `gestion.capacidad`, `gestion.organizaciones`, `gestion.servicios` (9 de 11). **Denials explícitos**: `gestion.economia`, `gestion.staff_augmentation` |
| `efeonce_account` | internal | `gestion.agencia`, `gestion.spaces`, `gestion.equipo`, `gestion.delivery`, `gestion.campanas`, `gestion.organizaciones`, `gestion.servicios` (sin economia, ops, capacidad, staff_aug) |
| `collaborator` | my | TODAS las 10 vistas `mi_ficha.*` |
| `employee` | internal+employee | TODAS las 10 vistas `mi_ficha.*` (revisar con producto si difiere de collaborator — por ahora idéntico) |
| `finance_admin` | finance | TODAS las 14 vistas `finanzas.*` + `gestion.economia` + `administracion.instrumentos_pago` (16 total) |
| `finance_analyst` | finance | TODAS las 14 vistas `finanzas.*` + `gestion.economia` (15 total, write-actions se gatean por capability no por view) |
| `finance_manager` | internal+finance | `finance_analyst` + `gestion.delivery` + `gestion.capacidad` (contexto cross para forecasting) |
| `hr_payroll` | internal+hr | TODAS las `equipo.*` excepto `equipo.evaluaciones` (8 de 9) |
| `hr_manager` | hr | TODAS las `equipo.*` (9 de 9) + `equipo.objetivos` + `equipo.evaluaciones` |
| `people_viewer` | people | `equipo.personas`, `equipo.organigrama` (2) |
| `ai_tooling_admin` | ai_tooling | `ia.herramientas` (1) |
| `client_executive`, `client_manager`, `client_specialist` | client | sin cambios — ya seedados en TASK-285 |

Total filas grant=true post-seed: ~140-160. Filas grant=false explícito: ~5 (denials que importan
para auditoría).

### Tipo `SupervisorAccessSummary` (Slice 2)

```ts
// next-auth.d.ts y src/lib/tenant/get-tenant-context.ts
export type SupervisorAccessSummary = {
  hasDirectReports: boolean
  hasDelegatedAuthority: boolean
  canAccessSupervisorLeave: boolean
  canAccessSupervisorPeople: boolean
  directReportCount: number
  delegatedSupervisorCount: number
}
```

Se inyecta en `session.user.supervisorAccess`. Si el usuario no es internal o no tiene `member_id`,
el flag entero es `null`.

### Page gate post-cleanup (Slice 3)

```ts
// /agency/economics/page.tsx
const tenant = await getTenantContext()
if (!tenant) redirect('/login')

const hasAccess = hasAuthorizedViewCode({ tenant, viewCode: 'gestion.economia' })
if (!hasAccess) redirect(tenant.portalHomePath)
```

Sin `fallback`. Sin `routeGroups.includes('internal')`. La decisión vive 100% en DB.

### Menu cleanup (Slice 3)

```ts
// VerticalMenu.tsx
const supervisorAccess = session?.user?.supervisorAccess
const canSeeHrTeamWorkspace =
  Boolean(session?.user?.memberId) &&
  (hasHrAccess || supervisorAccess?.canAccessSupervisorLeave === true)

// Eliminar:
// const hasSupervisorWorkspaceLanding = isInternalUser && memberId && [...].includes(dashboardHref)

// canSeeView simplificado:
const canSeeView = (viewCode: string) => authorizedViews.includes(viewCode)
```

### Telemetry pattern (Slice 4)

```ts
// view-access-store.ts
import { captureWithDomain } from '@/lib/observability/capture'

const roleCanAccessViewFallback = (role, view) => {
  const granted = computeGranted(role, view)
  if (granted) {
    captureWithDomain(new Error('role_view_fallback_used'), 'identity', {
      level: 'warning',
      tags: { roleCode: role.roleCode, viewCode: view.viewCode, routeGroup: view.routeGroup }
    })
  }
  return granted
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `SELECT COUNT(DISTINCT role_code) FROM greenhouse_core.role_view_assignments WHERE granted = true` ≥ 15.
- [ ] `efeonce_operations` × `gestion.economia` aparece con `granted = false` en DB.
- [ ] Daniela (`user-efeonce-internal-daniela-ferreira`) navegando a `/agency/economics` recibe
      redirect a su `portalHomePath`.
- [ ] Daniela ve `/hr/approvals` y `/hr/team` en el menú lateral.
- [ ] `efeonce_admin` sigue viendo TODO (smoke test con sesión real o agent auth).
- [ ] `finance_admin` sigue viendo `gestion.economia` y todas las `finanzas.*`.
- [ ] `roleCanAccessViewFallback` emite 0 invocaciones en una sesión normal post-deploy
      (verificable via Sentry tag `domain=identity`).
- [ ] `session.user.supervisorAccess` está poblado para Daniela con
      `canAccessSupervisorLeave = true, directReportCount = 3`.
- [ ] Test de paridad seed↔DB pasa en CI.
- [ ] Documentación funcional `docs/documentation/identity/sistema-identidad-roles-acceso.md`
      actualizada con la matriz vigente.
- [ ] No hay parámetro `fallback` en ningún call site de `hasAuthorizedViewCode` ni
      `canSeeView` (audit con grep).

## Verification

- `pnpm migrate:up`
- `pnpm db:generate-types`
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/admin src/lib/auth src/lib/tenant src/components/layout`
- Validación manual en preview con Daniela vía agent auth:
  ```bash
  pnpm staging:request /agency/economics      # → 302 a portal home
  pnpm staging:request /hr/approvals          # → 200, render OK
  ```
- Verificación cross-rol: una sesión `efeonce_admin` y una `finance_admin` mantienen acceso a
  `gestion.economia` y a la matriz completa esperada.

## Closing Protocol

- [ ] `Lifecycle` sincronizado en markdown + carpeta correcta
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` actualizados
- [ ] `Handoff.md` con resumen del cambio y matriz aplicada
- [ ] `changelog.md` actualizado (cambio visible: roles internos ahora con visibilidad fina)
- [ ] Chequeo de impacto cruzado sobre TASK-672 (Platform Health) y futuras supervisor surfaces
- [ ] Actualizar `CLAUDE.md` con la regla "todo gating de view consume `authorizedViews` puro;
      `hasAuthorizedViewCode` no admite `fallback`"

## Follow-ups

- Refresh on-demand de JWT cuando `reporting_lines` cambia (outbox listener) — abrir TASK
  derivada si la latencia hasta próximo login se vuelve problema operativo.
- Migración formal a entitlements capability-based (`role_entitlement_defaults`) cuando
  `task-404-entitlements-governance` esté aplicada en todos los entornos. Esta task deja el
  modelo de views limpio para esa migración.
- Revisar `default_portal_home_path` por rol como producto: definir landing canónico para
  cada rol y poblarlo en una migración separada.
- Decidir con producto si `gestion.staff_augmentation` debe abrirse para `efeonce_operations`
  (hoy denial explícito por seguridad).

## Open Questions

- ¿`employee` debe diferir de `collaborator` en visibilidad? Hoy ambos solo ven `mi_ficha.*`.
  ¿Existe escenario donde `employee` necesite vistas adicionales (ej. `equipo.asistencia` propia)?
- ¿`people_viewer` necesita `equipo.organigrama` o solo `equipo.personas`? Spec actual incluye
  ambas; verificar con HR.
- ¿`finance_manager` debe ver `gestion.economia` además del set finance? Esto sí (es ejecutivo) —
  confirmado en la matriz, pero documentar la decisión.
