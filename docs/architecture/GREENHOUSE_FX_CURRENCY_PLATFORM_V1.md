# Greenhouse EO — FX & Currency Platform V1

> **Version:** 1.0
> **Created:** 2026-04-19 por Claude (TASK-475)
> **Last updated:** 2026-04-19 por Claude
> **Audience:** Backend engineers, finance product owners, agents implementing currency-aware features
> **Related specs:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1](./GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) · [GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1](./GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md) · [GREENHOUSE_FINANCE_METRIC_REGISTRY_V1](./GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md) · [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1](./GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)

---

## 1. Purpose

Greenhouse handles three distinct currency realities at once:

1. **Finance core** — transactional persistence (income, expense, payroll, bank, reconciliation). Today limited to `CLP | USD` and kept that way deliberately.
2. **Pricing / quotes** — commercial surface Efeonce sells in. Today supports `USD, CLP, CLF, COP, MXN, PEN`.
3. **Reporting / analytics** — CLP-normalized snapshots (P&L, ICO metric registry, cost intelligence) regardless of source currency.

Prior to TASK-475, each surface had its own implicit contract. The result was drift risk: a new country could be added to pricing while finance core, sync pipeline, and reporting stayed on different assumptions, with no single answer to "can we cotizar in MXN today?"

This spec consolidates the contract so consumers never resolve FX inline, currencies are declared by domain instead of by ad-hoc enum, and adding a new currency is a 3-edit change to declarative data.

---

## 2. Canonical artifacts

All canonical code lives under [`src/lib/finance/`](../../src/lib/finance/):

| Artifact | File | Purpose |
|---|---|---|
| `CurrencyDomain` enum | [`currency-domain.ts`](../../src/lib/finance/currency-domain.ts) | 4 domains: `finance_core`, `pricing_output`, `reporting`, `analytics` |
| `CURRENCY_DOMAIN_SUPPORT` | same | Per-domain allowed currency list |
| `FxPolicy` enum | same | `rate_at_event`, `rate_at_send`, `rate_at_period_close`, `none` |
| `FX_POLICY_DEFAULT_BY_DOMAIN` | same | Default policy per domain |
| `FxReadinessState` enum | same | `supported`, `supported_but_stale`, `unsupported`, `temporarily_unavailable` |
| `FX_STALENESS_THRESHOLD_DAYS` | same | Threshold per domain (7d core/pricing, 31d reporting/analytics) |
| `CLIENT_FACING_STALENESS_THRESHOLD_DAYS` | same | Strict 3d gate for client-facing sends |
| `FxReadiness` interface | same | Consumer payload |
| `CURRENCY_REGISTRY` | [`currency-registry.ts`](../../src/lib/finance/currency-registry.ts) | Declarative catalog (provider, fallback strategies, coverage class) |
| `resolveFxReadiness()` | [`fx-readiness.ts`](../../src/lib/finance/fx-readiness.ts) | **The only resolver** for FX lookups |
| Readiness API | [`/api/finance/exchange-rates/readiness`](../../src/app/api/finance/exchange-rates/readiness/route.ts) | HTTP wrapper |

Source of truth for rate rows: `greenhouse_finance.exchange_rates` (dual-write PG + BQ `greenhouse.fin_exchange_rates`). No parallel FX tables are permitted.

---

## 3. Domain matrix

The per-domain support matrix is the governance artifact. A consumer declares its domain once and the matrix answers "may I accept this currency?"

```typescript
export const CURRENCY_DOMAIN_SUPPORT: Record<CurrencyDomain, readonly PlatformCurrency[]> = {
  finance_core:   ['CLP', 'USD'],
  pricing_output: ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'],
  reporting:      ['CLP'],
  analytics:      ['CLP']
}
```

### 3.1 `finance_core`

Transactional persistence. `FinanceCurrency = 'CLP' | 'USD'` in [`src/lib/finance/contracts.ts`](../../src/lib/finance/contracts.ts).

**Consumers:** income, expense, bank reconciliation, payroll, internal transfers, shareholder account.

**Invariant:** expanding this set without migrating the corresponding tables is a **breaking change**. Do not add currencies here opportunistically.

**FX policy default:** `rate_at_event` — persist the rate at the moment the transaction is recognized, never re-resolve at read time.

### 3.2 `pricing_output`

Commercial surface. All quote outputs, PDF amounts, email amounts, client-facing previews.

