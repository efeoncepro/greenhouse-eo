# TASK-835 — Sample Sprints Runtime Projection Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / agency / ui`
- Blocked by: `none`
- Branch: `task/TASK-835-sample-sprints-runtime-projection-hardening`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurece la surface runtime de `/agency/sample-sprints` para que deje de depender de heuristicas client-side para progreso, costos reales, equipo/capacidad y señales operativas. La task crea una proyeccion server-side reusable para el command center y los wizards, conectada a readers canonicos de Sample Sprints, Commercial Health y cost attribution, preservando el mockup aprobado sin mezclar datos reales con placeholders silenciosos.

## Why This Task Exists

TASK-809 conecto la UI real y los wizards, pero la capa visual todavia traduce datos reales a un view model con derivaciones locales: `progressPct` fijo por estado, `actualClp = 0`, equipo mostrado como placeholder del cliente, señales calculadas en el cliente y capacity risk inferido desde disponibilidad mockeada. Eso fue aceptable para cerrar la primera surface, pero ahora es deuda de robustez: puede mostrar salud, costo, progreso o aprobacion de forma distinta a los helpers canonicos que gobiernan backend, Ops Health y audit.

La causa raiz no es copy ni estilo: falta una proyeccion runtime canonica para la experiencia de Sample Sprints. Sin esa capa, cualquier mejora visual futura seguira duplicando reglas en React y aumentara el riesgo de drift.

## Goal

- Crear una proyeccion server-side canonica para el view model de Sample Sprints runtime.
- Sustituir heuristicas client-side por datos derivados desde primitives existentes.
- Alinear señales de la surface con Commercial Health, preservando descripciones operables para la UI.
- Mostrar equipo/capacidad/progreso/costo real con degraded states honestos cuando falte dato.
- Mantener la experiencia visual aprobada de `/agency/sample-sprints/mockup` sin volver a una UI paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Un Sample Sprint sigue siendo `greenhouse_core.services.engagement_kind != 'regular'`; no crear tabla `sample_sprints`.
- No duplicar reglas de Commercial Health en componentes React cuando exista reader canonico en `src/lib/commercial/sample-sprints/health.ts` o `src/lib/reliability/queries/engagement-*.ts`.
- No computar costos reales desde JSX; usar `greenhouse_serving.commercial_cost_attribution_v2` mediante helper server-side.
- No hardcodear copy reutilizable en componentes; usar `src/lib/copy/agency.ts` o crear entrada canonica si falta.
- Preservar el shell visual aprobado y el guardrail anti-import mockup runtime (`greenhouse/no-runtime-mockup-import`).
- Access model no cambia salvo que Discovery demuestre un gap: `views` = `gestion.sample_sprints`; entitlements = `commercial.engagement.*`; startup policy y routeGroups sin cambios por defecto.

## Normative Docs

- `docs/documentation/comercial/sample-sprints.md`
- `docs/manual-de-uso/comercial/sample-sprints.md`
- `docs/operations/runbooks/engagement-zombie-handling.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-809-sample-sprints-ui-wizards.md`
- `docs/tasks/complete/TASK-807-commercial-health-reliability-subsystem.md`
- `docs/tasks/complete/TASK-815-direct-service-expense-allocation-primitive.md`

## Dependencies & Impact

### Depends on

