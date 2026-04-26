# TASK-664 — Nubox Payment Graph & Expense Ledger Reconciliation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-224`
- Branch: `task/TASK-664-nubox-payment-graph-expense-ledger-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Converger movimientos bancarios Nubox hacia un payment graph explicable:
movement -> document -> payment -> settlement -> bank statement. El primer gap
concreto es que expense-side use `recordExpensePayment()` en vez de marcar pagos
directamente en `expenses`.

## Why This Task Exists

Income-side ya escribe `income_payments`, pero purchases/expenses todavía pueden
quedar como estado embebido. Eso impide explicar parciales, discrepancias y
settlements de forma simétrica.

## Goal

- Usar ledgers canónicos para cobros y pagos Nubox.
- Modelar linkage Nubox movement/document/payment.
- Exponer discrepancias, parciales, aging y reconciliation status.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md`

## Normative Docs

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md`
- `docs/tasks/plans/TASK-640-plan.md`

## Dependencies & Impact

### Depends on

- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `greenhouse_conformed.nubox_bank_movements`

### Blocks / Impacts

- payable aging
- cash position
- Finance data quality
- Cost Intelligence and client economics

### Files owned

- `src/lib/nubox/sync-nubox-to-postgres.ts`
- `src/lib/finance/payment-ledger*.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `recordPayment()` for income.
- `recordExpensePayment()` for expense payments.
- settlement groups/legs.
- payment ledger remediation scripts.

### Gap

- expense Nubox movement projection does not consistently use
  `recordExpensePayment()`.
- no explicit Nubox payment graph/linkage table.
- partial payment and discrepancy semantics need policy.

## Scope

### Slice 1 — Expense-side convergence

- Route Nubox debit movements through `recordExpensePayment()`.
- Preserve backward-compatible materialized status fields.

### Slice 2 — Linkage model

- Add movement/document/payment linkage for explainability.

### Slice 3 — Discrepancy policy

- Define automatic vs human-review thresholds.

## Out of Scope

- Renaming `income`/`expenses` schemas.
- Rebuilding bank reconciliation UI.

## Acceptance Criteria

- [ ] Expense Nubox payments write canonical ledger rows.
- [ ] Partial and discrepancy cases are explainable.
- [ ] Existing Finance/Cost consumers do not regress.

## Verification

- `pnpm migrate:create <name>` if schema is needed.
- `pnpm migrate:up`
- `pnpm lint`
- `pnpm test --run src/lib/finance src/lib/nubox`
- replay on a known period.

## Closing Protocol

- [ ] Lifecycle/folder/index synced.
- [ ] Migration + `src/types/db.d.ts` committed together if applicable.