**Consumers:** pricing engine v2, quotation line items, service composition catalog, HubSpot sync (quote amounts), quotation PDF, send email.

**FX policy default:** `rate_at_send` — snapshot the rate into `quotations.exchange_rates` + `exchange_snapshot_date` when the quote is emitted. PDF/email consume the snapshot; they never re-resolve.

**Compliance rule:** any currency added here MUST have at least a `manual_only` entry in `CURRENCY_REGISTRY`. UIs surface `temporarily_unavailable` when no rate exists; they must not silently apply `1.0`.

### 3.3 `reporting`

P&L, metric registry, ICO engine metrics. Declared as CLP-only today.

**FX policy default:** `rate_at_period_close` — period-close rate dictates the comparability plane. The metric registry ([`GREENHOUSE_FINANCE_METRIC_REGISTRY_V1`](./GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md)) may declare `fxPolicy` per metric when it overrides.

### 3.4 `analytics`

`operational_pl`, `member_capacity_economics`, `cost-intelligence`, tool-cost-reader target. Declared as CLP-only today.

Same policy as `reporting`. Expanding either domain is a migration concern, not an opportunistic enum edit.

---

## 4. FX policy enum

Four policies cover the situations the platform encounters today:

| Policy | Semantic | Used by |
|---|---|---|
| `rate_at_event` | Snapshot the rate when the transaction is recognized | finance_core |
| `rate_at_send` | Snapshot when the artifact goes to the client | pricing_output |
| `rate_at_period_close` | Use the period-close rate published for the reporting period | reporting, analytics |
| `none` | No FX applied; amounts consumed in their native currency | source-preserving readers |

Consumers can override the default by declaring their own `fxPolicy` per surface (e.g., a specific metric in the registry). The default exists so that when no declaration is present the platform still behaves coherently.

---

## 5. Readiness contract

Every FX lookup goes through a single resolver and returns a classified state. Callers do not re-implement the direct/inverse/USD-composition chain.

### 5.1 API

```typescript
// src/lib/finance/fx-readiness.ts
export const resolveFxReadiness = async ({
  fromCurrency,
  toCurrency,
  rateDate,
  domain
}: ResolveFxReadinessInput): Promise<FxReadiness>
```

```typescript
interface FxReadiness {
  fromCurrency: string
  toCurrency: string
  rateDate: string | null
  domain: CurrencyDomain
  state: 'supported' | 'supported_but_stale' | 'unsupported' | 'temporarily_unavailable'
  rate: number | null
  rateDateResolved: string | null
  source: string | null              // provider + optional suffix (e.g. 'mindicador', 'manual:inverse', 'composed_via_usd(...)')
  ageDays: number | null
  stalenessThresholdDays: number
  composedViaUsd: boolean
  message: string                    // Spanish, consumer-facing
}
```

### 5.2 Resolution chain

Order matters. The resolver short-circuits at the first successful step.

1. **Identity** — same currency → `{ state: 'supported', rate: 1 }` without a DB hit.
2. **Domain gate** — if either side is not in `CURRENCY_DOMAIN_SUPPORT[domain]`, return `unsupported`. Cheap deny before any DB work.
3. **Direct lookup** — `SELECT ... FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2 AND rate_date <= $3 ORDER BY rate_date DESC LIMIT 1`.
4. **Inverse lookup** — if direct missing AND `CURRENCY_REGISTRY[from].fallbackStrategies` includes `'inverse'`: swap and invert.
5. **USD composition** — if both legs allowed (`from → USD` + `USD → to`): multiply. Newer `rateDateResolved` = older of the two legs. Source string encodes both providers.
6. **Classification** — if a rate was resolved, compare `ageInDays` vs `FX_STALENESS_THRESHOLD_DAYS[domain]`; `supported` if ≤ threshold, `supported_but_stale` otherwise.
7. **Temporarily unavailable** — if no chain step produced a rate but the pair is declared for the domain.

The resolver **never throws** on missing rates. It classifies. Consumers decide whether to soft-warn, hard-block, or degrade.

### 5.3 Client-facing strict threshold

`CLIENT_FACING_STALENESS_THRESHOLD_DAYS = 3`. UI consumers that emit client-facing artifacts (send quote, render PDF, dispatch email) should compare `readiness.ageDays` against this tighter value even when the domain threshold is 7. The pricing engine does not enforce it — the UI does, at the send dialog.

---

## 6. Currency registry

Each currency declares its operational policy in [`currency-registry.ts`](../../src/lib/finance/currency-registry.ts).

