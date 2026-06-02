# Greenhouse Multi-Currency Finance Core V1

> **Status:** Proposed
> **Date:** 2026-06-02
> **Owner:** Finance / Treasury / Commercial / Integrations / Data
> **Validated as of:** 2026-06-02 against current repo docs, code paths, migrations, Nubox sync status, BigQuery conformed sales and PostgreSQL finance projection
> **Reversibility:** two-way-but-slow
> **Confidence:** high for the target architecture; medium for Nubox foreign-currency code extraction until XML/PDF payload confirms where Nubox exposes the currency code
> **Related docs:** [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md), [GREENHOUSE_FINANCE_ARCHITECTURE_V1](GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md), [GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1](GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md), [Monedas y Tipos de Cambio](../documentation/finance/monedas-y-tipos-de-cambio.md)
> **Implementation task:** [TASK-990](../tasks/to-do/TASK-990-mxn-multi-currency-finance-core.md)
>
> **Delta 2026-06-02 — Accepted decision (currency plane sourcing):** the reporting USD plane is derived from the functional CLP via a locked `CLP→USD` snapshot (IAS 21 presentation-currency translation), **not** from a direct `MXN→USD` market rate. The canonical chain is `MXN (native) → CLP (legal Nubox) → USD (reporting)`. Full rationale in §8.4. The rest of the ADR remains `Proposed` pending human acceptance.

---

## 1. Decision

Greenhouse must promote `MXN` from commercial/pricing-only support into `finance_core` and must model every material financial fact with four explicit currency planes:

1. `native` - the contractual/source-document currency, for example `MXN` for Grupo Berel.
2. `functional` - Efeonce's Chile operating/accounting plane, `CLP`.
3. `reporting` - management reporting plane, `USD`.
4. `settlement` - the currency that actually moved in treasury/cash, for example `MXN`, `CLP` or `USD`.

The platform must preserve native currency forever and store auditable FX snapshots for every conversion to CLP and USD. Greenhouse must not flatten MXN invoices, purchase orders, payments or balances into CLP-only records.

This is a structural finance migration. It is not an enum edit.

---

## 2. Source Runtime Evidence

### 2.1 Current supported scope

Current architecture intentionally limits finance core:

```ts
// src/lib/finance/currency-domain.ts
finance_core: ['CLP', 'USD']
pricing_output: ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN']
reporting: ['CLP']
analytics: ['CLP']
```

Current finance contract also narrows runtime persistence:

```ts
// src/lib/finance/contracts.ts
export type FinanceCurrency = 'CLP' | 'USD'
```

The existing FX platform already says "Finance core needs to accept MXN" is a dedicated structural task, not a routine currency addition.

### 2.2 Known CLP/USD constraints that block MXN end-to-end

The following deployed schema families currently constrain finance operations to `CLP | USD` and must be expanded deliberately:

| Layer | Runtime artifact | Current issue |
|---|---|---|
| Finance contracts/types | `src/lib/finance/contracts.ts` | `FinanceCurrency = 'CLP' | 'USD'` rejects MXN in typed write paths. |
| Domain support matrix | `src/lib/finance/currency-domain.ts` | `finance_core` excludes MXN. |
| Payment obligations | `migrations/20260501140545647_task-748-payment-obligations.sql` | `currency CHECK (currency IN ('CLP','USD'))`. |
| Payment orders | `migrations/20260501143749876_task-750-payment-orders.sql` | `payment_orders.currency` and `payment_order_lines.currency` constrained to CLP/USD. |
| Beneficiary payment profiles | `migrations/20260501151805031_task-749-beneficiary-payment-profiles.sql` | `currency CHECK (currency IN ('CLP','USD'))`. |
| Processor funding policy | `migrations/20260505172907393_payment-order-processor-funding-policy.sql` | `order_currency` constrained to CLP/USD. |
| Nubox projection | `src/lib/nubox/sync-nubox-to-postgres.ts` | `income.currency` hardcoded to `CLP`, `exchange_rate_to_clp=1`. |
| Nubox conformed mapper | `src/lib/nubox/mappers.ts` and `src/lib/nubox/types.ts` | `exportationDetail` and foreign amount/currency are not modeled. |
| Nubox cash signals | `recordSignalFromBankMovement` in `src/lib/nubox/sync-nubox-to-postgres.ts` | External cash signals are hardcoded as `CLP`. |

