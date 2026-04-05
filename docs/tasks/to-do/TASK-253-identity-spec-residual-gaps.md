# TASK-253 — Identity Spec Residual Gaps (Approval Snapshot + Audit Events)

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
- Domain: `identity`, `hr`, `platform`
- Blocked by: `none`
- Branch: `task/TASK-253-identity-spec-residual-gaps`
- Legacy ID: —
- GitHub Issue: —

## Summary

Cierra los 3 gaps residuales entre la spec de identidad (`GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` + `GREENHOUSE_IDENTITY_ACCESS_V2.md`) y la implementacion actual. Gap 1 congela el aprobador al momento del submit del leave request. Gap 2 emite `scope.revoked` cuando se quitan scopes. Gap 4 emite `user_deactivated` / `user_reactivated` desde todas las vias de desactivacion.

## Why This Task Exists

TASK-247 y TASK-248 cerraron 9 de 12 gaps identificados al contrastar la spec contra el codigo. Quedan 3 gaps abiertos:

1. **Approval snapshot**: la spec §2 Reporting Hierarchy dice que el aprobador debe congelarse al momento del submit, pero hoy se resuelve dinamicamente en cada render. Si la supervisoria cambia entre el submit y la aprobacion, el request puede quedar en un estado inconsistente.
2. **scope.revoked**: TASK-248 emitio `scope.assigned` en `upsertProjectScopes()`, pero la revocacion de scopes no emite el evento espejo. La spec §Audit Model lo requiere.
3. **user_deactivated**: solo la via SCIM emite un evento de desactivacion (`scim.user.deactivated`). La desactivacion manual desde Admin Center no emite nada al outbox. La spec requiere un evento canonico `user.deactivated`.

Ningun gap es critico ni bloquea funcionalidad hoy — son robustez y compliance con la spec.

**Nota:** Los gaps 3 (login events), 5 (people fallback) y 6 (employee/finance_manager migration) del brief original ya fueron cerrados por TASK-248 y su trabajo de migracion de datos.

## Goal

- Leave requests y futuro expense reports congelan el aprobador efectivo al momento del submit
- Toda revocacion de scope emite `scope.revoked` al outbox
- Toda desactivacion/reactivacion de usuario emite `user.deactivated` / `user.reactivated` al outbox

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — §Audit Model (eventos requeridos)
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — §2 Reporting Hierarchy (approval snapshot)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catalogo de eventos, aggregates, payloads

Reglas obligatorias:

- Outbox events usan `publishOutboxEvent()` de `@/lib/sync/publish-event` — fire-and-forget con `.catch(() => {})`
- Event types y payload interfaces deben registrarse en `src/lib/sync/event-catalog.ts`
- Nuevos event types que tengan consumers downstream deben agregarse a `REACTIVE_EVENT_TYPES`

## Normative Docs

- `docs/tasks/complete/TASK-248-identity-access-spec-compliance.md` — trabajo previo que cerro gaps 3, 5 y 6
- `docs/tasks/complete/TASK-247-identity-platform-block-hardening.md` — trabajo previo que cerro 12 gaps de platform

## Dependencies & Impact

### Depends on

- `greenhouse_hr.leave_requests` — tabla donde se persisten leave requests (necesita columna para snapshot)
- `src/lib/sync/event-catalog.ts` — ya tiene `scope.assigned`, `scope.revoked`, `loginSuccess`, `loginFailed` definidos (TASK-248)
- `src/lib/sync/publish-event.ts` — funcion de publish al outbox

### Blocks / Impacts

- Futuro expense reports workflow se beneficia del patron de approval snapshot (Gap 1)
- TASK-251 (Reactive Control Plane) puede monitorear los nuevos eventos

### Files owned

- `src/lib/hr-core/postgres-leave-store.ts`
- `src/app/api/hr/leave/requests/route.ts`
- `src/lib/admin/tenant-member-provisioning.ts`
- `src/lib/sync/event-catalog.ts`

## Current Repo State

### Already exists