```typescript
export interface CurrencyRegistryEntry {
  code: PlatformCurrency
  label: string
  countryCode: string | null
  provider: 'mindicador' | 'open_er_api' | 'manual' | null
  fallbackStrategies: readonly ('inverse' | 'usd_composition' | 'none')[]
  syncCadence: 'daily' | 'weekly' | 'on_demand' | null
  fxPolicyDefault: FxPolicy
  coverage: 'auto_synced' | 'manual_only' | 'declared_only'
  domains: readonly CurrencyDomain[]
  notes: string
}
```

### 6.1 Current state

| Code | Label | Coverage | Provider | Fallbacks | Domains |
|------|-------|----------|----------|-----------|---------|
| `CLP` | Peso chileno | `auto_synced` | `mindicador` | `inverse`, `usd_composition` | all 4 |
| `USD` | Dólar estadounidense | `auto_synced` | `mindicador` + `open_er_api` fallback | `inverse`, `usd_composition` | finance_core, pricing_output |
| `CLF` | Unidad de Fomento | `manual_only` | — | `inverse`, `usd_composition` | pricing_output |
| `COP` | Peso colombiano | `manual_only` | — | `usd_composition` | pricing_output |
| `MXN` | Peso mexicano | `manual_only` | — | `usd_composition` | pricing_output |
| `PEN` | Sol peruano | `manual_only` | — | `usd_composition` | pricing_output |

### 6.2 Coverage classes

- **`auto_synced`** — daily provider fetch populates the pair. Readiness will normally be `supported`.
- **`manual_only`** — declared in the platform but automatic sync is pending. Rates arrive via manual upsert from Finance Admin. Readiness is `temporarily_unavailable` until a manual rate is loaded, then becomes `supported` (subject to staleness).
- **`declared_only`** — surface can display the currency but pricing / finance refuses to snapshot it until promoted. Reserved for experimental / strategic codes.

### 6.3 Adding a new currency

The scalability rule: **3 edits only, no surface code changes.**

1. Append the code to `CURRENCIES_ALL` ([`currency-domain.ts`](../../src/lib/finance/currency-domain.ts)).
2. Add it to the `CURRENCY_DOMAIN_SUPPORT[domain]` entry for every domain that will accept it.
3. Add a `CURRENCY_REGISTRY` entry with provider / fallbacks / coverage / domains / notes.

If the code needs automatic sync:
4. Implement the fetch in [`src/lib/finance/exchange-rates.ts`](../../src/lib/finance/exchange-rates.ts) following the existing `fetchMindicadorUsdToClp` / `fetchOpenExchangeRateUsdToClp` pattern.
5. Update the daily cron sync route to upsert the new pair.

UI / engine / PDF / email surfaces do not change — they consume the readiness resolver.

---

## 7. Consumer contract

### 7.1 Pricing engine v2

At the start of the pipeline ([`pricing-engine-v2.ts`](../../src/lib/finance/pricing/pricing-engine-v2.ts)):

```typescript
const fxReadiness = await deps.resolvePricingOutputFxReadiness({
  currency: input.outputCurrency,
  rateDate: input.quoteDate
})

if (fxReadiness.state !== 'supported') {
  pushWarning({
    code: 'fx_fallback',
    severity: state === 'unsupported' || state === 'temporarily_unavailable' ? 'critical' : 'warning',
    message: fxReadiness.message,
    context: { ... }
  })
}
```

The engine emits a structured `fx_fallback` warning (see [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1](./GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md) for the full warning taxonomy). The engine does **not** block; the UI decides.

### 7.2 Quote send (TASK-466 surface, pending)

When an AE clicks "Enviar cotización":

1. Call `GET /api/finance/exchange-rates/readiness?from=USD&to=<output>&domain=pricing_output`.
2. If `state === 'unsupported'` → hard block. Display the readiness message.
3. If `state === 'temporarily_unavailable'` → hard block unless Finance Admin has loaded a manual rate within the last `CLIENT_FACING_STALENESS_THRESHOLD_DAYS`.
4. If `state === 'supported_but_stale'` → soft warn, allow after confirm.
5. If `state === 'supported'` but `ageDays > CLIENT_FACING_STALENESS_THRESHOLD_DAYS` → soft warn.
6. Snapshot `{rate, rateDateResolved, source, composedViaUsd}` into `quotations.exchange_rates` at the time of send.

### 7.3 PDF / email

