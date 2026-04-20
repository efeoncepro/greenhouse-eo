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
import type { FxProviderCode } from './fx/provider-adapter'

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

// Provider chain: primary tried first, then ordered fallbacks. `historical`
// is an optional adapter dedicated to backfill / bulk range queries
// (typically a central bank API where the `primary` is optimized for
// latest-day queries).
export interface CurrencyProviderChain {
  primary: FxProviderCode
  fallbacks: readonly FxProviderCode[]
  historical?: FxProviderCode
}

export interface CurrencyRegistryEntry {
  code: PlatformCurrency

  /** Human label for UI + docs. */
  label: string

  /** ISO country where the currency originates. Null for CLF (Chilean UF — a
   *  non-ISO accounting unit). */
  countryCode: string | null

  /** @deprecated Use `providers.primary` instead. Kept for backwards-compat
   *  with readers that haven't migrated yet. Derived automatically from
   *  `providers.primary` at export time. */
  provider: FxProviderCode | null

  /** Canonical chain of FX providers for this currency. Orchestrator tries
   *  `primary` first, then each entry in `fallbacks` in order. If
   *  `historical` is set, the backfill script uses it instead of `primary`
   *  for range queries. */
  providers: CurrencyProviderChain

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
    providers: { primary: 'mindicador', fallbacks: ['open_er_api'] },
    fallbackStrategies: ['inverse', 'usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_event',
    coverage: 'auto_synced',
    domains: ['finance_core', 'pricing_output', 'reporting', 'analytics'],
    notes: 'Base currency of the Chilean finance core. Synced daily via Mindicador; USD↔CLP is bidirectional. Fallback to OpenER when Mindicador is down.'
  },
  USD: {
    code: 'USD',
    label: 'Dólar estadounidense',
    countryCode: 'US',
    provider: 'mindicador',
    providers: { primary: 'mindicador', fallbacks: ['open_er_api'] },
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
    provider: 'clf_from_indicators',
    providers: { primary: 'clf_from_indicators', fallbacks: ['fawaz_ahmed'] },
    fallbackStrategies: ['inverse', 'usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'UF is a Chilean accounting unit. Synced from greenhouse_finance.economic_indicators (UF indicator) — TASK-484 wires this as an FX pair without fetching. Coverage stays manual_only until post-deploy 24-48h dry-run verification (TASK-484 Slice 5).'
  },
  COP: {
    code: 'COP',
    label: 'Peso colombiano',
    countryCode: 'CO',
    provider: 'datos_gov_co_trm',
    providers: { primary: 'datos_gov_co_trm', fallbacks: ['fawaz_ahmed'] },
    fallbackStrategies: ['usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'Colombian TRM via datos.gov.co Socrata dataset 32sa-8pi3 (BanRep official). Fallback to Fawaz Ahmed CDN. Coverage stays manual_only until post-deploy dry-run verification.'
  },
  MXN: {
    code: 'MXN',
    label: 'Peso mexicano',
    countryCode: 'MX',
    provider: 'banxico_sie',
    providers: { primary: 'banxico_sie', fallbacks: ['frankfurter', 'fawaz_ahmed'] },
    fallbackStrategies: ['usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'Mexican FIX rate via Banxico SIE series SF43718 (requires BANXICO_SIE_TOKEN secret). Fallbacks: Frankfurter (ECB), Fawaz Ahmed (CDN). Coverage stays manual_only until post-deploy dry-run verification.'
  },
  PEN: {
    code: 'PEN',
    label: 'Sol peruano',
    countryCode: 'PE',
    provider: 'apis_net_pe_sunat',
    providers: { primary: 'apis_net_pe_sunat', fallbacks: ['fawaz_ahmed'], historical: 'bcrp' },
    fallbackStrategies: ['usd_composition'],
    syncCadence: 'daily',
    fxPolicyDefault: 'rate_at_send',
    coverage: 'manual_only',
    domains: ['pricing_output'],
    notes: 'Peruvian SUNAT SBS venta via apis.net.pe (canonical rate for SUNAT invoicing). Fallback Fawaz Ahmed. Historical backfills use BCRP series PD04640PD. Coverage stays manual_only until post-deploy dry-run verification.'
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
