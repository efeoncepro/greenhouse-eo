# TASK-887 — Ecosystem Observed Access + Drift Reconciliation

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
- Domain: `identity|platform|reliability`
- Blocked by: `TASK-886`
- Branch: `task/TASK-887-ecosystem-observed-access-drift-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Permite que Kortex, Verk y futuras plataformas reporten su estado real de usuarios/capabilities a Greenhouse. Greenhouse compara observed state contra desired state y crea drift accionable: pendiente de provisionar, acceso local no autorizado, scope incorrecto o capability mismatch.

## Why This Task Exists

El usuario quiere que las plataformas puedan tener su propio provisioning si quieren, pero que Greenhouse pueda controlarlo. Eso exige observar lo que cada plataforma hizo localmente, no solo empujar grants desde Greenhouse. Sin observed state, Greenhouse no puede distinguir "pendiente", "fallo al aplicar" o "usuario creado localmente sin aprobacion".

## Goal

- Crear ingestion de observed access snapshots por plataforma.
- Resolver observed subjects contra `identity_profile` y bindings.
- Detectar drift entre desired y observed.
- Publicar reliability signals y admin queues para remediacion.
- Mantener modo read-only/observed para plataformas aun no integradas full.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- Observed state no autoriza por si mismo; solo describe realidad reportada.
- No revocar automaticamente en V1; crear drift y acciones operables.
- Resolver identidad Postgres-first; no depender de labels o email como unica fuente si existe link canonico.
- Toda ingestion debe ser idempotente y scoped al consumer/binding.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-884`
- `TASK-885`
- `TASK-886`
- `src/lib/sister-platforms/external-auth.ts`
- `src/lib/api-platform/core/ecosystem-auth`
- `greenhouse_core.identity_profile_source_links`

### Blocks / Impacts

- `TASK-888`
- `TASK-889`

### Files owned

- `migrations/*_ecosystem_observed_access_snapshots.sql`
- `src/lib/ecosystem-access/observed-state.ts`
- `src/lib/ecosystem-access/drift.ts`
- `src/app/api/platform/ecosystem/access/observed-state/route.ts`
- `src/app/api/admin/ecosystem/access/drift/route.ts`
- `src/lib/reliability/queries/ecosystem-access-signals.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Request logging y auth para sister-platform consumers.
- Platform Health y reliability primitives.
- Identity profile source links.

### Gap

- No hay observed access snapshots.
- No hay drift reconciliation entre desired/observed.
- No hay signals de acceso local no autorizado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce plan.md.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Observed State Schema

- Tabla de snapshots/runs.
- Tabla de observed access rows normalizadas.

### Slice 2 — Ingestion API

- Endpoint ecosystem-facing para que una plataforma reporte snapshot.
- Validar consumer, platformKey, binding y scope.

### Slice 3 — Identity Resolution

- Resolver platform user -> `identity_profile` via source links, platform external IDs y email fallback documentado.
- Marcar unresolved sin inventar identidad.

### Slice 4 — Drift Engine

- Comparar desired vs observed.
- Persistir drift records con severity/action.

### Slice 5 — Reliability + Admin Read

- Signals `ecosystem.access.unauthorized_local_access`, `ecosystem.access.pending_provisioning`, `ecosystem.access.identity_unresolved`.
- Admin read API para cola futura.

## Out of Scope

- UI completa.
- Revoke/approve commands.
- Provisioning outbound hacia plataformas.
- Kortex-specific adapter profundo.

## Detailed Spec

Drift types minimos:

- `pending_provisioning`: desired active, observed missing.
- `pending_deprovisioning`: desired revoked/suspended, observed active.
- `unauthorized_local_access`: observed active, desired none.
- `identity_unresolved`: observed subject no resoluble.
- `scope_mismatch`: mismo subject/capability en scope incorrecto.
- `capability_mismatch`: subject existe pero capability distinta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Drift engine no puede correr antes de identity resolution.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falso positivo de acceso no autorizado | identity | medium | severity warning hasta aprobacion humana V1 | ecosystem.access.unauthorized_local_access |
| Snapshot incompleto borra observed state valido | data | medium | run-based snapshots con status y cutoff; no hard-delete | ecosystem.access.snapshot_failed |
| Plataforma reporta scope equivocado | API | medium | binding validation obligatoria | request log + drift |

### Feature flags / cutover

Sin flag para ingestion read/write gated por ecosystem auth. No hay auto-remediation V1.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Down migration si no hay snapshots productivos | <30 min | parcial |
| Slice 2 | Deshabilitar route/consumer credential | <15 min | si |
| Slice 3 | Revert resolver fallback | <30 min | si |
| Slice 4 | Pausar drift job/helper | <15 min | si |
| Slice 5 | Retirar signals/read API | <30 min | si |

### Production verification sequence

- `pnpm pg:doctor`
- `pnpm migrate:up`
- API contract tests
- Vitest focused drift matrix
- Manual dry-run snapshot con fixture no productiva.

## Acceptance Criteria

- Una plataforma puede reportar observed access sin mutar desired state.
- Greenhouse persiste runs y rows observed.
- Drift engine produce tipos deterministas.
- Un usuario local creado en Kortex sin approval aparece como `unauthorized_local_access`.
- Un assignment creado en Greenhouse aun no aplicado aparece como `pending_provisioning`.
- Signals quedan visibles en Reliability.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm vitest run src/lib/ecosystem-access src/lib/reliability`
