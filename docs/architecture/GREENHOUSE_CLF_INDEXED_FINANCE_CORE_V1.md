# Greenhouse CLF/UF Indexed Finance Core V1

> **Status:** Accepted
> **Date:** 2026-06-20
> **Accepted:** 2026-06-20 by operator (Julio Reyes) — policy pre-selected + "avancemos". V1 defaults ratified per §0; snapshot model = Option A (extend `fx_snapshots` with an indexed-unit discriminator). Implementation proceeds via TASK-995, **Slice-by-slice with a hard gate: Slice 2 (schema) must not begin until the MXN foundation (TASK-990) is operationally stable**. Slice 1 (type split) is additive/flags-off and proceeds now.
> **Owner:** Finance / Treasury / Commercial / Data / Integrations / Reliability
> **Reversibility:** two-way-but-slow (type split + additive schema are reversible while flags are OFF; constraint re-narrowing is slow)
> **Confidence:** high for the conceptual model (indexed unit ≠ cash currency); medium for the per-event UF→CLP policy until Finance confirms contractual conventions
> **Related docs:** [GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1](GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md) (parent), [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md), [GREENHOUSE_FINANCE_ARCHITECTURE_V1](GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md), [Monedas y Tipos de Cambio](../documentation/finance/monedas-y-tipos-de-cambio.md)
> **Implementation task:** [TASK-995](../tasks/in-progress/TASK-995-clf-uf-indexed-finance-core.md)
> **Depends on:** [GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1](GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1.md) accepted (✓ 2026-06-02) and its foundation primitives (`src/lib/finance/multi-currency/*`) operationally rolled out via TASK-990.

---

## 0. Acceptance gate — open confirmations (must resolve before `Accepted`)

This ADR is `Proposed`. Acceptance requires the operator/Finance to confirm three items. Each has a documented **V1 default/recommendation** so implementation can proceed deterministically once accepted.

| # | Question | V1 default / recommendation | Status |
|---|---|---|---|
| Q1 | UF→CLP date policy per event class | **Recognize at the legal-event UF, remeasure the CLP cash at payment-date UF; classify the delta as `indexed_unit_revaluation`** (operator-selected 2026-06-20, §6). | Pre-confirmed by operator; ratify on acceptance |
| Q2 | Does any client pay into a real UF-denominated **cash** instrument? | **No.** V1 assumes "recibimos en UF" = *amount indexed in UF, cash settled in CLP*. CLF never enters `accounts`/`payment_orders`/`settlement_legs`. If a real UF cash rail appears, model it as a new instrument via a future ADR, never an opportunistic enum widening. | Needs Finance/Treasury confirm |
| Q3 | Authoritative source of UF evidence when the legal invoice is CLP | **Rate source = `greenhouse_finance.economic_indicators` (`indicator_code='UF'`, `auto_synced`, fresh 2026-06-19).** NEVER `exchange_rates` (only 2 stale CLF rows). Per-event amount precedence: (1) legal document CLP if present (Nubox/SII), (2) **the customer Purchase Order in UF / quote-contract snapshot** for the native CLF amount, (3) `economic_indicators.UF` at the policy date. | **Confirmed by operator 2026-06-21:** las Órdenes de Compra del cliente llegan en UF; ésa es la fuente del monto nativo UF, la factura legal es CLP. |

Until all three are ratified, no functional CLF write path ships (per TASK-995 hard rule "No implementar sin ADR aceptado").

> **Operator input 2026-06-21 — multi-currency reality (no asumir UF para todo):** las **compras (expenses / OC a proveedor) llegan en UF, MXN, CLP o USD** según el documento — NO todas son UF. La proyección CLF es estrictamente condicional por moneda real del documento (`currency === 'CLF'`); MXN ya lo cubre TASK-990, CLP/USD su camino legacy. El **path de compras en UF** (expense CLF native + functional CLP) es el complemento simétrico del income CLF — mismo helper/snapshot, en el expense writer; pendiente de confirmar el punto de entrada exacto de las compras UF (Nubox purchases / manual / OC proveedor) antes de cablearlo.

---

## 1. Decision

Greenhouse promotes `CLF` (UF, Unidad de Fomento) from pricing/quote-only support into `finance_core` as a **native indexed unit of account** — **not** as a cash/bank currency. Every CLF-denominated financial fact is modeled with the same four-plane discipline as the MXN parent ADR, with one critical difference: the **settlement plane for a CLF fact is CLP cash**, never CLF.

