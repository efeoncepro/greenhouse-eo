# TASK-963 — People List Workforce Overview

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|identity|ui|data`)
- Blocked by: `TASK-961`, `TASK-962`
- Branch: `task/TASK-963-people-list-workforce-overview`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Evolucionar la lista de People desde un directorio de colaboradores hacia un overview workforce persona-centrico: status, worker type, pais, assignment, manager, payment rail, compensation coverage y readiness/gaps.

Esta task materializa en la lista lo que `TASK-961` materializa en el detalle: People es el hub operativo; Payroll, Contractor y Finance son rails especializadas.

## Why This Task Exists

El articulo de Deel describe una People List con status claro por persona, filtros por dimensiones workforce y perfiles que necesitan atencion. Greenhouse ya tiene `/people` y Person 360, pero la lista todavia no expresa de forma compacta el estado workforce cross-rail.

Sin este overview, el operador debe abrir perfiles uno por uno o saltar a Payroll/Contractor/Finance para entender si una persona esta activa, pendiente, offboarding, sin compensation, sin rail de pago o bloqueada por readiness. Eso empuja al equipo de vuelta a vistas por dominio en vez de operar desde People.

## Goal

- Mostrar en People List un resumen workforce scan-friendly por persona.
- Reusar el read model/facet de `TASK-961` y la clasificacion de gaps de `TASK-962`.
- Agregar filtros y summary cards utiles para HR/People sin recalcular payroll ni payment state.
- Mantener redaction y permisos consistentes con Person 360.

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
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- People List consume una projection/read model canonica; no hace joins raw de payroll/contractor/finance en componentes cliente.
- No mutar data. La task es read-only salvo cambios de UI/copy/tests.
- No crear roles nuevos ni roles fantasma.
- No exponer montos, provider IDs, tax IDs o datos bancarios a audiencias no autorizadas.
- No convertir Payroll en el entrypoint raiz.
- No duplicar toda la ficha persona dentro de la tabla; la lista debe ser escaneable.

## Normative Docs

- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-961` — delivers the Person 360 workforce facet/adapter shape to consume.
- `TASK-962` — classifies gap/readiness states so the list does not display false blockers.
- Existing People list runtime:
  - `src/app/(dashboard)/people/page.tsx`
  - `src/views/greenhouse/people/PeopleList.tsx`
  - `src/views/greenhouse/people/PeopleListTable.tsx`
  - `src/views/greenhouse/people/helpers.ts`
- Existing workforce foundation runtime:
  - `src/lib/workforce/foundation/object-map.ts`
  - `src/lib/workforce/foundation/object-map-types.ts`
  - `src/lib/workforce/foundation/gap-codes.ts`

### Blocks / Impacts

- Future workforce reporting and filters.
- Future API/agent workforce read surface (`TASK-652`).
- HR operational adoption of Person-first workflow.

### Files owned

- `docs/tasks/to-do/TASK-963-people-list-workforce-overview.md`
- `src/views/greenhouse/people/PeopleList.tsx`
- `src/views/greenhouse/people/PeopleListTable.tsx`
- `src/views/greenhouse/people/helpers.ts`
- `src/lib/copy/people.ts` and/or `src/lib/copy/workforce.ts`
- `scripts/frontend/scenarios/*people-list*workforce*`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- People list and People detail routes.
- Person 360 detail experience.
- WorkforceFoundationMap from `TASK-959`.
- `TASK-961` defines the detail-level workforce facet target.
- `TASK-962` defines the coverage/readiness classification pass.

### Gap

- The People list does not expose workforce status, worker type, payment rail or readiness in one scan-friendly view.
- There are no workforce summary cards on People List.
- Filters do not cover worker type, payment rail, readiness or missing compensation.
- No GVC scenario proves People List behaves well after workforce columns/cards are added.

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

### Slice 1 — Discovery and View Model

- Confirm how People List currently loads rows and access context.
- Define a list-safe `PeopleWorkforceOverviewRow` derived from the `TASK-961` facet/adapter, not raw table joins.
- Define summary metrics: active workforce, not started, offboarding, employees vs contractors, needs attention.
- Define redaction behavior for salary/payment fields.

### Slice 2 — Summary Cards and Filters

