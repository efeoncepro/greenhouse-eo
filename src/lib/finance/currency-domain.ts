// Greenhouse canonical currency foundation.
//
// This module centralizes:
//   1. The set of currencies supported per domain (finance core / pricing /
//      reporting / analytics) — the "currency matrix".
//   2. The FX policy enum — when is the exchange rate frozen for a given
//      transaction (at event, at send, at period close, none).
//   3. The readiness state enum — consumer-facing classification of a
//      currency pair (supported / stale / unsupported / temporarily unavailable).
//
// The rule every caller should honor:
//
//   "Do not expand FinanceCurrency or `PRICING_OUTPUT_CURRENCIES` in isolation.
//    Declare the currency + its policy here first, then consumers opt-in per
//    domain."
//
// Adding a new currency requires 3 edits only:
//   - append it to `CURRENCIES_ALL`
//   - add it to the relevant `CURRENCY_DOMAIN_SUPPORT[domain]` entry
//   - declare its provider/fallback in `currency-registry.ts`
//
// No other surface should have hardcoded currency lists.

import type { FinanceCurrency } from './contracts'

// ── Domain matrix ───────────────────────────────────────────────────

export const CURRENCY_DOMAINS = [
  'finance_core',     // transactional persistence (income, expense, payroll)
  'pricing_output',   // quote output, client-facing pricing simulation
  'reporting',        // P&L / metric surfaces, CLP-normalized by default
  'analytics'         // cost intelligence snapshots, CLP-normalized by default
] as const

export type CurrencyDomain = (typeof CURRENCY_DOMAINS)[number]

// The master list of currencies the platform can recognize. Adding a new one
// requires a registry entry (currency-registry.ts) and at least one domain
// entry below. The list is the ONLY place where raw ISO codes live in types.
export const CURRENCIES_ALL = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'] as const

export type PlatformCurrency = (typeof CURRENCIES_ALL)[number]

// Per-domain support matrix. Consumers should call
// `isSupportedCurrencyForDomain` or `assertSupportedCurrencyForDomain`
// instead of hardcoding lists.
export const CURRENCY_DOMAIN_SUPPORT: Record<CurrencyDomain, readonly PlatformCurrency[]> = {
  // finance_core stays at CLP | USD to match `FinanceCurrency` contract;
  // expanding here without migrating income/expense/payroll tables would
  // break invariants downstream.
  finance_core: ['CLP', 'USD'],

  // pricing_output is the multi-currency surface Efeonce sells in.
  pricing_output: ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'],

  // reporting/analytics are CLP-normalized by contract. To add another
  // reporting currency, migrate the snapshot schemas first.
  reporting: ['CLP'],
  analytics: ['CLP']
}

export const isSupportedCurrencyForDomain = (
  currency: string,
  domain: CurrencyDomain
): currency is PlatformCurrency => {
  const supported = CURRENCY_DOMAIN_SUPPORT[domain] as readonly string[]

  return supported.includes(currency.toUpperCase())
}

export const assertSupportedCurrencyForDomain = (
  currency: string,
  domain: CurrencyDomain
): PlatformCurrency => {
  const normalized = currency.toUpperCase()

  if (!isSupportedCurrencyForDomain(normalized, domain)) {
    const supported = CURRENCY_DOMAIN_SUPPORT[domain].join(', ')

    throw new Error(
      `Currency "${currency}" is not supported for domain "${domain}". Supported: ${supported}.`
    )
  }

  return normalized as PlatformCurrency
}

// ── FX policy ───────────────────────────────────────────────────────

export const FX_POLICIES = [
  // Snapshot the rate at the moment the transaction is recognized. Used by
  // finance_core for income/expense that need historically-faithful FX.
  'rate_at_event',

  // Snapshot the rate when a client-facing artifact is emitted (quote sent,
  // contract signed, invoice issued). Used by pricing_output.
  'rate_at_send',

  // Use the period-close rate published for the reporting period. Used by
  // reporting/analytics that produce comparable P&L snapshots.
  'rate_at_period_close',

  // The surface does not apply FX — values are always consumed in their
  // native currency. Used when the surface is intentionally source-preserving.
  'none'
] as const

export type FxPolicy = (typeof FX_POLICIES)[number]