The four planes for an indexed-unit fact:

1. `native` (indexed unit) — the contractual/source unit, `CLF`, when the domain fact is UF-denominated.
2. `functional` — Efeonce's Chile operating/accounting plane, `CLP` (legal/documentary invoice amount).
3. `reporting` — management plane, `USD`, derived from functional CLP (IAS 21 presentation translation), never a direct `CLF→USD`.
4. `settlement` — the currency that actually moved in cash, **`CLP`** for the Chile UF flow (or another real cash currency if proven), never `CLF`.

The platform preserves the native CLF amount and the UF value/date forever via locked snapshots, and never recomputes UF on read. The reajuste/indexation movement of UF is accounted **separately** from foreign-currency FX gain/loss.

**Hard boundary:** `CLF` is allowed only on native/indexed-unit fields and indexed-unit snapshots. It is rejected on `accounts.currency`, `payment_orders.currency`, `payment_order_lines.currency`, `settlement_legs.currency`, and cash payment currencies in V1.

---

## 2. Context — why CLF is not just another `FinanceCurrency`

The MXN parent ADR (`GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1`) solved the case of a real foreign **cash** currency: Berel pays MXN into an MXN-denominated Global66 account; native = settlement = MXN. UF is fundamentally different:

- **UF is a reajustable unit of account indexed to CPI, published daily by the SII/Banco Central**, not a currency you hold in a bank account. There is no "UF cash."
- Greenhouse already quotes in UF (`pricing_output`, `greenhouse_finance.quotes` has 7 CLF quotes) and Payroll uses UF as a **calculation indicator** for Isapre/topes — but never as a payment currency (Chile statutory pay stays CLP).
- The runtime already materializes CLP↔CLF from `economic_indicators.UF` via `src/lib/finance/fx/providers/clf-from-indicators.ts`; UF is fresh (`2026-06-19`, 169 rows), while `exchange_rates` CLF is stale (`2026-04-20/21`).

If CLF were added as a plain `FinanceCurrency`, the system would risk enabling UF accounts, UF payment orders, UF settlement legs and UF balances — all of which are nonsensical. The MXN `native-settlement` helper assumes `native_currency` settles in the same native currency; that is correct for MXN and **wrong for UF** (a UF fact settles in CLP). Hence the need for an explicit **indexed-unit vs cash-currency type split**.

---

## 3. The indexed-unit vs cash-currency distinction (core model)

Greenhouse recognizes two distinct families:

- **Cash/settlement currencies** — money that can sit in an account and move through a rail: `CLP`, `USD`, `MXN`. These populate `accounts`, `payment_orders`, `settlement_legs`, cash payments, balances.
- **Indexed units** — reajustable units of account that denominate a contractual amount but never hold cash: `CLF` (UF). Extensible later to UTM/IPC if needed (out of scope here).

A native CLF fact is always **resolved to CLP** for its functional/legal/cash planes through a locked `CLF→CLP` snapshot sourced from `economic_indicators.UF`.

---

## 4. Type split (Slice 1 design)

Introduce explicit typed primitives so the compiler enforces the boundary. Proposed shapes (final names verified in Slice 1):

```ts
// Cash currencies — can hold balances, settle, fund orders.
type SettlementCurrency = 'CLP' | 'USD' | 'MXN'
type AccountCurrency    = 'CLP' | 'USD' | 'MXN'
type PaymentOrderCurrency = 'CLP' | 'USD' | 'MXN'
type ReportingCurrency  = 'CLP' | 'USD'

// Indexed units — denominate a fact, never hold cash.
type IndexedUnit = 'CLF'

// Native plane of a finance fact = a cash currency OR an indexed unit.
type FinanceNativeUnit = SettlementCurrency | IndexedUnit  // 'CLP' | 'USD' | 'MXN' | 'CLF'
```

- `FinanceCurrency` (today `'CLP' | 'USD' | 'MXN'`) stays the **cash** alias and remains the type for accounts/orders/settlement — CLF is NOT added to it.
- `toFinanceCurrency('CLF')` keeps failing by design; a new `toFinanceNativeUnit` / `toIndexedUnit` admits CLF on native paths only.
- Money/snapshot helpers from TASK-990 (`MoneyAmount`, `FxSnapshotEvidence`, `CanonicalMoneySnapshot`) extend to allow a `CLF→CLP` native→functional snapshot without contaminating `AccountCurrency`/`SettlementCurrency`.
- Tests must prove: CLF accepted as `native`/indexed unit; CLF rejected as account currency, payment-order currency and settlement currency.