Commercial pricing already supports MXN through quotation/product catalog paths, but finance, treasury and reporting do not.

### 2.3 Berel / Nubox invoice evidence

The active business case is Grupo Berel:

| Fact | Evidence |
|---|---|
| Source system | Nubox |
| Document | Electronic export invoice, DTE type `110` |
| Nubox document id | `28800562` |
| Client | `PINTURAS BEREL SA DE CV` |
| Mexican fiscal id | `PBE970101718` |
| Emission date | `2026-06-01T22:52:13Z` |
| Due date | `2026-07-01` |
| Nubox CLP equivalent | `4,617,647` |
| Nubox foreign amount | `89,960` |
| Business currency | `MXN` per operator context |
| Current projection result | raw/conformed sync succeeded, but `income_id` is null and the sale is orphaned because organization/client identity did not match. |

Observed issue: even if the orphan match were fixed today, the current projection would persist this invoice as CLP-only and lose the native MXN contract amount.

---

## 3. Accounting And Treasury Semantics

This architecture separates five finance lenses. Any implementation must name the lens it is changing.

| Lens | Greenhouse meaning | Multi-currency rule |
|---|---|---|
| Transactional finance | Source documents, income, expenses, obligations | Preserve `native` amount and currency; persist CLP and USD equivalents as snapshots. |
| Fiscal/tax | SII/Nubox/legal document treatment | Preserve the legal/documentary CLP plane and the foreign export amount. Do not treat CLP legal equivalent as the whole economics when the contract is MXN. |
| Treasury/cash | Bank accounts, settlement legs, cash signals, bank reconciliation | Record the actual settlement currency and account currency. Recognize FX gain/loss separately from revenue/cost. |
| Management accounting | P&L, margin, client profitability, reporting | Report consolidated CLP and USD from locked snapshots; keep native currency as a dimension. |
| Payroll/provider-payroll | Payroll obligations and contractor/provider payments | Support MXN only for international/provider/contractor rails where the obligation is legitimately MXN. Chile statutory payroll remains CLP. |

Greenhouse is not being promoted into a legal general ledger. The goal is faithful operational finance, treasury control and management reporting, with explicit fiscal boundaries.

---

## 4. Target Currency Domain Matrix

The target V1 matrix is:

```ts
export const CURRENCY_DOMAIN_SUPPORT = {
  finance_core: ['CLP', 'USD', 'MXN'],
  pricing_output: ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'],
  reporting: ['CLP', 'USD'],
  analytics: ['CLP', 'USD'],
} as const
```

Important clarifications:

- `finance_core` V1 adds `MXN` only. It does not automatically add `COP`, `PEN` or `CLF`.
- `pricing_output` keeps the wider commercial matrix.
- `reporting` and `analytics` add `USD` as a reporting plane, not as a replacement for CLP.
- Native facts can still be grouped by `native_currency='MXN'` in detailed reports even when consolidated outputs are CLP/USD.
- Any future currency promotion must repeat this ADR pattern. A pricing currency is not automatically a finance-core currency.

---

## 5. Canonical Money Primitives

### 5.1 `MoneyAmount`

```ts
type FinanceCurrency = 'CLP' | 'USD' | 'MXN'

interface MoneyAmount {
  amountMinor?: bigint
  amount: string
  currency: FinanceCurrency
  precision: number
}
```

Storage may keep numeric/decimal columns per table, but domain helpers must expose typed money objects. Amounts must never travel as unlabelled numbers in finance core.

### 5.2 `FxSnapshot`

```ts
interface FxSnapshot {
  snapshotId: string
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  rate: string
  inverseRate: string
  rateDate: string
  rateDateResolved: string
  source: string
  sourceRunId?: string | null
  composedVia?: FinanceCurrency[] | null
  policy:
    | 'rate_at_event'
    | 'rate_at_send'
    | 'rate_at_period_close'
    | 'rate_at_settlement'
    | 'manual_override'
  lockedAt: string
  lockedBy: 'system' | 'finance_admin'
  manualOverrideReason?: string | null
}
```

Rules:

- Store direct `rate` and `inverseRate` at snapshot time.
- Do not recompute a locked event snapshot during reads.
- Re-resolving a rate for a closed or emitted event is a restatement or adjustment, never an invisible refresh.
- FX snapshots are append-only evidence. If a snapshot must be replaced, link the replacement and preserve the original.

