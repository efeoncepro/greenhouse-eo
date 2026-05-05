# TASK-797 — Contractor Closure + Transition Controls

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
- Branch: `task/TASK-797-contractor-closure-controls`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar cierre contractor como lifecycle propio: no finiquito, no payroll dependent, con checks de invoices/submissions pendientes, provider termination refs, access handoff, assets/documentos y pagos futuros.

## Why This Task Exists

Terminar una relacion contractor no debe disparar finiquito laboral. Pero tampoco puede ser solo desactivar usuario: quedan invoices, work submissions, provider refs, documentos, access handoff y payment obligations pendientes.

## Goal

- Crear contractor closure state/checklist.
- Block closure or mark exceptions for open financial/operational items.
- Prevent future payables after closure unless explicitly allowed as post-closure invoice.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Contractor closure does not trigger `final_settlements`.
- Access offboarding remains separate from contractual closure.
- Open invoices and approved post-closure invoices must be explicit.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`

### Blocks / Impacts

- Impacts People 360, HR contractor workbench and access handoff.

### Files owned

- `src/lib/contractor-engagements/closure/**`
- `src/lib/workforce/offboarding/**`
- `src/views/greenhouse/people/**`
- `migrations/**`

## Current Repo State

### Already exists

- Workforce offboarding foundation for employee relationships.
- Identity/access docs distinguish startup policy and permissions.

### Gap

- No contractor-specific closure/readiness.
- No blocker preventing accidental final settlement lane for contractors.

## Scope

### Slice 1 — Closure schema/state

- Add contractor closure fields/table/events as local pattern dictates.
- Track closure reason, effective date and provider termination refs.

### Slice 2 — Closure readiness

- Check open invoices, submissions, payables, obligations/orders, assets/docs and access handoff.

### Slice 3 — Post-closure payment policy

- Allow documented post-closure invoices only when service period/evidence policy permits.
- Prevent new work submissions after closure.

## Out of Scope

- Automated provider termination API.
- Device/asset management full automation.
- Employee finiquito.

## Acceptance Criteria

- [ ] Contractor closure never exposes "Calcular finiquito".
- [ ] Open invoice/submission/payable blockers are visible.
- [ ] Post-closure invoice path is explicit and audited.
- [ ] New work submissions are blocked after closure.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Unit tests for closure readiness and post-closure policy.
- UI smoke if closure surface is implemented.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