---

## 5. Field-level invariant map (which fields may accept CLF)

Authoritative table for V1. Verified against runtime PG constraints (TASK-995 Discovery Refresh 2026-06-20).

| Field / family | Accepts `CLF`? | V1 rule |
|---|---|---|
| `income.native_currency` (indexed unit) | Yes (after ADR) | Only with locked `CLF→CLP` snapshot + CLP functional/legal amount frozen. |
| `expenses.native_currency` (indexed unit) | Yes (after ADR) | Only when the expense/contract is UF-pacted. |
| `payment_obligations.native_unit` (new col) | Yes (after additive schema) | Must produce a **CLP** cash order/payment unless a future approved instrument exists. |
| `fx_snapshots` (or `indexed_unit_snapshots`) | Yes (per §7) | Represents `CLF→CLP` from UF, NOT FX market. |
| `accounts.currency` | **No** | Cash account currency; reject UF. |
| `payment_orders.currency` / `payment_order_lines.currency` | **No** | Orders are cash-denominated; a UF obligation generates a CLP order. |
| `settlement_legs.currency` | **No** | Real cash/instrument movement; an accidental UF leg must alert/block. |
| `income_payments.currency` / `expense_payments.currency` | **No** (default) | Real payment expected in CLP for the Chile UF flow. |
| `beneficiary_payment_profiles.currency` | **No** | Cash payout currency. |
| `quotes.currency` | Already yes | Existing pricing/output CLF; do not migrate or break. |

---

## 6. UF→CLP event-date policy (V1 — operator-selected 2026-06-20)

**Decision: recognition at the legal-event UF, remeasurement of the CLP cash at payment-date UF; the difference is classified as `indexed_unit_revaluation`** (separate from FX gain/loss and from operating revenue/cost). This is the most faithful treatment of a reajustable unit.

| Event class | UF date used | Plane affected |
|---|---|---|
| Quote / send | UF at quote date (snapshot in quote) | pricing/output only (existing) |
| Contract / PO acceptance | UF at acceptance | obligation native evidence |
| Invoice emission (recognition) | UF at emission → CLP functional/legal frozen | `income`/`expenses` functional CLP + locked snapshot |
| Due date | informational; no remeasurement by default | reader/aging only |
| Payment / settlement | UF at payment date → CLP cash | `settlement` plane + `indexed_unit_revaluation` delta vs recognition |
| Period-close reporting | UF at period close for unsettled UF receivables (if Finance opts in) | reporting only, never mutates locked recognition |

Every conversion is a **locked snapshot** (`lockedAt`), never recomputed on read. The recognition CLP is the legal/documentary value (e.g. the Nubox CLP on an export/CLP invoice tied to a UF contract); the payment CLP reflects the UF at payment; their difference is the revaluation.

---

## 7. Snapshot model (ADR decision needed at acceptance)

Two acceptable options; **recommendation = Option A** for reuse and a single FX-evidence lane:

- **Option A (recommended):** extend `fx_snapshots` to admit `from_currency='CLF'` / `to_currency='CLP'` with a `source='economic_indicators.UF'` and a `kind`/`unit_class` discriminator marking it an indexed-unit conversion (not an FX-market rate). Reuses TASK-990 `persistFxSnapshot` + FK columns (`native_to_functional_fx_snapshot_id`, `functional_to_reporting_fx_snapshot_id`).
- **Option B:** a separate `indexed_unit_snapshots` table. Cleaner separation, more surface area + parallel readers.

Whichever is chosen, **casting `CLF` into the existing `FinanceCurrency`-typed snapshot columns without a discriminator is a bug** and is forbidden.

---

## 8. Canonical indexed-unit event shape

```ts
interface IndexedUnitFinanceEvent {
  native:   { amount: string; unit: 'CLF' }
  functional: { amount: string; currency: 'CLP' }
  reporting:  { amount: string; currency: 'USD' }   // derived from functional CLP
  settlement?: { amount: string; currency: 'CLP' | 'USD' | 'MXN' } // cash, never CLF
  indexedUnitSnapshots: Array<{
    fromUnit: 'CLF'; toCurrency: 'CLP'; rate: string; rateDate: string
    source: 'economic_indicators.UF' | 'quote_snapshot' | 'legal_document' | 'manual_override'
    policy: 'rate_at_event' | 'rate_at_settlement' | 'rate_at_due_date' | 'rate_at_period_close' | 'manual_override'
    lockedAt: string
  }>
}
```

