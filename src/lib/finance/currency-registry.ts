// Currency registry — declarative catalog of how Greenhouse obtains FX rates
// for each supported currency. This is the single source of truth for:
//
//   - which provider sync pipeline populates the pair
//   - whether a cross-pair composition via USD is allowed
//   - expected sync cadence (for staleness monitoring)
//   - the default FX policy if the consumer does not override
//   - the coverage class (is the currency actively supported by an automated
//     provider, or is it declared but only populated manually?)
//
// Adding a new currency requires one entry here + one entry in
// `CURRENCY_DOMAIN_SUPPORT` (currency-domain.ts). No other surface should
// need a change.

import type { CurrencyDomain, FxPolicy, PlatformCurrency } from './currency-domain'

// Coverage classification. Consumers that need to refuse actions on
// unsupported currencies should check `coverage === 'auto_synced'` before
// snapshotting client-facing artifacts.
export const CURRENCY_COVERAGE_CLASSES = [
  // Daily sync from an external provider (Mindicador, OpenER, Banco Central).
  // Readiness state will normally be `supported`.
  'auto_synced',

  // Declared in the platform but not wired to any automatic provider.
  // Rates can only arrive via manual upsert. Readiness will be
  // `temporarily_unavailable` until a manual rate is loaded.
  // Use this for currencies we sell in but cannot automate yet.
  'manual_only',

  // The currency is declared (so the UI can display it) but pricing / finance
  // must refuse to snapshot it until explicitly promoted. Readiness will be
  // `unsupported` even if a manual row exists. Use this for experimental /
  // strategic currencies we are not ready to commit to.
  'declared_only'
] as const

export type CurrencyCoverageClass = (typeof CURRENCY_COVERAGE_CLASSES)[number]

export interface CurrencyRegistryEntry {
  code: PlatformCurrency

  /** Human label for UI + docs. */
  label: string

  /** ISO country where the currency originates. Null for CLF (Chilean UF — a
   *  non-ISO accounting unit). */
  countryCode: string | null

  /** Provider that feeds the automatic sync, or null if coverage is not
   *  `auto_synced`. */
  provider: 'mindicador' | 'open_er_api' | 'manual' | null

  /** Permissible fallback strategies when the direct rate is missing:
   *   - `inverse`: try `to → from` and invert.
   *   - `usd_composition`: compose via USD (`from → USD → to`).
   *   - `none`: no fallback — return readiness `temporarily_unavailable`.
   */
  fallbackStrategies: readonly ('inverse' | 'usd_composition' | 'none')[]

  /** Expected cadence of the automatic sync. Null for non-auto classes. */
  syncCadence: 'daily' | 'weekly' | 'on_demand' | null

  /** Default FX policy when the consumer does not override. Must align with
   *  the policy defaults from `FX_POLICY_DEFAULT_BY_DOMAIN` for the domains
   *  this currency participates in. */
  fxPolicyDefault: FxPolicy

  /** Coverage class per the classification above. */
  coverage: CurrencyCoverageClass

  /** Domains that can officially consume this currency. Redundant with
   *  `CURRENCY_DOMAIN_SUPPORT` but kept here for declarative clarity. */
  domains: readonly CurrencyDomain[]

  /** Free-form notes for operators. Surfaces in admin tooling in the future. */
  notes: string
}

export const CURRENCY_REGISTRY: Record<PlatformCurrency, CurrencyRegistryEntry> = {
  CLP: {
    code: 'CLP',
    label: 'Peso chileno',
    countryCode: 'CL',
    provider: 'mindicador',
    fallbackStrategies: ['inverse', 'usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_event',
    coverage: 'auto_synced',
    domains: ['finance_core', 'pricing_output', 'reporting', 'analytics'],
    notes: 'Base currency of the Chilean finance core. Synced daily via Mindicador; USD↔CLP is bidirectional.'
  },
  USD: {
    code: 'USD',
    label: 'Dólar estadounidense',
    countryCode: 'US',
    provider: 'mindicador',
    fallbackStrategies: ['inverse', 'usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_event',
    coverage: 'auto_synced',
    domains: ['finance_core', 'pricing_output'],
    notes: 'Second finance_core currency. Synced daily via Mindicador + OpenER fallback.'
  },
  CLF: {
    code: 'CLF',
    label: 'Unidad de Fomento',
    countryCode: null,
    provider: null,
    fallbackStrategies: ['inverse', 'usd_composition'],
    syncCadence: null,
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'UF is a Chilean accounting unit. Mindicador exposes it as an economic indicator (greenhouse_finance.economic_indicators) but not as a direct exchange rate pair. Manual rate upserts are accepted until a dedicated provider is wired.'
  },
  COP: {
    code: 'COP',
    label: 'Peso colombiano',
    countryCode: 'CO',
    provider: null,
    fallbackStrategies: ['usd_composition'],
    syncCadence: null,
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'Declared for pricing_output; no automatic sync yet. Acceptable fallback: compose USD→COP via OpenER manual upload. Follow-up task required to wire an automatic provider before volume grows.'
  },
  MXN: {
    code: 'MXN',
    label: 'Peso mexicano',
    countryCode: 'MX',
    provider: null,
    fallbackStrategies: ['usd_composition'],
    syncCadence: null,
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'Declared for pricing_output; no automatic sync yet. Same treatment as COP.'
  },
  PEN: {
    code: 'PEN',
    label: 'Sol peruano',
    countryCode: 'PE',
    provider: null,
    fallbackStrategies: ['usd_composition'],
    syncCadence: null,
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'Declared for pricing_output; no automatic sync yet. Same treatment as COP.'
  }
}

export const getCurrencyRegistryEntry = (currency: string): CurrencyRegistryEntry | null => {
  const key = currency.toUpperCase() as PlatformCurrency

  return CURRENCY_REGISTRY[key] ?? null
}

// Shortcut helpers used by the readiness resolver + sync route.

export const isAutoSyncedCurrency = (currency: string): boolean =>
  getCurrencyRegistryEntry(currency)?.coverage === 'auto_synced'

export const allowsUsdComposition = (currency: string): boolean => {
  const entry = getCurrencyRegistryEntry(currency)

  if (!entry) return false

  return entry.fallbackStrategies.includes('usd_composition')
}