- Add compact summary cards above the list.
- Add filters for status, worker type, country, department/assignment, manager, payment rail and readiness.
- Preserve existing search/sort behavior.
- Keep layout dense and operational, not dashboard/hero-like.

### Slice 3 — Table Columns and Row States

- Add columns/chips for:
  - Person status.
  - Worker type.
  - Country/location.
  - Assignment/title.
  - Manager.
  - Payment rail.
  - Compensation state.
  - Readiness.
- Ensure long labels do not resize rows unpredictably.
- Link row drilldown to `/people/[memberId]` with the selected workforce tab/section if `TASK-961` exposes one.

### Slice 4 — Copy, Tests and GVC

- Add reusable copy to canonical copy layer.
- Add unit/component tests for row formatting, filters and redaction.
- Add GVC scenario for desktop and narrow/mobile viewport.
- Update docs and task indexes on close.

## Out of Scope

- Any workforce write path.
- Any compensation amount calculation.
- Any payroll close/receipt/payment behavior.
- Any new API Platform exposure.
- Any document/signature surface.
- Any global nav redesign.

## Detailed Spec

Expected list semantics:

```ts
type PeopleWorkforceOverviewRow = {
  memberId: string
  identityProfileId: string | null
  displayName: string
  primaryEmail: string | null
  personStatus: 'active' | 'not_started' | 'offboarding' | 'inactive' | 'unknown'
  workerType: 'employee' | 'contractor' | 'mixed' | 'none' | 'unknown'
  countryLabel: string | null
  assignmentLabel: string | null
  managerLabel: string | null
  paymentRailLabel: string
  compensationState: 'available' | 'missing' | 'redacted' | 'unknown'
  readinessState: 'ready' | 'warning' | 'blocked' | 'unknown'
  needsAttention: boolean
  gapCodes: string[]
}
```

The executing agent may adjust names after discovery, but must preserve the semantic contract.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. UI columns must not ship before the view model redaction behavior is tested.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| People List leaks sensitive comp/payment data | identity/payroll/finance/ui | medium | Redacted row model server-side + tests | Redaction test failure / review |
| Table becomes too dense or slow | ui/performance | medium | Limit columns, use existing table patterns, measure render | GVC/layout overflow, slow local render |
| False blockers create noisy operations | people/reliability | medium | Depend on `TASK-962` dispositions | High `needsAttention` count without owner |
| Payroll appears as source of truth | payroll/ui | low | Use labels as evidence/rail only, link out to Payroll | Review catches payroll-root language |

### Feature flags / cutover

Default: no flag if the change is additive and access-safe. If discovery finds a large table rewrite or access uncertainty, add a feature flag default OFF until GVC and manual review pass.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert view model helper/tests | <10 min | si |
| Slice 2 | Revert cards/filter changes | <10 min | si |
| Slice 3 | Disable flag or revert UI columns | <10 min | si |
| Slice 4 | Revert copy/scenario/docs | <10 min | si |

### Production verification sequence

1. Unit/type checks.
2. GVC desktop and narrow viewport.
3. Manual scan with HR/admin subject.
4. Manual scan with lower-privilege subject if supported.

## Acceptance Criteria

- [ ] People List shows workforce summary cards.
- [ ] Rows show person status, worker type, payment rail and readiness without raw sensitive IDs.
- [ ] Filters support status, worker type, country, payment rail and readiness.
- [ ] Missing compensation/readiness blockers are honest and not collapsed into generic empty states.
- [ ] UI consumes a canonical read model/facet/adapter, not raw table heuristics in client components.
- [ ] GVC evidence exists for desktop and narrow/mobile viewport.

## Verification

- `pnpm task:lint --task TASK-963`
- `pnpm exec tsc --noEmit --pretty false`
- Focused Vitest/component tests for People row model and UI
- `pnpm lint`
- `pnpm fe:capture <people-list-workforce-scenario> --env=local`
- `pnpm docs:context-check`
- `git diff --check`

## Closing Protocol

- [ ] Move file to `docs/tasks/in-progress/` when taking ownership and `docs/tasks/complete/` only when complete.
- [ ] Keep `Lifecycle` aligned with folder.
- [ ] Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`.
- [ ] Update `Handoff.md`.