### 5.3 `CanonicalMoneySnapshot`

```ts
interface CanonicalMoneySnapshot {
  native: MoneyAmount
  functional: MoneyAmount & { currency: 'CLP' }
  reporting: MoneyAmount & { currency: 'USD' }
  settlement?: MoneyAmount
  nativeToFunctionalFxSnapshotId: string
  nativeToReportingFxSnapshotId: string
  settlementToNativeFxSnapshotId?: string | null
  settlementToFunctionalFxSnapshotId?: string | null
  settlementToReportingFxSnapshotId?: string | null
}
```

This is the canonical conceptual shape. Tables may store columns inline or point to snapshot rows, but every reader must be able to reconstruct this shape.

---

## 6. Conversion Contract

### 6.1 Required pair coverage

V1 must support all pairs below in both directions through the canonical resolver:

| Pair | Required |
|---|---|
| CLP -> USD | yes |
| USD -> CLP | yes |
| MXN -> CLP | yes |
| CLP -> MXN | yes |
| MXN -> USD | yes |
| USD -> MXN | yes |

The resolver may use direct, inverse or composed routes, but the caller must only receive a classified `FxReadiness` plus snapshotable rate evidence.

### 6.2 Resolution rules

Resolution order:

1. Identity conversion returns rate `1`.
2. Domain gate checks both currencies against the requested domain.
3. Direct lookup in `greenhouse_finance.exchange_rates`.
4. Inverse lookup if declared.
5. Composition through USD or CLP as declared by `CURRENCY_REGISTRY`.
6. Classification as `supported`, `supported_but_stale`, `temporarily_unavailable` or `unsupported`.

For event creation in finance core:

- `unsupported` hard-blocks.
- `temporarily_unavailable` hard-blocks unless a Finance Admin manual override supplies a rate and reason.
- `supported_but_stale` hard-blocks client-facing emission and payment creation unless an explicit override is captured.
- `supported` can snapshot.

### 6.3 FX policy by event

| Event | FX policy |
|---|---|
| Quote draft simulation | Resolve dynamically; do not persist unless the quote is emitted/sent. |
| Quote send / accepted commercial artifact | `rate_at_send`. |
| PO received | `rate_at_event` at PO acceptance date. |
| Nubox export invoice | `rate_at_event` at invoice emission date, with Nubox CLP legal equivalent also captured. |
| Income recognition | Use invoice/contract event snapshot; do not silently refresh. |
| Payment obligation creation | Use obligation recognition snapshot. |
| Payment order creation | Use obligation snapshot for amounts; settlement preview can resolve current estimate separately. |
| Payment mark-paid / bank settlement | `rate_at_settlement` at bank movement/payment date. |
| Period reporting | `rate_at_period_close` only for period-close projections, not for changing source transactions. |

---

## 7. Data Model Contract

### 7.1 Column families

Each core table that stores financial amounts must classify its columns into these families:

| Family | Required fields | Meaning |
|---|---|---|
| Native | `native_amount`, `native_currency` or existing `amount`, `currency` declared as native | Source/contractual amount. |
| Functional | `amount_clp`, `functional_amount_clp` or existing CLP-normalized field | Efeonce CLP plane. |
| Reporting | `amount_usd`, `reporting_amount_usd` | Management USD plane. |
| Settlement | `settlement_amount`, `settlement_currency` | Actual cash movement, when different from source event. |
| FX evidence | `*_fx_snapshot_id`, `exchange_rate_to_clp`, `exchange_rate_to_usd`, `rate_date`, `source` | Immutable conversion evidence. |

Naming may vary by table, but the implementation task must document the final mapping table by table before migration apply.

### 7.2 Tables that must be migrated or explicitly bounded

