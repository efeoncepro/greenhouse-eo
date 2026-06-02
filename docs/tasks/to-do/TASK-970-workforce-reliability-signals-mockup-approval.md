# TASK-970 — Workforce Reliability Signals Mockup Approval

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Domain: `cross-domain` (`people|hr|payroll|finance|contractor|reliability|ui`)
- Blocked by: `TASK-962`
- Branch: `task/TASK-970-workforce-reliability-signals-mockup-approval`
- Legacy ID: `M05`
- GitHub Issue: `optional`

## Summary

Construir y aprobar el mockup `M05 - Workforce Reliability Signals Control Plane` en `/people/mockup/workforce-reliability`, como contrato visual/UX para operar confidence, drift, owner domain, runbooks y steady state cross-workforce.

## Why This Task Exists

EPIC-017 necesita una forma confiable de saber si la fundacion workforce se puede creer. `TASK-967` implementara signals, pero antes hace falta una UI aprobada que evite ruido, falsos criticos y acciones de remediation desde observabilidad.

## Goal

- Crear mockup real de control plane de reliability workforce.
- Mostrar signal groups, owner filters, signal table and runbook side panel.
- Preservar que signals son read-only.
- Obtener aprobacion con GVC multi-viewport.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Mockup-only. No signal readers, APIs, DB writes, migrations or remediation controls.
- Signals are observability, not controls.
- No recalculate, close, override, pay or auto-fix action.
- Intentional lifecycle states must show suppressed/explained state, not critical noise.
- Contractor/payroll/finance domains keep ownership.

## Normative Docs

- `docs/tasks/to-do/TASK-967-workforce-reliability-signals-control-plane.md`
- `docs/tasks/to-do/TASK-798-contractor-reliability-ops-control-plane.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`

## Dependencies & Impact

### Depends on

- `TASK-962` approved M03 dispositions and control-room direction.
- `TASK-967` signal contract.

### Blocks / Impacts

- Runtime reliability surface in `TASK-967`.
- `TASK-798` contractor reliability reframe.
- Future ops-health integration.

### Files owned

- `docs/tasks/to-do/TASK-970-workforce-reliability-signals-mockup-approval.md`
- `src/app/(dashboard)/people/mockup/workforce-reliability/page.tsx`
- `src/views/greenhouse/people/mockup/workforce-reliability/*`
- `scripts/frontend/scenarios/workforce-reliability-signals.scenario.ts`
- RESEARCH-008 docs, EPIC-017 and `Handoff.md`

## Current Repo State

### Already exists

- M03 readiness control room approved.
- Existing reliability overview system.
- `TASK-967` describes target signal keys and steady states.

### Gap

- No approved UI contract exists for viewing workforce reliability signals and runbooks without implying writes.

<!-- ZONE 2 intentionally empty -->

## Scope

### Slice 1 — Route and Signal Mock Data

- Create `/people/mockup/workforce-reliability`.
- Create typed signal mock data for relationship, compensation, payment rail, readiness, double-rail and stale projection.
- Include owner domains, steady state, severity, count, trend and disposition.

### Slice 2 — Control Plane UI

- Build reliability header, signal groups, owner-domain filter, signal table and runbook side panel.
- Include suppressed intentional lifecycle explanation.
- Add microinteractions for owner filter and signal row selection.

### Slice 3 — GVC and Approval Docs

- Add `workforce-reliability-signals` GVC scenario.
- Capture owner filter, double-rail signal, runbook and mobile behavior.
- After approval, lock M05 in `TASK-967` and RESEARCH-008.

## Out of Scope

- Implementing reliability readers.
- Wiring existing ops-health.
- Notifications/alerts.
- Any remediation command.

## Detailed Spec

Route target:

```txt
/people/mockup/workforce-reliability
```

Expected panels:

- overall confidence and last evaluation;
- signal groups by taxonomy;
- owner-domain filters;
- signal table;
- runbook side panel with what this means / what not to do / safe next action.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mockup implies reliability can fix data | reliability/data | medium | Read-only runbook wording | UI has fix/apply controls |
| False critical noise becomes approved pattern | ops/hr | medium | Suppressed/intentional lane | All gaps show critical |
| Duplicates contractor/payroll signals | reliability | medium | Owner-domain rollup language | Duplicate semantic keys in UI |

### Feature flags / cutover

Repo-only mockup route under `/people/mockup/**`; no production nav entry, no feature flag and no cutover. Mitigation is route isolation plus explicit read-only copy so the mockup cannot be mistaken for a remediation console.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert route/data | <5 min | si |
| Slice 2 | Revert view | <10 min | si |
| Slice 3 | Revert scenario/docs | <5 min | si |

### Production verification sequence

No production rollout.

## Acceptance Criteria

- [ ] `/people/mockup/workforce-reliability` renders.
- [ ] Signal states include owner, steady state, severity, count and runbook.
- [ ] No remediation controls exist.
- [ ] GVC evidence covers desktop, laptop, mobile and row/runbook interaction.
- [ ] Approval docs are updated after human approval.

## Verification

- `pnpm exec eslint <created-files>`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture workforce-reliability-signals --env=local`
- `pnpm fe:capture:review <capture-dir>`
- `git diff --check`

## Closing Protocol

- [ ] Update RESEARCH-008/EPIC-017 after approval.
- [ ] Update `Handoff.md`.
