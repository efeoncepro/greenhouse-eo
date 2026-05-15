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

- Audit log `ecosystem_access_audit_log` append-only con triggers anti-UPDATE/DELETE.
- Eventos versionados v1 (6 nuevos): `granted`, `revoked`, `suspended`, `resumed`, `approved`, `rejected`. Registrar en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.

### Slice 4 — Admin API

- Endpoints admin para crear/listar/revocar/suspender/aprobar assignments.
- Guards canonicos least-privilege (NO coarse `assignment.manage`):
  - `GET /api/admin/ecosystem/access/assignments` → `ecosystem.access.assignment.read`
  - `POST /api/admin/ecosystem/access/assignments` → `ecosystem.access.assignment.grant`
  - `PATCH /api/admin/ecosystem/access/assignments/[id]` (suspend/resume) → `ecosystem.access.assignment.suspend`
  - `DELETE /api/admin/ecosystem/access/assignments/[id]` (revoke) → `ecosystem.access.assignment.revoke`
  - `POST /api/admin/ecosystem/access/assignments/[id]/approve` → `ecosystem.access.assignment.approve` (actor distinto al grantor)
- Idempotency: POST con misma `idempotencyKey` retorna 200 `already_active=true`, no 409.

### Slice 5 — Tests + Docs

- Tests de idempotencia, scope validation y event emission.
- Docs architecture delta.

## Out of Scope

- Aplicar el cambio en Kortex/Verk.
- UI completa.
- Observed state/drift.
- Provisioning local desde plataformas hermanas.

## Detailed Spec

Tabla canonica `greenhouse_core.ecosystem_access_assignments` alineada con `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` §3.4.

### Assignment shape completo

```ts
type EcosystemAccessAssignment = {
  assignmentId: string                                         // uuid PK
  identityProfileId: string                                    // FK identity_profiles — NOT NULL para subjects humanos
  subjectType: 'internal_collaborator' | 'client_user' | 'service_account' | 'external_partner'
  memberId: string | null                                      // NOT NULL si subjectType=internal_collaborator
  userId: string | null                                        // NOT NULL si subjectType=client_user
  platformKey: string                                          // FK ecosystem_platforms (TASK-885)
  capabilityKey: string                                        // FK ecosystem_platform_capabilities (TASK-885)
  action: string                                               // debe pertenecer a capability.allowed_actions
  scopeType: 'internal' | 'organization' | 'client' | 'space' | 'platform_workspace' | 'platform_installation'
  scopeId: string | null                                       // null cuando scopeType=internal; en otro caso resuelve a binding
  bindingId: string                                            // FK sister_platform_bindings — NOT NULL, anchors scope resolution
  desiredStatus: 'active' | 'suspended' | 'revoked'
  approvalStatus: 'approved' | 'pending_approval' | 'rejected'
  grantedByUserId: string                                      // FK client_users — actor que crea
  approvedByUserId: string | null                              // FK client_users — segunda firma (DEBE diferir de grantedByUserId)
  reason: string                                               // CHECK length >= 10 chars
  effectiveFrom: string                                        // timestamptz NOT NULL DEFAULT NOW()
  effectiveTo: string | null                                   // null = sin expiracion
  idempotencyKey: string                                       // SHA256 de subjectKey+platform+capability+scope+action — UNIQUE
  metadataJson: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

### Constraints obligatorios

- CHECK sobre `subject_type`, `desired_status`, `approval_status`, `scope_type` enumerados.
- CHECK `length(reason) >= 10`.
- CHECK `approved_by_user_id IS NULL OR approved_by_user_id <> granted_by_user_id` — segunda firma exige actor distinto.
- FK obligatorias: `identity_profiles`, `members` (cuando aplica), `client_users` (cuando aplica), `ecosystem_platforms`, `ecosystem_platform_capabilities`, `sister_platform_bindings`.
- UNIQUE PARTIAL INDEX active por `(identity_profile_id, platform_key, capability_key, action, scope_type, scope_id)` WHERE `desired_status='active' AND approval_status='approved'` — idempotency + bloquea duplicate active grants.

### Trigger anti-zombie

`ecosystem_access_assignments_anti_zombie_trigger` BEFORE INSERT OR UPDATE: si `desired_status='active'` y `effective_to IS NOT NULL AND effective_to < NOW()`, auto-flip a `suspended` y registrar en audit log.

### Audit log `ecosystem_access_audit_log`

Append-only con triggers anti-UPDATE/DELETE (patron TASK-700/TASK-765). Columnas: `audit_id`, `assignment_id` FK, `action` (granted | revoked | suspended | resumed | approved | rejected), `actor_user_id`, `actor_label`, `before_json` jsonb, `after_json` jsonb, `reason`, `recorded_at`.

### Outbox events canonicos (versionados v1)

Alineados con spec V1 §5.3. Persistidos en la **misma tx** que la mutacion (patron TASK-771):

- `ecosystem.access.assignment.granted v1`
- `ecosystem.access.assignment.revoked v1`
- `ecosystem.access.assignment.suspended v1`
- `ecosystem.access.assignment.resumed v1` — al transicionar suspended → active
- `ecosystem.access.assignment.approved v1` — al cerrar approval pending → active
- `ecosystem.access.assignment.rejected v1` — al rechazar approval

### Capabilities granulares least-privilege (5)

Reemplaza la capability coarse `ecosystem.access.assignment.manage` del draft original con un set least-privilege alineado a spec V1 §3.5:

| Capability | Action | Allowed audience |
| --- | --- | --- |
| `ecosystem.access.assignment.read` | read | route_group=admin / FINANCE_ADMIN / HR |
| `ecosystem.access.assignment.grant` | create | EFEONCE_ADMIN / DEVOPS_OPERATOR / HR (scoped) |
| `ecosystem.access.assignment.revoke` | delete | EFEONCE_ADMIN / HR |
| `ecosystem.access.assignment.suspend` | update | EFEONCE_ADMIN / HR / DEVOPS_OPERATOR |
| `ecosystem.access.assignment.approve` | approve | EFEONCE_ADMIN only (segunda firma) |

Seedeadas en `greenhouse_core.capabilities_registry` + grants runtime en `src/lib/entitlements/runtime.ts` en el mismo PR (regla canonica TASK-873).

### Helper canonico

`grantEcosystemPlatformAccess(input)` en `src/lib/ecosystem-access/assignments.ts`:

- Atomic tx PG: validar (subject vs capability.allowed_subject_types, scope vs capability.allowed_scope_types, action vs capability.allowed_actions, binding activo para el scope, capability no deprecated) → INSERT/UPDATE assignment → INSERT audit log → publish outbox event.
- Acepta `client?: PoolClient` opcional para tx compartida (patron TASK-872).
- Idempotente: si `idempotencyKey` ya existe activo, retorna `{ alreadyActive: true }` sin segunda INSERT.
- Sensitive grants (`capability.requires_approval=true`) nacen con `approval_status='pending_approval'`; el helper rechaza intentos de set `approved` sin pasar por `approveEcosystemPlatformAccess` (segunda firma).

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
