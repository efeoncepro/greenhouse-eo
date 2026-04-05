# TASK-247 — Identity & Platform Block Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity / platform / admin`
- Blocked by: `none`
- Branch: `task/TASK-247-identity-platform-hardening`
- Legacy ID: —
- GitHub Issue: —

## Summary

Cerrar 12 gaps de robustez identificados en la auditoria post-implementacion del bloque TASK-225 a TASK-229. Incluye 2 race conditions criticas (superadmin count y primary demotion), 3 gaps altos (viewCode faltante, validacion de fechas, clasificacion de errores HTTP) y 7 medianos (paginacion, error handling UI, eventos reactivos, typing, validacion de input).

## Why This Task Exists

El bloque de identidad/plataforma (TASK-225, 227, 195, 226, 228, 229) se implemento end-to-end en una sola sesion. Una auditoria de robustez posterior identifico gaps que no son bugs funcionales hoy, pero representan riesgos reales en produccion:

- Dos race conditions pueden causar lockout del sistema o violacion de invariantes de dominio
- Un viewCode faltante deja el menu "Cuentas" invisible para usuarios autorizados
- Errores de negocio devueltos como HTTP 500 impiden al frontend dar feedback util
- Falta de paginacion puede causar OOM bajo carga historica
- Eventos publicados pero no consumidos dejan stale cache sin invalidar

Ninguno de estos gaps bloquea funcionalidad hoy, pero todos deben cerrarse antes de que el bloque entre en uso operativo real.

## Goal

- Eliminar las 2 race conditions criticas con locking transaccional
- Registrar el viewCode `administracion.cuentas` para que el menu admin sea visible
- Agregar validacion de rango de fechas en responsabilidades operativas
- Clasificar errores de negocio como 400 (no 500) en la API de roles
- Agregar paginacion a listResponsibilities
- Mejorar error handling en la UI de cuentas admin
- Registrar eventos nuevos en REACTIVE_EVENT_TYPES
- Cerrar gaps menores de validacion, typing y build-time checks

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Las transacciones que tocan `efeonce_admin` deben ser atomicas — el count de superadmins debe ocurrir dentro del `withTransaction` con `SELECT ... FOR UPDATE`
- El unique index `idx_opresp_unique_primary` ya protege a nivel DB; el locking en app-layer es defensa en profundidad
- Los eventos audit (`role.assigned`, `role.revoked`, `responsibility.assigned`, etc.) deben mantenerse como audit-only hasta que un consumer con contrato real los reclame en REACTIVE_EVENT_TYPES

## Normative Docs

- `docs/tasks/complete/TASK-225-internal-roles-hierarchies-approval-ownership-model.md`
- `docs/tasks/complete/TASK-226-superadministrador-bootstrap-assignment-policy.md`
- `docs/tasks/complete/TASK-227-operational-responsibility-registry.md`
- `docs/tasks/complete/TASK-195-space-identity-consolidation-organization-first-admin.md`

## Dependencies & Impact

### Depends on

- TASK-225 (complete) — spec de roles y jerarquias
- TASK-226 (complete) — policy de superadmin
- TASK-227 (complete) — operational responsibility registry
- TASK-195 (complete) — admin org-first surface

### Blocks / Impacts

- Ninguna task bloqueada, pero la estabilidad de produccion depende de cerrar los gaps criticos
- El menu `/admin/accounts` no es visible hasta que gap 3 se cierre

### Files owned

- `src/lib/admin/role-management.ts`
- `src/lib/operational-responsibility/store.ts`
- `src/lib/operational-responsibility/readers.ts`
- `src/app/api/admin/responsibilities/route.ts`
- `src/app/api/admin/users/[id]/roles/route.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/views/greenhouse/admin/accounts/AdminAccountsView.tsx`
- `src/lib/sync/event-catalog.ts`

## Current Repo State

### Already exists

