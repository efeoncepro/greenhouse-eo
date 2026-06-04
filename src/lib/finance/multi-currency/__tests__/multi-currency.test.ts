// TASK-990 Slice 1 — money primitives + FX snapshot evidence + canonical 3-plane
// snapshot. FX resolver is injected (deps.resolveRate) so tests are DB-free.

import { describe, expect, it } from 'vitest'

import type { FxReadiness } from '../../currency-domain'
import type { ResolveFxReadinessInput } from '../../fx-readiness'
import {
  buildCanonicalMoneySnapshot,
  CURRENCY_PRECISION,
  makeMoney,
  manualOverrideFxSnapshotEvidence,
  observedFxSnapshotEvidence,
  resolveFxSnapshotEvidence,
  roundHalfUp,
  validateNativeEquivalentDrift
} from '..'

// ── Stub resolver: deterministic rates for the 6 finance_core directions ──
const RATES: Record<string, { rate: number; hub?: string; source: string }> = {
  'CLP->USD': { rate: 0.001065, source: 'mindicador' }, // 1 CLP = 0.001065 USD (~939 CLP/USD)
  'USD->CLP': { rate: 939.0, source: 'mindicador' },
  'MXN->CLP': { rate: 51.33, hub: 'USD', source: 'composed' },
  'CLP->MXN': { rate: 0.019482, hub: 'USD', source: 'composed' },
  'MXN->USD': { rate: 0.05467, hub: 'USD', source: 'banxico_sie' },
  'USD->MXN': { rate: 18.29, hub: 'USD', source: 'banxico_sie' }
}

const stubResolver = (input: ResolveFxReadinessInput): Promise<FxReadiness> => {
  const key = `${input.fromCurrency}->${input.toCurrency}`
  const hit = RATES[key]

  const base: FxReadiness = {
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    rateDate: input.rateDate ?? null,
    domain: input.domain,
    state: hit ? 'supported' : 'temporarily_unavailable',
    rate: hit ? hit.rate : null,
    rateDateResolved: hit ? (input.rateDate ?? '2026-06-01') : null,
    source: hit ? hit.source : null,
    ageDays: hit ? 0 : null,
    stalenessThresholdDays: 7,
    composedViaUsd: hit?.hub === 'USD',
    compositionHub: hit?.hub ?? null,
    message: hit ? 'ok' : 'sin tasa'
  }

  return Promise.resolve(base)
}

describe('money primitives', () => {
  it('CLP rounds to 0 decimals, USD/MXN to 2', () => {
    expect(CURRENCY_PRECISION).toEqual({ CLP: 0, USD: 2, MXN: 2 })
    expect(makeMoney(4617647.4, 'CLP').amount).toBe('4617647')
    expect(makeMoney(89960, 'MXN').amount).toBe('89960.00')
    expect(makeMoney(4915.5, 'USD').amount).toBe('4915.50')
  })

  it('roundHalfUp is half-up, not banker-rounding', () => {
    expect(roundHalfUp(1.005, 2)).toBe('1.01')
    expect(roundHalfUp(2.5, 0)).toBe('3')
    expect(roundHalfUp(-2.5, 0)).toBe('-3')
    expect(roundHalfUp(0.125, 2)).toBe('0.13')
  })
})

describe('resolveFxSnapshotEvidence — 6 directions', () => {
  for (const key of Object.keys(RATES)) {
    const [from, to] = key.split('->') as ['CLP' | 'USD' | 'MXN', 'CLP' | 'USD' | 'MXN']

    it(`${key} produces snapshotable evidence with inverse`, async () => {
      const { evidence, readiness } = await resolveFxSnapshotEvidence(
        { fromCurrency: from, toCurrency: to, rateDate: '2026-06-01', policy: 'rate_at_event' },
        { resolveRate: stubResolver }
      )

      expect(readiness.state).toBe('supported')
      expect(evidence).not.toBeNull()
      expect(Number(evidence!.rate)).toBeCloseTo(RATES[key].rate, 6)
      expect(Number(evidence!.inverseRate)).toBeCloseTo(1 / RATES[key].rate, 6)
      expect(evidence!.composedVia).toEqual(RATES[key].hub ? ['USD'] : null)
    })
  }

  it('fails closed (evidence null) when rate unavailable', async () => {
    const { evidence, readiness } = await resolveFxSnapshotEvidence(
      { fromCurrency: 'MXN', toCurrency: 'CLP', rateDate: '2026-06-01', policy: 'rate_at_event' },
      { resolveRate: () => Promise.resolve({ ...({} as FxReadiness), state: 'temporarily_unavailable', rate: null } as FxReadiness) }
    )

    expect(readiness.state).toBe('temporarily_unavailable')
    expect(evidence).toBeNull()
  })
})