---

## 9. Settlement model (V1)

- A CLF native fact settles in **CLP cash**. The settlement plane reads the real cash currency, never the indexed unit.
- `account_balances` remain per cash-account currency; no UF balances are ever created.
- Payment orders for a CLF obligation are **CLP** orders, single-currency, cash-denominated. Server-side rejection for any attempt to create `payment_orders.currency='CLF'`.

---

## 10. `indexed_unit_revaluation` vs FX gain/loss

UF reajuste between recognition and settlement is **not** foreign-currency FX gain/loss. It is classified in its own lane (`indexed_unit_revaluation`, or an ADR-approved `financial_cost` sublane). Readers/views expose it separately so management accounting does not conflate UF indexation with FX volatility or operating margin.

---

## 11. Reliability signals (Slice 6)

- `finance.uf.rate_freshness` — is `economic_indicators.UF` fresh?
- `finance.indexed_unit.snapshot_missing` — CLF native fact without locked `CLF→CLP` snapshot.
- `finance.indexed_unit.native_functional_drift` — native CLF × UF ≠ functional CLP beyond tolerance.
- `finance.indexed_unit.settlement_currency_violation` — any CLF leaked into accounts/orders/settlement legs.
- `finance.indexed_unit.revaluation_unclassified` — a UF delta exists but is not classified.

All `data_quality`/`drift`/`freshness` kinds, steady=0, wired into the Finance reliability overview (mirror the TASK-990 / TASK-1209 signal pattern).

---

## 12. Fail-closed behavior

- Missing UF value for the required event date → block write unless Finance Admin records a manual override with reason.
- CLF event without a conversion policy → block write.
- Payment order with header `currency='CLF'` → reject with a canonical es-CL error.
- CLF native fact without CLP functional amount/snapshot → reliability signal `error`.
- Unclassified revaluation/indexation delta → reliability signal `error`.

---

## 13. Rollout (expand-and-contract, flags default OFF)

Flags (must exist in Production, staging, Preview develop; redeploy after env changes):
`FINANCE_CORE_CLF_INDEXED_ENABLED`, `FINANCE_CLF_INCOME_PROJECTION_ENABLED`, `FINANCE_CLF_OBLIGATIONS_ENABLED`, `FINANCE_CLF_REPORTING_ENABLED`, `FINANCE_CLF_BACKFILL_APPLY_ENABLED` — all `false` by default.

Schema changes are additive first (native/indexed columns + snapshot FKs on `income`/`expenses`/`payment_obligations`); constraint changes use `CHECK ... NOT VALID` + `VALIDATE`; any backfill is allowlisted with dry-run + expected mutation counts + rollback. CLF cash-lane constraints are **not** widened.

---

## 14. Consequences, risks, reversibility

- **Positive:** UF-denominated commercial agreements get finance-core traceability without faking UF cash; clean separation of indexation from FX; reuse of TASK-990 primitives.
- **Risk:** CLF leaking into cash lanes (mitigated by type split + CHECK + server rejection + signal); inconsistent UF dates (mitigated by the §6 policy table + locked snapshots); revaluation buried as FX/revenue (mitigated by the separate lane + reader tests).
- **Reversibility:** while flags are OFF, the type split + additive columns are revertible; re-narrowing constraints after CLF rows exist is the slow path.
- **Sequencing dependency:** this ADR builds on the MXN foundation. TASK-990 is accepted as architecture but still `in-progress`/not fully rolled out (and TASK-1209 fixed a core exempt-projection bug in it). Implementation of TASK-995 code should not begin until the MXN foundation is operationally stable.

---

## 15. Open questions remaining (resolve at acceptance)

- Q1 ratification of the §6 policy (operator pre-selected recognition + remeasure-at-payment).
- Q2 Finance/Treasury confirmation that no real UF cash instrument exists (V1 default: none).
- Q3 Finance confirmation of the per-event UF evidence precedence (§0).
- Snapshot model: Option A (extend `fx_snapshots`) vs Option B (`indexed_unit_snapshots`) — §7.
