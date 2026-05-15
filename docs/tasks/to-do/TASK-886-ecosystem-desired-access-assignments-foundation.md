# TASK-886 — Ecosystem Desired Access Assignments Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity|platform`
- Blocked by: `TASK-885`
- Branch: `task/TASK-886-ecosystem-desired-access-assignments-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega la foundation de estado deseado de acceso del ecosistema: desde Greenhouse se podran asignar colaboradores/personas a plataformas, clientes/spaces y capabilities, sin depender de que cada portal lo haga manualmente.

## Why This Task Exists

El objetivo del usuario es poder asignar usuarios desde Greenhouse a Kortex, Verk u otras plataformas. Para hacerlo bien, Greenhouse necesita persistir `desired access state` con auditabilidad, approval status, scope canonico y comandos idempotentes antes de intentar provisionar en una plataforma externa.

## Goal

- Modelar assignments deseados por subject, plataforma, scope y capability.
- Crear command helpers para grant/revoke/suspend desde Greenhouse.
- Emitir audit/outbox para que provisioning downstream aplique cambios.
- Soportar approval workflow para grants sensibles.
- Mantener separacion entre `client_user`, `member` e `identity_profile`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `identity_profile` es la raiz humana conceptual; `client_user` sigue siendo el principal de acceso cuando aplique.
- No escribir directamente en la DB de Kortex/Verk.
- Todo grant/revoke debe ser idempotente, auditado y con outbox event versionado.
- Greenhouse desired state no asume que la plataforma aplico el cambio; eso lo resuelve observed/applied state en `TASK-887`/`TASK-888`.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-884`
- `TASK-885`
- `greenhouse_core.identity_profiles`
- `greenhouse_core.client_users`
- `greenhouse_core.members`
- `greenhouse_core.sister_platform_bindings`
- `greenhouse_core.ecosystem_platform_capabilities` (de `TASK-885`)

### Blocks / Impacts

- `TASK-887`
- `TASK-888`
- `TASK-889`

### Files owned

- `migrations/*_ecosystem_desired_access_assignments.sql`
- `src/lib/ecosystem-access/assignments.ts`
- `src/lib/ecosystem-access/types.ts`
- `src/lib/sync/event-catalog.ts`
- `src/app/api/admin/ecosystem/access/assignments/route.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Entitlement governance para Greenhouse interno.
- Person identity source links y session/access runtime.
- Sister platform bindings para scope mapping.

### Gap

- No hay tabla de estado deseado cross-platform.
- No hay comando canonico para asignar usuario a plataforma hermana desde Greenhouse.
- No hay eventos `ecosystem.access.*`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

- Crear aggregate `ecosystem_access_assignments` o equivalente.
- Incluir subject refs, platform, capability, action/scope, greenhouse scope, approval status y lifecycle.

### Slice 2 — Command Helpers

- `grantEcosystemPlatformAccess()`
- `revokeEcosystemPlatformAccess()`
- `suspendEcosystemPlatformAccess()`
- `approveEcosystemPlatformAccess()` para sensitive grants.

### Slice 3 — Audit + Outbox

- Audit append-only.
- Eventos versionados `ecosystem.access.assignment.{granted,revoked,suspended,approved}`.

### Slice 4 — Admin API

- Endpoints admin para crear/listar/revocar assignments.
- Guard por capability Greenhouse interna, por ejemplo `ecosystem.access.assignment.manage`.

### Slice 5 — Tests + Docs

- Tests de idempotencia, scope validation y event emission.
- Docs architecture delta.

## Out of Scope

- Aplicar el cambio en Kortex/Verk.
- UI completa.
- Observed state/drift.
- Provisioning local desde plataformas hermanas.

## Detailed Spec

Assignment shape minimo:

```ts
type EcosystemAccessAssignment = {
  identityProfileId: string
  userId: string | null
  memberId: string | null
  platformKey: string
  capabilityKey: string
  action: string
  scopeType: 'internal' | 'organization' | 'client' | 'space' | 'platform_workspace' | 'platform_installation'
  scopeId: string | null
  desiredStatus: 'active' | 'suspended' | 'revoked'
  approvalStatus: 'approved' | 'pending_approval' | 'rejected'
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- No external provisioning hasta que audit/outbox este cerrado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sobre-grant por scope incorrecto | identity | high | validation helper + FK/binding checks | future drift signal |
| Grants sensibles sin aprobacion | identity | medium | approval_status pending para sensitive | audit query |
| Plataforma aplica antes de persistir audit | outbox | medium | outbox dentro de misma transaccion | outbox dead-letter |

### Feature flags / cutover

Sin flag para schema y API admin gated. No hay efecto externo hasta `TASK-888`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Down migration si no hay consumers | <30 min | si |
| Slice 2 | Revert helpers | <30 min | si |
| Slice 3 | Revert event catalog antes de consumers | <30 min | si |
| Slice 4 | Retirar rutas admin | <30 min | si |
| Slice 5 | Revert docs/tests | <15 min | si |

### Production verification sequence

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- Vitest focused.

## Acceptance Criteria

- Greenhouse puede persistir un assignment deseado para un colaborador hacia Kortex/Verk.
- El assignment referencia platform capability valida.
- Grant/revoke/suspend son idempotentes.
- Cada mutacion escribe audit y outbox.
- No se llama a APIs externas ni se asume applied state.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm vitest run src/lib/ecosystem-access`
