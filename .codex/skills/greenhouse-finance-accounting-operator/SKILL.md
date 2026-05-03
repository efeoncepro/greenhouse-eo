---
name: greenhouse-finance-accounting-operator
description: Investigate, design, audit, and explain Greenhouse finance and accounting work across management accounting, cost accounting, fiscal/tax treatment, treasury, cashflow, payments, reconciliation, P&L, budgeting, variance, forecasting, and financial controls.
---

# Greenhouse Finance & Accounting Operator

Use this skill when the task touches finance, accounting treatment, payment flows, cash balances, reconciliation, tax/IVA, payroll-finance boundaries, cost attribution, period close, budget, variance, forecast, or any metric that can drift because Greenhouse is mixing accounting layers.

This skill is for **investigation, architecture, diagnosis, and remediation design**. It is not legal or tax advice. When current tax rates, legal thresholds, or official filing rules matter, verify against official sources before concluding.

## External Benchmarks

This skill must not rely only on Greenhouse repo conventions. It should also reason from widely used accounting, reporting, treasury, and control frameworks:

- `IFRS Conceptual Framework`
  - use it to evaluate whether a number is being presented in a way that is decision-useful, comparable, and faithful to the economics
- `IAS 1 Presentation of Financial Statements`
  - use it when deciding how results, subtotals, classifications, comparative periods, and restatements should be presented
- `IAS 7 Statement of Cash Flows`
  - use it to separate operating, investing, and financing cash movements and to avoid confusing settlement mechanics with operating P&L
- `IFRS 7 Financial Instruments: Disclosures`
  - use it when financing instruments, supplier finance, risk concentration, liquidity, or settlement disclosures are involved
- `IFRS 15 Revenue from Contracts with Customers`
  - use it when timing of revenue recognition or revenue-vs-cash misunderstandings affect margin or P&L interpretation
- `IFRS 16 Leases`
  - use it when subscription, lease, or committed fixed-cost structures are being discussed and the economics may be hidden by cash timing
- `COSO Internal Control — Integrated Framework`
  - use it for maker-checker, reconciliation, evidence trails, approval controls, segregation of duties, and close governance
- `AICPA/CIMA Global Management Accounting Principles`
  - use them for cost transparency, causality, attribution, planning, performance management, scenario analysis, and decision support
- `AFP treasury and payments controls guidance`
  - use it for payment operations, fraud control, bank-account governance, callback controls, settlement discipline, and cash visibility

When the repo runtime disagrees with external best practice, do not silently follow the repo. Surface the drift and explain whether the repo is intentionally pragmatic, temporarily incomplete, or actually wrong.

## First Reads

Read only what the task needs, in this order:

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

If the task is narrower, also read the domain-specific docs that apply:

- tax / IVA: `docs/documentation/finance/categoria-economica-de-pagos.md`, `docs/documentation/finance/iva-compras-recuperabilidad.md`
- treasury / bank / reconciliation: `docs/documentation/finance/modulos-caja-cobros-pagos.md`, `docs/documentation/finance/conciliacion-bancaria.md`
- payroll-finance bridge: `docs/documentation/hr/pagos-de-nomina.md`, `docs/documentation/hr/periodos-de-nomina.md`
- payment operations: `docs/documentation/finance/ordenes-de-pago.md`, `docs/documentation/finance/payment-orders-bank-settlement-resilience.md`

## References

- `references/greenhouse-finance-runtime-map.md`: repo-specific source-of-truth map, runtime lanes, critical readers, and anti-patterns.
- `references/accounting-finance-playbook.md`: decision framework for management accounting, fiscal accounting, financial costs, cashflow, P&L, and period governance.
- `references/finance-operations-runbooks.md`: execution playbooks for audit, close, reopen, restatement, reconciliation, cashflow, classification, and P&L review.

## What This Skill Covers

- management accounting
  - fully-loaded cost
  - client / org / BU / service P&L
  - margin explainability
  - budget, variance, forecast, restatements
- cost accounting
  - cost attribution
  - labor vs direct non-labor vs shared overhead
  - member-loaded model
  - provider/tool/member/client/period dimensional thinking
- fiscal / tax accounting
  - `expense_type` vs `economic_category`
  - IVA recoverability
  - tax snapshots and fiscal/documentary boundaries
  - SII / Nubox / legal reporting boundaries
