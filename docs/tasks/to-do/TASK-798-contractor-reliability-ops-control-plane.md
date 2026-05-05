# TASK-798 — Contractor Reliability + Ops Control Plane

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-790, TASK-793`
- Branch: `task/TASK-798-contractor-reliability-ops`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar reliability signals, Ops Health surfacing, docs/manuales y runbooks para contractor engagements/payables: missing tax owner, FX blocked, duplicate candidates, unapproved invoices, finance bridge lag and provider reconciliation drift.

## Why This Task Exists

El dominio contractor cruza HR, Payroll, Finance, Identity y providers. Sin señales operativas, los bloqueos quedan como estados locales invisibles hasta que alguien no cobra o se paga duplicado.

## Goal

- Registrar signals deterministicas de contractor/payables.
- Exponer steady state y evidencia en Ops Health/Admin Center.
- Documentar runbooks y manuales para HR/Finance/contractor.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Signals deterministicas first, AI advisory later.
- Steady state and evidence must be explicit.
- Docs must not duplicate architecture; link canonical doc and document operations.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`
- `TASK-795` for provider/FX signals when implemented.

### Blocks / Impacts

- Impacts Ops Health, Admin Center and handoff readiness.

### Files owned

- `src/lib/reliability/**`
- `src/config/reliability/**` `[verificar]`
- `docs/documentation/hr/**`
- `docs/manual-de-uso/hr/**`
- `docs/manual-de-uso/finance/**`

## Current Repo State

### Already exists

- Reliability registry pattern.
- Finance and payroll data quality signals.

### Gap

- No contractor-specific signals or operator runbook.

## Scope

### Slice 1 — Signals

- Add missing tax owner, FX readiness blocked, duplicate candidate, invoices unapproved past due, finance bridge lag, provider unclassified/reconciliation lag and missing ICO snapshot where applicable.

### Slice 2 — Ops/Admin surfacing

- Add summaries to existing Ops Health/Admin patterns without inventing a new console.

### Slice 3 — Documentation

- Add functional docs and manuales for HR, Finance and contractor self-service once surfaces exist.

## Out of Scope

- AI recommendations beyond deterministic evidence.
- Full provider reconciliation automation if `TASK-795` has not shipped it.

## Acceptance Criteria

- [ ] Signals exist with steady state, severity and evidence.
- [ ] Ops/Admin can see contractor/payables health without SQL.
- [ ] Runbook explains how to unblock missing tax owner, FX, duplicate and bridge lag.
- [ ] Docs link to architecture and do not duplicate it.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Focused reliability tests.
- Manual Ops Health smoke if UI touched.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] `changelog.md` updated if visible behavior changes.