- `role-management.ts` con guardrails de superadmin (TASK-226) — pero count fuera de tx
- `operational-responsibility/store.ts` con CRUD + outbox (TASK-227) — pero sin date validation
- `view-access-catalog.ts` con validacion de unicidad build-time (TASK-229) — pero falta entry para `/admin/accounts`
- `AdminAccountsView.tsx` con lista de organizaciones (TASK-195) — pero errores silenciados
- `event-catalog.ts` con responsibility.* y role.* (TASK-226/227) — pero no en REACTIVE_EVENT_TYPES
- Unique index `idx_opresp_unique_primary` protege a nivel DB contra doble primary

### Gap

- `countActiveSuperadmins()` se ejecuta fuera de la transaccion en `updateUserRoles()`
- Primary demotion en `createResponsibility()` no usa locking pesimista
- No existe `administracion.cuentas` en VIEW_REGISTRY
- No hay validacion `effectiveFrom < effectiveTo`
- Errores de negocio de guardrails devueltos como HTTP 500
- `listResponsibilities` sin LIMIT ni paginacion
- `AdminAccountsView` swallows API errors silently
- Eventos nuevos no en REACTIVE_EVENT_TYPES
- `assigned_by_user_id` no verificado como user ID
- Build-time validation depende de import
- POST responsibilities sin input size validation
- Event payloads sin typing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Race conditions criticas (gaps 1, 2)

- Mover `countActiveSuperadmins()` dentro de `withGreenhousePostgresTransaction` en `updateUserRoles()` usando `SELECT COUNT(...) ... FOR UPDATE` para serializar el check
- En `createResponsibility()` y `updateResponsibility()`, agregar `SELECT ... FOR UPDATE` en el UPDATE de demotion para serializar acceso concurrente al primary del mismo scope+type
- Verificar que el unique index `idx_opresp_unique_primary` sigue activo como defensa DB-level

### Slice 2 — Gaps altos (gaps 3, 4, 5)

- Agregar `{ viewCode: 'administracion.cuentas', section: 'administracion', label: 'Cuentas', description: 'Organizaciones, spaces y gobierno de identidad.', routePath: '/admin/accounts', routeGroup: 'admin' }` a VIEW_REGISTRY
- Actualizar filtro en `VerticalMenu.tsx` para usar `administracion.cuentas` en vez de `administracion.spaces` para `/admin/accounts`
- En `store.ts`, validar `effectiveFrom < effectiveTo` cuando ambos esten presentes; throw `ResponsibilityValidationError`
- En `src/app/api/admin/users/[id]/roles/route.ts`, clasificar errores que contengan "Superadministrador" como HTTP 400 en vez de 500

### Slice 3 — Paginacion y error handling (gaps 6, 7)

- Agregar parametros `page` y `pageSize` a `listResponsibilities()` con LIMIT/OFFSET
- Actualizar `GET /api/admin/responsibilities` para aceptar `page` y `pageSize` query params y retornar `{ items, total, page, pageSize }`
- En `AdminAccountsView.tsx`, agregar error state visible cuando `res.ok` es false (Alert + "Reintentar")

### Slice 4 — Eventos reactivos y typing (gaps 8, 12)

- Agregar `responsibility.assigned`, `responsibility.revoked`, `responsibility.updated`, `role.assigned`, `role.revoked` a `REACTIVE_EVENT_TYPES` en `event-catalog.ts`
- Definir interfaces TypeScript para payloads de cada evento nuevo en `event-catalog.ts`

### Slice 5 — Gaps menores (gaps 9, 10, 11)

- En `updateUserRoles()`, agregar assertion que `assignedByUserId` es un user_id valido (no vacio, no un org/space ID)
- Mover la validacion build-time de VIEW_REGISTRY a un test unitario con Vitest para garantizar ejecucion en CI
- En `POST /api/admin/responsibilities`, validar que `body.memberId`, `body.scopeId`, `body.scopeType`, `body.responsibilityType` son strings no vacios antes de pasar al store

## Out of Scope

