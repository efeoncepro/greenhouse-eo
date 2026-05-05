# TASK-795 — International Contractor + Provider Boundary + FX Policy

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain`
- Blocked by: `TASK-790, TASK-793`
- Branch: `task/TASK-795-international-contractor-provider-fx`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar frontera internacional para contractors directos, provider contractors via Deel/Remote/Oyster y EOR/provider, con tax owner, provider refs, charge/payout split y FX policy explicita.

## Why This Task Exists

Greenhouse trabaja internacionalmente, pero no debe fingir que tiene un motor tributario global. Para contractors fuera de Chile, el sistema debe distinguir quien posee compliance/tax/payout: Greenhouse policy, provider, country engine o manual review.

## Goal

- Modelar direct international vs provider-owned vs EOR/provider.
- Declarar tax/compliance owner and FX policy before readiness.
- Store provider invoice/payout/contract refs and provider fee split.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`

Reglas obligatorias:

- Do not apply Chile statutory deductions to international/provider contractors by default.
- Currency and payment currency must be explicit.
- Missing reliable FX policy blocks `ready_for_finance`.
- Provider fees and FX spreads are separate from worker gross/net.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`
- `TASK-752` and `TASK-753` where payment profile coverage/self-service is needed.

### Blocks / Impacts

- Impacts Finance cost classification, provider reconciliation and payment routing.

### Files owned

- `src/lib/contractor-engagements/international/**`
- `src/lib/finance/payment-routing/**`
- `src/lib/finance/expense-taxonomy.ts`
- `migrations/**`

## Current Repo State

### Already exists

- Payroll has `payRegime='international'` and `payrollVia='deel'` concepts.
- Finance economic category has `labor_cost_external`.
- Payment routing can choose provider rails when profile says Deel.

### Gap

- Contractor/provider refs and FX/tax owner are not first-class in payables.
- Provider charge/payout/fee split is not ready for reconciliation.

## Scope

### Slice 1 — International policy model

- Add policy resolver for direct international, provider contractor and EOR/provider.
- Require tax owner and country/tax residency.

### Slice 2 — FX readiness

- Add FX rate source/date policy/spread owner validation.
- Block ready state when cross-currency path is not explicit.

### Slice 3 — Provider data contract

- Store provider contract, worker, invoice and payout IDs.
- Split worker payout, provider fee, tax/withholding reported by provider and FX fee/spread.

### Slice 4 — Finance classification

- Map provider/direct contractor costs to correct economic category and obligation metadata.

## Out of Scope

- Full Deel/Remote/Oyster API sync.
- Country-specific tax engines beyond Chile honorarios.
- Stablecoin/crypto rails.

## Acceptance Criteria

- [ ] Direct international contractor requires manual review or country policy before payment readiness.
- [ ] Provider-owned contractor can store provider refs and split charge/payout/fee.
- [ ] Cross-currency payable cannot become ready without FX policy.
- [ ] Chile deductions are never applied to international/provider contractor payables.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Unit tests for policy resolver and FX readiness.
- Payroll auditor checklist applied in task audit.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
