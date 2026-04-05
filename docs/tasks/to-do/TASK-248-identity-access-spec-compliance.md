# TASK-248 — Identity & Access Spec Compliance

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity / platform / admin`
- Blocked by: `none`
- Branch: `task/TASK-248-identity-access-spec-compliance`
- Legacy ID: —
- GitHub Issue: —

## Summary

Cerrar 4 gaps de compliance identificados al contrastar GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md y GREENHOUSE_IDENTITY_ACCESS_V2.md contra la implementacion actual del sistema de identidad (post TASK-225→229 + TASK-247). Los gaps son: audit de scope assignments, audit de login, formalizacion del drift people/operations, y migracion de legacy role codes en datos.

## Why This Task Exists

La auditoría post-implementación del bloque TASK-225→229 + TASK-247 cerró los 12 gaps de robustez operativa. Sin embargo, al contrastar la spec canónica contra el código implementado quedan 4 gaps de compliance con la arquitectura documentada:

- La spec §Audit Model define `scope_assigned`/`scope_revoked` y `login_success`/`login_failed` como eventos audit requeridos, pero ninguno se emite hoy
- La spec §1.5 documenta un drift reconocido en el fallback de people para `efeonce_operations` y `hr_payroll` que debe formalizarse (decidir: mapping base o override explícito)
- TASK-228 deprecó `employee` y `finance_manager` en TypeScript pero la migración de datos en `user_role_assignments` nunca se ejecutó

Ninguno de estos gaps es funcional — no hay bugs ni feature rota. Son deuda de spec compliance que debe cerrarse para que la arquitectura documentada coincida con la realidad del código.

**Nota:** Dos gaps del análisis original resultaron ya cerrados:
- Gap 1 (approval snapshot): `postgres-leave-store.ts` ya congela `supervisor_member_id` al submit y las aprobaciones usan el valor persistido
- Gap 4 (user_deactivated): `deactivateMember` ya emite `memberDeactivated` y SCIM emite `scim.user.deactivated`

## Goal

- Emitir eventos audit para scope assignments (project, campaign, client)
- Emitir eventos audit para login success/failed desde NextAuth callbacks
- Formalizar el drift de people access para efeonce_operations y hr_payroll
- Migrar datos legacy de `employee`/`finance_manager` en `user_role_assignments` si no hay usuarios activos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — §Audit Model, §Route Group Model
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — §1.5 Drift actual
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Los eventos audit deben ir por outbox (`publishOutboxEvent`) — no insertar directamente en `audit_events`
- Los login events deben emitirse desde NextAuth callbacks sin bloquear el flujo de autenticación (fire-and-forget si es necesario)
- La decisión sobre el drift people/operations debe documentarse como delta en GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md
- La migración de legacy codes debe verificar 0 usuarios activos ANTES de ejecutar, y abortar con warning si hay usuarios activos

## Normative Docs

- `docs/tasks/complete/TASK-228-employee-legacy-role-convergence.md` — contexto de la deprecación de `employee`/`finance_manager`
- `docs/tasks/complete/TASK-247-identity-platform-block-hardening.md` — hardening previo que cerró gaps de robustez

## Dependencies & Impact

### Depends on

- TASK-225 (complete) — spec de roles y jerarquías
- TASK-228 (complete) — deprecación de legacy role codes
- TASK-247 (complete) — hardening post-auditoría

### Blocks / Impacts

- Ninguna task bloqueada
- Cierra deuda de spec compliance documentada en GREENHOUSE_IDENTITY_ACCESS_V2.md §Audit Model
- Cierra drift #1 documentado en GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §1.5

### Files owned

- `src/lib/sync/event-catalog.ts`
- `src/lib/auth.ts`
- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/role-route-mapping.ts`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/identity-store.ts`
- `src/config/role-codes.ts`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

## Current Repo State

### Already exists

- `event-catalog.ts` con aggregate types y event types para scope, member, identity, role — pero no para scope_assigned/scope_revoked ni login events
- `auth.ts` con NextAuth config completa (Microsoft SSO, Google SSO, credentials) — callbacks `signIn` y `jwt` presentes, pero sin outbox emission
- `role-route-mapping.ts` con `ROLE_ROUTE_GROUPS` — `efeonce_operations` y `hr_payroll` no incluyen `people`
- `authorization.ts` con `canAccessPeopleModule` que hardcodea fallback people para `efeonce_operations` y `hr_payroll`
- `identity-store.ts` con operaciones sobre `user_project_scopes`, `user_campaign_scopes`, `user_client_scopes` — pero sin outbox events
- `role-codes.ts` con `employee` y `finance_manager` marcados `@deprecated`
- `deactivateMember` ya emite `memberDeactivated` — gap 4 original ya cerrado
- `postgres-leave-store.ts` ya congela `supervisor_member_id` al submit — gap 1 original ya cerrado

### Gap

- Scope assignments (project, campaign, client) no emiten eventos audit al asignar o revocar
- NextAuth no emite login_success ni login_failed al outbox
- Drift people/operations no está formalizado: ni está en el mapping base ni documentado como override explícito
- `employee`/`finance_manager` pueden tener usuarios activos en `user_role_assignments` sin migrar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit de scope assignments (gap 2)

- Definir event types `scope.assigned` y `scope.revoked` en `event-catalog.ts`
- Definir aggregate type `userScope` en `AGGREGATE_TYPES`
- Definir payload interfaces `ScopeAssignedPayload` y `ScopeRevokedPayload`
- Emitir `scope.assigned` en las funciones de `identity-store.ts` que insertan en `user_project_scopes`, `user_campaign_scopes`, `user_client_scopes`
- Emitir `scope.revoked` en las funciones que eliminan scope assignments
- Agregar event types a `REACTIVE_EVENT_TYPES`

### Slice 2 — Audit de login success/failed (gap 3)

- Definir event types `auth.login.success` y `auth.login.failed` en `event-catalog.ts`
- Definir aggregate type `authSession` en `AGGREGATE_TYPES`
- Definir payload interfaces `LoginSuccessPayload` y `LoginFailedPayload`
- En `auth.ts` callback `signIn`, emitir `auth.login.success` al retornar true (fire-and-forget, no bloquear auth flow)
- En `auth.ts` callback `signIn`, emitir `auth.login.failed` al retornar false o al capturar error de credentials
- Evaluar si NextAuth `events.signIn` es mejor hook que `callbacks.signIn` para esto
- Incluir en payload: `userId` (si disponible), `email`, `provider`, `timestamp`, `ipAddress` (si disponible desde headers)

### Slice 3 — Formalizar drift people/operations (gap 5)

- Decidir: agregar `people` al mapping base de `efeonce_operations` y `hr_payroll` en `ROLE_ROUTE_GROUPS`, o documentar como override explícito en la spec
- Recomendación: agregar `people` al mapping base — el fallback hardcoded en `canAccessPeopleModule` ya confirma la intención
- Si se agrega al mapping base: actualizar `ROLE_ROUTE_GROUPS` en `role-route-mapping.ts`, remover el fallback hardcoded en `canAccessPeopleModule` de `authorization.ts`
- Actualizar la tabla §1.5 en `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` para cerrar drift #1
- Actualizar `GREENHOUSE_IDENTITY_ACCESS_V2.md` §Route Group Model si la tabla de route groups cambia

### Slice 4 — Migración de legacy role codes en datos (gap 6)

- Consultar `user_role_assignments` para contar usuarios activos con `role_code = 'employee'` o `role_code = 'finance_manager'`
- Si count = 0: eliminar las entries legacy de `ROLE_ROUTE_GROUPS`, eliminar `EMPLOYEE` y `FINANCE_MANAGER` de `ROLE_CODES`, y eliminar de `ROLE_PRIORITY`
- Si count > 0: documentar el count y los user_ids afectados, crear un script de migración que haga UPDATE SET role_code = 'collaborator' WHERE role_code = 'employee' (y lo equivalente para finance_manager → finance_admin), ejecutar previa confirmación del usuario
- Actualizar `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` §7 Legacy and Convergence con el resultado

## Out of Scope

- Implementar impersonation de sesiones (`session_impersonation` event) — es feature nueva, no spec compliance
- Crear consumers o projections para los nuevos eventos — solo se emiten, el consumer los procesa cuando tenga handler
- Modificar el leave approval workflow — ya funciona correctamente con snapshot
- Agregar rate limiting a login attempts — es infra, no audit
- Crear UI para ver login audit trail — es otra task
- Agregar nuevos role codes o modificar la taxonomía de roles

## Detailed Spec

### Login audit: signIn callback vs events hook

NextAuth ofrece dos hooks para login:

1. `callbacks.signIn({ user, account, profile })` — se ejecuta ANTES de crear la sesión, puede retornar false para bloquear. Es síncrono respecto al flujo de auth.
2. `events.signIn({ user, account, profile, isNewUser })` — se ejecuta DESPUÉS de la sesión creada. Es fire-and-forget.

Para `login_success`: usar `events.signIn` (no bloquea auth).
Para `login_failed`: usar `callbacks.signIn` con try/catch en la rama de credentials, ya que `events` no tiene un hook para failures.

### Scope assignment audit: dónde se emiten

Buscar en `identity-store.ts` las funciones que modifican:
- `user_project_scopes` — INSERT/DELETE
- `user_campaign_scopes` — INSERT/DELETE
- `user_client_scopes` — INSERT/DELETE

Cada INSERT debe emitir `scope.assigned` y cada DELETE `scope.revoked`.

### People drift resolution

El patrón actual:

```typescript
// role-route-mapping.ts
[ROLE_CODES.EFEONCE_OPERATIONS]: ['internal'],
[ROLE_CODES.HR_PAYROLL]: ['internal', 'hr'],