| Table / projection family | Required V1 treatment |
|---|---|
| `greenhouse_finance.income` | Accept MXN native income, preserve Nubox CLP legal equivalent, persist USD reporting equivalent and FX snapshots. |
| `greenhouse_finance.expenses` | Accept MXN where supplier/contractor/provider obligation is MXN; preserve CLP/USD equivalents. |
| `greenhouse_finance.payment_obligations` | Expand currency to `CLP|USD|MXN`; include functional/reporting equivalents or link to source snapshot. |
| `greenhouse_finance.payment_orders` | Expand order currency to MXN; preserve uniform-currency order invariant. |
| `greenhouse_finance.payment_order_lines` | Expand line currency to MXN; line amount must equal native obligation amount unless explicit settlement preview is modeled. |
| `greenhouse_finance.beneficiary_payment_profiles` | Expand active profile uniqueness and routing to MXN. |
| `greenhouse_finance.payment_order_processor_funding_policies` | Support `order_currency='MXN'` and define source/intermediary policy for MXN corridors. |
| `greenhouse_finance.accounts` | Accounts may be CLP/USD/MXN; account currency is the settlement native plane for balances. |
| `greenhouse_finance.income_payments` | Payment currency can be MXN; must store CLP/USD equivalents at settlement date. |
| `greenhouse_finance.expense_payments` | Payment currency can be MXN; same settlement snapshot rule. |
| `greenhouse_finance.settlement_legs` | Legs must support MXN funding, FX, fee and payout legs without double-rebating a processor. |
| `greenhouse_finance.account_balances` | Balances remain per account currency; consolidated readers expose CLP/USD views. |
| `greenhouse_finance.external_cash_signals` | Signal currency must be source-provided, not hardcoded to CLP. |
| BigQuery raw/conformed Nubox sales | Store exportation detail foreign amount/currency and CLP equivalent. |
| Serving/reporting views | Add CLP/USD consolidated outputs and preserve `native_currency` dimensions. |

### 7.3 Compatibility rule for legacy fields

Existing fields named `currency`, `total_amount`, `amount`, `amount_paid` may remain if the implementation declares them as native. If a legacy field has historically meant CLP-normalized, the implementation must rename/add a native field instead of changing semantics silently.

No table may have an unlabelled numeric amount whose currency can only be inferred from caller context.

---

## 8. Nubox Export Invoice Contract

### 8.1 Raw and conformed ingestion

Nubox export invoices must model:

```ts
interface NuboxExportationDetail {
  totalAmountForeignCurrency: number | null
  foreignCurrencyCode: 'MXN' | 'USD' | 'CLP' | string | null
  originCity?: string | null
  destinationCountry?: string | null
  raw: unknown
}
```

If Nubox does not expose `foreignCurrencyCode` in the JSON endpoint, Greenhouse must resolve it using this evidence order:

1. Nubox XML/PDF or DTE export payload if available.
2. Nubox API field if discovered in another endpoint.
3. Organization commercial contract / quote / PO currency.
4. Manual Finance Admin classification with reason and audit log.

The implementation must not infer MXN solely from the client country in production write paths. Country can be an advisory signal, not the authoritative currency.

### 8.2 Berel expected projection

For Nubox document `28800562`, the expected Greenhouse projection after identity resolution is:

```txt
native_amount: 89960
native_currency: MXN
functional_amount_clp: 4617647
reporting_amount_usd: resolved from locked CLP->USD snapshot applied to functional_amount_clp (NOT a direct MXN->USD market rate) — see 8.4
source_document_type: nubox_export_invoice
nubox_dte_type: 110
nubox_client_tax_id: PBE970101718
organization_match_basis: RFC or explicit reviewed match
is_tax_exempt: true   # DTE 110 export invoice is IVA-exempt (D.L. 825 Art 12)
```

The CLP amount from Nubox is legal/documentary evidence. It is not allowed to overwrite the native MXN amount.

### 8.4 Currency plane sourcing — ACCEPTED DECISION (2026-06-02)

The three planes are sourced through a single anchor chain. This is **decided, not open**:

```txt
MXN (native)  →  CLP (functional = Nubox legal/documentary value, NOT recomputed by Greenhouse)  →  USD (reporting)
```

1. **`native`** = the document's foreign amount, immutable. Basis for revenue recognition (IFRS 15 transaction price in contract currency).
2. **`functional` (CLP)** = the CLP legal/documentary equivalent that Nubox/SII already computed. Greenhouse does **not** recompute MXN→CLP with its own rate. The implied rate (`4,617,647 / 89,960 = 51.3300 CLP/MXN`) is stored as `FxSnapshot{source='nubox_legal_document', policy='rate_at_event'}` evidence. This preserves exact reconciliation against the SII RCV / libro de ventas.
3. **`reporting` (USD)** = the functional CLP **translated** to USD via a locked `CLP→USD` snapshot (`rate_at_event` at emission date). It is **not** computed from an independent `MXN→USD` market rate.

