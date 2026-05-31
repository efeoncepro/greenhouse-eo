# TASK-972 — Unified Worker Change Workflow Mockup Approval

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno futuro — mockup only`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|documents|identity|ui`)
- Blocked by: `TASK-965`
- Branch: `task/TASK-972-unified-worker-change-workflow-mockup-approval`
- Legacy ID: `M07`
- GitHub Issue: `optional`

## Summary

Construir y aprobar el mockup `M07 - Unified Worker Create/Edit Workflow` en `/people/mockup/worker-change-workflow`, como shell visual futuro para create/edit People-first sin habilitar writes reales.

## Why This Task Exists

El flujo unificado es el mas riesgoso del epic porque puede parecer una autorizacion para escribir Payroll, Finance, Contractor o Documents desde People. Este mockup debe mostrar orquestacion, blockers, preview and partial failure sin sugerir que el write path runtime ya esta aprobado.

## Goal

- Crear mockup-only workflow shell.
- Mostrar stepper: identity/person, relationship, assignment, compensation, documents/compliance, payment rail, review/apply.
- Mostrar domain command status: available, missing, gated, blocked.
- Mostrar preview/apply and partial failure states without real writes.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `DESIGN.md`

Reglas obligatorias:

- Mockup-only. No APIs, commands, DB writes, migrations, audit events or outbox events.
- This task must not imply `TASK-965` runtime writes are approved.
- Payment execution remains outside the workflow.
- Compensation writes wait for CompensationProfile/assignment architecture checkpoint.
- Any future money, contract, payment rail or legal-status write requires preview, acknowledgement and audit.

## Normative Docs

- `docs/tasks/to-do/TASK-965-unified-worker-create-edit-workflow.md`
- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
- `docs/tasks/to-do/TASK-788-workforce-role-title-effective-dating-promotion-flow.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`

## Dependencies & Impact

### Depends on

- `TASK-965` as future runtime owner.
- Approved M01-M06 semantics before final human approval is requested.

### Blocks / Impacts

- Future write-path UX architecture.
- Compensation, assignment, documents and payment rail command planning.

### Files owned

- `docs/tasks/to-do/TASK-972-unified-worker-change-workflow-mockup-approval.md`
- `src/app/(dashboard)/people/mockup/worker-change-workflow/page.tsx`
- `src/views/greenhouse/people/mockup/worker-change-workflow/*`
- `scripts/frontend/scenarios/worker-change-workflow.scenario.ts`
- RESEARCH-008 docs, EPIC-017 and `Handoff.md`

## Current Repo State

### Already exists

- `TASK-965` defines runtime concept but is write-path gated.
- Existing workflow primitives exist in several domains, but no unified People-first shell is approved.

### Gap

- No mockup defines how future worker create/edit should communicate domain ownership, blockers, preview/apply and partial failure.

<!-- ZONE 2 intentionally empty -->

## Scope

### Slice 1 — Route and Workflow Data

- Create `/people/mockup/worker-change-workflow`.
- Define typed mock workflow with draft, validating, blocked, ready_to_apply, partial and applied states.
- Include available/missing command states per step.

### Slice 2 — Workflow UI

- Build shell, stepper, step content, validation blockers, preview/apply panel and partial failure state.
- Include sticky acknowledgements for money/legal/payment changes.
- Show missing domain commands explicitly.

### Slice 3 — GVC and Approval Docs

- Add `worker-change-workflow` GVC scenario.
- Capture step progression, blocker, preview drawer and partial failure.
- After approval, lock M07 in `TASK-965` and RESEARCH-008.

## Out of Scope

- Any runtime write path.
- Any command orchestration.
- Payroll calculation, payment execution or document signing.
- Agent-executed changes.

## Detailed Spec

Route target:

```txt
/people/mockup/worker-change-workflow
```

Required approved states:

- draft;
- blocked validation;
- preview/apply;
- partial failure;
- applied summary.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3. Do not mark approved unless the UI is visibly mockup-only/write-gated.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mockup implies writes are approved | payroll/finance/hr | high | Mockup-only and command-gated language | UI shows real apply without gate |
| Payment execution sneaks into workflow | finance | medium | Payment rail setup only, execution out of scope | Pay button appears |
| Compensation writes bypass architecture | payroll/hr | medium | Missing/gated command states | Compensation editable as final write |

### Feature flags / cutover

Repo-only mockup route under `/people/mockup/**`; no production nav entry, no feature flag and no cutover. Mitigation is route isolation plus hard copy that this shell does not authorize runtime write paths.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert route/data | <5 min | si |
| Slice 2 | Revert view | <10 min | si |
| Slice 3 | Revert scenario/docs | <5 min | si |

### Production verification sequence

No production rollout.

## Acceptance Criteria

- [ ] `/people/mockup/worker-change-workflow` renders.
- [ ] Stepper covers identity, relationship, assignment, compensation, documents/compliance, payment rail and review/apply.
- [ ] Missing/gated commands are explicit.
- [ ] No real write path or API exists.
- [ ] GVC captures blocker, preview and partial failure.

## Verification

- `pnpm exec eslint <created-files>`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture worker-change-workflow --env=local`
- `pnpm fe:capture:review <capture-dir>`
- `git diff --check`

## Closing Protocol

- [ ] Update approval docs after human approval.
- [ ] Update `Handoff.md`.