- `TASK-801` a `TASK-810` completos.
- `TASK-815` para costos directos anclados a service cuando existan.
- `src/lib/commercial/sample-sprints/store.ts`
- `src/lib/commercial/sample-sprints/approvals.ts`
- `src/lib/commercial/sample-sprints/progress-recorder.ts`
- `src/lib/commercial/sample-sprints/outcomes.ts`
- `src/lib/commercial/sample-sprints/health.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- `src/app/api/agency/sample-sprints/*`

### Blocks / Impacts

- Mejora la confiabilidad visible de `/agency/sample-sprints`.
- Reduce drift entre `/agency/sample-sprints`, `/admin/ops-health` y helpers backend.
- Habilita futuras visual regression/E2E con datos deterministas sin depender de placeholders.

### Files owned

- `src/lib/commercial/sample-sprints/runtime-projection.ts` (nuevo, `import 'server-only'`, mirror TASK-611)
- `src/lib/commercial/sample-sprints/runtime-projection.test.ts` (nuevo)
- `src/lib/commercial/sample-sprints/store.ts` (consumer del payload extendido si aplica)
- `src/lib/commercial/sample-sprints/health.ts` (extender 6 helpers con parametro opcional `tenantContext`)
- `src/lib/commercial/sample-sprints/health.test.ts` (regression con tenantContext provisto vs undefined)
- `src/lib/commercial-cost-attribution/v2-reader.ts` (extender con `byServiceId` segun Checkpoint A)
- `src/lib/commercial-cost-attribution/v2-reader.test.ts` (regression del modo nuevo)
- `src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.ts` (nuevo, consumer reactivo)
- `src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.test.ts` (nuevo)
- `src/lib/reliability/queries/sample-sprint-projection-degraded.ts` (nuevo)
- `src/lib/reliability/queries/get-reliability-overview.ts` (extender con signal nuevo)
- `src/app/api/agency/sample-sprints/route.ts` (extender payload con `runtime` field segun Checkpoint C)
- `src/app/api/agency/sample-sprints/[serviceId]/route.ts`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx` (eliminar lineas 140-245 client-side derivations)
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.tsx`
- `src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.test.tsx`
- `src/lib/copy/agency.ts` (extender `GH_AGENCY.sampleSprints` con degraded states copy)
- `docs/documentation/comercial/sample-sprints.md`
- `docs/manual-de-uso/comercial/sample-sprints.md`
- `CLAUDE.md` (canonizar Hard Rules para que agentes/tasks futuros hereden)

## Current Repo State

### Already exists

- Runtime real `/agency/sample-sprints` y rutas hijas `new`, `[serviceId]`, `approve`, `progress`, `outcome`.
- API list/detail/mutations bajo `src/app/api/agency/sample-sprints/**`.
- Store server-side que lista y declara Sample Sprints usando `services`, `engagement_approvals`, `engagement_progress_snapshots`, `engagement_outcomes` y audit log.
- Helpers canonicos para approval, progress, outcome, conversion, audit/outbox, eligibility y Commercial Health.
- UI runtime reutiliza el shell visual aprobado en `SampleSprintsExperienceView`.

### Gap

- `SampleSprintsWorkspace` deriva `progressPct`, `actualClp`, `team`, `signal` y health cards localmente.
- El command center no consume una proyeccion server-side única; cada pieza interpreta estado parcial.
- `actualClp` aparece como `0` aunque `commercial_cost_attribution_v2` ya puede agrupar costos por `service_id`.
- La tabla de approval muestra equipo/capacidad desde un placeholder visual, no desde `proposedTeam` + capacity checker real.
- Las señales visibles del workspace son parecidas, pero no identicas, a Commercial Health: falta source-of-truth explicito y degraded state si los readers fallan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Pre-implementation checkpoints (binary gates antes de Plan)

Estos checkpoints son obligatorios antes de iniciar Plan/Discovery. Cada uno produce una decision binaria que cambia el shape de slices posteriores.

- **Checkpoint A — Reader `actualClp byServiceId`**: el helper canonico actual `readCommercialCostAttributionByClientForPeriodV2` (`src/lib/commercial-cost-attribution/v2-reader.ts:84-195`) agrega por **cliente para periodo**, NO por `service_id`. Decidir entre:
  - **Recomendado**: extender el reader con un modo `byServiceId` opcional (single source of truth, evita duplicar SQL contra `commercial_cost_attribution_v2`).
  - Crear sibling `readCommercialCostAttributionByServiceForPeriod` reutilizando misma VIEW.
  - Read VIEW directo desde la projection (rechazado: acoplamiento alto, viola "VIEW canonica + helper" pattern).
- **Checkpoint B — Scope de health helpers**: los 6 helpers en `src/lib/commercial/sample-sprints/health.ts:64-182` son global-scope (no tenant). Decidir:
  - **Recomendado**: agregar parametro opcional `{ tenantContext?: TenantContext }` con default `undefined` -> comportamiento global preservado (backward compat 100% para `/admin/ops-health`); cuando `tenantContext` provisto, scope a `space_id IN (...)`.
  - Crear variants paralelas (rechazado: duplicacion).
- **Checkpoint C — API shape**: la projection vive en payload existente o en endpoint nuevo `/api/agency/sample-sprints/runtime`. **Recomendado**: payload existente (consumer unico: server component del workspace). Endpoint nuevo solo si emerge un segundo consumer real.
- Documentar la decision tomada en cada checkpoint en el PR description antes de iniciar Slice 1.

### Slice 1 — Server-side runtime projection (mirror del pattern TASK-611)

- Crear primitive `src/lib/commercial/sample-sprints/runtime-projection.ts` que abre con `import 'server-only'` (enforce: NUNCA importable desde cliente). Pattern fuente: `src/lib/organization-workspace/projection.ts:1-160`.
- Reutilizar `listSampleSprints`, `getSampleSprintDetail`, `getApprovalForService`, `listSnapshotsForService`, `getOutcomeForService` y el reader extendido del Checkpoint A. NUNCA duplicar SQL en componentes.
- Definir tipos explicitos para:
  - item resumido del command center
  - detalle de selected sprint
  - health/signal summary
  - degraded reasons enum cerrado: `cost_attribution_unavailable | commercial_health_unavailable | capacity_unresolvable | progress_snapshot_missing | team_enrichment_failed`
- Cache TTL 30s in-memory por subject (mirror TASK-611). Helper `clearProjectionCacheForService(serviceId)` exportado para invalidation reactiva (Slice 6).
- Composer pattern: cada source via `withSourceTimeout(produce, { source, timeoutMs })` para que una fuente caida produzca `degraded[]` + baja `confidence` en lugar de 5xx. Pattern fuente: `src/lib/platform-health/with-source-timeout.ts`.
- Mantener compat API: el payload se inserta en la respuesta existente del API (Checkpoint C); consumers actuales no rompen.

### Slice 2 — Real metrics: progress, cost and conversion

- Reemplazar `progressPct` heuristico (`SampleSprintsWorkspace.tsx:140-147` switch hardcoded) por regla canonica:
  - si hay outcome terminal, `100`
  - si el ultimo snapshot trae `deliveryProgressPct` valido (`0..100`, numerico), usarlo
  - si falta snapshot, devolver `null` y la UI muestra "sin progreso registrado" (NO porcentaje inventado, NO `0` silente).
- Poblar `actualClp` via el reader extendido del Checkpoint A: `commercial_cost_attribution_v2` agrupado por `service_id`, filtrado por lanes `attribution_intent IN ('pilot','trial','poc','discovery')` cuando aplique.
- Si el reader falla, marcar `degraded.push({ source: 'cost_attribution', code: 'cost_attribution_unavailable', message: '...' })` y dejar `actualClp = null` (UI muestra "—" + estado degraded). NUNCA `actualClp = 0` placeholder silencioso (`SampleSprintsWorkspace.tsx:184` hoy).
- Exponer `budgetUsagePct` server-side con manejo de division por cero: si `expectedInternalCostClp === 0`, devolver `null`.
- Recalcular conversion rate desde outcomes reales del payload o desde reader canonico (`getCommercialEngagementConversionRateSnapshot` en `src/lib/commercial/sample-sprints/health.ts:161-182`); NO mantener tasa hardcodeada en el componente runtime.

### Slice 3 — Team and capacity projection

- Mostrar equipo desde `commitment_terms_json.proposedTeam` enriquecido con `greenhouse_core.members.display_name` y `members.role_title` (LEFT JOIN inline en la projection o helper dedicado `enrichProposedTeam(proposedTeam)`).
- Hoy el store extrae `proposedTeam` (`store.ts:178-195`) pero NO enriquece. La projection es el unico lugar canonico para hacer el JOIN — NUNCA en componentes React.
- Si un `proposedTeam.memberId` no resuelve contra `members` (member archivado, ID stale), preservar `memberId` con flag `unresolved=true` y agregar warning a `degraded[]` con code `team_enrichment_failed` (severity warning, no error).
- Para approval, usar capacity checker real cuando el Sprint tenga fechas + equipo suficiente. Si no hay equipo propuesto o no se puede calcular capacidad, devolver `capacityRisk: null` y la UI muestra empty state honesto. NO derivar de disponibilidad mockeada del cliente (`teamFromItem(item)` en `SampleSprintsWorkspace.tsx:165-171` queda eliminado).
- `hasCapacityRisk` queda como derivacion server-side: `capacityRisk?.severity === 'critical'`. Si `capacityRisk === null`, `hasCapacityRisk` es `null` (no `false` silente).

### Slice 4 — Commercial Health alignment (tenant-scoped via Checkpoint B)

- Reconciliar las senales del command center con los 6 helpers en `src/lib/commercial/sample-sprints/health.ts:64-182` y los 8 readers en `src/lib/reliability/queries/engagement-*.ts`.
- Aplicar la decision tomada en Checkpoint B (Slice 0): extender los 6 helpers con parametro opcional `{ tenantContext?: TenantContext }` con default `undefined`.
  - Cuando `tenantContext` provisto: filtrar por `space_id IN (tenant.spaceIds)` (o equivalente segun el SQL real de cada helper).
  - Cuando `undefined`: comportamiento global preservado. `/admin/ops-health` y todos los consumers actuales no rompen.
- La projection invoca los helpers con `tenantContext` resuelto del subject. NUNCA invoca el global desde la surface comercial.
- Mapear los signals del command center a los `kind` canonicos de Commercial Health: `overdue-decision | budget-overrun | zombie | unapproved-active | stale-progress | conversion-rate-drop`. Reusar el shape `ReliabilitySignal` de `src/lib/reliability/queries/engagement-*.ts`.
- Reemplazar `buildRuntimeSignals(item)` (`SampleSprintsWorkspace.tsx:194-245`) por consumo del payload `signals[]` projected. NUNCA derivar severity client-side por status enum.
- Cuando un health helper falla, agregar a `degraded[]` con code `commercial_health_unavailable` (severity warning) y la UI muestra "Senales no disponibles" en lugar de senales estables falsas.

### Slice 5 — UI adoption, copy hygiene y DataTableShell

- Reducir `SampleSprintsWorkspace` (`src/views/greenhouse/agency/sample-sprints/SampleSprintsWorkspace.tsx`) a loader + render del payload proyectado; **eliminar** `getProgressPct`, `teamFromItem`, `buildRuntimeSignals` (lineas 140-245). El componente solo lee `payload.items[]`, `payload.selected`, `payload.signals[]`, `payload.degraded[]`.
- Mantener `SampleSprintsExperienceView` como shell visual, pero extender `GH_AGENCY.sampleSprints` en `src/lib/copy/agency.ts:9-232` con copy de degraded states (cost_attribution_unavailable, commercial_health_unavailable, capacity_unresolvable, progress_snapshot_missing, team_enrichment_failed). NUNCA hardcodear strings en JSX.
- Revisar empty/loading/error/degraded states para command, approval, progress y outcome. Diferenciar 4 estados: `loading | ready | empty | degraded` — degraded NO equivale a empty.
- **DataTableShell migration (TASK-743)**: si el workspace renderiza tablas con > 8 columnas o celdas editables inline, envolver en `<DataTableShell>` (`src/components/greenhouse/data-table/DataTableShell.tsx`). La lint rule `greenhouse/no-raw-table-without-shell` puede bloquear el commit si no se migra.
- Asegurar que tabs internas y rutas directas (`/new`, `/[serviceId]/approve`, `/progress`, `/outcome`) renderizan datos coherentes despues de mutaciones (gracias a la cache invalidation reactiva de Slice 6).
- Revisar la microcopy con la skill `greenhouse-ux-writing` antes de mergear (regla canonica TASK-265).

### Slice 6 — Reactive cache invalidation, reliability signal y tests

#### Reactive cache invalidation (mirror TASK-611 pattern)

Registrar consumer reactivo `sampleSprintRuntimeProjectionCacheInvalidation` en `src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.ts` que escucha estos outbox events y dropea el cache scoped al `service_id` afectado:

- `commercial.sample_sprint.declared`
- `engagement.approval.recorded`
- `engagement.progress.snapshot.recorded`
- `engagement.outcome.recorded`
- `commercial.service_engagement.lifecycle_changed v1` (TASK-836)
- `commercial.engagement.team_assignment_changed` si emerge en futuro

Idempotente. Cero side effects beyond cache drop. Pattern fuente: `src/lib/sync/projections/organization-workspace-cache-invalidation.ts`.

#### Reliability signal canonico

- `commercial.sample_sprint.projection_degraded` (kind=drift, severity=warning si count>0, steady=0). Reader cuenta services con projection failures recientes (last 5 min) en algun `degraded[]` con severity error. Subsystem rollup `commercial`. Wire-up en `getReliabilityOverview`.

#### Tests

- Agregar tests unitarios para la projection (`runtime-projection.test.ts`) cubriendo:
  - shape del payload con todas las fuentes OK
  - cada `degraded[]` reason individualmente
  - cache hit / cache miss / cache invalidation por outbox event
  - `tenantContext` provisto vs `undefined` (path scoped vs global)
  - team enrichment con member resoluble y unresolved
  - `progressPct` cuando outcome terminal / snapshot valido / sin snapshot
  - `actualClp` cuando reader OK / reader falla
- Agregar/actualizar tests de `SampleSprintsExperienceView.test.tsx`:
  - costo real distinto de cero (UI muestra valor proyectado)
  - sprint sin snapshots muestra estado honesto (no `0%` inventado)
  - equipo propuesto real aparece en approval con display_name + role_title
  - degraded health no se renderiza como estable (banner visible + signals omitidos)
  - cache miss resincroniza correctamente
- Test focal para que el API list/detail exponga payload con shape canonico (Checkpoint C resuelve si es endpoint nuevo o payload existente).
- Test reactive consumer: emit outbox event mock, verificar que `clearProjectionCacheForService` se invoca con `serviceId` correcto.
- Ejecutar smoke manual o Playwright autenticado sobre `/agency/sample-sprints` si hay sesion local/staging disponible.

## Out of Scope

- No crear nuevas tablas Sample Sprints.
- No cambiar el state machine de `engagement_approvals`.
- No automatizar emails o notificaciones cliente V2.
- No escribir a HubSpot al declarar o cerrar Sample Sprints.
- No rediseñar visualmente el mockup aprobado salvo ajustes mínimos necesarios para estados degraded/empty.
- No cambiar routeGroups, startup policy ni el access model base salvo hallazgo bloqueante en Discovery.

## Detailed Spec

La proyeccion debe vivir server-side y ser la **unica capa** que traduce datos de dominio a los campos que la UI necesita. Nombre canonico: `src/lib/commercial/sample-sprints/runtime-projection.ts` con `import 'server-only'` al inicio (mirror TASK-611). NO integrar en `store.ts`: separar mantiene single responsibility y permite tests focales.

### Pattern fuente

Mirror exacto de `src/lib/organization-workspace/projection.ts:1-160` (TASK-611):

- `import 'server-only'` enforce
- Cache TTL 30s in-memory por subject (`buildProjectionCacheKey + readProjectionFromCache + writeProjectionToCache`)
- Composer pattern via `withSourceTimeout(produce, { source, timeoutMs })` (`src/lib/platform-health/with-source-timeout.ts`) para que una fuente caida produzca `degraded[]`, NUNCA 5xx
- Reactive cache invalidation via outbox consumer (Slice 6)
- `clearProjectionCacheForService(serviceId)` exportado para invalidation
- Reliability signal de degradation (Slice 6)

### Shape canonica

```ts
type SampleSprintRuntimeProjection = {
  items: SampleSprintRuntimeItem[]
  selected: SampleSprintRuntimeDetail | null
  signals: SampleSprintRuntimeSignal[]
  options?: SampleSprintOptions
  degraded: SampleSprintProjectionDegradedReason[]
  generatedAt: string // iso8601 — ayuda al cliente a saber edad del payload
  contractVersion: 'sample-sprint-runtime.v1'
}

type SampleSprintProjectionDegradedReason = {
  code:
    | 'cost_attribution_unavailable'
    | 'commercial_health_unavailable'
    | 'capacity_unresolvable'
    | 'progress_snapshot_missing'
    | 'team_enrichment_failed'
  message: string
  source: 'cost_attribution' | 'commercial_health' | 'capacity' | 'progress' | 'team'
  severity: 'warning' | 'error'
}
```

`degraded` es enum cerrado de `code` (no string libre). Pattern fuente: TASK-742 (auth resilience signals).

### Reglas de derivacion canonicas

| Campo | Regla | Source of truth | Fallback honesto |
| --- | --- | --- | --- |
| `actualClp` | Reader extendido del Checkpoint A: `commercial_cost_attribution_v2` por `service_id` | `src/lib/commercial-cost-attribution/v2-reader.ts` (extendido) | `null` + degraded `cost_attribution_unavailable`. NUNCA `0` silente. |
| `progressPct` | Si outcome terminal -> `100`. Si snapshot valido -> snapshot. Si no -> `null` | `engagement_progress_snapshots` + `engagement_outcomes` | `null` + degraded `progress_snapshot_missing` |
| `budgetUsagePct` | `actualClp / expectedInternalCostClp * 100`, division por cero -> `null` | derivado | `null` |
| `team` | LEFT JOIN `commitment_terms_json.proposedTeam` × `members` por `member_id` | `services.commitment_terms_json` + `greenhouse_core.members` | `unresolved=true` flag por miembro + degraded `team_enrichment_failed` (warning) |
| `capacityRisk` | Capacity checker canonico cuando team + fechas suficientes | helper canonico de capacity (Discovery confirma cual) | `null` + degraded `capacity_unresolvable` |
| `signals[]` | 6 helpers de `health.ts` con `tenantContext` provisto (Checkpoint B) | `src/lib/commercial/sample-sprints/health.ts` | `[]` + degraded `commercial_health_unavailable` |
| `conversionRate` | `getCommercialEngagementConversionRateSnapshot(tenantContext)` | `src/lib/commercial/sample-sprints/health.ts:161-182` | `null` + degraded `commercial_health_unavailable` |

### Cache + invalidation contract

- Cache key: `(subjectId, tenantId)` — TTL 30s.
- Invalidation reactiva (Slice 6) via 5 outbox events que llaman `clearProjectionCacheForService(serviceId)`. Ese helper droppea TODAS las entradas de cache que mencionen el `service_id` (no solo el subject que lo declaro), porque otros subjects del mismo tenant ven el mismo sprint.
- Sin invalidation reactiva, el operador podia ver datos stale 30s despues de aprobar/recordar progreso/cerrar outcome. Inaceptable para UX comercial.

### API shape (Checkpoint C)

**Recomendado**: payload existente de `GET /api/agency/sample-sprints` se extiende con campo `runtime: SampleSprintRuntimeProjection`. Backward compat: clients viejos ignoran `runtime`, clients nuevos lo consumen. Endpoint nuevo `/api/agency/sample-sprints/runtime` solo si emerge segundo consumer real (Mi Greenhouse, command palette, etc.). NO crearlo preventivo.

### Health alignment con `commercial.engagement.*`

Los `signal.kind` de la projection mapean 1:1 a los `kind` de Commercial Health:

| Projection signal kind | Commercial Health helper |
| --- | --- |
| `overdue-decision` | `countCommercialEngagementOverdueDecision` |
| `budget-overrun` | `countCommercialEngagementBudgetOverrun` |
| `zombie` | `countCommercialEngagementZombie` |
| `unapproved-active` | `countCommercialEngagementUnapprovedActive` |
| `stale-progress` | `countCommercialEngagementStaleProgress` |
| `conversion-rate-drop` | `getCommercialEngagementConversionRateSnapshot` |

NUNCA inventar `kind` nuevos en la projection. Si emerge necesidad, primero canonizarlo en Commercial Health, despues consumirlo aqui.

## Hard Rules (invariantes anti-regresion)

Reglas duras canonizadas por esta task. Cualquier futura task o agente que toque `/agency/sample-sprints`, la projection runtime o los helpers de health debe respetarlas:

- **NUNCA** derivar `progressPct`, `actualClp`, `team`, `capacityRisk`, `signals` ni health cards en componentes React. Toda derivacion pasa por `runtime-projection.ts`.
- **NUNCA** importar la projection desde codigo cliente. Enforce con `import 'server-only'` al inicio del modulo.
- **NUNCA** consumir `commercial_cost_attribution_v2` directo en componentes. Siempre via reader canonico (extender `v2-reader.ts` con `byServiceId` o sibling, NUNCA inline SQL en projection).
- **NUNCA** mostrar `0` literal cuando un valor no se pudo computar. Usar `null` + degraded honesto. UI distingue tres estados: `loading | ready | degraded`.
- **NUNCA** derivar severity de signals client-side por status enum (`buildRuntimeSignals` queda eliminado). Severity viene del helper canonico server-side.
- **NUNCA** mostrar equipo desde `client.organizationName` o `space.spaceName`. El team es `proposedTeam` enriquecido con `members.display_name`.
- **NUNCA** invocar los 6 health helpers de `health.ts` con scope global desde la surface comercial. Usar siempre `tenantContext` resuelto del subject. Solo `/admin/ops-health` (path admin) consume global.
- **NUNCA** inventar `kind` de signal nuevos en la projection. Mapear 1:1 a los 6 kinds canonicos de Commercial Health.
- **NUNCA** escribir literals de copy en JSX. Extender `GH_AGENCY.sampleSprints` en `src/lib/copy/agency.ts`.
- **NUNCA** crear `<Table>` MUI con > 8 columnas o celdas editables inline sin envolver en `<DataTableShell>` (TASK-743).
- **NUNCA** crear endpoint nuevo `/api/agency/sample-sprints/runtime` preventivo sin segundo consumer demostrado.
- **SIEMPRE** que un outbox event afecte el sprint (declared / approval / progress / outcome / lifecycle_changed), invalidar cache scoped al `service_id` via consumer reactivo registrado.
- **SIEMPRE** emitir signal `commercial.sample_sprint.projection_degraded` cuando un reader downstream falla con severity error.
- **SIEMPRE** que emerja un nuevo `degraded.code`, agregarlo al enum cerrado en `SampleSprintProjectionDegradedReason` antes de mergear; NUNCA string libre.
- **SIEMPRE** revisar la microcopy con `greenhouse-ux-writing` antes de mergear (TASK-265).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Pre-implementation checkpoints A/B/C ejecutados y resultados documentados en PR description antes de Slice 1.
- [ ] `/agency/sample-sprints` ya no depende de heuristicas client-side para `progressPct`, `actualClp`, team/capacity ni health signals (lineas 140-245 de `SampleSprintsWorkspace.tsx` eliminadas).
- [ ] Existe `src/lib/commercial/sample-sprints/runtime-projection.ts` con `import 'server-only'` al inicio y mirror de pattern TASK-611.
- [ ] Cache TTL 30s in-memory por subject implementado con helpers `buildProjectionCacheKey + readProjectionFromCache + writeProjectionToCache + clearProjectionCacheForService`.
- [ ] Reader `actualClp byServiceId` implementado segun decision Checkpoint A (extension de `v2-reader.ts` o sibling).
- [ ] Costo real por Sample Sprint viene de `commercial_cost_attribution_v2` o muestra `degraded.code='cost_attribution_unavailable'`; NUNCA se fuerza `0` como placeholder silencioso.
- [ ] Progreso viene de snapshots reales o muestra `degraded.code='progress_snapshot_missing'` honesto.
- [ ] Approval muestra `proposedTeam` enriquecido con `display_name` + `role_title` desde `members`.
- [ ] `capacityRisk` calculado por helper canonico cuando hay datos suficientes; `null` + degraded `capacity_unresolvable` cuando no.
- [ ] Senales visibles mapean 1:1 a los 6 kinds canonicos de Commercial Health (`overdue-decision | budget-overrun | zombie | unapproved-active | stale-progress | conversion-rate-drop`).
- [ ] Health helpers extendidos con parametro opcional `tenantContext` (Checkpoint B); `/admin/ops-health` no rompe (backward compat verificado).
- [ ] `degraded[]` usa enum cerrado de `code`, NUNCA string libre.
- [ ] Reactive cache invalidation: 5 outbox events disparan `clearProjectionCacheForService(serviceId)` via consumer registrado.
- [ ] Reliability signal `commercial.sample_sprint.projection_degraded` wired y verificado con steady=0.
- [ ] Copy reusable nuevo vive en `src/lib/copy/agency.ts` (`GH_AGENCY.sampleSprints` extendido); cero literals en JSX.
- [ ] DataTableShell (TASK-743) aplicado al workspace si renderiza tablas con > 8 columnas o celdas editables inline.
- [ ] Tests focales cubren projection (cache hit/miss/invalidation, cada degraded reason, tenantContext provisto vs undefined), UI states (4 estados), API payload (shape canonico) y reactive consumer.
- [ ] Hard Rules (invariantes anti-regresion) reflejadas en CLAUDE.md o doc canonico equivalente al cierre.
- [ ] Microcopy revisada con skill `greenhouse-ux-writing` antes de mergear (TASK-265).

## Verification

- Pre-implementation checkpoint reports persistidos: reader strategy (Checkpoint A), tenant scope decision (Checkpoint B), API shape decision (Checkpoint C).
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm test src/views/greenhouse/agency/sample-sprints/SampleSprintsExperienceView.test.tsx`
- `pnpm test src/lib/commercial/sample-sprints` (incluye `runtime-projection.test.ts` nuevo)
- `pnpm test src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.test.ts` (nuevo, reactive consumer)
- `pnpm test src/lib/reliability/queries` para signal nuevo `projection_degraded`
- `pnpm test src/lib/commercial-cost-attribution` (regression del reader extendido)
- `pnpm design:lint`
- Test integracion: emit outbox event mock para cada uno de los 5 events trigger; verificar que `clearProjectionCacheForService` se invoca con `serviceId` correcto e idempotente.
- Test integracion: simular falla del reader cost_attribution; verificar `degraded.code='cost_attribution_unavailable'` + UI muestra "—" (no `$0`).
- Test integracion: simular tenantContext provisto vs undefined contra los 6 health helpers; verificar paridad con `/admin/ops-health` cuando undefined (backward compat).
- Smoke manual o Playwright autenticado en `/agency/sample-sprints`, `/agency/sample-sprints/new`, `/agency/sample-sprints/[serviceId]/approve`, `/progress`, `/outcome` cuando haya dataset/sesion disponible.
- Verificar reliability dashboard `/admin/operations` post-deploy: signal `commercial.sample_sprint.projection_degraded` visible con steady=0.

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] `docs/documentation/comercial/sample-sprints.md` y `docs/manual-de-uso/comercial/sample-sprints.md` quedaron sincronizados si cambia el comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-807`, `TASK-809`, `TASK-810`, `TASK-815`, `TASK-611` (pattern fuente projection) y `TASK-743` (DataTableShell)
- [ ] Hard Rules canonizadas en `CLAUDE.md` para que agentes/tasks futuros hereden las reglas
- [ ] Reliability signal `commercial.sample_sprint.projection_degraded` wired en `getReliabilityOverview` con steady-state esperado documentado
- [ ] Reactive consumer `sampleSprintRuntimeProjectionCacheInvalidation` registrado y verificado contra los 5 events trigger
- [ ] Pre-implementation checkpoint reports (A/B/C) persistidos en PR description

## Follow-ups

- Crear fixture E2E dedicada que declare, apruebe, registre progreso y cierre un Sample Sprint con cleanup transaccional si esta task descubre que falta dataset estable.
- Evaluar reporte final auto-generado V2 desde snapshots + outcome metrics; fuera de alcance de este hardening.

## Delta 2026-05-08

### Creacion (2026-05-08)

Task creada desde revision de runtime solicitada por el usuario. Gap principal observado: la foundation backend esta completa, pero la surface todavia mezcla payload real con derivaciones locales para progress/cost/team/health; esta task documenta el hardening para hacerlo mas robusto, seguro, resiliente y escalable.

### Hardening pre-implementation (2026-05-08)

Task endurecida tras audit codebase contrastando claims contra estado real del repo. Las 12 claims iniciales (heuristicas client-side + readers ausentes + signals globales) fueron **validadas con citas line-level**:

- `progressPct` switch hardcoded en `SampleSprintsWorkspace.tsx:140-147`
- `actualClp = 0` literal en `SampleSprintsWorkspace.tsx:184`
- `team` derivado de `client.organizationName` en `SampleSprintsWorkspace.tsx:165-171`
- `buildRuntimeSignals` con severity hardcoded en `SampleSprintsWorkspace.tsx:194-245`
- 6 health helpers en `src/lib/commercial/sample-sprints/health.ts:64-182` global-scope
- `commercial_cost_attribution_v2` reader es `byClient`, NO `byServiceId` (gap real)
- Pattern fuente canonizado: `src/lib/organization-workspace/projection.ts:1-160` (TASK-611)
- `GH_AGENCY.sampleSprints` ya existe en `src/lib/copy/agency.ts:9-232`
- `DataTableShell` (TASK-743) aplica al render del workspace

Cambios introducidos en este hardening:

1. **Slice 0 nuevo**: 3 pre-implementation checkpoints (A: reader strategy `byServiceId`, B: tenant scope health helpers, C: API shape) que deben resolverse ANTES de Plan/Discovery.
2. **`import 'server-only'` enforce + cache TTL 30s** mirror exacto TASK-611 pattern (Slice 1).
3. **Reader extension explicita**: extender `v2-reader.ts` con `byServiceId` opcional resuelve el gap real detectado en audit.
4. **Tenant scope resoluto via parametro opcional**: backward compat 100% para `/admin/ops-health`.
5. **Reactive cache invalidation (Slice 6 nuevo)**: 5 outbox events trigger `clearProjectionCacheForService(serviceId)` via consumer registrado. Pattern fuente: `src/lib/sync/projections/organization-workspace-cache-invalidation.ts`.
6. **Reliability signal canonico**: `commercial.sample_sprint.projection_degraded` wired en `getReliabilityOverview`.
7. **Health alignment 1:1**: signals mapean a los 6 kinds canonicos de Commercial Health (`overdue-decision | budget-overrun | zombie | unapproved-active | stale-progress | conversion-rate-drop`); NUNCA inventar kinds nuevos.
8. **`degraded[]` enum cerrado**: 5 codes canonicos (`cost_attribution_unavailable | commercial_health_unavailable | capacity_unresolvable | progress_snapshot_missing | team_enrichment_failed`); NUNCA string libre.
9. **DataTableShell migration explicita** (TASK-743): si el workspace renderiza tablas con > 8 columnas o celdas editables inline.
10. **Hard Rules section nueva**: 15 invariantes anti-regresion canonizadas en CLAUDE.md.
11. **Files owned + Acceptance Criteria + Verification + Closing Protocol** sincronizados con todos los puntos anteriores.

Patterns fuente: TASK-611 (organization-workspace projection), TASK-742 (degraded enum cerrado), TASK-743 (DataTableShell), TASK-771/773 (outbox-driven invalidation), TASK-265 (microcopy hygiene).

Razon: aplicar el 4-pillar contract llevo el score de la task de 7.5/10 promedio a 9/10 antes de implementacion. Sin estos ajustes, la implementacion podria:

- Recomputar SQL contra `commercial_cost_attribution_v2` directamente desde la projection (acoplamiento alto, viola "VIEW canonica + helper")
- Mostrar datos stale 30s post-mutacion sin invalidacion reactiva
- Fragmentar el shape `degraded[]` con codes ad-hoc por caller
- Inventar `kind` de signals nuevos en la projection en lugar de mapear a Commercial Health canonico

## Delta 2026-05-09 — Implementacion completa

Task implementada end-to-end en `develop` (sin checkout a branch nueva, por instruccion explicita del usuario). 6 slices commiteados incrementalmente:

- **Slice 1** (commit `67145f94`) — Projection skeleton + cache + tipos. 11 tests verdes.
- **Slice 2** (commit `46702635`) — Sibling reader `readCommercialCostAttributionByServiceForPeriodV2` + projection wiring. +5 reader tests + 2 projection tests.
- **Slice 3** (commit `25374c5f`) — `enrichProposedTeam` + `resolveCapacityRiskForSprint` helpers. +12 tests + 2 projection wiring.
- **Slice 4** (commit `9eed3164`) — 6 health helpers extendidos con `tenantContext` opcional + signals mapping 1:1. +11 scope tests + 4 projection wiring. Backward compat 100% verificado contra `engagement-commercial-health.test.ts` (5) + `engagement-stale-progress.test.ts` (6).
- **Slice 5** (commit `c8b99414`) — UI consume runtime projection. Eliminadas 4 derivativas client-side. `Sprint.actualClp/progressPct: number | null` honest. Banner `Alert role='status'` con copy desde `GH_AGENCY.sampleSprints.degraded.<code>`. API endpoints adjuntan `runtime` field. Skills `greenhouse-ux + greenhouse-microinteractions-auditor + greenhouse-ux-writing` invocadas ANTES de tocar JSX (instruccion del usuario).
- **Slice 6** (commit `47b33a2d`) — Reactive consumer `sampleSprintRuntimeCacheInvalidationProjection` + reliability signal `commercial.sample_sprint.projection_degraded`. 11 tests verdes.

Decisiones de Slice 0 documentadas en commits + audit report:

- **Checkpoint A**: sibling reader (no extension del byClient) — single source of truth via SQL builder compartido contra la VIEW canonica.
- **Checkpoint B**: parametro opcional `{tenantContext?}` con default `undefined` — backward compat 100% para `/admin/ops-health`.
- **Checkpoint C**: payload existente extendido con `runtime` field (NO endpoint nuevo) — single consumer demostrado.
- **Q4 (no en spec original)**: 6 outbox events reales `service.engagement.{declared, approved, rejected, capacity_overridden, progress_snapshot_recorded, outcome_recorded}`. La spec original mencionaba nombres conceptuales que no matcheaban event_type real.
- **Q5 (no en spec original)**: convencion canonica `metrics_json.deliveryProgressPct: number ∈ [0,100]` documentada en CLAUDE.md + manual de uso. El wizard `RuntimeProgressWizard` ya escribe esa key.

Verificacion final:

- Tests: 86/86 verdes en sample-sprints + shell (Slices 1-5) + 11/11 en Slice 6 (consumer + signal). Backward compat verificado en 11 tests pre-existentes de health helpers.
- `npx tsc --noEmit` clean en todos los archivos TASK-835.
- `eslint` clean (incluye `greenhouse/no-untokenized-copy`).
- Lint rule `no-untokenized-copy` no genera nuevos warnings — toda copy reusable vive en `GH_AGENCY.sampleSprints.degraded.*`.

Cierre lifecycle:

- Hard Rules canonizadas en CLAUDE.md seccion nueva "Sample Sprints Runtime Projection invariants (TASK-835)" (13 reglas duras + convencion `metrics.deliveryProgressPct`).
- Doc funcional `docs/documentation/comercial/sample-sprints.md` v1.1 (seccion "Runtime projection" agregada).
- Manual de uso `docs/manual-de-uso/comercial/sample-sprints.md` v1.1 (6 nuevas filas en troubleshooting).
- `Handoff.md` con cierre completo.
- `changelog.md` 2026-05-09 con entrada visible.

DataTableShell (TASK-743): no aplica — el SampleSprintsWorkspace usa Stack/Card layout con sub-listas, no `<Table>` MUI con > 8 columnas. Verificado.

Cero modificacion a archivos owned por TASK-841 (nubox/ops-worker) — preservados intactos en el workspace durante la sesion paralela.