// Default policy per domain. Individual consumers can still override when
// they declare their own contract, but the default keeps the platform
// consistent when no explicit declaration exists.
export const FX_POLICY_DEFAULT_BY_DOMAIN: Record<CurrencyDomain, FxPolicy> = {
  finance_core: 'rate_at_event',
  pricing_output: 'rate_at_send',
  reporting: 'rate_at_period_close',
  analytics: 'rate_at_period_close'
}

// ── Readiness contract ──────────────────────────────────────────────

export const FX_READINESS_STATES = [
  // Direct (or USD-composed) rate is present and within the staleness
  // threshold for the domain. Consumer can safely snapshot.
  'supported',

  // Rate exists but is older than the domain's staleness threshold. Consumer
  // should warn the user and decide whether to block the action.
  'supported_but_stale',

  // The pair is not declared for this domain by `CURRENCY_DOMAIN_SUPPORT`.
  // This is a hard deny: the consumer must refuse the action at the API
  // boundary.
  'unsupported',

  // The pair IS declared for the domain but no rate row exists (sync failed,
  // provider offline, new currency without backfill). Consumer surfaces an
  // actionable warning; action may be soft-blocked.
  'temporarily_unavailable'
] as const

export type FxReadinessState = (typeof FX_READINESS_STATES)[number]

export interface FxReadiness {
  fromCurrency: string
  toCurrency: string
  rateDate: string | null
  domain: CurrencyDomain
  state: FxReadinessState

  /** Resolved numeric rate. Null when state is `unsupported` or
   *  `temporarily_unavailable`. */
  rate: number | null

  /** ISO date of the rate row used (or null if no row). */
  rateDateResolved: string | null

  /** Provider that produced the row (`mindicador`, `open_er_api`, `manual`…). */
  source: string | null

  /** Days between `rateDateResolved` and today. Null if no row. */
  ageDays: number | null

  /** Staleness threshold applied by this domain (days). */
  stalenessThresholdDays: number

  /** When true, the rate was derived by composing via USD as the pivot hub
   *  (`from → USD → to`). Kept for backwards-compatibility with consumers
   *  that only know the USD-hub case (PDF footer, quotation snapshot). For
   *  non-USD hubs (e.g. CLF composed via CLP) this is `false` and the real
   *  hub is exposed in `compositionHub`. */
  composedViaUsd: boolean

  /** The pivot currency used to compose the rate when direct lookup missed.
   *  Null when the rate was direct, inverse, or identity. Non-null examples:
   *   - `'USD'` for COP/MXN/PEN cross pairs (and where `composedViaUsd = true`)
   *   - `'CLP'` for CLF pairs (UF is CLP-indexed; there is no direct USD↔CLF) */
  compositionHub: string | null

  /** Human-readable message in Spanish for UI consumption. */
  message: string
}

// Domain-specific staleness thresholds. These feed `resolveFxReadiness` and
// are exposed for UI so consumers can tell the user "X days fresh".
export const FX_STALENESS_THRESHOLD_DAYS: Record<CurrencyDomain, number> = {
  finance_core: 7,
  pricing_output: 7,
  reporting: 31,
  analytics: 31
}

// Bound to pricing_output: the stricter threshold to apply when a rate is
// about to be snapshot into a client-facing artifact (quote send, PDF render,
// email dispatch). Used by consumers that opt-in to the strict gate; default
// readiness uses the domain threshold above.
export const CLIENT_FACING_STALENESS_THRESHOLD_DAYS = 3

// ── Helpers ─────────────────────────────────────────────────────────

export const toFinanceCurrency = (currency: string): FinanceCurrency => {
  const narrowed = assertSupportedCurrencyForDomain(currency, 'finance_core')

  // finance_core support is statically ['CLP', 'USD'] — cast is safe because
  // assertSupportedCurrencyForDomain threw otherwise.
  return narrowed as FinanceCurrency
}

export const narrowToDomainCurrency = (
  currency: string,
  domain: CurrencyDomain
): PlatformCurrency | null => {
  const normalized = currency.toUpperCase()

  return isSupportedCurrencyForDomain(normalized, domain) ? (normalized as PlatformCurrency) : null
}
