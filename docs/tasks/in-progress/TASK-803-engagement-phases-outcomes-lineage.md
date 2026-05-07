# TASK-803 — Engagement Phases + Outcomes + Lineage

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial`
- Blocked by: `TASK-801`
- Branch: `develop` (por instrucción explícita del usuario; no crear branch task)

## Summary

3 tablas core del modelo: `engagement_phases` (hitos del Sprint con phase_kind canónico), `engagement_outcomes` (decisión final con 5 valores incluyendo cancellation paths + `next_quotation_id` para pricing post-conversión), `engagement_lineage` (grafo multi-parent/multi-child de transiciones). Helpers TS para CRUD + state machine helpers.

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- Esta task no implementa UI, pero sus helpers/contratos deben alimentar la experiencia aprobada sin forzar reinterpretación visual posterior.

## Why This Task Exists

Sin estas 3 tablas, no existe la primitiva operativa del Sample Sprint: cómo organizar fases (kickoff → operation → reporting → decision), cómo cerrar con outcome (incluyendo cancellation early), cómo linkear Sprint → contrato post-conversión. La spec V1.2 establece phases como reusable más allá de Sprints (cualquier service con hitos discretos puede usarlas).

## Goal

- 3 tablas creadas con DDL canónica (§3.2 Capas 3, 4, 5).
- `outcome_kind` enum incluye 5 valores: `converted | adjusted | dropped | cancelled_by_client | cancelled_by_provider`.
- CHECK constraint anti-cancellation-sin-reason: `cancellation_reason ≥ 10 chars` cuando outcome es cancellation.
- `engagement_lineage` UNIQUE (parent, child, kind) previene duplicados.
- Helpers TS para: declarar fase, completar fase, registrar outcome, registrar lineage.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capas 3, 4, 5.

Patrones canónicos:

- TASK-721 — `engagement_outcomes.report_asset_id` FK al canonical asset uploader.
- TASK-760/761/762 — FK actor pattern.
- TASK-700/765 — `UNIQUE (service_id)` en outcomes (terminal).

Reglas obligatorias:

- `phase_kind` enum: `kickoff | operation | reporting | decision | custom`.
- `outcome_kind` enum: 5 valores incluyendo cancellation paths.
- CHECK `cancellation_reason ≥ 10 chars` cuando outcome es cancellation.
- `decision_rationale ≥ 10 chars` SIEMPRE.
- `transition_reason ≥ 10 chars` SIEMPRE en lineage.
- `next_quotation_id` FK opcional a `quotations` (pricing post-conversión, Delta v1.2).

## Slice Scope

DDL (de §3.2 Capas 3-5):

```sql
CREATE TABLE greenhouse_commercial.engagement_phases (...);
CREATE TABLE greenhouse_commercial.engagement_outcomes (...);
CREATE TABLE greenhouse_commercial.engagement_lineage (...);
```

Índices canónicos (§3.4):

```sql
CREATE INDEX engagement_lineage_parent_idx ...;
CREATE INDEX engagement_lineage_child_idx ...;
CREATE INDEX engagement_outcomes_decision_idx ...;
CREATE INDEX engagement_outcomes_next_service_idx ...;
```

Helpers TS (`src/lib/commercial/sample-sprints/`):

- `phases.ts` — `declarePhase`, `completePhase`, `listPhasesForService`
- `outcomes.ts` — `recordOutcome`, `getOutcomeForService`
- `lineage.ts` — `addLineage`, `getAncestors`, `getDescendants`

Tests:

- Unit cada helper.
- Integration: completar todas las fases + record outcome.
- Constraint: cancellation outcome sin reason → rejected.
- Constraint: lineage parent=child → rejected.
- Constraint: outcome doble por mismo service → rejected.

## Acceptance Criteria

- DDL aplicada, columnas + CHECKs + UNIQUE + FKs verificados via `information_schema`.
- `pnpm db:generate-types` actualiza tipos.
- 6 helpers TS con tests unitarios + 3 integration tests + 3 constraint enforcement tests.
- `pnpm test` verde, `pnpm lint` verde.

## Dependencies

- Blocked by: TASK-801 (services.engagement_kind), TASK-802 (engagement_commercial_terms — outcomes pueden referenciar terms del child service).
- Bloquea: TASK-804, TASK-808, TASK-809, TASK-810.

## References

- Spec: `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capas 3-5 + §3.4
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