**Why this chain (IAS 21).** USD is a *presentation currency*, not the measurement currency. IAS 21 translates to a presentation currency **from the functional-currency figures** (CLP), not from each transaction's original currency independently. Sourcing USD from CLP guarantees the three planes reconcile through one anchor, so `native_equivalent_drift` is deterministic with no tolerance fudge. A direct `MXN→USD` would introduce permanent cross-rate inconsistency (`MXN→USD`, `CLP→USD` and the implied `MXN→CLP` never form a perfect triangle across sources/timestamps).

**What is preserved.** The native MXN amount is kept forever as a first-class dimension, so a direct `MXN→USD` "market value on emission day" remains available as an **ad-hoc analytics view** — it just never becomes the consolidated reporting number.

**Revisit condition.** If Finance later requires the reporting USD to be "market-pure" (direct `MXN→USD`), that is a governance change that must be recorded here and must relax the `native_equivalent_drift` tolerance contract accordingly. Until then, the chain via functional CLP is the only canonical path.

### 8.3 Orphan identity contract

The Berel invoice is currently orphaned because the client/organization identity path does not match the Mexican RFC. V1 must introduce or reuse a cross-country tax identity resolver:

| Country | Tax id type | Example | Rule |
|---|---|---|---|
| Chile | `RUT` | `76.123.456-7` | Existing RUT matching. |
| Mexico | `RFC` | `PBE970101718` | Must match normalized RFC against organization tax identities. |

No Nubox sale may be projected into `income` through a guessed organization just because the display name is similar. Name matching can propose candidates; it cannot write without review.

---

## 9. Treasury And Settlement Contract

### 9.1 Source, processor and settlement separation

Payment Orders keep the existing TASK-799 principle:

- `processor_slug` is the rail/operator.
- `source_account_id` is the financial instrument actually debited.
- `settlement_legs` model funding, FX, fee and payout.

MXN does not weaken that rule. If Berel pays MXN into an MXN bank/fintech account, the account is the settlement source. If a processor converts MXN to CLP/USD before settlement, Greenhouse must model the processor/counterparty legs instead of pretending the invoice was CLP.

### 9.2 Payment order currency invariant

Payment Orders remain single-currency in V1:

- One order can contain only `MXN` obligations, or only `CLP`, or only `USD`.
- Mixed-currency payment runs create separate orders grouped by currency.
- A multi-leg conversion can belong to the settlement group, not the order header.

### 9.3 FX gain/loss

FX gain/loss is explicit:

```txt
fx_result = settlement_functional_amount_clp - invoice_functional_amount_clp
```

Equivalent USD reporting deltas may also be produced. These deltas are financial/treasury effects, not revenue or operating cost adjustments.

No margin reader may bury FX loss/gain inside client revenue, payroll cost or generic overhead.

---

## 10. Reporting And Analytics Contract

Reporting readers must expose three views of the same fact:

| View | Purpose |
|---|---|
| Native detail | "What was contracted/paid in MXN?" |
| CLP functional | Chile operating/accounting comparability. |
| USD reporting | Management comparability across cross-border clients. |

Minimum V1 outputs:

- Client revenue by native currency, CLP and USD.
- Accounts receivable by native currency, CLP and USD.
- Cash position by account currency plus CLP/USD consolidated.
- Payment obligations by native currency plus CLP/USD consolidated.
- FX gain/loss bucket separated from operating P&L.
- Nubox export invoice sync health with foreign amount/currency coverage.

Closed periods must not change because a fresher FX rate appears. If a closed period's FX treatment changes, it must be a restatement or adjustment with evidence.

---

## 11. Reliability Signals

V1 must add or update signals with these exact semantic contracts:

| Signal | Kind | Steady state | Meaning |
|---|---|---|---|
| `finance.fx.mxn_rate_freshness` | lag | `ok` | MXN rates required for finance core are fresh enough for event creation. |
| `finance.fx.snapshot_missing` | data_quality | `0` | A finance-core row requiring FX has no locked snapshot. |
| `finance.nubox_export.foreign_amount_missing` | data_quality | `0` | Export invoice lacks foreign amount/currency evidence. |
| `finance.nubox_export.orphan_rfc` | drift | `0` | Nubox export invoices with RFC have no organization match or reviewed disposition. |
| `finance.multi_currency.native_equivalent_drift` | drift | `0` | Native, CLP and USD equivalents fail deterministic recomputation from locked snapshot beyond rounding tolerance. |
| `finance.cash_signal.unsupported_currency` | data_quality | `0` | External cash signal arrives in a currency not accepted by finance core. |
| `finance.payment_order.mixed_currency_attempt` | data_quality | `0` | A create-order request attempted to combine currencies. |
| `finance.fx_gain_loss.unclassified` | data_quality | `0` | Settlement/invoice FX delta exists but was not classified into explicit FX result lane. |

Signals should be wired into existing finance reliability surfaces. If a signal is too expensive to compute synchronously, it must be implemented as a scheduled/materialized check with freshness metadata.

---

## 12. Migration Strategy

Implementation must use expand-and-contract. No big-bang schema rewrite.

### Phase 0 - ADR acceptance and runtime inventory

- Accept or amend this ADR.
- Produce a table-by-table migration map with current columns, target columns, compatibility fields and rollback stance.
- Verify actual constraints in PostgreSQL with `pnpm pg:connect` / `pg:doctor` before writing migrations.
- Verify BigQuery raw/conformed Nubox shapes.

### Phase 1 - Primitive foundation, no behavior flip

- Add typed finance money primitives.
- Expand FX readiness/resolver for `finance_core` pairs.
- Add snapshot writer/reader interfaces.
- Keep all write paths behaviorally unchanged behind flags.

### Phase 2 - Schema expand, dual-read safe

- Add nullable native/functional/reporting/snapshot columns where needed.
- Expand CHECK constraints to include MXN only after readers can reject unsupported rows safely.
- Add indexes for `(currency, period/date, source_system)` query patterns.
- Do not mutate existing CLP/USD semantics.

### Phase 3 - Nubox export invoice ingestion

- Model `exportationDetail`.
- Capture foreign amount and currency evidence.
- Add RFC identity matching or reviewed disposition.
- Backfill Berel in dry-run first.

### Phase 4 - Finance core write paths

- Enable MXN for income/expenses/payment obligations through a tenant/allowlist flag.
- Snapshot CLP and USD equivalents at event creation.
- Add tests for CLP/USD no-regression.

### Phase 5 - Treasury/payment orders

- Enable MXN profiles, obligations and payment orders.
- Keep one order per currency.
- Add settlement legs for MXN cash and conversion.
- Classify FX result explicitly.

### Phase 6 - Reporting and analytics

- Add CLP/USD consolidated readers.
- Preserve native detail.
- Add finance dashboards/exports only after server readers are stable.

### Phase 7 - Rollout and backfill

- Staging dry-run with Berel.
- Staging apply allowlist.
- Production deploy with flags off.
- Production backfill Berel allowlist.
- Enable MXN finance-core for selected tenant/client only.
- Monitor signals for at least 7 days before broader rollout.

---

## 13. Feature Flags And Cutover

Expected flags:

| Flag | Default | Scope |
|---|---|---|
| `FINANCE_CORE_MXN_ENABLED` | `false` | Allows finance-core write paths to accept MXN. |
| `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED` | `false` | Enables exportation detail mapping into conformed/projection layers. |
| `FINANCE_MXN_PAYMENT_ORDERS_ENABLED` | `false` | Enables MXN in payment obligations/orders/profiles. |
| `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` | `false` | Enables new CLP/USD consolidated readers in UI/API. |
| `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED` | `false` | Allows Berel-specific backfill apply after dry-run. |

Flags must default to `false` in production. A deploy that adds schema/reader support must be safe with all flags disabled.

---

## 14. Alternatives Considered

### Alternative A - Add MXN to `FinanceCurrency` only

Rejected. This would compile some paths while payment obligations, orders, profiles, Nubox projection, settlement, reporting and cash signals still fail or flatten data. It creates a false sense of support.

### Alternative B - Store everything as CLP and keep MXN in metadata JSON

Rejected. Metadata-only native amount is not queryable enough for AR, payments, P&L, audit, reconciliation or client reporting. It would hide the economic reality of the Berel contract.

### Alternative C - Store native MXN and compute CLP/USD at read time