describe('observed + manual evidence', () => {
  it('observed evidence carries the implicit legal rate (Berel)', () => {
    const ev = observedFxSnapshotEvidence({
      fromCurrency: 'MXN',
      toCurrency: 'CLP',
      fromAmount: 89960,
      toAmount: 4617647,
      rateDate: '2026-06-01'
    })

    expect(ev.source).toBe('nubox_legal_document')
    expect(Number(ev.rate)).toBeCloseTo(4617647 / 89960, 4) // 51.3300
    expect(ev.policy).toBe('rate_at_event')
  })

  it('manual override requires rate>0 and reason>=10 chars', () => {
    expect(() =>
      manualOverrideFxSnapshotEvidence({ fromCurrency: 'MXN', toCurrency: 'CLP', rate: 51, rateDate: '2026-06-01', reason: 'corto' })
    ).toThrow(/reason/)

    const ev = manualOverrideFxSnapshotEvidence({
      fromCurrency: 'MXN',
      toCurrency: 'CLP',
      rate: 51.5,
      rateDate: '2026-06-01',
      reason: 'Banxico caído, rate del banco confirmado por tesorería'
    })

    expect(ev.policy).toBe('manual_override')
    expect(ev.lockedBy).toBe('finance_admin')
  })
})

describe('buildCanonicalMoneySnapshot — Berel export (MXN→CLP legal→USD)', () => {
  it('uses observed functional CLP and derives USD from CLP (single anchor)', async () => {
    const result = await buildCanonicalMoneySnapshot(
      {
        nativeAmount: 89960,
        nativeCurrency: 'MXN',
        rateDate: '2026-06-01',
        observedFunctionalClp: 4617647
      },
      { resolveRate: stubResolver }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { snapshot } = result

    expect(snapshot.native).toEqual({ amount: '89960.00', currency: 'MXN', precision: 2 })
    expect(snapshot.functional.amount).toBe('4617647') // observed legal CLP, not recomputed
    expect(snapshot.functional.currency).toBe('CLP')
    // reporting USD derived from functional CLP × (CLP→USD) — NOT from MXN→USD
    expect(snapshot.reporting.currency).toBe('USD')
    expect(Number(snapshot.reporting.amount)).toBeCloseTo(4617647 * 0.001065, 2)
    expect(snapshot.nativeToFunctional.source).toBe('nubox_legal_document')
    expect(snapshot.functionalToReporting.fromCurrency).toBe('CLP')
    expect(snapshot.functionalToReporting.toCurrency).toBe('USD')
  })

  it('native_equivalent_drift is within tolerance for the canonical chain', async () => {
    const result = await buildCanonicalMoneySnapshot(
      { nativeAmount: 89960, nativeCurrency: 'MXN', rateDate: '2026-06-01', observedFunctionalClp: 4617647 },
      { resolveRate: stubResolver }
    )

    if (!result.ok) throw new Error('expected ok')
    const drift = validateNativeEquivalentDrift(result.snapshot)

    expect(drift.ok).toBe(true)
    expect(Math.abs(drift.functionalDriftClp)).toBeLessThanOrEqual(1)
    expect(Math.abs(drift.reportingDriftUsd)).toBeLessThanOrEqual(0.01)
  })

  it('CLP native is identity at functional plane', async () => {
    const result = await buildCanonicalMoneySnapshot(
      { nativeAmount: 1000000, nativeCurrency: 'CLP', rateDate: '2026-06-01' },
      { resolveRate: stubResolver }
    )

    if (!result.ok) throw new Error('expected ok')
    expect(result.snapshot.functional.amount).toBe('1000000')
    expect(result.snapshot.nativeToFunctional.source).toBe('identity')
  })

  it('fails closed when functional→reporting rate is unavailable', async () => {
    const noClpUsd = (input: ResolveFxReadinessInput): Promise<FxReadiness> =>
      input.fromCurrency === 'CLP' && input.toCurrency === 'USD'
        ? Promise.resolve({ ...({} as FxReadiness), state: 'temporarily_unavailable', rate: null } as FxReadiness)
        : stubResolver(input)

    const result = await buildCanonicalMoneySnapshot(
      { nativeAmount: 89960, nativeCurrency: 'MXN', rateDate: '2026-06-01', observedFunctionalClp: 4617647 },
      { resolveRate: noClpUsd }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('functional_to_reporting_unavailable')
  })
})