- Redisenar el flujo de asignacion de roles
- Crear UI nueva para responsabilidades o cuentas
- Modificar el schema de la base de datos (migraciones)
- Agregar rate limiting a nivel de API (es infra, no app)
- Implementar auto-revocacion temporal (cuando effectiveTo pasa) — eso es otra task
- Cambiar la semantica de los role codes o route groups

## Detailed Spec

### Gap 1: Race condition superadmin count

**Antes:**
```typescript
// FUERA de la transaccion
const adminCount = await countActiveSuperadmins()
if (adminCount <= 1) throw ...

return withGreenhousePostgresTransaction(async client => { ... })
```

**Despues:**
```typescript
return withGreenhousePostgresTransaction(async client => {
  // DENTRO de la transaccion, con lock
  const { rows } = await client.query(
    `SELECT COUNT(DISTINCT user_id)::int AS cnt
     FROM greenhouse_core.user_role_assignments
     WHERE role_code = $1 AND active = TRUE
     FOR UPDATE`,
    [ROLE_CODES.EFEONCE_ADMIN]
  )
  if (rows[0].cnt <= 1) throw ...
  // ... resto de la logica
})
```

### Gap 2: Race condition primary demotion

Agregar `FOR UPDATE` al SELECT implícito en el UPDATE de demotion. El unique index `idx_opresp_unique_primary` ya protege a nivel DB; este fix agrega defensa app-level.

### Gap 3: viewCode para /admin/accounts

Agregar entry en VIEW_REGISTRY y actualizar VerticalMenu filter.

### Gap 4: Date range validation

```typescript
if (effectiveTo && new Date(effectiveFrom) >= new Date(effectiveTo)) {
  throw new ResponsibilityValidationError('effectiveFrom debe ser anterior a effectiveTo.')
}
```

### Gap 5: Error classification

```typescript
} catch (error) {
  if (error instanceof Error && error.message.includes('Superadministrador')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  // ... fallthrough to 500
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `countActiveSuperadmins()` se ejecuta DENTRO de la transaccion con `FOR UPDATE`
- [ ] Primary demotion en `createResponsibility` usa locking que serializa acceso concurrente
- [ ] `administracion.cuentas` existe en VIEW_REGISTRY con routePath `/admin/accounts`
- [ ] VerticalMenu filtra `/admin/accounts` con viewCode `administracion.cuentas`
- [ ] `effectiveFrom >= effectiveTo` lanza error 400 en la API de responsabilidades
- [ ] Errores de guardrail de superadmin retornan HTTP 400 (no 500)
- [ ] `listResponsibilities` acepta `page` y `pageSize` y aplica LIMIT/OFFSET
- [ ] `AdminAccountsView` muestra error visible (no silencia) cuando la API falla
- [ ] Eventos `responsibility.*` y `role.*` estan en REACTIVE_EVENT_TYPES
- [ ] Payloads de eventos tienen interfaces TypeScript definidas
- [ ] POST responsibilities valida strings no vacios antes de pasar al store
- [ ] Validacion de unicidad de VIEW_REGISTRY tiene test unitario

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test` (incluye el nuevo test de unicidad de VIEW_REGISTRY)
- Validacion manual: verificar que `/admin/accounts` es visible en el sidebar para efeonce_admin

## Closing Protocol

- [ ] Verificar que el unique index `idx_opresp_unique_primary` sigue activo en staging
- [ ] Documentar el delta en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- [ ] Documentar el delta en `GREENHOUSE_IDENTITY_ACCESS_V2.md`

## Follow-ups

- Implementar auto-revocacion temporal de role assignments cuando `effective_to` pasa (cron job)
- Considerar test de integracion con requests concurrentes para validar locking
- Evaluar si `responsibility.*` y `role.*` eventos necesitan consumers reactivos reales (projections)

## Open Questions

- Para gap 8: los eventos `responsibility.*` y `role.*` deben agregarse a REACTIVE_EVENT_TYPES para que el consumer los procese, pero hoy no tienen projections definidas. Agregar a REACTIVE_EVENT_TYPES sin projection es seguro? El consumer ignora eventos sin handler registrado, asi que si — pero confirmar con el playbook de projecciones.