- `src/lib/sync/event-catalog.ts` — event types `scope.assigned`, `scope.revoked` ya definidos; payload interfaces `ScopeAssignedPayload`, `ScopeRevokedPayload` ya definidas (TASK-248)
- `src/lib/admin/tenant-member-provisioning.ts:502` — `scope.assigned` ya se emite en `upsertProjectScopes()`
- `src/lib/auth.ts:212,586` — `loginFailed` y `loginSuccess` ya se emiten (TASK-248, cerrado)
- `src/lib/tenant/role-route-mapping.ts:13,15` — `people` ya incluido en `EFEONCE_OPERATIONS` y `HR_PAYROLL` (TASK-248, cerrado)
- `src/config/role-codes.ts` — `EMPLOYEE` y `FINANCE_MANAGER` ya eliminados (TASK-248, cerrado)
- `src/lib/scim/provisioning.ts:335` — via SCIM emite `scim.user.deactivated` pero no el evento canonico `user.deactivated`

### Gap

- Leave requests no congelan aprobador al submit — `reports_to_member_id` se resuelve en cada query
- `scope.revoked` no se emite en ninguna via de revocacion de scopes
- Desactivacion manual de usuarios (fuera de SCIM) no emite evento al outbox
- No existe evento canonico `user.deactivated` / `user.reactivated` en `event-catalog.ts`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Approval snapshot al submit

- Agregar columna `approver_member_id` a `greenhouse_hr.leave_requests` (migracion)
- Al crear un leave request, resolver `reports_to_member_id` del solicitante y persistirlo en `approver_member_id`
- Las queries de lectura del leave request usan `approver_member_id` en vez de resolver dinamicamente
- Si `approver_member_id` es NULL (requests legacy), fallback al comportamiento actual (resolucion dinamica)

### Slice 2 — Emitir scope.revoked

- Identificar todas las vias de revocacion de scopes: DELETE en `user_project_scopes`, `user_campaign_scopes`, `user_client_scopes`
- En cada via, emitir `scope.revoked` con payload `ScopeRevokedPayload` (ya definido en event-catalog)
- Patron: fire-and-forget `.catch(() => {})`, identico a `scope.assigned`

### Slice 3 — Emitir user.deactivated / user.reactivated

- Definir event types `user.deactivated` y `user.reactivated` en `event-catalog.ts` con aggregate type `userLifecycle`
- Definir payload interfaces `UserDeactivatedPayload` y `UserReactivatedPayload`
- Emitir en todas las vias de desactivacion: Admin Center toggle, SCIM provisioning, cualquier otra via
- La via SCIM (`scim.user.deactivated`) sigue emitiendo su evento propio — el canonico es adicional

## Out of Scope

- Expense reports workflow (no existe aun — el patron de approval snapshot se aplica solo a leave requests)
- Migrar leave requests legacy para llenar `approver_member_id` retroactivamente
- Consumers reactivos de los nuevos eventos (eso es trabajo de proyecciones, no de esta task)
- UI changes: no hay cambios visibles en el portal
- Refactor de `canAccessPeopleModule` (Gap 5 ya cerrado en TASK-248)
- Migracion de datos de `employee`/`finance_manager` (Gap 6 ya cerrado en TASK-248)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un leave request nuevo persiste `approver_member_id` al momento del submit
- [ ] Un leave request legacy (sin `approver_member_id`) sigue funcionando con fallback dinamico
- [ ] La revocacion de project/campaign/client scopes emite `scope.revoked` al outbox
- [ ] La desactivacion manual de un usuario emite `user.deactivated` al outbox
- [ ] La reactivacion de un usuario emite `user.reactivated` al outbox
- [ ] `event-catalog.ts` contiene los nuevos event types y payload interfaces
- [ ] Los nuevos event types estan en `REACTIVE_EVENT_TYPES` para consumers downstream

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Crear leave request en preview y verificar que `approver_member_id` se persiste
- Revocar scope en preview y verificar evento en `greenhouse_sync.outbox_events`

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — marcar gaps como cerrados
- [ ] Actualizar `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — marcar §2 snapshot como implementado
- [ ] Actualizar `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — agregar nuevos eventos

## Follow-ups

- Expense reports workflow (cuando se implemente) debe usar el mismo patron de approval snapshot
- Consumer reactivo para `user.deactivated` que revoque sesiones activas (scope de TASK-251 o task dedicada)

## Open Questions

- Debe el approval snapshot incluir solo `approver_member_id` o tambien `approver_display_name` para auditoria sin JOIN?
