# TASK-962 — Workforce Coverage & Readiness Remediation Plan

## Delta 2026-06-01

- `TASK-797` (Contractor Closure + Transition Controls) — backend shipped en `develop` (lifecycle de cierre propio, readiness, post-closure guards, API `/api/hr/contractors/[id]/closure`, signal `hr.contractor_engagement.closed_with_open_payables`). Para la disposición del backlog: el cierre contractor ya NO es proposal; queda follow-up de UI (closure drawer en `/hr/contractors`). Cerrado por trabajo en TASK-797.

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
- Status real: `Mockup aprobado`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|identity|data|reliability`)
- Blocked by: `TASK-959` complete; can run before or alongside `TASK-961` only as read-only analysis
- Branch: `task/TASK-962-workforce-coverage-readiness-remediation-plan`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Explain the real workforce coverage gaps found by `TASK-959` before Greenhouse treats Person 360 workforce state as operationally complete.

This task is read-only. It classifies the four active workers without current compensation and the eight active workers with unresolved/blocked readiness into intentional lifecycle state, data debt, model gap, access/redaction gap or fixture/demo residue. It produces a remediation plan and follow-up task candidates, but does not mutate data.

## Approved Mockup Lock

El mockup `M03 - Workforce Coverage & Readiness Control Room` fue aprobado por el usuario el `2026-05-31` y queda como contrato visual/UX obligatorio para esta task. Es un artefacto de aprobacion visual/producto, no una implementacion runtime de remediation.

- Ruta local: `/people/mockup/workforce-readiness`
- Route file: `src/app/(dashboard)/people/mockup/workforce-readiness/page.tsx`
- View mockup: `src/views/greenhouse/people/mockup/workforce-readiness/WorkforceReadinessMockupView.tsx`
- Mock data tipada: `src/views/greenhouse/people/mockup/workforce-readiness/data.ts`
- GVC scenario: `scripts/frontend/scenarios/workforce-readiness-control-room.scenario.ts`
- Evidencia GVC aprobada: `.captures/2026-05-31T16-35-51_workforce-readiness-control-room`

Reglas del mockup:

- Es una superficie diagnostica/read-only. No tiene botones de fix, recalculo payroll, payment execution ni signing.
- Separa real active workers de fixtures/demo para evitar falsos blockers.
- Clasifica gaps por disposition, owner domain, severity, source codes, masked samples y next safe action.
- La remediation queue es preview de tareas futuras; no ejecuta cambios.

Regla de implementacion UI: construir cualquier surface runtime futura desde este mockup aprobado. El agente implementador puede cablear audit outputs reales, owner domains, redaction, copy canonico, estados vacios y responsive fixes, pero no debe agregar acciones de remediation, convertir el control room en una consola de fixes ni mezclar fixtures/demo con el real active cohort sin aprobacion explicita.

## Why This Task Exists

`TASK-959` proved that the read-only workforce map is feasible for the real active cohort:

- relationship coverage: `9/9`
- current classification parity: `9/9`
- current compensation coverage: `5/9`
- payment rail evidence coverage: `8/9`
- unresolved/blocked readiness: `8/9`
- error-severity gaps: `0`

That is strong enough to promote a People/Person 360 workforce facet in `TASK-961`, but not strong enough to pretend the foundation is complete. The system still needs to know why four active people lack current compensation and why readiness is unresolved/blocked for eight of nine real active people.

Without this classification, later tasks could over-correct normal onboarding states, hide real data debt, or build write paths that make payroll/finance decisions from incomplete evidence.

## Goal

- Re-run and deepen the `TASK-959` audit against dev PostgreSQL with masked examples.
- Classify every active real worker coverage/readiness gap into a stable disposition.
- Produce a remediation matrix with owner domain, urgency, source evidence, safe next action and "do not fix" cases.
- Decide which existing backlog tasks should be rewritten, kept separate, absorbed or deferred after `TASK-961`.
- Create follow-up task recommendations only as documented candidates; do not auto-open broad batches.

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
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- This task is **read-only**. No DB writes, migrations, backfills, UI changes, API routes, outbox events, payroll recalculation, contractor payable transitions or payment obligation mutations.
- Mockup-only routes under `/people/mockup/**` are allowed as approval artifacts when explicitly requested by the operator; they do not count as runtime remediation UI and must not create API routes, writes or source-of-truth behavior.
- Do not convert data classification into data remediation inside this task.
- Do not treat `member.contract_type` as universal current truth. Use `WorkforceFoundationMap` and `resolveCurrentWorkClassification()`.
- Do not invent local drift categories if a `TASK-959` gap code already exists.
- Person/People remains the hub for workforce state; Payroll remains a specialized rail.
- Any future data fix must be proposed as a separate task with before/after evidence and payroll/finance no-regression gates.
- Demo/fixture residue must be separated from real active worker gaps.

## Normative Docs

- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`
- `docs/research/RESEARCH-008-pre-task-considerations.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `TASK-959` complete: `WorkforceFoundationMap`, gap taxonomy and audit script.
- `TASK-961` to-do: Person 360 workforce facet consumer; this task can run before implementation to inform UI states, or after it to validate what the UI should show.
- Existing runtime files:
  - `src/lib/workforce/foundation/object-map.ts`
  - `src/lib/workforce/foundation/object-map-types.ts`
  - `src/lib/workforce/foundation/gap-codes.ts`
  - `scripts/workforce/audit-workforce-foundation-map.ts`
  - `src/lib/account-360/current-work-classification.ts`
  - `src/lib/workforce/activation/readiness.ts`
- Dev PostgreSQL access via `pnpm pg:doctor`.

### Blocks / Impacts

- Blocks confidence to treat `TASK-961` UI states as operationally complete.
- Blocks safe rewrite of `TASK-338` into `CompensationProfile` foundation.
- Blocks reliable scoping of workforce reliability signals.
- Impacts future disposition of:
  - `TASK-338`
  - `TASK-340`
  - `TASK-614`
  - `TASK-652`
  - `TASK-788`
  - `TASK-798`
  - `TASK-797`
  - `TASK-787`
  - `TASK-960`

### Files owned

- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `src/app/(dashboard)/people/mockup/workforce-readiness/page.tsx` (mockup-only approval route)
- `src/views/greenhouse/people/mockup/workforce-readiness/*` (mockup-only approval artifact)
- `scripts/frontend/scenarios/workforce-readiness-control-room.scenario.ts` (GVC mockup scenario)
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`
- `docs/research/RESEARCH-008-workforce-coverage-readiness-remediation-2026-05-31.md` (new output, if executing agent chooses a dedicated appendix)
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`

No runtime source file should be changed unless the executing agent finds a read-only audit bug in the `TASK-959` script. If that happens, the fix must be narrowly scoped and documented.

## Current Repo State

### Already exists

- `WorkforceFoundationMap` can derive current relationship, assignment candidate, compensation candidate, payment rail evidence, readiness summary, current classification and gap codes.
- `TASK-959` audit can run with:
  - `--active-only`
  - `--include-demo`
  - `--profile-id`
  - `--member-id`
  - `--json-out`
  - `--fail-on-error-gap`
  - `--limit`
- Demo fixture cleanup has already removed the five `demo-%@demo.greenhouse.efeonce.org` active members and derived materialized rows from dev.
- Real active cohort after cleanup: 9 active members.
- Known gap metrics after cleanup:
  - `compensation.missing_current_version=4`
  - `readiness.unresolved_or_blocked=8`
  - payment rail evidence gap for 1 active member
  - relationship/classification error gaps: 0

### Gap

- No documented owner/disposition exists for the four active members missing current compensation.
- No documented owner/disposition exists for the eight readiness blocked/unresolved states.
- No classification exists for whether these gaps are:
  - intentional onboarding/intake state;
  - valid non-payroll/non-compensated relationship;
  - historical data debt;
  - missing source sync/materialization;
  - model gap in `WorkforceFoundationMap`;
  - access/redaction gap;
  - payment rail setup gap.
- No ordered remediation queue exists.
- Existing tasks are not yet updated to reflect the new sequence: `TASK-961` -> `TASK-962` -> compensation/assignment rewrites -> write paths.

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

### Slice 1 — Baseline Re-Audit

- Run `pnpm pg:doctor`.
- Run the `TASK-959` audit against dev PostgreSQL:
  - active real cohort;
  - active including demo, to confirm fixture cleanup remains clean;
  - targeted output for each member/profile with compensation or readiness gaps.
- Capture summary metrics and masked examples.
- Confirm whether gap counts still match the `TASK-959` closeout baseline.
- If counts changed, explain whether the change came from data mutation, source sync, code change or audit filter.

### Slice 2 — Gap Disposition Taxonomy

- Define a stable disposition taxonomy:
  - `intentional_lifecycle_state`
  - `valid_non_payroll_state`
  - `source_data_debt`
  - `source_sync_gap`
  - `read_model_gap`
  - `access_or_redaction_gap`
  - `payment_rail_setup_gap`
  - `fixture_or_demo_residue`
  - `requires_business_decision`
- Map every observed gap to:
  - disposition;
  - owner domain;
  - urgency;
  - source evidence;
  - safe next action;
  - whether it blocks `TASK-961`, `TASK-338`, reliability signals or write paths.

### Slice 3 — Compensation Coverage Analysis

- For each active worker without current compensation:
  - verify identity profile/member linkage;
  - verify current relationship/classification;
  - inspect compensation version history read-only;
  - decide whether current compensation is truly missing or intentionally absent;
  - identify the source table/system that should own the fix later.
- Do not create or modify compensation versions.
- Output a compensation remediation matrix:
  - `no_action`
  - `needs_source_data_entry`
  - `needs_compensation_profile_model`
  - `needs_backfill_task`
  - `needs_business_decision`

### Slice 4 — Readiness Coverage Analysis

- For each active worker with blocked/unresolved readiness:
  - inspect readiness lanes available from existing workforce activation logic;
  - distinguish "not ready because onboarding is incomplete" from "not ready because the model lacks evidence";
  - map each blocker to a domain:
    - identity/access;
    - legal profile;
    - work relationship;
    - compensation;
    - payment profile/rail;
    - contractor engagement;
    - compliance/tax/country.
- Produce a readiness remediation matrix with owner, next task recommendation and "do not fix" cases.

### Slice 5 — Backlog Alignment Output

- Update the existing backlog triage with final dispositions after the detailed analysis.
- Explicitly mark:
  - which tasks should be rewritten;
  - which tasks should be kept separate;
  - which tasks should be absorbed/superseded;
  - which tasks should be deferred.
- Do not rewrite every old task file unless the plan identifies a small, necessary metadata-only update.
- Produce candidate follow-up tasks, but do not open more than one without operator confirmation.

### Slice 6 — Documentation and Handoff

- Update `RESEARCH-008` with a dedicated appendix or section for the coverage/readiness remediation plan.
- Update `EPIC-017` child tasks and intake queue.
- Update `docs/tasks/README.md` and `TASK_ID_REGISTRY.md` at close.
- Update `Handoff.md` with commands, findings, non-changes and next recommended task.

## Out of Scope

- Any data mutation, SQL update, migration, backfill apply or manual DB repair.
- Any payroll amount calculation, payroll period close, receipt generation or contractor payable transition.
- Any UI change in Person 360, Payroll, Contractor or Finance.
- Any API route, outbox event, reliability signal wiring or scheduled job.
- Any automatic creation of broad task batches.
- Any closure/superseding of existing task files without a specific operator checkpoint.
- Any acceptance of the Unified Workforce Foundation ADR by implication.

## Detailed Spec

### Required report shape

The output report should include:

```md
## Executive Summary

## Baseline Audit

| Metric | Count | Rate | Delta vs TASK-959 |
| --- | ---: | ---: | --- |

## Compensation Coverage Findings

| Subject | Relationship | Classification | Gap | Disposition | Owner | Next action |
| --- | --- | --- | --- | --- | --- | --- |

## Readiness Findings

| Subject | Readiness lane | Gap | Disposition | Owner | Blocks | Next action |
| --- | --- | --- | --- | --- | --- | --- |

## Payment Rail Findings

## Backlog Disposition

## Follow-up Recommendations

## Non-Changes
```

Subjects must be masked unless the operator explicitly approves named examples. Prefer initials + internal stable IDs when needed for reproducibility.

### Disposition rules

- `intentional_lifecycle_state`: normal state such as onboarding pending, not a bug.
- `valid_non_payroll_state`: active relationship exists but payroll compensation is not required.
- `source_data_debt`: data should exist in the source table but does not.
- `source_sync_gap`: source has data but projection/map does not see it.
- `read_model_gap`: data exists but `WorkforceFoundationMap` cannot represent it correctly.
- `access_or_redaction_gap`: data exists but should not be exposed to a given audience.
- `payment_rail_setup_gap`: payment evidence/profile/provider ref is missing for a payable worker.
- `fixture_or_demo_residue`: non-real fixture data still appears in active cohort.
- `requires_business_decision`: system cannot infer the correct owner/action.

### Follow-up task creation rule

The executing agent may recommend multiple follow-ups but should open only the next single task unless the operator asks for a batch.

Recommended follow-up candidates may include:

- CompensationProfile read model rewrite (`TASK-338` replacement/reframe).
- WorkAssignment effective dating read-model rewrite (`TASK-788` split).
- Workforce reliability signals.
- Targeted data backfill/remediation for compensation coverage.
- Payment rail evidence remediation.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (baseline re-audit) -> Slice 2 (taxonomy) -> Slice 3 (compensation) -> Slice 4 (readiness) -> Slice 5 (backlog alignment) -> Slice 6 (docs/handoff).
- Slice 5 cannot finalize dispositions until Slices 3 and 4 classify actual gaps.
- No data remediation task may be opened until the report says whether the relevant gap is data debt, intentional state or model gap.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Analysis turns into manual data repair | payroll/hr/data | medium | Explicit read-only scope; no SQL writes; follow-up tasks only | git diff / command history |
| Intentional onboarding states get treated as defects | people/hr | medium | Required disposition taxonomy; owner/domain review | Report marks normal lifecycle as data debt |
| Real compensation data debt gets hidden behind UI readiness | payroll/finance | medium | Per-subject evidence matrix; compare compensation history read-only | `compensation.missing_current_version` remains unexplained |
| Backlog churn rewrites too many old tasks | docs/ops | medium | Update triage first; avoid editing old task files unless necessary | Large docs diff across many task files |
| Sensitive data leaks in report examples | payroll/finance/security | medium | Mask subjects and monetary/provider details by default | Review catches raw salary/provider IDs |
| Later write paths proceed despite unresolved gaps | architecture/payroll | medium | Report must declare blockers for write paths | EPIC-017 child task ignores report blockers |

### Feature flags / cutover

No feature flags. This is a documentation/read-only analysis task with no runtime cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Re-run audit and correct report | <30 min | si |
| Slice 2 | Revert taxonomy section | <10 min | si |
| Slice 3 | Revert compensation findings section | <10 min | si |
| Slice 4 | Revert readiness findings section | <10 min | si |
| Slice 5 | Revert triage/EPIC docs delta | <10 min | si |
| Slice 6 | Revert task/index/handoff docs delta | <10 min | si |

### Production verification sequence

No production cutover exists because this is a repo-only/read-only analysis task with no runtime behavior change. Verification is local/dev only:

1. `pnpm pg:doctor` healthy.
2. `TASK-959` audit script runs read-only.
3. Report masks sensitive details.
4. Task/docs lint passes.
5. `git diff --check` passes.

### Out-of-band coordination required

- HR/Payroll/Finance review is recommended for any finding marked `source_data_debt`, `payment_rail_setup_gap` or `requires_business_decision`.
- Operator checkpoint required before any follow-up task mutates data.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `TASK-959` audit is re-run against the active real cohort and active-with-demo filter.
- [ ] All observed compensation coverage gaps are classified with disposition, owner and next action.
- [ ] All observed readiness blocked/unresolved gaps are classified with disposition, owner and next action.
- [ ] Payment rail evidence gaps are classified separately from compensation gaps.
- [ ] Report distinguishes intentional lifecycle state from data debt and model gaps.
- [ ] Existing backlog disposition is updated for `TASK-338`, `TASK-340`, `TASK-614`, `TASK-652`, `TASK-788`, `TASK-798`, `TASK-797`, `TASK-787`, `TASK-960` and `TASK-955`.
- [ ] No data mutations, migrations, UI changes, API routes, outbox events, reliability signals or payroll/finance state changes are introduced.
- [ ] Follow-up recommendations are ordered and do not open a broad batch without operator confirmation.
- [ ] EPIC-017, RESEARCH-008, task registry/index and `Handoff.md` are synchronized at close.

## Verification

- `pnpm task:lint --task TASK-962`
- `pnpm pg:doctor`
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/workforce/audit-workforce-foundation-map.ts --active-only`
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/workforce/audit-workforce-foundation-map.ts --active-only --include-demo`
- `pnpm docs:context-check`
- `git diff --check`

If the executing agent touches `src/lib/workforce/foundation/*`, also run:

- `pnpm vitest run src/lib/workforce src/lib/account-360/current-work-classification.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Closing Protocol

- [ ] Move file to `docs/tasks/in-progress/` when taking ownership and to `docs/tasks/complete/` only when all criteria are met.
- [ ] Keep `Lifecycle` aligned with folder.
- [ ] Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`.
- [ ] Update `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`.
- [ ] Update `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`.
- [ ] Update `Handoff.md` with commands run, results, non-changes and follow-up recommendation.
- [ ] Do not stage unrelated `TASK-960` implementation artifacts unless explicitly requested.

## Follow-ups To Consider After Review

- Reframed `TASK-338` as CompensationProfile read model/foundation.
- Reframed `TASK-788` as WorkAssignment effective dating read model.
- Workforce reliability signals from `TASK-959` candidate list.
- Targeted compensation coverage remediation if gaps are real data debt.
- Payment rail evidence remediation if the missing rail evidence belongs to an active payable worker.
