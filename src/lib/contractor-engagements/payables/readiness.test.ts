import { describe, expect, it } from 'vitest'

import { evaluatePayableReadiness } from './readiness'
import type { PayableReadinessInputs } from './readiness'

const ready: PayableReadinessInputs = {
  sourceApproved: true,
  requiresInvoice: true,
  hasRequiredInvoiceAsset: true,
  grossAmount: 1000,
  withholdingAmount: 152.5,
  netPayable: 847.5,
  obligationCurrency: 'CLP',
  fxNeeded: false,
  fxSupported: true,
  paymentProfileResolved: true,
  paymentProfileWaived: false,
  providerOwned: false,
  hasProviderRef: false
}

describe('contractor payable readiness (TASK-793)', () => {
  it('is ready when every gate passes', () => {
    const r = evaluatePayableReadiness(ready)

    expect(r.ready).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it('blocks when source not approved', () => {
    const r = evaluatePayableReadiness({ ...ready, sourceApproved: false })

    expect(r.ready).toBe(false)
    expect(r.blockers.map(b => b.code)).toContain('source_not_approved')
  })

  it('blocks when invoice required but no asset attached', () => {
    const r = evaluatePayableReadiness({ ...ready, hasRequiredInvoiceAsset: false })

    expect(r.blockers.map(b => b.code)).toContain('invoice_asset_missing')
  })

  it('does NOT require invoice asset when engagement does not require invoice', () => {
    const r = evaluatePayableReadiness({
      ...ready,
      requiresInvoice: false,
      hasRequiredInvoiceAsset: false
    })

    expect(r.ready).toBe(true)
  })

  it('blocks when net does not reconcile', () => {
    const r = evaluatePayableReadiness({ ...ready, netPayable: 900 })

    expect(r.blockers.map(b => b.code)).toContain('net_mismatch')
  })

  it('blocks unsupported obligation currency', () => {
    const r = evaluatePayableReadiness({ ...ready, obligationCurrency: 'EUR' })

    expect(r.blockers.map(b => b.code)).toContain('currency_unsupported')
  })

  it('blocks cross-currency without FX support', () => {
    const r = evaluatePayableReadiness({ ...ready, fxNeeded: true, fxSupported: false })

    expect(r.blockers.map(b => b.code)).toContain('fx_unresolved')
  })

  it('passes cross-currency when FX is supported', () => {
    const r = evaluatePayableReadiness({
      ...ready,
      obligationCurrency: 'USD',
      fxNeeded: true,
      fxSupported: true
    })

    expect(r.ready).toBe(true)
  })

  it('blocks missing payment profile, passes with waiver', () => {
    const blocked = evaluatePayableReadiness({ ...ready, paymentProfileResolved: false })

    expect(blocked.blockers.map(b => b.code)).toContain('payment_profile_unresolved')

    const waived = evaluatePayableReadiness({
      ...ready,
      paymentProfileResolved: false,
      paymentProfileWaived: true
    })

    expect(waived.ready).toBe(true)
  })

  it('blocks provider-owned without provider ref', () => {
    const r = evaluatePayableReadiness({ ...ready, providerOwned: true, hasProviderRef: false })

    expect(r.blockers.map(b => b.code)).toContain('provider_split_missing')

    const ok = evaluatePayableReadiness({ ...ready, providerOwned: true, hasProviderRef: true })

    expect(ok.ready).toBe(true)
  })
})
