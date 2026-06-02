# TASK-965 — Unified Worker Create/Edit Workflow

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno futuro — write path gated`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|identity|documents|platform`)
- Blocked by: `TASK-961`, `TASK-962`, `TASK-338 reframe`, `TASK-788 reframe`
- Branch: `task/TASK-965-unified-worker-create-edit-workflow`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Diseñar e implementar, en una fase posterior, un flujo unificado para crear y editar workers desde People: persona, relacion, assignment, compensation profile, compliance/document evidence y payment rail, sin perder ownership especializado de Payroll, Contractor, Finance o Documents.

Esta task es el write-path convergence que se parece al "worker management system" de Deel. No debe ejecutarse hasta que los read models y coverage gates esten estables.

## Why This Task Exists

Greenhouse ya tiene varios write paths parciales: activacion workforce, transitions employee->contractor, contractor engagement, payment profiles, compensation versions, offboarding, documents y payroll. Eso es correcto para seguridad de dominio, pero desde la experiencia usuario final el operador necesita un flujo coherente para crear o modificar un worker sin saltar mentalmente entre cinco modulos.

La respuesta no es centralizar todo en una tabla ni dejar que People escriba directo en Payroll/Finance. La respuesta es un workflow orchestrator que compone comandos canonicos, con gates, idempotencia, audit y rollback/compensacion.

## Goal

- Definir un wizard/workflow People-first para create/edit worker.
- Componer comandos canonicos existentes en vez de escribir tablas raw.
- Separar fases: identity/person, relationship, assignment, compensation, documents/compliance, payment rail.
- Mantener hard gates para payroll, contractor payables, finance payment execution y documents/e-signature.
- Producir una implementation plan con feature flags y no-regression gates antes de cualquier write path.

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
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- No implementar hasta que read-only Person 360 Workforce y coverage/readiness esten validados.
- No escribir tablas raw de payroll/finance/contractor/documents desde UI.
- Cada step debe llamar un comando canonico existente o crear uno con ADR/checkpoint propio.
- Todo cambio que pueda afectar monto, elegibilidad, finiquito, contractor payable o payment rail requiere before/after evidence y no-regression gates.
- El workflow debe ser idempotente y auditable.
- No aceptar implicitamente el ADR `Proposed` sin checkpoint.

## Normative Docs

- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
- `docs/tasks/to-do/TASK-788-workforce-role-title-effective-dating-promotion-flow.md`
- `docs/tasks/complete/TASK-956-employee-to-contractor-transition-connected-command.md`
- `docs/tasks/complete/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md`
- `docs/tasks/to-do/TASK-964-person-workforce-documents-rail-epic001-alignment.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-961` — visible People hub.
- `TASK-962` — readiness dispositions.
- Reframed `TASK-338` — CompensationProfile read model/foundation.
- Reframed `TASK-788` — WorkAssignment effective-dating.
- Existing activation/onboarding primitives:
  - `TASK-874`
  - `TASK-875`
  - `TASK-876`
- Existing contractor transition primitives:
  - `TASK-956`
  - `TASK-789`
  - `TASK-790`
- Optional documents/signature dependencies:
  - `TASK-489`
  - `TASK-490`
  - `TASK-492`
  - `TASK-494`

### Blocks / Impacts

- Future People-first onboarding/editing UX.
- Future compensation change workflow.
- Future contract/addendum signing workflows.
- API/agent command safety model.

### Files owned

- `docs/tasks/to-do/TASK-965-unified-worker-create-edit-workflow.md`
- Future runtime paths to be confirmed in Plan Mode, likely:
  - `src/views/greenhouse/people/**`
  - `src/app/api/hr/workforce/**`
  - `src/lib/workforce/**`
  - `src/lib/person-legal-entity-relationships/**`
  - `src/lib/contractor-engagements/**`
  - `src/lib/payroll/**`
  - `src/lib/documents/**`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Workforce activation and intake primitives.
- Employee->contractor connected command.
- Contractor engagements and payables domain.
- Current work classification resolver.
- Person 360/People hub foundation.
- Document/signature epic and tasks.

### Gap

- No single People-first workflow coordinates identity, relationship, assignment, compensation, documents/compliance and payment rail.
- Operators still need domain-specific flows.
- No orchestration contract exists for partial completion, rollback, idempotency or approval gates across these rails.

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

### Slice 0 — Architecture Checkpoint

