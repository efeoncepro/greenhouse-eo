# Finance Operations Runbooks

## Objective

Turn the finance/accounting skill into an operator, not just an analyst. Each runbook below defines how to investigate, recommend, and execute work in a way that is financially sound, operationally realistic, and auditable.

## 1. `audit_overhead_and_cost_allocation`

Use when:

- a client margin looks wrong
- overhead looks inflated
- labor, payroll, tools, or shared costs appear mixed

Steps:

1. Identify the period, scope, and visible broken metric.
2. Break the metric into:
   - labor
   - direct non-labor
   - shared operational overhead
   - shared financial cost
   - regulatory/payment obligations
3. Trace each suspicious amount from:
   - source document or payment
   - normalized reader
   - attribution/distribution logic
   - serving snapshot
   - UI/API consumer
4. Test whether the current lane is justified by:
   - economic substance
   - allocation policy
   - evidence trail
5. Recompute the corrected view manually if needed.
6. Recommend one of:
   - reclassify
   - redistribute
   - separate pool
   - restate
   - provisional close only

Deliver:

- exact components inflating the metric
- current lane vs correct lane
- whether the issue is isolated or systemic

## 2. `review_client_pl`

Use when:

- the user wants to understand client profitability
- P&L composition or margin quality is in doubt

Steps:

1. Separate:
   - revenue recognition
   - labor cost
   - direct non-labor
   - shared overhead
   - financial costs below operating line when appropriate
2. Confirm the period state:
   - provisional
   - closed
   - reopened
   - stale snapshot
3. Check comparability against adjacent periods.
4. Flag if margin is being distorted by:
   - missing revenue timing
   - payroll/provider-payroll leakage
   - financial costs hidden as operating
   - stale or partial snapshots
5. Summarize:
   - operating margin
   - quality of earnings/margin
   - main distortions

Deliver:

- trustworthy vs untrustworthy P&L components
- whether leadership can rely on the current margin

## 3. `classify_expense_or_payment`

Use when:

- a transaction needs a canonical lane
- a new provider or expense pattern appears

Steps:

1. Determine whether the item is primarily:
   - accounting recognition
   - cash movement
   - management allocation input
2. Evaluate strongest anchor:
   - member
   - client
   - supplier/provider
   - legal/regulatory entity
   - treasury/bank account
3. Choose the narrowest justified lane:
   - `member_direct_labor`
   - `member_direct_tool`
   - `client_direct_non_labor`
   - `shared_operational_overhead`
   - `shared_financial_cost`
   - `regulatory_payment`
   - `provider_payroll`
   - `treasury_transit`
   - `unallocated`
4. Explain what it should not be classified as.
5. If ambiguity remains, require explicit policy instead of silent defaulting.

Deliver:

- canonical lane
- why
- what evidence would overturn the classification

## 4. `reconcile_cash_and_balances`

Use when:

- bank balances do not match expected movements
- treasury or settlement math looks wrong

Steps:

1. Identify the balance owner:
   - real bank account
   - processor transit
   - accounting-only snapshot
2. Separate:
   - opening balance
   - inflows
   - outflows
   - transfers
   - FX effects
   - pending settlement
3. Verify normalized amounts and supersede behavior.
4. Rebuild the delta from canonical readers, not ad hoc UI math.
5. Check whether the issue is:
   - missing movement
   - duplicated movement
   - wrong currency normalization
   - wrong account ownership
   - stale materialization

Deliver:

- exact mismatch source
- corrected balance logic
- whether historical backfill or forward-only fix is required

## 5. `review_cashflow_and_liquidity`

Use when:

- the user asks about cash health, runway, payment stress, or liquidity risk

Steps:

1. Distinguish:
   - cash on hand
   - restricted or operationally constrained cash
   - expected collections
   - scheduled disbursements
   - financing-related cash needs
2. Build short-term and medium-term view separately.
3. Identify concentration risks:
   - few clients
   - few banks/accounts
   - timing dependency on one inflow
4. Flag control risks:
   - poor visibility
   - no callback controls
   - weak payment approval
   - reconciliations lagging
5. Recommend:
   - cash buffer policy
   - forecast cadence
   - control reinforcement

Deliver:

- current liquidity posture
- near-term stress points
- controls or forecasting gaps

## 6. `close_month_or_period`

Use when:

- the user asks whether a period can close

Steps:

1. Confirm period readiness state and data freshness.
2. Check whether material items are still:
   - unclassified
   - misallocated
   - unsettled in a way that affects economics
   - pending restatement
3. Test whether the current snapshot is:
   - comparable
   - explainable
   - auditable
4. Decide one outcome:
   - safe to close
   - provisional close only
   - do not close
5. State the minimum gating fixes if close is blocked.

Deliver:

- close decision
- rationale
- blocking items

## 7. `reopen_or_restate_period`

Use when:

- a closed period is materially wrong

Steps:

1. Confirm what changed:
   - classification
   - distribution
   - source data
   - materialization bug
2. Measure materiality and blast radius.
3. Distinguish:
   - reopen for operational completion
   - restate for conceptual/accounting correction
4. Preserve comparability:
   - what was previously shown
   - what will change
   - why
5. Recommend the safest path for data, communications, and controls.

Deliver:

- reopen vs restate recommendation
- scope of reprocessing
- stakeholder communication note

## 8. `review_payment_controls`

Use when:

- payment operations, bank changes, settlement safety, or fraud risk are involved

Steps:

1. Map the payment flow end-to-end.
2. Check for:
   - maker-checker
   - callback verification
   - bank detail change controls
   - approval evidence
   - reconciliation evidence
3. Identify manual override lanes and whether they are auditable.
4. Separate convenience shortcuts from acceptable treasury practice.
5. Recommend the minimum control upgrades that materially reduce risk.

Deliver:

- control gaps
- fraud or operational-risk exposure
- control uplift plan

## 9. `review_budget_vs_actual_vs_forecast`

Use when:

- the user asks for planning discipline, variance quality, or forecast credibility

Steps:

1. Check whether actuals are trustworthy enough to compare.
2. Separate:
   - volume variance
   - price/rate variance
   - timing variance
   - classification drift
3. Distinguish operating drivers from financing/cash effects.
4. Evaluate whether forecast assumptions reflect current collection/disbursement reality.
5. Recommend forecast and reporting improvements if the planning model is overfit to broken actuals.

Deliver:

- meaningful vs noisy variances
- forecast credibility assessment
- planning model corrections
