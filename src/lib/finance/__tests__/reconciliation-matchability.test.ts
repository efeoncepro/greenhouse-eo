import { describe, expect, it } from 'vitest'

import {
  getPaymentMatchability,
  getSettlementLegMatchability,
  isReconciliable
} from '@/lib/finance/reconciliation-matchability'

describe('TASK-708 Slice 2 — reconciliation matchability policy', () => {
  describe('payment matchability', () => {
    it('returns reconciliable when account present and not superseded', () => {
      const state = getPaymentMatchability({
        paymentId: 'pay-1',
        paymentAccountId: 'santander-clp',
        supersededByPaymentId: null,
        supersededByOtbId: null
      })

      expect(state).toEqual({ kind: 'reconciliable' })
      expect(isReconciliable(state)).toBe(true)
    })

    it('returns pending_account_resolution when account is null', () => {
      const state = getPaymentMatchability({
        paymentId: 'pay-phantom',
        paymentAccountId: null,
        supersededByPaymentId: null,
        supersededByOtbId: null
      })

      expect(state).toEqual({
        kind: 'pending_account_resolution',
        reason: 'no_payment_account_id'
      })
      expect(isReconciliable(state)).toBe(false)
    })

    it('returns recorded when superseded by payment chain (TASK-702)', () => {
      const state = getPaymentMatchability({
        paymentId: 'pay-old',
        paymentAccountId: 'santander-clp',
        supersededByPaymentId: 'pay-new',
        supersededByOtbId: null
      })

      expect(state).toEqual({ kind: 'recorded' })
      expect(isReconciliable(state)).toBe(false)
    })

    it('returns recorded when superseded by OTB chain (TASK-703b)', () => {
      const state = getPaymentMatchability({
        paymentId: 'pay-pre-anchor',
        paymentAccountId: 'santander-clp',
        supersededByPaymentId: null,
        supersededByOtbId: 'otb-2026-04'
      })

      expect(state).toEqual({ kind: 'recorded' })
      expect(isReconciliable(state)).toBe(false)
    })

    it('superseded chain has priority over null account (a phantom that gets superseded is still recorded historico)', () => {
      const state = getPaymentMatchability({
        paymentId: 'pay-phantom-superseded',
        paymentAccountId: null,
        supersededByPaymentId: 'pay-new',
        supersededByOtbId: null
      })

      expect(state).toEqual({ kind: 'recorded' })
    })
  })

  describe('settlement leg matchability', () => {
    it('returns reconciliable when receipt has instrument', () => {
      const state = getSettlementLegMatchability({
        settlementLegId: 'leg-1',
        legType: 'receipt',
        instrumentId: 'santander-clp',
        supersededAt: null,
        supersededByOtbId: null
      })

      expect(state).toEqual({ kind: 'reconciliable' })
      expect(isReconciliable(state)).toBe(true)
    })

    it('returns needs_repair when principal leg (receipt) has no instrument', () => {
      const state = getSettlementLegMatchability({
        settlementLegId: 'leg-phantom',
        legType: 'receipt',
        instrumentId: null,
        supersededAt: null,
        supersededByOtbId: null
      })

      expect(state).toEqual({
        kind: 'needs_repair',
        reason: 'principal_leg_without_instrument'
      })
      expect(isReconciliable(state)).toBe(false)
    })

    it('returns needs_repair when principal leg (payout) has no instrument', () => {
      const state = getSettlementLegMatchability({
        settlementLegId: 'leg-phantom-payout',
        legType: 'payout',
        instrumentId: null,
        supersededAt: null,
        supersededByOtbId: null
      })

      expect(state).toEqual({
        kind: 'needs_repair',
        reason: 'principal_leg_without_instrument'
      })
    })

    it('returns pending_account_resolution for auxiliary leg (funding) without instrument', () => {
      const state = getSettlementLegMatchability({
        settlementLegId: 'leg-funding',
        legType: 'funding',
        instrumentId: null,
        supersededAt: null,
        supersededByOtbId: null
      })

      expect(state).toEqual({
        kind: 'pending_account_resolution',
        reason: 'no_instrument_id'
      })
    })

    it('returns recorded when leg superseded (any chain)', () => {
      const a = getSettlementLegMatchability({
        settlementLegId: 'leg-old',
        legType: 'receipt',
        instrumentId: 'santander-clp',
        supersededAt: new Date(),
        supersededByOtbId: null
      })

      expect(a).toEqual({ kind: 'recorded' })

      const b = getSettlementLegMatchability({
        settlementLegId: 'leg-pre-anchor',
        legType: 'receipt',
        instrumentId: 'santander-clp',
        supersededAt: null,
        supersededByOtbId: 'otb-2026-04'
      })

      expect(b).toEqual({ kind: 'recorded' })
    })

    it('superseded has priority over needs_repair (a needs_repair leg that gets superseded becomes recorded)', () => {
      const state = getSettlementLegMatchability({
        settlementLegId: 'leg-phantom-cleaned',
        legType: 'receipt',
        instrumentId: null,
        supersededAt: new Date(),
        supersededByOtbId: null
      })

      expect(state).toEqual({ kind: 'recorded' })
    })
  })
})