- Reconfirm ADR status for Unified Workforce Foundation.
- Inventory available commands and identify missing commands.
- Decide whether this task ships as workflow shell only or includes first write path.
- Produce `docs/tasks/plans/TASK-965-plan.md` before implementation.

### Slice 1 — Workflow Contract

- Define workflow states: draft, validating, blocked, ready_to_apply, applying, applied, partially_applied, cancelled.
- Define step model: person identity, relationship, assignment, compensation, compliance/documents, payment rail.
- Define idempotency keys and audit events.
- Define how partial failures are represented without corrupting source domains.

### Slice 2 — Readiness and Preview

- Build a preview/readiness step that composes `TASK-962` dispositions and domain validators.
- Show what will change before applying.
- Require explicit acknowledgement for money/payment/contract changes.

### Slice 3 — First Narrow Write Path

- Choose one low-risk write path after Plan Mode:
  - create/edit worker identity + relationship only; or
  - edit assignment only; or
  - prepare draft without applying.
- Do not include compensation/payment/doc signing unless explicitly approved after discovery.

### Slice 4 — UI and Evidence

- Implement People-first workflow entrypoint from Person 360 or People List.
- Add copy/tests/GVC.
- Document domain boundaries and rollback.

## Out of Scope

- Bulk import.
- Agent-executed HR/payroll writes.
- Payroll calculation changes.
- Payment execution.
- Direct document signing unless `TASK-490`/`TASK-491` are complete and explicitly in scope.
- Replacing specialized Payroll/Finance/Contractor UIs.

## Detailed Spec

Minimum workflow envelope:

```ts
type UnifiedWorkerWorkflow = {
  workflowId: string
  targetIdentityProfileId: string | null
  targetMemberId: string | null
  status: 'draft' | 'validating' | 'blocked' | 'ready_to_apply' | 'applying' | 'applied' | 'partially_applied' | 'cancelled'
  steps: Array<{
    key: 'identity' | 'relationship' | 'assignment' | 'compensation' | 'documents' | 'payment_rail'
    status: 'not_started' | 'ready' | 'blocked' | 'applied' | 'skipped'
    ownerDomain: 'identity' | 'hr' | 'payroll' | 'documents' | 'contractor' | 'finance'
    commandKey: string | null
    blockers: string[]
  }>
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. No write path before Slice 0 checkpoint and Slice 2 preview.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Workflow corrupts payroll/contractor state | payroll/contractor/hr | medium | Preview + command composition + no-regression gates | payroll/contractor test failures |
| Partial apply leaves inconsistent rails | data/reliability | medium | Workflow state machine + idempotency + audit | partially_applied count >0 |
| UI bypasses specialized permissions | identity/access | medium | Capability checks per step, not just page access | 403/latent capability tests |
| Scope expands into all domains at once | delivery | high | First write path must be narrow | Plan review |

### Feature flags / cutover

Required. Introduce a workflow feature flag default OFF for any runtime surface. Write-path sub-flags required per command family.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert plan/docs | <5 min | si |
| Slice 1 | Revert workflow contract if doc/code only | <10 min | si |
| Slice 2 | Disable preview flag or revert | <10 min | si |
| Slice 3 | Disable write-path flag; use command-specific compensation if needed | varies | parcial |
| Slice 4 | Disable UI flag or revert UI commit | <10 min | si |

### Production verification sequence

1. Staging dry-run/preview only.
2. Execute first write path against approved test subject.
3. Verify before/after across People, Payroll, Contractor and Finance where relevant.
4. GVC for workflow UI.

## Acceptance Criteria

- [ ] Workflow contract is documented and tested.
- [ ] Preview/readiness shows blockers before apply.
- [ ] First write path is narrow and command-based.
- [ ] No raw table writes from UI/server route.
- [ ] Payroll/contractor/finance no-regression gates pass.
- [ ] Feature flag exists for runtime surface/write path.

## Verification

- `pnpm task:lint --task TASK-965`
- `pnpm exec tsc --noEmit --pretty false`
- Focused tests for workflow contract and selected command
- Payroll/contractor no-regression tests if any write touches those rails
- `pnpm lint`
- `pnpm fe:capture <unified-worker-workflow-scenario> --env=local`
- `pnpm docs:context-check`
- `git diff --check`

## Closing Protocol

- [ ] Move file and lifecycle through `in-progress`/`complete`.
- [ ] Update EPIC-017.
- [ ] Update README/registry.
- [ ] Update architecture/ADR if workflow changes source-of-truth or command semantics.
- [ ] Update `Handoff.md`.
