// TASK-990 — FX snapshot contract (ADR GREENHOUSE_MULTI_CURRENCY_FINANCE_CORE_V1
// §5.2 / §6). An FxSnapshot is the immutable, auditable evidence of how one
// currency was converted to another for a financial fact. Slice 1 produces the
// EVIDENCE (rate + provenance + policy); persistence to greenhouse_finance.
// fx_snapshots (append-only) + the snapshotId/lockedAt are Slice 2.
//
// Three construction paths, all producing the same evidence shape:
//   1. resolveFxSnapshotEvidence  — rate from the canonical FX resolver
//      (resolveFxReadiness, finance_core domain). Used for MXN expenses,
//      CLP→USD reporting, etc. Fail-closed: unsupported/unavailable → null.
//   2. observedFxSnapshotEvidence — implicit rate from two observed amounts
//      (the Nubox legal-document CLP equivalent; Greenhouse does NOT recompute).
//   3. manualOverrideFxSnapshotEvidence — Finance Admin supplied the rate.

import type { FinanceCurrency } from '../contracts'
import type { CurrencyDomain, FxReadiness } from '../currency-domain'
import { resolveFxReadiness, type ResolveFxReadinessInput } from '../fx-readiness'

/** Snapshot policy = WHEN the rate was frozen (ADR §5.2). Subset of FX_POLICIES
 *  excluding `'none'`; a snapshot always froze at a moment. */
export type FxSnapshotPolicy =
  | 'rate_at_event'
  | 'rate_at_send'
  | 'rate_at_period_close'
  | 'rate_at_settlement'
  | 'manual_override'

/** The evidence to persist into greenhouse_finance.fx_snapshots (Slice 2). The
 *  persisted row adds `snapshotId` + `lockedAt` + `supersededBy`. */
export interface FxSnapshotEvidence {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  /** Rate as decimal string: 1 unit of `from` = `rate` units of `to`. */
  rate: string
  /** 1 / rate, pre-computed so consumers never divide. */
  inverseRate: string
  /** Date the rate applies to (event/settlement date). */
  rateDate: string
  /** Actual date of the rate row used (may differ from rateDate if older). */
  rateDateResolved: string | null
  /** Provider / origin: `mindicador`, `banxico_sie`, `nubox_legal_document`,
   *  `composed_via_USD`, `manual_override`. */
  source: string
  /** Pivot currencies if composed (e.g. ['USD'] for MXN↔CLP). Null if direct. */
  composedVia: FinanceCurrency[] | null
  policy: FxSnapshotPolicy
  lockedBy: 'system' | 'finance_admin'
  manualOverrideReason: string | null
}

export interface ResolveFxSnapshotEvidenceResult {
  readiness: FxReadiness
  /** Non-null only when readiness is `supported` or `supported_but_stale`
   *  (fail-closed: missing/stale-unsupported → no snapshotable evidence). */
  evidence: FxSnapshotEvidence | null
}

const RATE_PRECISION = 8

const formatRate = (rate: number): string => rate.toFixed(RATE_PRECISION)

const asFinanceCurrency = (code: string): FinanceCurrency => code.toUpperCase() as FinanceCurrency

type RateResolver = (input: ResolveFxReadinessInput) => Promise<FxReadiness>

/**
 * Resolve snapshotable FX evidence via the canonical resolver. Works for all 6
 * finance_core directions (CLP↔USD, MXN↔CLP, MXN↔USD) — the resolver applies
 * direct → inverse → USD-composition. Fail-closed: returns evidence=null when
 * the pair is `unsupported` or `temporarily_unavailable`.
 */
export const resolveFxSnapshotEvidence = async (
  params: {
    fromCurrency: FinanceCurrency
    toCurrency: FinanceCurrency
    rateDate: string
    policy: FxSnapshotPolicy
    domain?: CurrencyDomain
  },
  deps: { resolveRate?: RateResolver } = {}
): Promise<ResolveFxSnapshotEvidenceResult> => {
  const resolve = deps.resolveRate ?? resolveFxReadiness

  const readiness = await resolve({
    fromCurrency: params.fromCurrency,
    toCurrency: params.toCurrency,
    rateDate: params.rateDate,
    domain: params.domain ?? 'finance_core'
  })

  if ((readiness.state !== 'supported' && readiness.state !== 'supported_but_stale') || readiness.rate === null) {
    return { readiness, evidence: null }
  }

  const rate = readiness.rate
  const composedVia = readiness.compositionHub ? [asFinanceCurrency(readiness.compositionHub)] : null

  return {
    readiness,
    evidence: {
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      rate: formatRate(rate),
      inverseRate: formatRate(1 / rate),
      rateDate: params.rateDate,
      rateDateResolved: readiness.rateDateResolved,
      source: composedVia ? `composed_via_${composedVia.join('_')}` : readiness.source ?? 'unknown',
      composedVia,
      policy: params.policy,
      lockedBy: 'system',
      manualOverrideReason: null
    }
  }
}

/**
 * Build evidence from two OBSERVED amounts — the implicit rate of a legal
 * document. Canonical for Nubox export invoices (ADR §8.4): the functional CLP
 * is the SII/Nubox legal value, NOT recomputed by Greenhouse. The implicit rate
 * (toAmount / fromAmount) is persisted as evidence with source
 * `nubox_legal_document`.
 */
export const observedFxSnapshotEvidence = (params: {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  fromAmount: number
  toAmount: number
  rateDate: string
  source?: string
  policy?: FxSnapshotPolicy
}): FxSnapshotEvidence => {
  if (!(params.fromAmount > 0) || !Number.isFinite(params.toAmount)) {
    throw new Error('observedFxSnapshotEvidence: fromAmount must be > 0 and toAmount finite')
  }

  const rate = params.toAmount / params.fromAmount

  return {
    fromCurrency: params.fromCurrency,
    toCurrency: params.toCurrency,
    rate: formatRate(rate),
    inverseRate: formatRate(1 / rate),
    rateDate: params.rateDate,
    rateDateResolved: params.rateDate,
    source: params.source ?? 'nubox_legal_document',
    composedVia: null,
    policy: params.policy ?? 'rate_at_event',
    lockedBy: 'system',
    manualOverrideReason: null
  }
}

/**
 * Build evidence from a Finance-Admin-supplied rate (readiness was
 * temporarily_unavailable / stale and an authorized override was recorded).
 * The raw reason rides on the snapshot; the override capability + audit live in
 * the route layer (Slice 6/7).
 */
export const manualOverrideFxSnapshotEvidence = (params: {
  fromCurrency: FinanceCurrency
  toCurrency: FinanceCurrency
  rate: number
  rateDate: string
  reason: string
}): FxSnapshotEvidence => {
  if (!(params.rate > 0)) {
    throw new Error('manualOverrideFxSnapshotEvidence: rate must be > 0')
  }

  if (params.reason.trim().length < 10) {
    throw new Error('manualOverrideFxSnapshotEvidence: reason must be >= 10 chars')
  }

  return {
    fromCurrency: params.fromCurrency,
    toCurrency: params.toCurrency,
    rate: formatRate(params.rate),
    inverseRate: formatRate(1 / params.rate),
    rateDate: params.rateDate,
    rateDateResolved: params.rateDate,
    source: 'manual_override',
    composedVia: null,
    policy: 'manual_override',
    lockedBy: 'finance_admin',
    manualOverrideReason: params.reason.trim()
  }
}
