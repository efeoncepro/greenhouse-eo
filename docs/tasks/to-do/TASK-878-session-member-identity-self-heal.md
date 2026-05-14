# TASK-878 — Session Member Identity Self-Heal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-878-session-member-identity-self-heal`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agregar un self-heal seguro para sesiones internas cuyo JWT quedo sin `memberId` antes de una remediacion de identidad. Cuando `greenhouse_serving.session_360` ya tiene `member_id` para el mismo `user_id`, el callback JWT debe refrescar solo los campos de identidad colaborador sin exigir logout/login manual.

## Why This Task Exists

El 2026-05-14 Felipe Zurita seguia viendo `Member identity not linked` aun cuando Postgres ya mostraba `client_users.member_id`, `members.identity_profile_id` y `session_360.member_id` correctos. La causa real fue un JWT emitido el 2026-05-13 antes de que la remediacion vinculara `client_user -> member`. El runtime actual rehidrata `memberId` durante sign-in SSO, pero las requests posteriores leen el token existente, por lo que el portal puede seguir fallando hasta que el usuario cierre sesion.

Este no es un problema de Workforce Activation ni de Notion. Es un gap de resiliencia en Identity Access: una remediacion correcta en DB no siempre llega a sesiones ya emitidas.

## Goal

- Refrescar `memberId` e `identityProfileId` en JWTs internos stale cuando el vinculo ya existe en `greenhouse_serving.session_360`.
- Mantener el cambio fail-closed: nunca inferir ni escribir vinculos nuevos desde el token.
- Dejar observabilidad/test anti-regresion para que el self-heal no se convierta en un bypass de autorizacion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- `identity_profile_id` sigue siendo la raiz humana canonica; `member_id` es el ancla operacional de colaborador.
- No crear ni modificar `client_users`, `members` o `identity_profiles` desde el JWT callback.
- No recalcular roles, routeGroups, authorizedViews ni entitlements como efecto colateral de este self-heal, salvo decision explicita en Plan Mode.
- El lookup debe usar Postgres/session_360 como source of truth runtime. BigQuery no debe usarse para reparar una sesion interna ya existente.
- El cambio no debe introducir una DB call por request sano. Solo debe ejecutarse cuando falte `memberId` en un usuario interno autenticado.

## Normative Docs

- `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`
- `docs/tasks/complete/TASK-872-scim-internal-collaborator-provisioning.md`
- `docs/tasks/complete/TASK-874-workforce-activation-readiness-workspace.md`
- `docs/tasks/complete/TASK-877-workforce-external-identity-reconciliation.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_serving.session_360` — runtime session projection with `user_id`, `tenant_type`, `member_id`, `identity_profile_id`.
- `src/lib/tenant/identity-store.ts` — existing Postgres session readers, including `getSessionFromPostgresByUserId`.
- `src/lib/auth.ts` — NextAuth JWT/session callback that materializes `memberId` into the session.
- `src/lib/tenant/get-tenant-context.ts` — current request context reads from session/JWT.
- `src/lib/tenant/authorization.ts` — `requireMyTenantContext()` returns `422 Member identity not linked` when `tenant.memberId` is missing.

### Blocks / Impacts

- Reduces manual logout/login requirements after SCIM/Workforce Activation identity remediation.
- Impacts `/api/my/*` routes guarded by `requireMyTenantContext()`.
- Improves resilience for collaborators activated by TASK-872/TASK-874/TASK-877 after their first login.

### Files owned

- `src/lib/auth.ts`
- `src/lib/tenant/identity-store.ts`
- `src/lib/auth/sign-agent-session-in-process.test.ts`
- `src/lib/tenant/authorization.test.ts`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `Handoff.md`
- `changelog.md`
- `docs/tasks/README.md`

## Current Repo State

### Already exists

- `src/lib/auth.ts` refreshes tenant identity on SSO sign-in (`account?.provider === 'azure-ad'` or `google`) and copies `tenant.memberId` into the JWT.
- `src/lib/tenant/identity-store.ts` exposes `getSessionFromPostgresByUserId()` over `greenhouse_serving.session_360`.
- `src/lib/tenant/get-tenant-context.ts` builds `TenantContext` directly from `session.user`.
- `src/lib/tenant/authorization.ts` fails `/api/my/*` with `Member identity not linked` when `tenant.memberId` is absent.
- Live Postgres check on 2026-05-14 confirmed Felipe Zurita and Maria Camila Hoyos have correct rows in `client_users`, `members` and `session_360`; the remaining failure mode is stale session token, not missing DB linkage.