- financial accounting and treasury
  - bank balances
  - payment instruments
  - liabilities
  - payment orders
  - settlement legs
  - factoring / FX / bank fees / treasury costs
- cashflow and payments
  - income / expense payment ledgers
  - CLP-normalized readers
  - processors vs bank accounts
  - account balance and cash-position integrity
- operational finance controls
  - period close
  - reopen vs restatement
  - reliability signals
  - stale/degraded snapshot handling

## Core Rules

1. Always separate the accounting layer you are talking about:
   - transactional finance
   - management accounting
   - fiscal/tax
   - treasury/cash
   - payroll/provider-payroll

2. Do not treat Greenhouse as legal general ledger software unless the task explicitly extends that boundary.

3. The member is the atomic unit of loaded cost. Clients consume members; members consume labor, tools, and policy-based overhead.

4. `economic_category` is mandatory input for analytics, but it is not the final distribution decision by itself.

5. Never hide payroll, regulatory payments, or financial costs inside generic `overhead` without an explicit policy and explanation.

6. Payment processors are not bank accounts. `Previred`, `Deel`, `Global66`, and similar rails must not invent cash ledgers they do not own.

7. Never recompute payment CLP math ad hoc when canonical normalized readers or VIEWs already exist.

8. If a metric is wrong, trace the full chain:
   - source transaction
   - normalized reader
   - serving snapshot
   - consumer/query/UI

9. Prefer root-cause fixes in the canonical primitive over local patches in a dashboard or single endpoint.

10. If the correct treatment is ambiguous, surface the ambiguity explicitly instead of silently classifying it.

## Decision Framework

Classify every finance/accounting request into one or more of these lenses before acting:

1. `management_accounting`
   - “How profitable was client X?”
   - “Should this hit operating margin or below-margin financial costs?”

2. `cost_accounting`
   - “Does this belong to a member, a client, a shared pool, or nowhere yet?”

3. `fiscal_accounting`
   - “How should the document be classified for IVA/tax/legal reporting?”

4. `treasury_cash`
   - “Which account really moved cash?”
   - “Is this settled, pending, processor-transit, or merely documented?”

5. `period_governance`
   - “Can we close/reopen/restate this period safely?”

6. `planning_control`
   - “How should this appear in budget / variance / forecast?”

7. `controls_audit`
   - “Is the process auditable, reviewable, and defensible under normal finance controls?”
   - “Would this survive a controller, auditor, or treasury review?”

## Canonical Treatment Heuristics

Use these as starting hypotheses, then verify against runtime evidence:

- provider payroll (`Deel`, EOR, international rail) -> `provider_payroll` or `member_direct_labor`, not generic overhead
- employer social security / `Previred` -> `regulatory_payment`, anchored to payroll period and legal employer context
- tool subscriptions / SaaS with member assignment -> `member_direct_tool` or structured shared overhead via tool model
- business-wide SaaS without seat/member link -> `shared_operational_overhead`
- bank maintenance, factoring fees, FX loss, treasury carry -> `shared_financial_cost` unless strong client-direct evidence exists
- direct client reimbursement or one-off scoped vendor cost -> `client_direct_non_labor`
- internal transfers / treasury transit / settlement hops -> not operating cost; treat as treasury movement unless proven otherwise

## Best-Practice Prompts

When using this skill, pressure-test the situation with questions like:

- Is this number wrong in `economics`, in `financial reporting`, in `cash reporting`, or in more than one layer?
- Is the current treatment faithful to the economic substance, or is it only convenient for the current schema?
- Does this classification improve comparability across periods and clients?
- Would a finance controller accept this allocation policy and be able to explain it to leadership?
- Would a treasury operator accept this cash classification and reconcile it against bank evidence?
- Does the system distinguish `expense recognition`, `cash settlement`, and `management distribution`, or is it collapsing them into one shortcut?
- Is the current close safe, or would best practice require provisional close, reopen, or restatement?
- Is a direct attribution rule stronger than a shared-pool heuristic?
- Are we mixing operating performance with financing effects?
- Are we mixing payroll/regulatory obligations with overhead just because the system lacks a better lane?

## Market-Grade Control Expectations

Assume mature finance operations normally expect all of the following unless the task proves otherwise:

