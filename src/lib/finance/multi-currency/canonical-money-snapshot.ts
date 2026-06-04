// TASK-990 — Canonical money snapshot (ADR §5.3 + §8.4). Every multi-currency
// finance fact reconstructs three planes through a SINGLE anchor (functional
// CLP):
//
//   native (contractual, e.g. MXN) → functional (CLP) → reporting (USD)
//
// Reporting USD is ALWAYS derived from functional CLP, NEVER from a direct
// native→USD rate (IAS 21: USD is a presentation currency, translated from the
// functional figures). This guarantees the three planes reconcile and
// `native_equivalent_drift` has no false positives.
//
// For Nubox export invoices the functional CLP is the OBSERVED legal value
// (pass `observedFunctionalClp`); Greenhouse never recomputes it. For other
// MXN facts (expenses) functional is resolved via the canonical FX resolver.

import type { FinanceCurrency } from '../contracts'
import type { CurrencyDomain, FxReadiness } from '../currency-domain'
import type { ResolveFxReadinessInput } from '../fx-readiness'

import {
  observedFxSnapshotEvidence,
  resolveFxSnapshotEvidence,
  type FxSnapshotEvidence,
  type FxSnapshotPolicy
} from './fx-snapshot'
import { CURRENCY_PRECISION, makeMoney, moneyToNumber, type MoneyAmount } from './money'

export interface CanonicalMoneySnapshot {
  native: MoneyAmount
  /** Functional plane — always CLP. */
  functional: MoneyAmount
  /** Reporting plane — always USD, derived from functional CLP. */
  reporting: MoneyAmount
  settlement?: MoneyAmount
  /** Evidence native→CLP (identity when native is CLP; observed for Nubox). */
  nativeToFunctional: FxSnapshotEvidence
  /** Evidence CLP→USD. */
  functionalToReporting: FxSnapshotEvidence
}

export type BuildCanonicalMoneySnapshotResult =
  | { ok: true; snapshot: CanonicalMoneySnapshot }
  | { ok: false; reason: 'native_to_functional_unavailable' | 'functional_to_reporting_unavailable'; readiness: FxReadiness }

type RateResolver = (input: ResolveFxReadinessInput) => Promise<FxReadiness>

const identityEvidence = (currency: FinanceCurrency, rateDate: string): FxSnapshotEvidence => ({
  fromCurrency: currency,
  toCurrency: currency,
  rate: '1.00000000',
  inverseRate: '1.00000000',
  rateDate,
  rateDateResolved: rateDate,
  source: 'identity',
  composedVia: null,
  policy: 'rate_at_event',
  lockedBy: 'system',
  manualOverrideReason: null
})

/**
 * Build the canonical 3-plane snapshot. Fail-closed: if any required rate is
 * unsupported/unavailable, returns `{ ok: false }` and the caller must block
 * the write (ADR fail-closed contract).
 */
export const buildCanonicalMoneySnapshot = async (
  params: {
    nativeAmount: number
    nativeCurrency: FinanceCurrency
    rateDate: string
    /** Nubox legal-document CLP equivalent — when present, functional is the
     *  OBSERVED value and native→functional is an implicit-rate evidence. */
    observedFunctionalClp?: number | null
    policy?: FxSnapshotPolicy
    domain?: CurrencyDomain
  },
  deps: { resolveRate?: RateResolver } = {}
): Promise<BuildCanonicalMoneySnapshotResult> => {
  const policy = params.policy ?? 'rate_at_event'
  const domain = params.domain ?? 'finance_core'
  const native = makeMoney(params.nativeAmount, params.nativeCurrency)

  // ── Plane 1→2: native → functional CLP ──
  let functional: MoneyAmount
  let nativeToFunctional: FxSnapshotEvidence

  if (params.nativeCurrency === 'CLP') {
    functional = native
    nativeToFunctional = identityEvidence('CLP', params.rateDate)
  } else if (params.observedFunctionalClp != null) {
    // Nubox legal document: functional is observed, not recomputed.
    functional = makeMoney(params.observedFunctionalClp, 'CLP')
    nativeToFunctional = observedFxSnapshotEvidence({
      fromCurrency: params.nativeCurrency,
      toCurrency: 'CLP',
      fromAmount: moneyToNumber(native),
      toAmount: params.observedFunctionalClp,
      rateDate: params.rateDate,
      policy
    })
  } else {
    const resolved = await resolveFxSnapshotEvidence(
      { fromCurrency: params.nativeCurrency, toCurrency: 'CLP', rateDate: params.rateDate, policy, domain },
      deps
    )

    if (!resolved.evidence) {
      return { ok: false, reason: 'native_to_functional_unavailable', readiness: resolved.readiness }
    }

    functional = makeMoney(moneyToNumber(native) * Number(resolved.evidence.rate), 'CLP')
    nativeToFunctional = resolved.evidence
  }

  // ── Plane 2→3: functional CLP → reporting USD (single anchor) ──
  const reportingResolved = await resolveFxSnapshotEvidence(
    { fromCurrency: 'CLP', toCurrency: 'USD', rateDate: params.rateDate, policy, domain },
    deps
  )

  if (!reportingResolved.evidence) {
    return { ok: false, reason: 'functional_to_reporting_unavailable', readiness: reportingResolved.readiness }
  }

  const reporting = makeMoney(moneyToNumber(functional) * Number(reportingResolved.evidence.rate), 'USD')

  return {
    ok: true,
    snapshot: {
      native,
      functional,
      reporting,
      nativeToFunctional,
      functionalToReporting: reportingResolved.evidence
    }
  }
}

export interface NativeEquivalentDriftResult {
  ok: boolean
  /** functional_clp − (native × nativeToFunctional.rate). */
  functionalDriftClp: number
  /** reporting_usd − (functional_clp × functionalToReporting.rate). */
  reportingDriftUsd: number
}

/** Tolerances = currency precision (ADR §8.4): ±1 CLP, ±0.01 USD. */
const FUNCTIONAL_DRIFT_TOLERANCE_CLP = 1
const REPORTING_DRIFT_TOLERANCE_USD = 0.01

/**
 * Verify the three planes reconcile through the canonical chain. A consumer
 * that recomputes by any other chain (e.g. native→USD directly) violates the
 * contract and this returns ok=false.
 */
export const validateNativeEquivalentDrift = (snapshot: CanonicalMoneySnapshot): NativeEquivalentDriftResult => {
  const nativeNum = moneyToNumber(snapshot.native)
  const functionalNum = moneyToNumber(snapshot.functional)
  const reportingNum = moneyToNumber(snapshot.reporting)

  const expectedFunctional = nativeNum * Number(snapshot.nativeToFunctional.rate)
  const expectedReporting = functionalNum * Number(snapshot.functionalToReporting.rate)

  const functionalDriftClp = Number((functionalNum - expectedFunctional).toFixed(CURRENCY_PRECISION.CLP))
  const reportingDriftUsd = Number((reportingNum - expectedReporting).toFixed(CURRENCY_PRECISION.USD))

  return {
    ok:
      Math.abs(functionalDriftClp) <= FUNCTIONAL_DRIFT_TOLERANCE_CLP &&
      Math.abs(reportingDriftUsd) <= REPORTING_DRIFT_TOLERANCE_USD,
    functionalDriftClp,
    reportingDriftUsd
  }
}