### Gap

- Existing sessions emitted before a DB identity remediation do not self-heal.
- A user can remain functionally blocked in personal workspace routes until manual logout/login even though source-of-truth DB is already correct.
- No test currently pins the invariant "internal stale JWT without memberId can recover from `session_360` by same userId".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Self-heal primitive

- Crear o extender una primitive server-only para refrescar identidad colaborador desde `session_360` por `userId`.
- La primitive debe retornar un resultado tipado: `healed`, `not_needed`, `not_found`, `mismatch`, `unavailable`.
- Guardrails obligatorios:
  - solo `tenantType === 'efeonce_internal'`
  - solo cuando el token no tenga `memberId`
  - lookup primario por `userId`
  - si se usa email como fallback, debe confirmar que el `user_id` retornado coincide con el token
  - no escribir DB

### Slice 2 — JWT callback wiring

- Integrar la primitive en `src/lib/auth.ts` dentro del callback `jwt`.
- Ejecutar el self-heal solo en sesiones stale: token con `tenantType='efeonce_internal'`, `userId` presente y `memberId` ausente.
- Actualizar en el token solo `memberId`, `identityProfileId` y `supervisorAccess` cuando el heal sea exitoso.
- Mantener roles, routeGroups, authorizedViews, projectScopes y capabilities sin cambio en este slice.

### Slice 3 — Observability and tests

- Agregar tests unitarios que cubran:
  - heal exitoso por same `user_id`
  - no-op cuando `memberId` ya existe
  - fail-closed si `session_360` no devuelve row
  - fail-closed si hay mismatch de `user_id`
  - no cambio para tenant `client`
- Registrar observabilidad ligera cuando ocurre heal o mismatch. Reusar `captureWithDomain` solo para estados anormales; el happy-path puede ser log estructurado o metric-friendly breadcrumb si existe primitive local.

### Slice 4 — Docs and operational guidance

- Actualizar `GREENHOUSE_IDENTITY_ACCESS_V2.md` con el contrato: sesiones internas pueden self-heal `memberId` desde `session_360`, sin recalcular permisos.
- Actualizar `Handoff.md` y `changelog.md` con el bug class Felipe/Maria y el rollback.
- Si emerge decision de ADR separada durante Plan Mode, indexarla en `docs/architecture/DECISIONS_INDEX.md`.

## Out of Scope

- No crear ni modificar `client_users`, `members`, `identity_profiles` o `identity_profile_source_links`.
- No cambiar Workforce Activation, Notion reconciliation ni SCIM provisioning.
- No recalcular `authorizedViews`, `routeGroups`, role assignments o entitlements por request.
- No invalidar sesiones globalmente ni forzar logout masivo.
- No agregar una DB call en cada request sana.

## Detailed Spec

Pseudoflujo esperado:

```ts
if (
  token.tenantType === 'efeonce_internal' &&
  typeof token.userId === 'string' &&
  typeof token.memberId !== 'string'
) {
  const result = await healInternalMemberIdentityToken(token)

  if (result.status === 'healed') {
    token.memberId = result.memberId
    token.identityProfileId = result.identityProfileId ?? token.identityProfileId
    token.supervisorAccess = await resolveSupervisorAccessSummaryFromMinimalContext({
      userId: token.userId,
      tenantType: 'efeonce_internal',
      memberId: result.memberId
    })
  }
}
```