PDF and email templates consume the snapshot stored on the quote. They do **not** call the readiness resolver or the exchange-rates table at render time. If the snapshot is missing, they fail loudly (missing-data error), which is the right behavior for a send-time artifact.

### 7.4 Finance core readers

`getLatestExchangeRate`, `resolveExchangeRateToClp`, `resolveExchangeRate` in [`shared.ts`](../../src/lib/finance/shared.ts) remain the entry points for finance_core. They continue to auto-sync USD↔CLP on miss. They do **not** call `resolveFxReadiness` today — they predate the foundation and still work correctly within the narrower `FinanceCurrency` scope. A future refactor can consolidate them against the readiness layer when the rest of the finance core moves to the same pattern.

---

## 8. Operational runbook

### 8.1 "A quote shows fx_fallback warning — what do I do?"

Read the warning context:

- `state: 'unsupported'` — the output currency is not declared in `CURRENCY_DOMAIN_SUPPORT['pricing_output']`. Either change the output currency or promote the currency in the registry.
- `state: 'temporarily_unavailable'` — the registry declares the pair but no rate exists. Action: Finance Admin uploads a manual rate via the existing `upsertExchangeRates` API (or UI, when it lands).
- `state: 'supported_but_stale'` — the last rate is older than the domain threshold. Action: re-run `GET /api/finance/exchange-rates/sync?rateDate=YYYY-MM-DD` for the day to refresh.
- `severity: 'info'` with `composedViaUsd: true` — the rate was derived from `from → USD → to`. The AE should verify against their expectation before sending.

### 8.2 "We want to start selling in BRL"

1. Declare `BRL` in `CURRENCIES_ALL` + `CURRENCY_DOMAIN_SUPPORT['pricing_output']` + a `CURRENCY_REGISTRY` entry (coverage `manual_only` initially).
2. Finance Admin uploads a first rate (manual upsert).
3. The UI starts accepting BRL output. Engine will emit `fx_fallback` warnings with `temporarily_unavailable` until rates stop being stale.
4. When volume justifies automation, add a provider fetch in `exchange-rates.ts` and flip coverage to `auto_synced`.

### 8.3 "Finance core needs to accept MXN"

This is a structural change, not an edit. You must:

1. Migrate `income`, `expense`, bank reconciliation tables to accept non-CLP/USD currencies.
2. Update the `FinanceCurrency` type.
3. Expand `CURRENCY_DOMAIN_SUPPORT['finance_core']`.
4. Ensure `getLatestExchangeRate` / `resolveExchangeRate` handle the new pair.
5. Verify all downstream readers (reporting, analytics, payroll) either explicitly support MXN or reject it at the boundary with a clear error.

This is a dedicated task, not a routine addition.

---

## 9. Non-goals

- **Multi-currency output client-facing UI** — owned by [TASK-466](../tasks/to-do/TASK-466-multi-currency-quote-output.md).
- **Management accounting FX (factoring, treasury)** — owned by [TASK-397](../tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md).
- **Locale-aware formatting** — owned by [TASK-429](../tasks/to-do/TASK-429-locale-aware-formatting-utilities.md).
- **Expanding `operational_pl`, `member_capacity_economics` or payroll to new currencies** — each has its own compatibility concern and must ship under its own migration task.

This spec builds the foundation; it does not migrate the consumers.

---

## 10. Tests

Unit tests live in [`src/lib/finance/__tests__/`](../../src/lib/finance/__tests__/):

- `currency-domain.test.ts` — matrix invariants, helper narrowing + assertion behavior.
- `fx-readiness.test.ts` — resolution chain (identity, domain gate, direct, inverse, USD composition, staleness classification, temporarily-unavailable).

The pricing engine v2 test stubs the `resolvePricingOutputFxReadiness` dep so the foundation is exercised end-to-end without touching the DB.

---

## 11. Deltas

### Delta 2026-04-19 — V1 foundation (TASK-475)

- First canonical declaration of the currency + FX contract platform-wide.
- Domain matrix, FX policy enum, readiness contract, currency registry, resolver + HTTP endpoint all shipped.
- Pricing engine v2 integrated via `fx_fallback` structured warnings.
- `FinanceCurrency` kept at `CLP | USD` — compatibility rule #5 respected.
- CLP-normalized consumers (operational_pl, member_capacity_economics, tool-cost-reader target, payroll) unchanged.
- Follow-ups: TASK-466 for client-facing send gate; wire automatic providers for COP/MXN/PEN when volume justifies.
