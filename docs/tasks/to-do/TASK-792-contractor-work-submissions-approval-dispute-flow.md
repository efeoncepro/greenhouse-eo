# TASK-792 — Contractor Work Submissions + Approval/Dispute Flow

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-790, TASK-791`
- Branch: `task/TASK-792-contractor-work-submissions`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar work submissions para contractors: timesheets, milestones, deliverables, project evidence, approval operacional, dispute/reject flow y eventos canonicos antes de generar payables.

## Why This Task Exists

PAYG, milestone y weekly contractor payments no deben nacer solo desde un monto manual. Necesitan evidencia, aprobador, periodo de servicio, estado y trail de disputa para evitar pagos sin soporte y para separar approval operacional de payment execution.

## Goal

- Crear `contractor_work_submissions`.
- Soportar timesheet, milestone, deliverable y support evidence.
- Permitir approval/dispute/reject con audit y readiness downstream.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- Approval de trabajo no equivale a pago ejecutado.
- Submission aprobada puede generar payable solo si engagement/readiness lo permite.
- Evidence refs deben ser assets o refs canonicas, no texto libre como unica evidencia.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-791`

### Blocks / Impacts

- Blocks `TASK-793` for PAYG/milestone lanes.
- Impacts contractor self-service and HR review surfaces.

### Files owned

- `migrations/**`
- `src/lib/contractor-engagements/work-submissions/**`
- `src/app/api/hr/contractors/**`
- `src/views/greenhouse/hr/**` `[verificar]`

## Current Repo State

### Already exists

- Contractor architecture defines submission types and approval requirement.
- Asset infra can store evidence after `TASK-791`.

### Gap

- No work submission aggregate or approval/dispute lifecycle.

## Scope

### Slice 1 — Schema and readers

- Add submissions table with engagement, type, period, amount basis, evidence refs and status.
- Add canonical list/detail readers.

### Slice 2 — Mutation workflow

- Submit, approve, dispute, reject, cancel.
- Require reason for dispute/reject.
- Emit outbox events.

### Slice 3 — Readiness integration

- Expose approved submission as input to contractor payable readiness.
- Prevent duplicate payable candidates for same submission/payable kind.

## Payroll Non-Regression Guardrails (hard rules)

792 modela evidencia de trabajo contractor; aprobación operacional ≠ pago ejecutado. No debe filtrar hacia el motor de nómina. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** alimentar `payroll_adjustments` ni `payroll_entries` desde una work submission aprobada. La submission aprobada es input de readiness del payable (TASK-793), no de payroll.
- **NUNCA** crear `compensation_versions` desde una submission.
- **NUNCA** tratar la aprobación de trabajo como ejecución de pago. Approval es operacional; el pago nace en payable → Finance.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` al cierre para probar que el flujo de submissions no alteró clasificación ni cálculo dependiente.

## Out of Scope

- Finance bridge.
- Contractor portal UI polish.
- Automatic time tracking integration.

## Acceptance Criteria

- [ ] Timesheet/milestone/deliverable submissions can be created.
- [ ] Approval/dispute/reject transitions are validated and audited.
- [ ] Evidence refs are preserved and retrievable.
- [ ] Approved submission can be consumed by payable readiness.
- [ ] Duplicate payable candidates are blocked or flagged.
- [ ] Payroll non-regression: suite `src/lib/payroll` verde; sin escritura a `payroll_adjustments`/`payroll_entries`/`compensation_versions` desde submissions.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Unit tests for state machine and duplicate guard.
- Focused API tests where route patterns exist.
- `pnpm vitest run src/lib/payroll` — payroll non-regression gate.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
