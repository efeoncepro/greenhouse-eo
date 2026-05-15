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

- Crear ingestion de observed access snapshots por plataforma (inbound push o outbound pull).
- Resolver observed subjects contra `identity_profile_source_links` (Postgres-first, patron TASK-877); fallback documentado a email solo si no hay link canonico.
- Detectar los 7 drift types canonicos comparando desired vs observed.
- Resolver severity via `resolveDriftSeverity(driftType, platformMode)` — NO hardcodear.
- Publicar 7 reliability signals + admin queues para remediacion humana.
- Mantener modo `read_only_observed` / `platform_managed_observed` para plataformas aun no integradas full.

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

Signals canonicos bajo subsystem nuevo `Ecosystem Access` (spec V1 §5.4, los que viven en este slice):

- `ecosystem.access.pending_provisioning` — kind=drift, severity warning>24h / error>72h.
- `ecosystem.access.pending_deprovisioning` — kind=drift, severity warning>24h / error>72h.
- `ecosystem.access.unauthorized_local_access` — kind=drift, severity depende del platform mode (via `resolveDriftSeverity`).
- `ecosystem.access.identity_unresolved` — kind=data_quality, severity error si count>0. Steady=0.
- `ecosystem.access.snapshot_stale` — kind=lag, warning>48h / error>7d. Detecta sister platforms activas sin snapshot reciente.
- `ecosystem.access.capability_deprecated_assignments` — kind=data_quality, warning>0. Detecta assignments activos con capability `deprecated_at IS NOT NULL` (movido desde TASK-885 a este slice).
- `ecosystem.access.approval_overdue` — kind=drift, warning>7d / error>30d. Detecta assignments `pending_approval` sin resolucion.

Los 2 signals restantes del subsystem (`provisioning_apply_lag`, `provisioning_dead_letter`) viven en TASK-888.

Admin read API: `GET /api/admin/ecosystem/access/drift?status=open&platform=` con cursor pagination keyset on `(detected_at DESC, drift_id)`, gated por capability `ecosystem.access.drift.read`.

## Out of Scope

- UI completa.
- Revoke/approve commands.
- Provisioning outbound hacia plataformas.
- Kortex-specific adapter profundo.

## Detailed Spec

Alineado con `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` §4.4.

### Drift types canonicos (7, no 6)

- `pending_provisioning` — desired active, observed missing.
- `pending_deprovisioning` — desired revoked/suspended, observed active.
- `unauthorized_local_access` — observed active, desired none.
- `missing_identity_link` — observed subject sin `identity_profile_id` resoluble (era `identity_unresolved` en draft; renombrado por consistencia con spec V1).
- `scope_mismatch` — mismo subject/capability en scope incorrecto.
- `capability_mismatch` — subject existe pero capability distinta a la desired.
- `platform_apply_failed` — provisioning command en `failed` o `dead_letter` (anclado a TASK-888). 7° tipo agregado por spec V1.

### Drift severity NO es constante

La severity depende del `provisioning_mode` del binding asociado. Helper canonico server-only `resolveDriftSeverity(driftType, platformMode) → 'info' | 'warning' | 'error'`. Matriz canonica (spec V1 §4.4):

| Drift type | greenhouse_managed | hybrid_approval | platform_managed_observed | read_only_observed |
| --- | --- | --- | --- | --- |
| `pending_provisioning` | error | warning | warning | info |
| `pending_deprovisioning` | error | warning | warning | info |
| `unauthorized_local_access` | error | warning | info | info |
| `missing_identity_link` | error | error | error | error |
| `scope_mismatch` | error | warning | warning | info |
| `capability_mismatch` | error | warning | warning | info |
| `platform_apply_failed` | error | error | error | N/A |

**Regla dura**: consumers NUNCA hardcodean severity inline. Toda lectura pasa por `resolveDriftSeverity`.

### Tabla drift

`greenhouse_core.ecosystem_access_drift`:

- `drift_id` uuid PK
- `drift_type` text — CHECK enum 7 valores
- `assignment_id` uuid FK nullable — null para `unauthorized_local_access` o `missing_identity_link`
- `observed_row_id` uuid FK nullable — null para `pending_provisioning`
- `platform_key` text NOT NULL
- `binding_id` uuid FK — anchors severity resolution
- `severity` text — resuelto al crear via `resolveDriftSeverity`
- `status` text — `open | acknowledged | resolved | dismissed`
- `detected_at` timestamptz
- `resolved_at` timestamptz nullable
- `resolution_action` text nullable

### Auto-resolve

Si en un snapshot posterior `desired` y `observed` convergen, drift se mueve a `status='resolved'` automaticamente. **No auto-revoke ni auto-grant en V1**; solo close del drift.

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
