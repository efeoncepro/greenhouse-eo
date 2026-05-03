# Greenhouse Finance Runtime Map

## Purpose

This reference maps the main finance/accounting lanes in Greenhouse so an agent can quickly find the real source of truth before diagnosing a number or designing a fix.

## Primary source-of-truth layers

### Transactional finance

- `greenhouse_finance.income`
- `greenhouse_finance.expenses`
- `greenhouse_finance.income_payments`
- `greenhouse_finance.expense_payments`
- `greenhouse_finance.settlement_legs`
- `greenhouse_finance.payment_orders*`

Use this layer to answer:

- what document/payment/settlement exists
- what account or processor moved cash
- what raw amount/currency/reference was captured

### Management accounting / cost intelligence

- `greenhouse_serving.member_capacity_economics`
- `greenhouse_serving.commercial_cost_attribution`
- `greenhouse_serving.operational_pl_snapshots`
- downstream read models for `client_economics`, service profitability, and budget/forecast when present

Use this layer to answer:

- how labor/tool/overhead was loaded
- how cost was attributed to client/org/service
- what margin a consumer surface is actually showing

### Fiscal / tax

- `expense_type`
- `income_type`
- tax snapshots on invoices/expenses
- VAT / IVA readers and ledgers
- Nubox / SII integration layers

Use this layer to answer:

- what the document means for tax/legal reporting
- whether IVA is recoverable
- how a document should be emitted or booked for fiscal purposes

### Treasury / cash / bank

- account balances and cash-position readers
- payment account anchors
- reconciliation contracts
- processors vs bank instruments

Use this layer to answer:

- what cash really moved
- what is still processor-transit
- what belongs to treasury rather than P&L

## Current architectural fault line

Greenhouse is still migrating from a V0 approach to the canonical Member Loaded Cost Model.

### Legacy / transitional shortcuts

- `expenses.allocated_client_id`
- `expenses.direct_overhead_member_id`

These may still be useful as transitional overrides, but they must not be treated as the primary model for new accounting decisions.

### Canonical forward-going path

- tool/provider/member/client/period dimensionality
- explicit distribution lanes
- explicit overhead distribution policy
- financial-cost lanes separate from operating overhead
- period-close snapshots and restatement governance

## Common failure modes

### 1. Shared overhead contamination

Symptom:

- one client suddenly absorbs too much `overhead_clp`

Typical causes:

- provider payroll or regulatory payments leaking into shared operational overhead
- bank fees / factoring / FX mixed into operating overhead
- stale materialization

First places to inspect:

- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/team-capacity/overhead.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`

### 2. Direct overhead contamination

Symptom:

- a member has unrealistically high `direct_overhead_target`

Typical causes:

- `direct_overhead_member_id` used for payroll/provider-payroll rather than equipment/tool/member-direct true overhead

First place to inspect:

- `src/lib/team-capacity/tool-cost-reader.ts`

### 3. CLP normalization drift

Symptom:

- cash KPIs or account balances are inflated or understated

Typical causes:

- ad hoc FX math on raw payment amounts
- bypassing normalized readers / VIEWs

First places to inspect:

- canonical payment readers
- normalized VIEW consumers
- account balance / cash-position materializers

### 4. Processor vs bank confusion

Symptom:

- `Previred`, `Deel`, `Global66`, or another processor appears with fake cash semantics

Canonical rule:

- processor = operational rail / workflow surface
- bank account = actual cash ledger

### 5. Period close unsafe

Symptom:

- users want to close a month even though cost distribution is conceptually wrong

Canonical response:

- classify whether the period is closeable, provisionally closeable, or must be restated/reopened
- do not normalize a bad month into a “final” snapshot silently
