# TASK-794 — Chile Honorarios Compliance + SII Retention

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-790, TASK-793`
- Branch: `task/TASK-794-chile-honorarios-compliance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Converger Chile honorarios hacia Contractor Engagements + Payables: boleta/invoice, retencion SII versionada, readiness tributario y exclusion explicita de deducciones dependientes.

## Why This Task Exists

Honorarios hoy puede parecer payroll Chile por vivir cerca de payroll. Eso es peligroso: no aplica AFP, salud, AFC, SIS, mutual ni IUSC dependiente. Debe usar retencion SII por anno de emision y generar payable contractor, no payroll adjustment.

## Goal

- Implementar policy Chile honorarios sobre contractor invoice/payable.
- Versionar retencion SII y snapshots.
- Mantener compatibilidad con payroll legacy mientras se migra el pago flexible.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/types/hr-contracts.ts`

Reglas obligatorias:

- Retencion SII 2026 es `15.25%` desde `2026-01-01`; verificar contra SII antes de cerrar.
- No aplicar deducciones dependientes.
- Classification risk blocks if relationship looks employee-like.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`
- `TASK-784`

### Blocks / Impacts

- Impacts Payroll compatibility readers, Finance obligations and contractor self-service.

### Files owned

- `src/lib/contractor-engagements/chile-honorarios/**`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/types/hr-contracts.ts`
- `migrations/**`

## Current Repo State

### Already exists

- Payroll honorarios calculation helper.
- Person legal profile readiness for `honorarios_closure`.

### Gap

- Honorarios is not yet sourced from ContractorEngagement/Invoice/Payable.
- SII retention snapshot is not part of contractor payable readiness.

## Scope

### Slice 1 — Chile honorarios policy

- Add policy resolver for `honorarios_cl`.
- Snapshot retention rate, emission year and SII folio where present.

### Slice 2 — Payable calculation

- Calculate gross, withholding and net for contractor payable.
- Ensure no dependent deductions can enter.

### Slice 3 — Compatibility and migration guard

- Keep payroll legacy consumers safe.
- Document cutover from honorarios payroll legacy to contractor payables.

## Out of Scope

- F29 filing automation.
- Global tax engine.
- Provider-owned payroll.

## Acceptance Criteria

- [ ] Chile honorarios payable computes retention from versioned SII policy.
- [ ] AFP/salud/AFC/IUSC dependent deductions cannot appear.
- [ ] Missing verified RUT or required boleta data blocks readiness as configured.
- [ ] Classification risk can block payable approval.

## Verification

- `pnpm vitest run src/lib/payroll src/lib/contractor-engagements`
- `pnpm exec tsc --noEmit --pretty false`
- Official SII rate verification documented in task audit before implementation.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