El agente que implemente debe decidir si la primitive vive en `src/lib/auth.ts` como helper local o en un archivo nuevo bajo `src/lib/tenant/`. Si crea archivo nuevo, justificar por reuso/testabilidad y mantenerlo server-only.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (primitive + tests isolated) -> Slice 2 (JWT wiring) -> Slice 3 (observability/tests expanded) -> Slice 4 (docs/close).
- Slice 2 no puede shippear sin tests de Slice 1.
- Slice 4 no puede cerrar sin evidencia contra Felipe y Maria Camila o una razon documentada de por que no se pudo probar live.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Asignar `memberId` a usuario equivocado | identity / SSO | low | Lookup por `userId`; email fallback solo si confirma mismo `user_id`; no usar name matching | mismatch capturado en logs/Sentry domain `identity` |
| Reintroducir DB call por cada request | identity / performance | medium | Gate estricto: solo cuando falta `memberId`; tests pin no-op con `memberId` presente | latency/login callback logs |
| Cambiar permisos sin querer | access | low | Solo actualizar `memberId`/`identityProfileId`; no recalcular roles/views/entitlements | regression tests de session payload |
| Ocultar drift real de provisioning | identity / SCIM | medium | Registrar mismatch/not_found; no crear links; reliability signals existentes `identity.scim.*` siguen reportando drift DB | `identity.scim.users_without_member`, `identity.scim.member_identity_drift` |
| Self-heal falla por Postgres no disponible | identity / availability | low | Fail-open al comportamiento actual: no mutar token, usuario conserva error visible; capturar unavailable si aplica | logs/Sentry domain `identity` |

### Feature flags / cutover

- Sin feature flag inicial si el plan confirma que el gate es estrictamente `memberId` faltante + usuario interno + same `userId`. Razon: cambio narrow, fail-closed y reversible por revert.
- Si durante Discovery aparece un riesgo mayor, agregar env var `IDENTITY_SESSION_MEMBER_SELF_HEAL_ENABLED` default `false` en production y documentar flip/cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir helper/tests si no se cableo | <5 min | si |
| Slice 2 | Revertir commit de wiring JWT y redeploy; no hay mutacion DB | <10 min | si |
| Slice 3 | Revertir observability/tests o ajustar severity; no afecta datos | <10 min | si |
| Slice 4 | Revertir docs si la implementacion se revierte | <5 min | si |

### Production verification sequence

1. Staging: iniciar sesion con usuario interno sano y confirmar que no aparece self-heal log.
2. Staging: generar o simular JWT interno sin `memberId` para un `userId` cuyo `session_360.member_id` existe; confirmar que `/api/my/dashboard` deja de responder `422 Member identity not linked`.
3. Staging: simular mismatch/no row y confirmar que no se asigna `memberId`.
4. Produccion: deploy normal; pedir a Felipe y Maria Camila refresh/retry sin logout si aun conservan sesion stale.
5. Monitorear logs/Sentry domain `identity` y signals `identity.scim.*` durante 24h.

### Out-of-band coordination required

- N/A para datos. No requiere cambios en Entra, GCP, Vercel secrets ni Postgres data.
- Coordinacion operativa opcional: avisar a Felipe Zurita y Maria Camila Hoyos que reintenten luego del deploy; logout/login queda como workaround temporal hasta que esta task cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un token interno stale sin `memberId` se actualiza desde `session_360` solo cuando `user_id` coincide.
- [ ] `/api/my/*` deja de fallar con `Member identity not linked` para usuarios cuyo `session_360.member_id` ya existe.
- [ ] El self-heal no corre cuando el token ya tiene `memberId`.
- [ ] El self-heal no corre para tenants `client`.
- [ ] Mismatch/no row/Postgres unavailable no asignan identidad y quedan observables.
- [ ] No hay cambios a DB data ni migraciones.
- [ ] Docs vivas explican el contrato y rollback.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm exec vitest run src/lib/auth/sign-agent-session-in-process.test.ts src/lib/tenant/authorization.test.ts`
- `pnpm pg:doctor`
- Verificacion manual/staging de `/api/my/dashboard` o ruta equivalente con sesion stale simulada.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Felipe Zurita y Maria Camila Hoyos quedaron verificados o se documento por que no se pudo verificar con sus sesiones reales

## Follow-ups

- Si aparecen mas campos stale de sesion, abrir task separada para TTL/refresh controlado de `authorizedViews` y routeGroups. No mezclar con esta task.

## Open Questions

- ¿El equipo quiere feature flag para production aunque el cambio sea narrow/fail-closed? Default recomendado: no flag, salvo que Discovery encuentre un riesgo no observado.
