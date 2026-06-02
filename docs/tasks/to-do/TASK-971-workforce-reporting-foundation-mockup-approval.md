# TASK-971 — Workforce Reporting Foundation Mockup Approval

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|finance|payroll|data|analytics|ui`)
- Blocked by: `TASK-961`, `TASK-962`, `TASK-963`
- Branch: `task/TASK-971-workforce-reporting-foundation-mockup-approval`
- Legacy ID: `M06`
- GitHub Issue: `optional`

## Summary

Construir y aprobar el mockup `M06 - Workforce Reporting Foundation` en `/people/mockup/workforce-reporting`, como contrato visual/UX para reporting persona-centrico sin doble conteo.

## Why This Task Exists

`TASK-966` debe definir metricas y readers antes de runtime. Este mockup fija la experiencia aprobada para composicion, coverage, breakdowns, redaction and drilldowns sin crear un dashboard bonito pero semanticamente ambiguo.

## Goal

- Crear mockup de reporting workforce agregado.
- Mostrar active workforce, worker mix, countries, rails, coverage and readiness.
- Mostrar redaction/capability state for sensitive money/cost metrics.
- Probar drilldown hacia People/List/Profile sin crear nuevo source of truth.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Mockup-only. No reporting reader, API, DB write or export implementation.
- Headcount is person-centric and cannot double-count people with multiple rails.
- Cost/compensation metrics must show sensitivity/redaction state.
- Drilldowns point back to People surfaces, not a new source of truth.

## Normative Docs

- `docs/tasks/to-do/TASK-966-workforce-reporting-foundation.md`
- `docs/tasks/to-do/TASK-963-people-list-workforce-overview.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`

## Dependencies & Impact

### Depends on

- Approved M01/M02/M03 semantics.
- `TASK-966` metric contract.

### Blocks / Impacts

- Runtime reporting UI in `TASK-966`.
- Future `TASK-652` aggregate API/agent-safe read surface.

### Files owned

- `docs/tasks/to-do/TASK-971-workforce-reporting-foundation-mockup-approval.md`
- `src/app/(dashboard)/people/mockup/workforce-reporting/page.tsx`
- `src/views/greenhouse/people/mockup/workforce-reporting/*`
- `scripts/frontend/scenarios/workforce-reporting-foundation.scenario.ts`
- RESEARCH-008 docs, EPIC-017 and `Handoff.md`

## Current Repo State

### Already exists

- M01/M02/M03 approved mockups.
- `TASK-966` reporting foundation task.

### Gap

- No approved reporting mockup exists for person-centric workforce composition, coverage, redaction and drilldown.

<!-- ZONE 2 intentionally empty -->

## Scope

### Slice 1 — Route and Mock Metrics

- Create `/people/mockup/workforce-reporting`.
- Define typed mock metrics for headcount, worker types, countries, payment rails, coverage and readiness.
- Include redacted and privileged metric states.

### Slice 2 — Reporting UI

- Build header, composition cards, coverage panels, breakdown charts/lists and drilldown drawer.
- Add source/formula lineage affordance.
- Add redaction explanation.

### Slice 3 — GVC and Approval Docs

- Add `workforce-reporting-foundation` GVC scenario.
- Capture aggregate view, segment drilldown, redacted state and mobile layout.
- After approval, lock M06 in `TASK-966` and RESEARCH-008.

## Out of Scope

- Runtime reporting readers.
- Exports/downloads.
- Payroll or finance cost calculations.
- API exposure.

## Detailed Spec

Route target:

```txt
/people/mockup/workforce-reporting
```

Required states:

- aggregate composition;
- coverage/readiness;
- redacted sensitive money state;
- segment drilldown back to People.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Double-counting becomes visual norm | analytics/data | medium | Person-first labels and formulas | Metrics imply rails=sum people |
| Sensitive cost exposure | finance/payroll/access | medium | Redacted state in mockup | Money visible without capability |
| Dashboard becomes source of truth | architecture/ui | low | Drilldowns to People/read models | New standalone ownership language |

### Feature flags / cutover

Repo-only mockup route under `/people/mockup/**`; no production nav entry, no feature flag and no cutover. Mitigation is route isolation plus sensitivity/redaction states before any runtime reporting reader is approved.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert route/data | <5 min | si |
| Slice 2 | Revert view | <10 min | si |
| Slice 3 | Revert scenario/docs | <5 min | si |

### Production verification sequence

No production rollout.

## Acceptance Criteria

- [ ] `/people/mockup/workforce-reporting` renders.
- [ ] Metrics are person-centric and display source/confidence.
- [ ] Sensitive cost/compensation states can be redacted.
- [ ] Drilldown returns to People surfaces.
- [ ] GVC evidence exists for desktop/laptop/mobile and an interaction.

## Verification

- `pnpm exec eslint <created-files>`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture workforce-reporting-foundation --env=local`
- `pnpm fe:capture:review <capture-dir>`
- `git diff --check`

## Closing Protocol

- [ ] Update approval docs after human approval.
- [ ] Update `Handoff.md`.