// authorization.ts — fallback hardcoded
export const canAccessPeopleModule = (tenant) =>
  hasRouteGroup(tenant, 'people') ||
  (hasRouteGroup(tenant, 'internal') &&
    (hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN) || hasRoleCode(tenant, ROLE_CODES.EFEONCE_OPERATIONS) || hasRoleCode(tenant, ROLE_CODES.HR_PAYROLL) || ...))
```

Target: mover `people` al mapping base:

```typescript
[ROLE_CODES.EFEONCE_OPERATIONS]: ['internal', 'people'],
[ROLE_CODES.HR_PAYROLL]: ['internal', 'hr', 'people'],
```

Y simplificar `canAccessPeopleModule`:

```typescript
export const canAccessPeopleModule = (tenant) =>
  hasRouteGroup(tenant, 'people') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `scope.assigned` y `scope.revoked` se emiten al modificar `user_project_scopes`, `user_campaign_scopes`, `user_client_scopes`
- [ ] `auth.login.success` se emite al completar login exitoso sin bloquear el auth flow
- [ ] `auth.login.failed` se emite al fallar login con credentials
- [ ] Payload de login incluye `email`, `provider` y `timestamp` como mínimo
- [ ] Drift #1 está cerrado: `people` está en el mapping base de `efeonce_operations` y `hr_payroll`, o documentado como override
- [ ] `canAccessPeopleModule` no tiene fallback hardcoded para roles que ya tienen `people` en su mapping
- [ ] Si 0 usuarios activos en legacy codes: `employee` y `finance_manager` eliminados de `ROLE_CODES`, `ROLE_PRIORITY` y `ROLE_ROUTE_GROUPS`
- [ ] Si >0 usuarios activos en legacy codes: migración documentada con script y lista de user_ids
- [ ] Deltas documentados en GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md y GREENHOUSE_IDENTITY_ACCESS_V2.md
- [ ] Nuevos event types tienen payload interfaces TypeScript definidas
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` pasan

## Verification

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- Verificar manualmente que login emite evento (revisar outbox en PG después de un login local)

## Closing Protocol

- [ ] Documentar el delta de drift #1 en GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md
- [ ] Documentar el delta de audit events en GREENHOUSE_IDENTITY_ACCESS_V2.md
- [ ] Si se migraron legacy codes, documentar el resultado en GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md §7

## Follow-ups

- Crear UI de audit trail para login events (admin surface)
- Evaluar si `session_impersonation` event merece implementarse (requiere feature de impersonation primero)
- Considerar agregar `user_created` outbox event en el invite flow (hoy solo tiene audit_events via writeAuditEvent)
- Evaluar consumer reactivo para login events (rate limiting, anomaly detection)

## Open Questions

- Para slice 2: NextAuth `events.signIn` ejecuta fire-and-forget, pero ¿tiene acceso al request headers para obtener IP address? Si no, puede que se necesite middleware para capturar IP y pasar por context. Verificar durante Discovery.
- Para slice 4: ¿hay usuarios activos con `employee` o `finance_manager` en producción? El agente debe consultar la DB antes de decidir si migrar o documentar.