- documented allocation policies for shared costs
- explicit separation of operating costs, financial costs, and regulatory liabilities
- reproducible period-close criteria
- reconciliation from source documents to normalized readers to management views
- maker-checker or equivalent review for sensitive payment actions
- audit trails for manual reclassification or override actions
- clear distinction between bank cash, processor transit, and accounting accruals
- comparatives and restatement discipline when period numbers change materially
- scenario-based cash forecasting rather than static single-point cash expectations
- fraud-aware payment controls, especially for bank detail changes, callbacks, and exceptional wires

## Workflow

1. Classify the question by accounting lens.
2. Identify the source-of-truth layer.
3. Read the real code path and serving tables involved.
4. Reconstruct the data path end-to-end.
5. Decide whether the issue is:
   - classification
   - distribution
   - normalization
   - timing / period governance
   - stale materialization
   - consumer misuse
6. Recommend the narrowest canonical fix that removes the class of error.
7. Verify with runtime readers, staging requests, tests, or SQL evidence.

## Execution Modes

Use one of these explicit modes so the work does not stay at vague diagnosis:

1. `audit`
   - investigate a number, flow, period, client, account, or policy
   - produce findings, root cause, and treatment guidance

2. `recommend`
   - compare treatment options using accounting substance, controls, and operating tradeoffs
   - propose the safest canonical policy

3. `execute`
   - implement the smallest repo/runtime/doc change that fixes the class of issue
   - include validation and rollout notes

4. `close_governance`
   - decide whether a period is safe to close, should close provisionally, or should reopen/restate

5. `reconcile`
   - reconstruct cash, payment, or attribution deltas from source to snapshot

## Runbook Catalog

When the task matches one of these, follow the corresponding runbook in `references/finance-operations-runbooks.md`:

- `audit_overhead_and_cost_allocation`
- `review_client_pl`
- `classify_expense_or_payment`
- `reconcile_cash_and_balances`
- `review_cashflow_and_liquidity`
- `close_month_or_period`
- `reopen_or_restate_period`
- `review_payment_controls`
- `review_budget_vs_actual_vs_forecast`

Default rule:

- if the user asks “what is inflating this?”, start with `audit_overhead_and_cost_allocation`
- if the user asks “can we close?”, use `close_month_or_period`
- if the user asks “where should this live?”, use `classify_expense_or_payment`
- if the user asks “why doesn’t this match the bank/cash?”, use `reconcile_cash_and_balances`
- if the user asks “how healthy is the business financially?”, combine `review_client_pl` + `review_cashflow_and_liquidity`

## Repo-Specific Watchlist

Check these risk areas first when numbers smell wrong:

- `src/lib/sync/projections/member-capacity-economics.ts`
  - shared overhead pool contamination
  - provider-payroll or regulatory costs leaking into `direct_overhead_target`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
  - labor/overhead summarization by client
- `src/lib/cost-intelligence/compute-operational-pl.ts`
  - inflated `overhead_clp`
  - consumers mixing direct costs, labor, and overhead incorrectly
- `src/lib/team-capacity/tool-cost-reader.ts`
  - `direct_overhead_member_id` shortcuts absorbing things that are not real overhead
- `src/lib/finance/*normalized*` and payment readers
  - CLP normalization
  - supersede filters
- period close / restatement lanes
  - `TASK-713`
  - `TASK-393`

## Verification Commands

Use the smallest set that proves the claim:

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- `pnpm pg:doctor`
- `pnpm staging:request /api/finance/intelligence/operational-pl?year=<YYYY>&month=<MM>&scope=client --pretty`
- `pnpm staging:request /api/finance/bank --pretty`
- targeted SQL / reader checks against the real serving tables and canonical helpers
- authoritative-source check when the answer depends on current external standards, legal rules, filing thresholds, or market practice details

## Output Format

For investigations, answer with:

- `Decision`: pass, warning, block, provisional, or restatement-needed
- `Accounting Lens`: which layers are involved
- `Scope`: period, clients, accounts, expenses, payments, or code paths reviewed
- `Findings`: ordered by severity with source path or table
- `Canonical Treatment`: where each disputed amount should live
- `Root Cause`: classification, distribution, timing, stale materialization, or consumer misuse
- `Recommended Fix`: canonical primitive / task / migration path
- `Close Guidance`: whether the period can close, should close provisionally, or must restate
- `Verification`: commands or runtime checks executed

For execution work, also include:

- `Changes Applied`: code, doc, task, or config changes made
- `Rollout Notes`: what should happen before or after deploy/close
- `Residual Risk`: what remains unresolved or intentionally provisional
