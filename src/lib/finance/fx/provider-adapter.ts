// FX Provider Adapter interface — the canonical plugin contract every FX
// source must implement. Consumers (sync orchestrator, admin endpoint,
// backfill script) depend only on this interface, never on a specific
// provider's HTTP shape.
//
// Design rules:
//   - Adapters NEVER throw for "rate missing" or transient network errors.
//     They return `null` from fetchDailyRate so the orchestrator can move
//     to the fallback. They may throw for programmer errors (invalid
//     input) or for config problems (missing required secret) — those are
//     loud failures.
//   - Adapters declare their own `publishedDayPattern` so the orchestrator
//     knows when to treat "last published rate ≠ today" as normal carry
//     vs. as a sync failure.
//   - Each adapter wraps its HTTP call in a 5s timeout and a single-pass
//     retry (handled at the call site via fetchWithRetry helper). The
//     circuit breaker is shared across adapters and lives in circuit-
//     breaker.ts.

export const FX_PROVIDER_CODES = [
  'mindicador',
  'open_er_api',
  'banxico_sie',
  'datos_gov_co_trm',
  'apis_net_pe_sunat',
  'bcrp',
  'fawaz_ahmed',
  'frankfurter',
  'clf_from_indicators',
  'manual'
] as const

export type FxProviderCode = (typeof FX_PROVIDER_CODES)[number]

export const FX_PUBLISHED_DAY_PATTERNS = [
  // Publishes only on local business days (banks, central banks for most
  // LATAM currencies). Weekend requests should be served as carried from
  // Friday.
  'weekdays_only',

  // Publishes every day including weekends (aggregators like Fawaz, or
  // Chilean UF which is calculated daily including weekends).
  'all_days',

  // Irregular cadence (IPC monthly, UTM monthly, UF irregular on edge
  // cases). Treat missing-for-requested-date as expected and fall back to
  // most recent published value.
  'irregular'
] as const

export type FxPublishedDayPattern = (typeof FX_PUBLISHED_DAY_PATTERNS)[number]

export interface FxRateFetchResult {
  /** Currency the caller requested (FROM side of the pair). */
  fromCurrency: string

  /** Currency the caller requested (TO side of the pair). */
  toCurrency: string

  /** The rate value. Must be > 0 and Number.isFinite(). */
  rate: number

  /** ISO YYYY-MM-DD — the actual publication date of the rate returned. */
  rateDate: string

  /** ISO YYYY-MM-DD — the date the caller requested. If != rateDate, the
   *  row is being carried forward (weekend/holiday). */
  requestedDate: string

  /** True when `rateDate < requestedDate`. Persisted alongside the row so
   *  consumers can distinguish "fresh today" from "carried from Friday". */
  isCarried: boolean

  /** Provider identifier + optional suffix (e.g. 'banxico_sie:SF43718',
   *  'composed_via_usd(...)'). Stored in `exchange_rates.source`. */
  source: string

  /** When the provider published the value (if known). Null for aggregators
   *  that don't expose timestamps. */
  publishedAt: string | null

  /** Raw provider response for debug/audit. Not persisted. */
  rawPayload?: unknown
}

export interface FxRateFetchInput {
  fromCurrency: string
  toCurrency: string

  /** ISO YYYY-MM-DD. Adapter returns the nearest rate on or before this
   *  date. If null/undefined, adapter returns "latest available". */
  rateDate?: string | null
}

export interface FxRateHistoricalRangeInput {
  fromCurrency: string
  toCurrency: string

  /** Inclusive ISO YYYY-MM-DD. */
  startDate: string

  /** Inclusive ISO YYYY-MM-DD. */
  endDate: string
}

export interface FxProviderPingResult {
  reachable: boolean
  latencyMs: number | null
  error?: string
}

export interface FxProviderAdapter {
  /** Stable machine code used by registry + outbox events. */
  readonly code: FxProviderCode

  /** Human label for UI/admin + logs. */
  readonly displayName: string

  /** Drives carry-forward classification. */
  readonly publishedDayPattern: FxPublishedDayPattern

  /** If false, fetchHistoricalRange should return [] and the orchestrator
   *  will fall back to the registry's `historical` adapter (or accept
   *  a no-op result for backfills). */
  readonly supportsHistorical: boolean

  /** If true, the adapter requires an external secret to authenticate
   *  (e.g., BANXICO_SIE_TOKEN). The orchestrator short-circuits (return
   *  null) when the secret is missing rather than making a 401 request. */
  readonly requiresSecret: boolean

  /** The secret identifier (env var name) when `requiresSecret === true`.
   *  Null otherwise. */
  readonly secretEnvVar: string | null

  fetchDailyRate(input: FxRateFetchInput): Promise<FxRateFetchResult | null>

  fetchHistoricalRange(input: FxRateHistoricalRangeInput): Promise<FxRateFetchResult[]>

  ping(): Promise<FxProviderPingResult>
}

// Helper for adapter authors: sanity-check a raw rate before returning it.
// Keeps provider implementations from accidentally emitting negative / NaN
// / zero rates that would poison the exchange_rates table downstream.
export const isValidRateValue = (value: unknown): value is number => {
  if (typeof value !== 'number') return false
  if (!Number.isFinite(value)) return false

  return value > 0
}

// Helper for adapter authors: normalize a date string to ISO YYYY-MM-DD.
// Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.Mon.YY (BCRP). Returns
// null for anything unparseable.
export const normalizeRateDate = (value: string | null | undefined): string | null => {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()

  // YYYY-MM-DD (already normalized)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed)

  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`

  // DD.Mon.YY (BCRP format, e.g. "18.Apr.26")
  const bcrpMatch = /^(\d{2})\.([A-Za-z]{3})\.(\d{2})$/.exec(trimmed)

  if (bcrpMatch) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    }
    const month = months[bcrpMatch[2]]

    if (!month) return null

    // BCRP uses 2-digit year. Assume 20XX (safe for current series).
    return `20${bcrpMatch[3]}-${month}-${bcrpMatch[1]}`
  }

  // Try Date parsing as last resort
  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

// Compare ISO YYYY-MM-DD dates lexically (valid since format is padded).
export const isIsoDateBeforeOrEqual = (a: string, b: string): boolean => a <= b

// Determine whether a result is carried-forward based on requested vs published.
export const deriveIsCarried = (requestedDate: string, rateDate: string): boolean => {
  return rateDate < requestedDate
}
