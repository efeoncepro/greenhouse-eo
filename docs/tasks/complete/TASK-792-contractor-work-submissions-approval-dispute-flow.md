# TASK-792 — Contractor Work Submissions + Approval/Dispute Flow

## Delta 2026-05-30

- **TASK-791 ✅ complete**: existe `greenhouse_hr.contractor_invoice_assets` (ledger append-only de soportes) + contexts de asset contractor + helper `attachContractorInvoiceAsset`. Cuando esta task cree el aggregate `greenhouse_hr.contractor_invoices`, debe (a) agregar la FK `contractor_invoice_assets.contractor_invoice_id → contractor_invoices` (additivo, la columna ya existe NULL), y (b) setear `contractorInvoiceId` al llamar `attachContractorInvoiceAsset`. Evidencia de work submissions usa contexto `contractor_work_evidence_draft` vía el uploader canónico.

## Delta 2026-05-29

- Desbloqueado por **TASK-790 ✅ complete**: `greenhouse_hr.contractor_engagements` ya existe con módulo `src/lib/contractor-engagements/`. Las work submissions FK-anclan a `contractor_engagement_id`. Respetar `requires_work_approval` del engagement como gate de approval antes de payable. Outbox events nuevos siguen el patrón v1 (`workforce.contractor_work_submission.*`) ya documentado en el arch doc.

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

- [x] Timesheet/milestone/deliverable submissions can be created. — `createContractorWorkSubmission` (6 submission_types, gross derivado para timesheet).
- [x] Approval/dispute/reject transitions are validated and audited. — `reviewContractorWorkSubmission` + state-machine trigger DB + append-only events; dispute/reject reason ≥10.
- [x] Evidence refs are preserved and retrievable. — D-792-1: `contractor_invoice_assets.contractor_work_submission_id` (additivo) + `attachContractorInvoiceAsset` extendido; delivery refs en metadata_json.
- [x] Approved submission can be consumed by payable readiness. — `listWorkSubmissionsReadyForPayable` (approved ∧ unconsumed) + `markContractorWorkSubmissionConsumed`.
- [x] Duplicate payable candidates are blocked or flagged. — D-792-3: `consumed_by_payable_id` + markConsumed idempotente rechaza doble consumo.
- [x] Payroll non-regression: suite `src/lib/payroll` verde (522 passed, 0 failed); cero escritura a `payroll_adjustments`/`payroll_entries`/`compensation_versions`.

## Closing Note (2026-05-30)

Implementado en `develop` (sin rama, instrucción del operador). 3 slices + close.

- **Slice 1** — migración `20260531000000000` (timestamp ubicado después de TASK-791): `contractor_work_submissions` (state machine + CHECK enums + approved-requires-gross CHECK + transition trigger) + append-only `contractor_work_submission_events` (anti-UPDATE/DELETE) + ALTER `contractor_invoice_assets` ADD `contractor_work_submission_id` (D-792-1) + `consumed_by_payable_id` forward-compat (D-792-3) + types + pure state-machine (8 tests) + readers (incl. readiness).
- **Slice 2** — workflow (create/updateDraft/submit/review/cancel/markConsumed) en tx + outbox v1 (5 events) + capabilities `hr.contractor_work_submission` + `.review` (catalog + grants, grant-coverage verde) + API `/api/hr/contractors/work-submissions` (+ `[id]`) + extensión del helper de evidencia TASK-791.
- **Slice 3** — signal `hr.contractor_work_submission.review_overdue` (drift, moduleKey identity, steady=0).

**Decisiones (no había `## Open Questions`):** D-792-1 evidencia reusa el ledger TASK-791 (columna additiva); D-792-2 amount basis (quantity/unit/rate_snapshot/gross); D-792-3 consumed_by_payable_id forward-compat + readiness reader; D-792-4 2 capabilities least-privilege; D-792-5 state machine + reason ≥10 dispute/reject; D-792-6 UI deferida a TASK-796.

**Gates verdes:** tsc 0 · full lint 0 · `pnpm build` ✓ (rutas compiladas) · `pnpm test` 5546 passed / 0 failed · `pnpm vitest run src/lib/payroll` 522 passed / 0 failed · grant-coverage guard ✓ · DB defense-in-depth verificado live en tx rolled-back (transition 23514, approve-requires-gross 23514, anti-UPDATE/DELETE 23001, enum CHECK 23514) · signal live steady=0.

**Skills:** greenhouse-backend. (Payroll non-regression: cero touch a payroll.)

**Pendiente (out of scope V1, desbloqueado):** TASK-793 (payables → Finance — consume `listWorkSubmissionsReadyForPayable` + `markContractorWorkSubmissionConsumed` + agrega FK a `consumed_by_payable_id`), TASK-796 (self-service UI).

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Unit tests for state machine and duplicate guard.
- Focused API tests where route patterns exist.
- `pnpm vitest run src/lib/payroll` — payroll non-regression gate.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
