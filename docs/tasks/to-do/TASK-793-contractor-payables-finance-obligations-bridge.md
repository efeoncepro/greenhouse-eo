# TASK-793 — Contractor Payables to Finance Payment Obligations Bridge

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-790, TASK-791, TASK-792, TASK-749, TASK-750`
- Branch: `task/TASK-793-contractor-payables-finance-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear `ContractorPayable` como obligacion economica aprobada previa a Finance y un bridge idempotente hacia `greenhouse_finance.payment_obligations`, manteniendo a Finance como owner de payment orders, banco y conciliacion.

## Why This Task Exists

Contractor payment no debe ser payroll adjustment ni expense generico directo. Hace falta un source aggregate con readiness, dedupe, tax owner, FX policy, invoice/submission refs y payment profile antes de crear obligaciones financieras.

## Goal

- Implementar `greenhouse_hr.contractor_payables`.
- Implementar readiness fail-closed.
- Generar Finance Payment Obligations idempotentes desde payables listos.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Contractor payable aprobado genera obligation, no payment directo.
- Idempotency by `contractor_payable_id`.
- Economic category must be `labor_cost_external`, `payroll` or `provider_payroll` according to source.
- Payment profile resolver remains canonical.

## Dependencies & Impact

### Depends on

- `TASK-790`, `TASK-791`, `TASK-792`.
- `TASK-749`, `TASK-750`.
- `TASK-752` for broader beneficiary coverage where needed.

### Blocks / Impacts

- Blocks `TASK-794`, `TASK-795`, `TASK-796`, `TASK-798`.
- Impacts Finance obligations/orders and payment calendar.

### Files owned

- `migrations/**`
- `src/lib/contractor-engagements/payables/**`
- `src/lib/finance/payment-obligations/**` `[verificar]`
- `src/lib/finance/payment-routing/**`

## Current Repo State

### Already exists

- Payment profiles V1 for member/shareholder.
- Payment obligations/orders architecture and runtime.
- Finance economic category dimension has `labor_cost_external`.

### Gap

- No contractor source aggregate can generate obligations.
- No readiness for invoice asset, FX, tax owner, provider split or duplicates.

## Scope

### Slice 1 — Payable schema/runtime

- Add payable table with invoice/submission refs, gross/withholding/net, currency, payment currency, tax owner, FX policy, payment profile and status.

### Slice 2 — Readiness engine

- Gate approved invoice/submission, asset attached, gross/net reconcile, currency/FX, payment profile, tax owner, provider split and duplicate candidate.

### Slice 3 — Finance bridge

- Consume `workforce.contractor_payable.ready_for_finance.v1`.
- Create payment obligation with source aggregate refs and idempotency.

### Slice 4 — Tests and recovery

- Add tests for duplicate replay, missing profile, missing FX, missing invoice asset and provider split.

## Out of Scope

- Executing the bank payment.
- Provider API import.
- Global tax engine.

## Acceptance Criteria

- [ ] Ready payable creates exactly one Finance obligation after replay.
- [ ] Missing payment profile blocks readiness unless a governed waiver exists.
- [ ] Missing FX policy blocks cross-currency readiness.
- [ ] Duplicate invoice/submission/payable candidates are blocked or flagged.
- [ ] Finance obligation preserves source aggregate `contractor_payable`.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/contractor-engagements src/lib/finance/payment-routing`
- `pnpm pg:doctor`

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
- [ ] Finance architecture delta updated if bridge contract changes.
