import 'server-only'

import type {
  CurrencyDomain,
  FxReadiness,
  FxReadinessState,
  PlatformCurrency
} from './currency-domain'
import { CLIENT_FACING_STALENESS_THRESHOLD_DAYS } from './currency-domain'

// ────────────────────────────────────────────────────────────────────────────
// TASK-466 — Canonical FX snapshot persisted on `quotations.exchange_rates`.
//
// The JSONB column historically stored a free-form map `{ CLP: rate }` populated
// by `syncCanonicalFinanceQuote` and the finance PATCH endpoint. TASK-466
// formalizes the shape of the snapshot used by client-facing render (PDF,
// email, detail toggle) while keeping backward compat: legacy currency-key
// entries (`CLP`, `USD`, …) remain valid and coexist with the canonical
// metadata stored under `__snapshot`.
//
// Rule: no parallel column (`output_currency` is NOT introduced). The contract
// stays `currency + exchange_rates + exchange_snapshot_date`.
// ────────────────────────────────────────────────────────────────────────────

export const QUOTATION_FX_SNAPSHOT_VERSION = '1' as const

/**
 * Canonical snapshot persisted under `exchange_rates.__snapshot`. It freezes
 * the readiness resolution at the moment the quote transitions to `issued`
 * so PDF/email/detail consumers read exactly the same payload without
 * re-resolving FX later.
 */
export interface QuotationFxSnapshot {
  version: typeof QUOTATION_FX_SNAPSHOT_VERSION
  outputCurrency: PlatformCurrency
  baseCurrency: PlatformCurrency
  rate: number
  rateDateResolved: string | null
  source: string | null
  composedViaUsd: boolean

  /** Pivot hub used when the rate was composed (`USD`, `CLP`…) or null when
   *  direct / inverse / identity. New in TASK-466 follow-up; legacy snapshots
   *  restored from DB return null here until re-issued. */
  compositionHub: string | null
  readinessState: FxReadinessState
  stalenessThresholdDays: number
  clientFacingThresholdDays: number
  ageDays: number | null
  frozenAt: string
  domain: CurrencyDomain
}

export interface BuildQuotationFxSnapshotInput {
  readiness: FxReadiness
  outputCurrency: PlatformCurrency
  baseCurrency: PlatformCurrency
  frozenAt?: Date
}

/**
 * Builds the canonical snapshot from a resolved readiness. Callers must have
 * already verified that the readiness state is acceptable for client-facing
 * use (see `quotation-fx-readiness-gate.ts`). This helper is deliberately
 * permissive about stale-but-supported rates — the policy decision lives in
 * the gate.
 */
export const buildQuotationFxSnapshot = ({
  readiness,
  outputCurrency,
  baseCurrency,
  frozenAt
}: BuildQuotationFxSnapshotInput): QuotationFxSnapshot => {
  const rate = readiness.rate ?? 1

  return {
    version: QUOTATION_FX_SNAPSHOT_VERSION,
    outputCurrency,
    baseCurrency,
    rate,
    rateDateResolved: readiness.rateDateResolved,
    source: readiness.source,
    composedViaUsd: readiness.composedViaUsd,
    compositionHub: readiness.compositionHub,
    readinessState: readiness.state,
    stalenessThresholdDays: readiness.stalenessThresholdDays,
    clientFacingThresholdDays: CLIENT_FACING_STALENESS_THRESHOLD_DAYS,
    ageDays: readiness.ageDays,
    frozenAt: (frozenAt ?? new Date()).toISOString(),
    domain: readiness.domain
  }
}

/**
 * Produces the JSONB payload that replaces `exchange_rates` for the quote.
 * Backward-compat keys (`CLP`, `USD`…) are preserved alongside the canonical
 * `__snapshot` key so legacy readers that iterate currency-rate entries keep
 * working.
 *
 * If the output currency happens to be CLP, the payload also mirrors the
 * historical `{ CLP: rate }` shape for the `pdf/route.ts` consumer that still
 * relies on it.
 */
export const serializeQuotationFxSnapshotForJsonb = (
  snapshot: QuotationFxSnapshot
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    __snapshot: snapshot
  }

  // Backward-compatible currency-keyed rate. Consumers that iterate
  // `Object.entries(exchange_rates)` filtering numeric entries (see
  // `src/app/api/finance/quotes/[id]/lines/route.ts`) still work.
  payload[snapshot.outputCurrency] = snapshot.rate

  if (snapshot.outputCurrency !== 'CLP') {
    // Preserve the classic anchor so legacy CLP-centric code paths keep
    // finding something to read.
    payload.CLP = snapshot.rate
  }

  return payload
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeSnapshotCandidate = (candidate: unknown): QuotationFxSnapshot | null => {
  if (!isPlainObject(candidate)) return null

  const version = candidate.version

  if (version !== QUOTATION_FX_SNAPSHOT_VERSION) return null

  const outputCurrency = typeof candidate.outputCurrency === 'string' ? candidate.outputCurrency : null
  const baseCurrency = typeof candidate.baseCurrency === 'string' ? candidate.baseCurrency : null
  const rate = typeof candidate.rate === 'number' ? candidate.rate : Number(candidate.rate)

  if (!outputCurrency || !baseCurrency || !Number.isFinite(rate)) return null

  return {
    version: QUOTATION_FX_SNAPSHOT_VERSION,
    outputCurrency: outputCurrency as PlatformCurrency,
    baseCurrency: baseCurrency as PlatformCurrency,
    rate,
    rateDateResolved: typeof candidate.rateDateResolved === 'string' ? candidate.rateDateResolved : null,
    source: typeof candidate.source === 'string' ? candidate.source : null,
    composedViaUsd: candidate.composedViaUsd === true,

    // Pre-TASK-466 followup snapshots don't have this field. Null is the
    // safe default; consumers fall back to `composedViaUsd ? 'USD' : null`
    // when they need a display hub.
    compositionHub: typeof candidate.compositionHub === 'string' ? candidate.compositionHub : null,
    readinessState:
      typeof candidate.readinessState === 'string'
        ? (candidate.readinessState as FxReadinessState)
        : 'supported',
    stalenessThresholdDays:
      typeof candidate.stalenessThresholdDays === 'number'
        ? candidate.stalenessThresholdDays
        : Number(candidate.stalenessThresholdDays) || 0,
    clientFacingThresholdDays:
      typeof candidate.clientFacingThresholdDays === 'number'
        ? candidate.clientFacingThresholdDays
        : CLIENT_FACING_STALENESS_THRESHOLD_DAYS,
    ageDays:
      typeof candidate.ageDays === 'number'
        ? candidate.ageDays
        : candidate.ageDays === null
          ? null
          : Number(candidate.ageDays) || null,
    frozenAt: typeof candidate.frozenAt === 'string' ? candidate.frozenAt : new Date().toISOString(),
    domain: (typeof candidate.domain === 'string' ? candidate.domain : 'pricing_output') as CurrencyDomain
  }
}

/**
 * Permissive reader: returns the canonical snapshot if stored, or `null` when
 * the row still uses the legacy free-form shape (pre-TASK-466). Consumers
 * should fall back to `quotations.currency` + `exchange_rate_to_clp` in that
 * case.
 */
export const extractQuotationFxSnapshot = (
  exchangeRates: unknown
): QuotationFxSnapshot | null => {
  if (!isPlainObject(exchangeRates)) return null
  
return normalizeSnapshotCandidate(exchangeRates.__snapshot)
}
