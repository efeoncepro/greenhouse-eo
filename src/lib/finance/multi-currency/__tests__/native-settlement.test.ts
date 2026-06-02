import { describe, expect, it } from 'vitest'

import {
  computeRealizedFxClp,
  deriveBookedFunctionalRate,
  isSettlementCorridorSupported,
  resolveNativeSettlementContext
} from '../native-settlement'

// Round to CLP cents (mirror of finance roundCurrency for the deterministic test).
const round = (value: number) => Math.round(value * 100) / 100

// Berel DTE 110 canonical fixture.
const BEREL_NATIVE = 89_960 // MXN
const BEREL_FUNCTIONAL_CLP = 4_617_647 // CLP legal (Nubox)
const BEREL_BOOKED_RATE = BEREL_FUNCTIONAL_CLP / BEREL_NATIVE // 51.3300...

describe('resolveNativeSettlementContext', () => {
  it('flags a native invoice and settles in native units', () => {
    const ctx = resolveNativeSettlementContext({
      nativeCurrency: 'MXN',
      nativeAmount: BEREL_NATIVE,
      fallbackTotal: BEREL_FUNCTIONAL_CLP
    })

    expect(ctx.isNative).toBe(true)
    expect(ctx.nativeCurrency).toBe('MXN')
    expect(ctx.nativeAmount).toBe(BEREL_NATIVE)
    // Settlement plane is native units, NOT the CLP functional total.
    expect(ctx.settlementTotal).toBe(BEREL_NATIVE)
  })

  it('falls back to functional total for a legacy CLP/USD row', () => {
    const ctx = resolveNativeSettlementContext({
      nativeCurrency: null,
      nativeAmount: null,
      fallbackTotal: 1_000_000
    })

    expect(ctx.isNative).toBe(false)
    expect(ctx.nativeCurrency).toBeNull()
    expect(ctx.nativeAmount).toBeNull()
    expect(ctx.settlementTotal).toBe(1_000_000)
  })

  it('treats a present native_currency with null native_amount as non-native (defensive)', () => {
    const ctx = resolveNativeSettlementContext({
      nativeCurrency: 'MXN',
      nativeAmount: null,
      fallbackTotal: 500
    })

    expect(ctx.isNative).toBe(false)
    expect(ctx.settlementTotal).toBe(500)
  })
})

describe('isSettlementCorridorSupported', () => {
  it('native MXN invoice accepts MXN payments', () => {
    expect(isSettlementCorridorSupported({ isNative: true, nativeCurrency: 'MXN', paymentCurrency: 'MXN' })).toBe(true)
  })

  it('native MXN invoice REJECTS a CLP payment in V1 (fail-closed corridor)', () => {
    expect(isSettlementCorridorSupported({ isNative: true, nativeCurrency: 'MXN', paymentCurrency: 'CLP' })).toBe(false)
  })

  it('native MXN invoice REJECTS a USD payment in V1 (fail-closed corridor)', () => {
    expect(isSettlementCorridorSupported({ isNative: true, nativeCurrency: 'MXN', paymentCurrency: 'USD' })).toBe(false)
  })

  it('legacy (non-native) invoice accepts any payment currency', () => {
    expect(isSettlementCorridorSupported({ isNative: false, nativeCurrency: null, paymentCurrency: 'USD' })).toBe(true)
    expect(isSettlementCorridorSupported({ isNative: false, nativeCurrency: null, paymentCurrency: 'CLP' })).toBe(true)
  })
})

describe('deriveBookedFunctionalRate', () => {
  it('native invoice uses the native→functional rate locked at issuance', () => {
    const rate = deriveBookedFunctionalRate({
      isNative: true,
      totalAmountClp: BEREL_FUNCTIONAL_CLP,
      nativeAmount: BEREL_NATIVE,
      legacyDocumentRate: 1 // income.exchange_rate_to_clp = 1 for a CLP-functional row — MUST be ignored
    })

    expect(rate).toBeCloseTo(BEREL_BOOKED_RATE, 8)
    expect(rate).not.toBe(1) // the bug: using exchange_rate_to_clp=1 would be wrong
  })

  it('legacy foreign invoice uses exchange_rate_to_clp', () => {
    const rate = deriveBookedFunctionalRate({
      isNative: false,
      totalAmountClp: 0,
      nativeAmount: null,
      legacyDocumentRate: 950 // USD doc rate
    })

    expect(rate).toBe(950)
  })

  it('guards native_amount <= 0 by falling back to the legacy rate', () => {
    const rate = deriveBookedFunctionalRate({
      isNative: true,
      totalAmountClp: 1000,
      nativeAmount: 0,
      legacyDocumentRate: 42
    })

    expect(rate).toBe(42)
  })
})

describe('computeRealizedFxClp (fx_result = settlement_clp − booked_clp)', () => {
  it('Berel paid 89.960 MXN at a HIGHER rate → realized FX gain', () => {
    const settlementRate = 52
    const settlementClp = round(BEREL_NATIVE * settlementRate) // 4.677.920

    const fx = computeRealizedFxClp({
      paymentAmount: BEREL_NATIVE,
      settlementClp,
      bookedRate: BEREL_BOOKED_RATE,
      round
    })

    // settlement 4.677.920 − booked 4.617.647 = 60.273 CLP gain
    expect(fx).toBe(60_273)
  })

  it('paid at the booked rate → zero realized FX', () => {
    const settlementClp = round(BEREL_NATIVE * BEREL_BOOKED_RATE)

    const fx = computeRealizedFxClp({
      paymentAmount: BEREL_NATIVE,
      settlementClp,
      bookedRate: BEREL_BOOKED_RATE,
      round
    })

    expect(fx).toBe(0)
  })

  it('paid at a LOWER rate → realized FX loss (negative)', () => {
    const settlementRate = 50
    const settlementClp = round(BEREL_NATIVE * settlementRate) // 4.498.000

    const fx = computeRealizedFxClp({
      paymentAmount: BEREL_NATIVE,
      settlementClp,
      bookedRate: BEREL_BOOKED_RATE,
      round
    })

    expect(fx).toBe(4_498_000 - 4_617_647) // -119.647
  })

  it('returns null when no booked rate is available (→ fx_gain_loss.unclassified signal)', () => {
    const fx = computeRealizedFxClp({
      paymentAmount: 100,
      settlementClp: 95_000,
      bookedRate: 0,
      round
    })

    expect(fx).toBeNull()
  })
})
