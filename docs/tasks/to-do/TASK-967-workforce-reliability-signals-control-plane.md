# TASK-967 — Workforce Reliability Signals Control Plane

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
- Epic: `EPIC-017`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|contractor|reliability|data`)
- Blocked by: `TASK-962`
- Branch: `task/TASK-967-workforce-reliability-signals-control-plane`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear un set canonico de reliability signals workforce cross-rail: relationship coverage, compensation coverage, payment rail evidence, readiness blockers, double-rail risk y stale projections, reutilizando gap codes de `TASK-959`/`TASK-962`.

Esta task evita que cada dominio invente su propia categoria de drift para el mismo problema.

## Why This Task Exists

El avance hacia un sistema tipo Deel depende de confianza operacional: si la vista People muestra estado workforce, el sistema debe alertar cuando la evidencia detras esta incompleta o contradictoria. `TASK-959` ya produjo gap codes; `TASK-962` clasificara su significado. Falta convertir esa taxonomia en señales vivas de confiabilidad.

`TASK-798` ya apunta a reliability contractor, pero necesita reframe para no duplicar categorias contractor-locales. Esta task es la capa cross-workforce que `TASK-798` y otros dominios deben consumir.

## Goal

- Definir signals canónicos cross-workforce.
- Reusar `WorkforceFoundationMap` y dispositions de `TASK-962`.
- Exponer signals en Reliability/Ops sin crear otra projection de estado workforce.
- Permitir que contractor/payroll/finance signals se alineen a la misma taxonomia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Signals are read-only.
- Signals must use existing gap codes/dispositions before inventing new categories.
- Steady states must be explicitly declared.
- Do not mutate data from reliability routes.
- Do not create false-critical alerts for intentional lifecycle states.
- Contractor-specific signals may roll up into workforce taxonomy, but contractor payables remain contractor-owned.

## Normative Docs

- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/tasks/to-do/TASK-798-contractor-reliability-ops-control-plane.md`
- `docs/tasks/to-do/TASK-963-people-list-workforce-overview.md`
- `docs/tasks/to-do/TASK-966-workforce-reporting-foundation.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`

## Dependencies & Impact

### Depends on

- `TASK-962` — gap disposition taxonomy and real cohort classification.
- `TASK-959` — audit script and gap codes.
- Existing reliability overview runtime to be verified in discovery.

### Blocks / Impacts

- `TASK-798` reframe.
- Operations health dashboards.
- API Platform Ops/Reliability (`TASK-653`) and People/Workforce read surface (`TASK-652`).
- Future write-path safety gates.

### Files owned

- `docs/tasks/to-do/TASK-967-workforce-reliability-signals-control-plane.md`
- Runtime paths to confirm in discovery, likely:
  - `src/lib/reliability/**`
  - `src/lib/workforce/foundation/**`
  - `src/app/api/admin/ops-health/**`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `WorkforceFoundationMap` and gap codes from `TASK-959`.
- `TASK-962` planned classification.
- Existing reliability overview system.
- Contractor reliability task `TASK-798` marked for reframe.

### Gap

- No live cross-workforce signals exist for the unified foundation.
- Existing contractor/payroll/finance signals can drift into separate categories.
- There is no steady-state matrix for workforce gaps.

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

### Slice 1 — Signal Contract

- Define signal names and steady states:
  - `workforce.relationship.missing_active`
  - `workforce.compensation.missing_current`
  - `workforce.payment_rail.missing_evidence`
  - `workforce.readiness.blocked_or_unresolved`
  - `workforce.double_rail.risk`
  - `workforce.profile.stale_projection`
- Map each signal to gap codes and dispositions.
- Define severity rules: info, warning, error.

### Slice 2 — Readers

- Implement read-only signal readers over `WorkforceFoundationMap`/audit sources.
- Avoid N+1 where possible.
- Add tests for steady=0 and known gap fixtures.

### Slice 3 — Reliability Overview Integration

- Wire signals into existing reliability overview.
- Add runbook snippets with owner domain and safe next action.
- Link contractor-specific signals from `TASK-798` to this taxonomy where relevant.

### Slice 4 — Docs and Follow-up Alignment

- Update `TASK-798` or its docs if needed to consume the new taxonomy.
- Update EPIC-017 and research/triage docs.
- Document future API exposure via `TASK-653`/`TASK-652`.

## Out of Scope

- Data remediation.
- Backfills.
- UI redesign beyond existing reliability overview rows.
- Payroll or contractor payable state changes.
- Alerting/notification routing unless an existing signal pattern requires it.

## Detailed Spec

Signal rows should preserve this minimum shape:

```ts
type WorkforceReliabilitySignal = {
  key: string
  severity: 'info' | 'warning' | 'error'
  count: number
  steadyState: number
  ownerDomain: 'people' | 'hr' | 'payroll' | 'contractor' | 'finance' | 'data'
  dispositionCodes: string[]
  sampleRefs: Array<{ memberId: string; identityProfileId: string | null }>
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. Do not wire signals into overview before steady states are defined.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Intentional lifecycle states become noisy alerts | reliability/hr | medium | Use `TASK-962` dispositions | High warning count with intentional labels |
| Signals duplicate contractor/payroll signals | reliability/contractor/payroll | medium | Roll up existing categories, do not rename locally | Review finds duplicate semantic keys |
| Signal reader is slow | performance/data | medium | Batch reads and sample caps | local timing / Sentry slow request |
| Operators treat signal as auto-fix instruction | ops | low | Runbook says read-only and owner domain | Manual remediation without task |

### Feature flags / cutover

No feature flag required for read-only signals if severity defaults are conservative. If any signal is error-level on day one, ship as warning/info first or gate via config until reviewed.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert docs/types | <5 min | si |
| Slice 2 | Revert readers/tests | <10 min | si |
| Slice 3 | Remove overview registration | <10 min | si |
| Slice 4 | Revert docs alignment | <5 min | si |

### Production verification sequence

1. Compare signal counts to `TASK-962` output.
2. Verify no error-level noise for intentional states.
3. Verify reliability overview renders.
4. Document owner domain per signal.

## Acceptance Criteria

- [ ] Signal contract maps to `TASK-959` gap codes and `TASK-962` dispositions.
- [ ] Readers are read-only and tested.
- [ ] Reliability overview shows workforce signals with owner and safe next action.
- [ ] `TASK-798` is aligned to consume the taxonomy rather than duplicate it.
- [ ] Signals do not trigger data remediation inside this task.

## Verification

- `pnpm task:lint --task TASK-967`
- `pnpm exec tsc --noEmit --pretty false`
- Focused reliability/workforce tests
- `pnpm lint`
- `pnpm docs:context-check`
- `git diff --check`

## Closing Protocol

- [ ] Move file and lifecycle through `in-progress`/`complete`.
- [ ] Update README/registry.
- [ ] Update EPIC-017.
- [ ] Update `TASK-798` if alignment is applied.
- [ ] Update `Handoff.md`.