Rejected. Read-time FX recomputation breaks emitted documents, period comparability, close governance and auditability. Snapshots are required.

### Alternative D - One generic JSON money blob per row

Rejected for V1. It is flexible but weak for SQL constraints, indexes, analytics, reconciliation and governance. Use typed columns plus optional JSON evidence for source-specific payloads.

### Alternative E - Promote all pricing currencies to finance core

Rejected for V1. The urgent operational need is MXN. Promoting COP/PEN/CLF simultaneously increases blast radius across fiscal/tax/treasury without current live evidence.

---

## 15. Hard Rules

- NEVER treat `MXN` support as complete if it only works in quotes.
- NEVER persist a source document in CLP-only when the contract/source currency is MXN.
- NEVER infer MXN from country alone in a production write path.
- NEVER use read-time FX as the source for emitted/closed financial facts.
- NEVER mix currencies inside one payment order.
- NEVER classify FX gain/loss as revenue, payroll cost, contractor cost, vendor cost or generic overhead.
- NEVER let a `supported_but_stale` finance-core rate write silently without override evidence.
- NEVER hardcode `currency='CLP'` in a source sync projection unless the source payload proves CLP native.
- NEVER mutate closed-period CLP/USD equivalents because a newer rate is available.
- ALWAYS preserve native currency as a first-class dimension in detail views and exports.
- ALWAYS keep CLP as functional currency for Chile operating/accounting views.
- ALWAYS keep USD as management reporting plane for consolidated executive views.
- ALWAYS gate backfills with dry-run, allowlist, counts, sample rows and rollback plan.

---

## 16. Self-Critique

### What breaks in 12 months?

If Greenhouse signs more LATAM clients in COP/PEN/BRL, MXN-only finance core will become the next bottleneck. The ADR intentionally scopes V1 to MXN, but the primitive names and resolver contracts must avoid MXN-specific branching so the next promotion is a domain decision, not a rewrite.

### What breaks in 36 months?

If Efeonce operates multiple legal entities with different functional currencies, `functional='CLP'` will be too narrow. The model should then generalize functional currency per operating/legal entity. V1 deliberately keeps CLP because current Efeonce operating entity and Nubox/SII boundary are Chile-centered.

### Cognitive debt risk

High if implementers scatter amount columns without a table-by-table mapping. Mitigation: TASK-990 requires a migration map before code, named money primitives, and tests that assert no unlabelled finance amounts are introduced.

### Lock-in

Low provider lock-in because FX providers already sit behind adapters and registry. Medium data-shape lock-in because typed columns are harder to change than JSON. This is acceptable for finance integrity and queryability.

### Observability gap

The riskiest silent failure is "invoice projected, native MXN lost". The proposed `foreign_amount_missing`, `snapshot_missing` and `native_equivalent_drift` signals directly target that class.

### Compliance/regional gap

This ADR is not tax/legal advice. It preserves the Nubox/SII CLP export-invoice plane and the MXN contract plane separately. Any official export-document field mapping must be verified against Nubox/SII artifacts during TASK-990 discovery.

---

## 17. Revisit When

Reopen or supersede this ADR when any of the following becomes true:

- A second non-CLP/USD finance-core currency must go live.
- Efeonce adds a non-Chile operating/legal entity with a different functional currency.
- Nubox exposes a better canonical foreign currency field that changes ingestion semantics.
- Greenhouse adopts a formal legal GL that requires different accounting treatment.
- Payment rails settle Berel MXN through a processor that hides native cash movement from bank evidence.
- Period close policy changes from CLP-functional to multi-functional reporting.

---

## 18. Implementation Gate

No runtime implementation may claim "MXN supported" until all are true:

1. `finance_core` accepts MXN through typed contracts and DB constraints.
2. Nubox export invoice foreign amount/currency is captured.
3. Berel RFC identity can be matched or reviewed.
4. Income preserves native MXN plus CLP/USD equivalents.
5. Payment/cash paths can settle or explicitly block MXN with a clear reason.
6. Payment orders/profiles/obligations either support MXN or reject it before order creation.
7. Reporting exposes native, CLP and USD planes.
8. FX snapshots are locked and auditable.
9. Reliability signals are wired.
10. Staging and production verification cover the Berel invoice and an MXN payment/cash scenario.
