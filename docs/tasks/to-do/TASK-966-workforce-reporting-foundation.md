# TASK-966 — Workforce Reporting Foundation

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
- Domain: `cross-domain` (`people|hr|finance|payroll|data|analytics`)
- Blocked by: `TASK-961`, `TASK-962`, `TASK-963`
- Branch: `task/TASK-966-workforce-reporting-foundation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear la foundation de reporting workforce persona-centrico: headcount, worker type, pais, department/assignment, cost/compensation coverage, readiness gaps y rails de pago, consumiendo read models canonicos y no heuristicas por tabla.

El objetivo es que Greenhouse pueda responder "como esta nuestra fuerza laboral" sin partir desde Payroll, Contractor o Finance por separado.

## Why This Task Exists

Deel vende la idea de ver todo el workforce en un mismo sistema: empleados, contractors, payroll, compliance, compensation y documents. Greenhouse necesita el equivalente analitico: no basta con tener la ficha persona; hay que poder sumar y segmentar el workforce de forma confiable.

Hoy existen reportes por dominio, pero el reporting cross-workforce puede caer en duplicacion o doble conteo si lee `members`, payroll, contractor engagements y payment obligations sin la doctrina EPIC-017.

## Goal

- Definir un read model de reporting workforce.
- Entregar metricas iniciales: active workforce, employees, contractors, countries, payment rails, compensation coverage, readiness blockers.
- Mantener Finance/Payroll cost semantics separadas de headcount/person semantics.
- Exponer salida para UI interna y futuro API/agent safe context.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Reporting headcount/workforce no puede doble-contar persona por tener multiples rails.
- Cost reporting debe distinguir persona, relationship, assignment, compensation y payment obligation.
- No exponer salary/cost sensitive metrics sin capability.
- No usar `member.contract_type` como current truth universal.
- No crear dashboards bonitos sin contrato de metricas y tests.

## Normative Docs

- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/tasks/to-do/TASK-963-people-list-workforce-overview.md`
- `docs/tasks/to-do/TASK-652-api-platform-people-workforce-read-surface.md`

## Dependencies & Impact

### Depends on

- `TASK-961` — stable Person 360 workforce facet/read model.
- `TASK-962` — gap disposition taxonomy.
- `TASK-963` — list-level overview semantics.
- Existing data/reporting layers to be verified in discovery.

### Blocks / Impacts

- Executive workforce overview.
- Finance workforce cost reporting.
- API/agent read surfaces.
- Reliability/control plane prioritization.

### Files owned

- `docs/tasks/to-do/TASK-966-workforce-reporting-foundation.md`
- Runtime files to be confirmed in Plan Mode, likely:
  - `src/lib/workforce/**`
  - `src/lib/person-360/**`
  - `src/lib/reports/**` or existing reporting path if present
  - `src/views/greenhouse/**`
- `docs/architecture/metrics/**` if metric specs are added.
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- WorkforceFoundationMap and gap taxonomy.
- Person 360/People direction.
- Payroll/Finance/Contractor domain reporting primitives in separate lanes.

### Gap

- No canonical workforce reporting model ties person, relationship, assignment, compensation, payment rail and readiness together.
- No metric spec for active workforce/headcount by worker type across employee/contractor rails.
- No safe aggregate contract for exposing compensation/cost coverage.

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

### Slice 1 — Metric Contract

- Define metric specs for:
  - active workforce;
  - employees;
  - contractors;
  - worker type mix;
  - country coverage;
  - compensation coverage;
  - payment rail coverage;
  - readiness blockers.
- Define sensitivity tier per metric.

### Slice 2 — Reporting Reader

- Build a read-only reporting reader over canonical workforce map/facet outputs.
- Avoid N+1 reads; use batch readers where possible.
- Add tests for no double counting and gap disposition mapping.

### Slice 3 — Internal Surface

- Add or update a compact internal reporting surface only if a suitable existing page exists.
- Otherwise document API/reader output and defer UI.
- Include export/download only if existing reporting patterns support it.

### Slice 4 — Docs, API Follow-up and GVC

- Update EPIC-017 and API Platform dependencies.
- If UI ships, capture with GVC.
- Document what remains for `TASK-652`.

## Out of Scope

- Payroll calculation.
- Payment execution.
- Compensation write paths.
- Finance P&L restatement.
- External API exposure; that belongs to `TASK-652`.
- Agent recommendations or AI-generated workforce analytics.

## Detailed Spec

Minimum metric output:

```ts
type WorkforceReportingSnapshot = {
  asOf: string
  headcount: {
    activeTotal: number
    employees: number
    contractors: number
    unknown: number
  }
  coverage: {
    relationship: { covered: number; total: number }
    compensation: { covered: number; total: number }
    paymentRail: { covered: number; total: number }
    readinessBlocked: number
  }
  breakdowns: {
    byCountry: Array<{ label: string; count: number }>
    byWorkerType: Array<{ label: string; count: number }>
    byPaymentRail: Array<{ label: string; count: number }>
  }
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. Do not build UI before metric definitions and tests.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Double-counting people with multiple rails | data/analytics | medium | Person-first grouping and tests | Count mismatch vs audit cohort |
| Sensitive cost data leaks | finance/payroll/access | medium | Sensitivity tiers + capability checks | Redaction/access test failure |
| Report becomes source of truth | architecture | low | Read-only docs and links to source facets | Write paths added to report |
| Slow reporting queries | performance | medium | Batch readers/materialized view only after ADR | Slow local/staging timing |

### Feature flags / cutover

If UI ships, use a feature flag unless the surface is internal-only and read-only with existing access. Reader-only code can ship without flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert metric docs/types | <5 min | si |
| Slice 2 | Revert reader/tests | <10 min | si |
| Slice 3 | Disable flag or revert UI | <10 min | si |
| Slice 4 | Revert docs/scenario | <5 min | si |

### Production verification sequence

1. Tests prove no double counting.
2. Compare snapshot against `TASK-959` audit cohort.
3. GVC if UI exists.
4. Manual access check for sensitive metrics.

## Acceptance Criteria

- [ ] Metric contract exists and names sensitivity per metric.
- [ ] Reader returns active workforce metrics without double counting.
- [ ] Compensation/payment coverage follows `TASK-962` dispositions.
- [ ] Sensitive metrics are redacted/gated.
- [ ] Output is ready to feed `TASK-652`.

## Verification

- `pnpm task:lint --task TASK-966`
- `pnpm exec tsc --noEmit --pretty false`
- Focused tests for reporting reader and no double counting
- `pnpm lint`
- GVC if UI ships
- `pnpm docs:context-check`
- `git diff --check`

## Closing Protocol

- [ ] Move file and lifecycle through `in-progress`/`complete`.
- [ ] Update README/registry.
- [ ] Update EPIC-017.
- [ ] Update `Handoff.md`.
