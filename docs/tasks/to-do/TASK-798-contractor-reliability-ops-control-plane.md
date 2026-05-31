# TASK-798 — Contractor Reliability + Ops Control Plane

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Reframe requerido para EPIC-017 gap taxonomy before execution`
- Rank: `TBD`
- Domain: `ops|finance|hr|reliability`
- Blocked by: `TASK-790, TASK-793, TASK-959, TASK-962`
- Branch: `task/TASK-798-contractor-reliability-ops`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar reliability signals, Ops Health surfacing, docs/manuales y runbooks para contractor engagements/payables, pero reescrito para consumir la gap taxonomy de `TASK-959`/`TASK-962` cuando el signal cruce relación, compensation, readiness o payment rail.

No crear un control plane contractor-local que duplique los gaps de EPIC-017.

> **Alineación dimensión Entidad Contratante (2026-05-30):** los signals consolidan los introducidos por las tasks previas, incluyendo los de TASK-795 (`manual_review_overdue`, `fx_unresolved_overdue`, `provider_settlement_unreconciled`) y `hr.contractor_payable.honorarios_rut_unverified` (TASK-794, ya shipped). Cuando exista multi-entidad (Efeonce US Inc), agregar un signal de "engagement con entidad contratante chilena + no-residente + sin policy de withholding (905) resuelta" para visibilizar los que quedan en manual. SSOT del modelo: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30.

## Why This Task Exists

El dominio contractor cruza HR, Payroll, Finance, Identity y providers. Sin señales operativas, los bloqueos quedan como estados locales invisibles hasta que alguien no cobra o se paga duplicado.

Después de `TASK-959`, parte de esos bloqueos ya pertenecen a una taxonomía workforce compartida: relationship coverage, compensation lineage, payment rail evidence, obligation lineage y readiness. Esta task sigue siendo válida, pero debe observar esos gaps desde el control plane contractor en vez de inventar categorías paralelas.

## Goal

- Registrar signals deterministicas de contractor/payables.
- Reusar gap codes y dispositions de `TASK-959`/`TASK-962` cuando aplique.
- Exponer steady state y evidencia en Ops Health/Admin Center.
- Documentar runbooks y manuales para HR/Finance/contractor.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Signals deterministicas first, AI advisory later.
- Steady state and evidence must be explicit.
- Docs must not duplicate architecture; link canonical doc and document operations.
- Workforce/payment rail gaps must reuse `TASK-959` gap codes where possible.
- Contractor-local signals must not hide People/Person 360 workforce gaps.
- Signals are read-only; no remediation/write path in this task.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`
- `TASK-959`
- `TASK-962`
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

### Slice 0 — Gap taxonomy alignment

- Map proposed contractor signals to existing `TASK-959` gap codes:
  - payment rail evidence;
  - obligation lineage;
  - readiness blocked/unresolved;
  - provider reconciliation drift.
- Decide which signals remain contractor-local and which should be EPIC-017 workforce signals.
- Remove or rename any duplicate drift category.

### Slice 1 — Signals

- Add missing tax owner, FX readiness blocked, duplicate candidate, invoices unapproved past due, finance bridge lag, provider unclassified/reconciliation lag and missing ICO snapshot where applicable.
- For payment rail/readiness/obligation lineage, emit evidence compatible with EPIC-017 gap taxonomy.

### Slice 2 — Ops/Admin surfacing

- Add summaries to existing Ops Health/Admin patterns without inventing a new console.

### Slice 3 — Documentation

- Add functional docs and manuales for HR, Finance and contractor self-service once surfaces exist.

## Payroll Non-Regression Guardrails (hard rules)

798 agrega signals read-only; observabilidad nunca muta payroll ni finance.

- **NUNCA** escribir en tablas de payroll/finance desde un signal reader. Los readers de contractor reliability son estrictamente read-only.
- **NUNCA** validar las queries SQL de los signals contra `db.d.ts` como ground truth; verificar tipos reales contra PG (gate TASK-893: `date - date = integer`, no `EXTRACT(EPOCH FROM date)`).
- **NUNCA** invocar `Sentry.captureException` directo; usar `captureWithDomain` para el rollup correcto del subsystem.

## Out of Scope

- AI recommendations beyond deterministic evidence.
- Full provider reconciliation automation if `TASK-795` has not shipped it.
- Data fixes, payable transitions, payment execution or Person 360 UI changes.

## Acceptance Criteria

- [ ] Signals exist with steady state, severity and evidence.
- [ ] Signals that overlap EPIC-017 reuse `TASK-959`/`TASK-962` gap taxonomy.
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
