# FINANCE_DOMAIN_AUDIT_2026-05-03

## Status

- Date: 2026-05-03
- Scope: auditoria end-to-end del dominio Finance / Management Accounting / Cost Intelligence / Treasury / Payments en `greenhouse-eo`
- Auditor: Codex usando `greenhouse-finance-accounting-operator`
- Mode: `audit`
- Runtime checked: Cloud SQL dev/staging via `pnpm pg:doctor` + SQL read-only con Cloud SQL Connector
- Mutation policy: read-only audit; no se modifico runtime ni datos
- External benchmarks: IFRS Conceptual Framework, IAS 1, IAS 7, IFRS 7, IFRS 15, IFRS 16, COSO, AICPA/CIMA Global Management Accounting Principles, AFP treasury/payment controls
- Criticality: alta
- Business sensitivity: alta

## Executive Summary

Finance no esta roto de punta a punta; tiene una base transaccional cada vez mas solida. Los fixes recientes de CLP readers, account balances y Payment Orders dejaron buenas defensas en caja/pagos. En runtime vivo, los drifts revisados estan en steady state:

- `finance.account_balances.fx_drift`: `0`
- `expense_payments_normalized.has_clp_drift`: `0`
- `income_payments_normalized.has_clp_drift`: `0`
- `payment_orders paid without expense_payment`: `0`
- `payment_orders dead_letter`: `0`

El problema material esta en la capa de management accounting: Cost Intelligence sigue sirviendo P&L con una mezcla de modelo V0, shortcuts legacy y clasificacion/distribucion incompleta. Abril 2026 aparece `ready = 100%` aunque:

- la reconciliacion bancaria esta configurada como `not_required`
- hay reconciliation periods de abril en estado `open`
- el snapshot `operational_pl` de abril tiene `period_closed = false`
- `overhead_clp` incluye costos que no son overhead operativo

Conclusion practica: **Finance transaccional esta razonablemente defendido; Management Accounting / Cost Attribution / Close Governance no esta listo para cerrar abril como baseline canonico.**

## Audit Scope

### Architecture reviewed

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-777-canonical-expense-distribution-and-shared-cost-pools.md`

### Runtime/code paths reviewed

- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/cost-intelligence/check-period-readiness.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/app/api/finance/cash-position/route.ts`
- `src/app/api/finance/dashboard/summary/route.ts`
- `src/lib/finance/payment-orders/mark-paid-atomic.ts`
- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- `src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts`
- `src/lib/reliability/queries/payment-orders-dead-letter.ts`

### Runtime SQL sampled

- `greenhouse_cost_intelligence.period_closure_config`
- `greenhouse_cost_intelligence.period_closures`
- `greenhouse_serving.operational_pl_snapshots`
- `greenhouse_finance.expenses`
- `greenhouse_finance.payment_orders`
- `greenhouse_finance.payment_order_lines`
- `greenhouse_finance.reconciliation_periods`
- `greenhouse_finance.expense_payments_normalized`
- `greenhouse_finance.income_payments_normalized`
- `greenhouse_finance.account_balances`
- `greenhouse_sync.outbox_reactive_log`

## What Is Healthy

### FIN-HEALTH-001 — CLP normalized payment readers are doing their job

`expense_payments_normalized` and `income_payments_normalized` report `has_clp_drift = 0` in live data. Account balance FX drift also reports `0`.

Evidence:

- `src/lib/reliability/queries/account-balances-fx-drift.ts`
- live SQL: `expense` drift `0`, `income` drift `0`, account balance drift `0`

Assessment:

- This is a strong foundation. Keep extending the TASK-766/TASK-774 pattern to every future cash, balance, treasury and forecast materializer.

### FIN-HEALTH-002 — Payment Orders has a strong atomic path for employee net pay

`markPaymentOrderPaidAtomic` updates order state, audit log, lines, obligations, `expense_payments`, settlement legs and outbox events in one transactional path.

Evidence:

- `src/lib/finance/payment-orders/mark-paid-atomic.ts:146`
- live SQL: `paid without expense_payment = 0`
- live SQL: `payment_orders dead_letter = 0`

Assessment:

- This is the strongest control design in Finance today. It follows COSO-style control expectations better than the older P&L layer.

## Findings

### FIN-AUD-001 — `overhead_clp` is materially contaminated by non-overhead costs

Severity: Critical

April 2026 shared pool candidates include items that should not all be treated as shared operational overhead:

- `Deel Inc.` / Melkin provider payroll: `827,276.88` + `187,975.55`
- `Previred consolidado`: `33,391.33`
- `Xepelin` factoring interest/advisory: `94,557.00` + `30,990.00`
- `COM.MANTENCION PLAN`: `19,522.00`
- HubSpot/Figma/Nubox/Beeconta also enter the same undifferentiated pool, even if some may be valid shared operational overhead

Live April `operational_pl` impact:

- `SKY AIRLINE S A`: `overhead_clp = 3,833,182.06`
- `ANAM`: `overhead_clp = 664,310.94`

Code evidence:

- Shared pool built inline from expenses where `allocated_client_id IS NULL`, `cost_is_direct = false`, and `cost_category IN ('operational', 'infrastructure', 'tax_social')`: `src/lib/sync/projections/member-capacity-economics.ts:670`
- Direct member overhead absorbs `direct_overhead_member_id` rows except `tool_license` / `tool_usage`: `src/lib/team-capacity/tool-cost-reader.ts:124`
- Client P&L consumes `commercialCostRows.overheadCostClp` directly into `overheadClp`: `src/lib/cost-intelligence/compute-operational-pl.ts:465`

Root cause:

- `economic_category` exists, but there is no canonical `expense -> distribution lane` resolver in runtime yet.
- `cost_category` and legacy overhead fields are doing too much semantic work.

Canonical treatment:

- `Deel` / provider payroll -> `provider_payroll` or `member_direct_labor`
- `Previred` -> `regulatory_payment`, anchored to payroll period/person/legal employer
- factoring, bank fees, FX -> `shared_financial_cost`
- HubSpot/Figma/Nubox/Beeconta -> `shared_operational_overhead` only if no stronger tool/member/client anchor exists

Recommended fix:

- Execute `TASK-777` before treating April or May `overhead_clp` as reliable.

### FIN-AUD-002 — Period close readiness is under-gated for finance-grade close

Severity: Critical

April 2026 is `ready = 100%`, but reconciliation is not required and actual reconciliation periods remain open.

Live evidence:

- `period_closure_config.default.require_bank_reconciled = false`
- April 2026 closure row: `closure_status = ready`, `readiness_pct = 100`, `reconciliation_status = not_required`
- April 2026 reconciliation periods: `2` rows, `status = open`, `statement_imported = 0`
- April 2026 `operational_pl_snapshots.period_closed = false`

Code evidence:

- `checkPeriodReadiness` maps reconciliation to `not_required` when config does not require bank reconciliation: `src/lib/cost-intelligence/check-period-readiness.ts:340`
- `reconciliationClosed` becomes true only because status is `not_required`: `src/lib/cost-intelligence/check-period-readiness.ts:349`

Root cause:

- The readiness model currently checks existence/completeness signals, not finance-grade evidence. It can mark a period ready without bank reconciliation, lane purity, or distribution-policy checks.

Best-practice gap:

- Under IAS 7 / treasury controls / COSO, a month-end finance close should not treat cash/bank reconciliation as irrelevant when P&L and cash dashboards are used for decisions.

Recommended fix:

- Implement `TASK-713` / `TASK-393` with explicit close gates:
  - bank reconciliation policy
  - unresolved economic categories = 0
  - unresolved distribution lanes = 0
  - shared pool contamination = 0
  - CLP drift = 0
  - payment order zombie/dead-letter = 0

### FIN-AUD-003 — `operational_pl` still reads V0 shortcuts as source of truth

Severity: High

`computeOperationalPl` still uses `expenses.allocated_client_id` and `greenhouse_finance.cost_allocations` as direct expense inputs, then overlays commercial cost attribution.

Code evidence:

- Direct expenses by legacy `allocated_client_id`: `src/lib/cost-intelligence/compute-operational-pl.ts:336`
- Additional direct expenses from `cost_allocations`: `src/lib/cost-intelligence/compute-operational-pl.ts:370`
- Labor and overhead added from commercial attribution: `src/lib/cost-intelligence/compute-operational-pl.ts:465`

Live evidence:

- Current April data has no overlap between `allocated_client_id` and `cost_allocations`, but the model allows two direct-cost lanes to coexist without a canonical distribution contract.

Root cause:

- `GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1` explicitly says this is V0, while `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1` says the forward model must be dimensional and member-centered.

Recommended fix:

- Make `operational_pl` consume canonical distribution facts/pools after `TASK-777`, not raw legacy allocation shortcuts.

### FIN-AUD-004 — Some dashboard cash views still mix document-level and payment-level math

Severity: High

Some newer cash series use normalized payment views, but other fields still calculate receivables/payables or expense cash from document-level fields.

Code evidence:

- `cash-position` AR/AP subtracts `amount_paid * exchange_rate_to_clp` from document totals: `src/app/api/finance/cash-position/route.ts:64`
- `dashboard/summary` expense cash series uses `expenses.payment_status = 'paid'` and `total_amount_clp`, not `expense_payments_normalized`: `src/app/api/finance/dashboard/summary/route.ts:145`

Root cause:

- TASK-766 migrated several payment KPIs, but not every dashboard field has fully separated accrual/document logic from cash/payment logic.

Recommended fix:

- Create a follow-up task to finish the document-vs-cash semantic contract across dashboard summary, cash position, aging, and finance analytics.
- Reuse normalized payment readers for cash, and document ledgers for accrual.

### FIN-AUD-005 — Payment Orders V1 is strong but still too narrow for full Finance close

Severity: High

The atomic mark-paid path only supports `payroll/employee_net_pay`. Lines outside that lane throw `out_of_scope_v1`.

Code evidence:

- `markPaymentOrderPaidAtomic` blocks non-`employee_net_pay` lines: `src/lib/finance/payment-orders/mark-paid-atomic.ts:281`

Runtime implication:

- Previred / employer social security / provider payroll / Global66-like execution still needs canonical runtime completion before Finance can close payroll-adjacent obligations end-to-end.

Recommended fix:

- Prioritize `TASK-707`, `TASK-707a`, `TASK-707b`, `TASK-756`, `TASK-757` and connect them to close gates.

### FIN-AUD-006 — Finance has many control tasks, but no single finance control tower contract yet

Severity: Medium

Open tasks already identify the missing pieces:

- `TASK-416` Finance Metric Registry Foundation
- `TASK-425` Metric Dependency DAG
- `TASK-397` financial costs integration
- `TASK-398` management accounting hardening
- `TASK-396` variance/forecast/executive control tower
- `TASK-777` distribution lanes and shared pools

Root cause:

- The domain is evolving through strong slices, but Finance lacks a single explicit "control tower" contract that says which numbers are authoritative, degraded, provisional, closeable, or restated.

Recommended fix:

- Promote these into a finance/management-accounting epic or program with ordered gates:
  - facts/readers
  - distribution lanes
  - close governance
  - metric registry/DAG
  - planning/forecast
  - executive surface

## Close Guidance

### April 2026

Decision: `provisional` / `restatement-needed`

Do not treat April 2026 as a canonical management-accounting close. It can be used for directional review if clearly labeled provisional. It should be restated after `TASK-777` separates provider payroll, regulatory payments, financial costs and shared operational overhead.

### May 2026

Decision: `do-not-close-until-gated`

May should become the first finance-grade close only after the minimum gates exist:

- no unresolved `economic_category`
- no unresolved distribution lane
- no provider payroll/regulatory/financial costs inside `overhead_clp`
- bank reconciliation policy satisfied or explicitly waived by documented policy
- CLP/payment/account balance drift signals steady at `0`
- payment orders and obligations steady at `0` zombies/dead-letters

## Recommended Roadmap

### P0 — Protect decision quality now

- Label April 2026 as provisional in any finance review.
- Do not close April as final until restatement path exists.
- Keep using existing CLP/payment/account-balance readers; they are currently healthy.

### P1 — Fix management accounting root cause

- Execute `TASK-777`.
- Implement canonical `expense -> distribution lane`.
- Split `shared_operational_overhead` from `shared_financial_cost`.
- Refactor `member_capacity_economics`, `commercial_cost_attribution`, and `operational_pl` to consume the new lane contract.

### P1 — Harden close governance

- Implement close gates from `TASK-713` / `TASK-393`.
- Add material close blockers for reconciliation, lane ambiguity, CLP drift and payment-order health.
- Require explicit provisional/restate status when gates fail.

### P2 — Finish treasury/payment coverage

- Complete Previred/provider payroll/social-security/payment processor lanes.
- Extend Payment Orders beyond `employee_net_pay`.
- Ensure reconciliation sees settlement legs and payment instruments consistently for all obligation kinds.

### P2 — Build Finance Control Tower

- Finish metric registry, dependency DAG, variance/forecast and executive control tower tasks.
- Make every visible Finance metric declare:
  - source reader
  - accounting lens
  - freshness
  - close status
  - degradation reason
  - owner task/doc

## Verification

Executed:

- `pnpm pg:doctor`
- read-only SQL against Cloud SQL dev/staging through Cloud SQL Connector
- static inspection with `rg`, `nl`, and targeted file reads

Not executed:

- `pnpm test`
- `pnpm lint`
- browser/manual UI verification

Reason:

- This was a read-only audit and documentation update, not a runtime implementation.
