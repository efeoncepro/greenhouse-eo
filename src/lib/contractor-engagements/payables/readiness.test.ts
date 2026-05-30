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
  hasProviderRef: false,
  classificationRiskBlocking: false,
  isHonorarios: false,
  rutVerified: true,
  honorariosWithholdingConsistent: true,
  taxOwnerReviewRequired: false,
  fxPolicyDeclared: true
}

const honorariosReady: PayableReadinessInputs = {
  ...ready,
  isHonorarios: true,
  rutVerified: true,
  honorariosWithholdingConsistent: true
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

describe('contractor payable readiness — Chile honorarios compliance (TASK-794)', () => {
  it('classification risk blocks ANY lane (universal gate)', () => {
    const r = evaluatePayableReadiness({ ...ready, classificationRiskBlocking: true })

    expect(r.ready).toBe(false)
    expect(r.blockers.map(b => b.code)).toContain('classification_risk_blocking')
  })

  it('honorarios passes when RUT verified + withholding consistent + classification clear', () => {
    const r = evaluatePayableReadiness(honorariosReady)

    expect(r.ready).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it('blocks honorarios when CL_RUT not verified', () => {
    const r = evaluatePayableReadiness({
      ...honorariosReady,
      rutVerified: false,
      rutBlockerDetail: 'cl_rut_missing'
    })

    expect(r.ready).toBe(false)
    const rutBlocker = r.blockers.find(b => b.code === 'rut_unverified')

    expect(rutBlocker).toBeDefined()
    expect(rutBlocker?.message).toContain('cl_rut_missing')
  })

  it('does NOT require verified RUT for non-honorarios lanes', () => {
    const r = evaluatePayableReadiness({ ...ready, isHonorarios: false, rutVerified: false })

    expect(r.ready).toBe(true)
    expect(r.blockers.map(b => b.code)).not.toContain('rut_unverified')
  })

  it('blocks honorarios when withholding is inconsistent with the SII snapshot (dependent deduction guard)', () => {
    const r = evaluatePayableReadiness({ ...honorariosReady, honorariosWithholdingConsistent: false })

    expect(r.ready).toBe(false)
    expect(r.blockers.map(b => b.code)).toContain('honorarios_withholding_mismatch')
  })

  it('does NOT apply the honorarios withholding gate to non-honorarios lanes', () => {
    const r = evaluatePayableReadiness({ ...ready, isHonorarios: false, honorariosWithholdingConsistent: false })

    expect(r.blockers.map(b => b.code)).not.toContain('honorarios_withholding_mismatch')
  })
})

describe('contractor payable readiness — international tax-owner boundary (TASK-795 Fase A)', () => {
  it('passes when tax owner does not require review (e.g. greenhouse_policy / provider_owned)', () => {
    const r = evaluatePayableReadiness({ ...ready, taxOwnerReviewRequired: false })

    expect(r.ready).toBe(true)
  })

  it('blocks when tax owner requires human review (manual_review_required / country_engine_owned)', () => {
    const r = evaluatePayableReadiness({
      ...ready,
      taxOwnerReviewRequired: true,
      taxOwnerDetail: 'manual_review_required'
    })

    expect(r.ready).toBe(false)
    const blocker = r.blockers.find(b => b.code === 'tax_owner_review_required')

    expect(blocker).toBeDefined()
    expect(blocker?.message).toContain('manual_review_required')
  })

  it('the tax-owner gate is universal (applies regardless of honorarios)', () => {
    const r = evaluatePayableReadiness({ ...honorariosReady, taxOwnerReviewRequired: true })

    expect(r.blockers.map(b => b.code)).toContain('tax_owner_review_required')
  })
})

describe('contractor payable readiness — explicit FX policy (TASK-795 Fase A)', () => {
  it('does NOT require FX policy when same-currency (fxNeeded=false)', () => {
    const r = evaluatePayableReadiness({ ...ready, fxNeeded: false, fxPolicyDeclared: false })

    expect(r.ready).toBe(true)
    expect(r.blockers.map(b => b.code)).not.toContain('fx_policy_unresolved')
  })

  it('blocks cross-currency without an explicit FX policy even if a rate exists', () => {
    const r = evaluatePayableReadiness({
      ...ready,
      obligationCurrency: 'USD',
      fxNeeded: true,
      fxSupported: true,
      fxPolicyDeclared: false
    })

    expect(r.ready).toBe(false)
    expect(r.blockers.map(b => b.code)).toContain('fx_policy_unresolved')
  })

  it('passes cross-currency when FX policy is declared and a rate exists', () => {
    const r = evaluatePayableReadiness({
      ...ready,
      obligationCurrency: 'USD',
      fxNeeded: true,
      fxSupported: true,
      fxPolicyDeclared: true
    })

    expect(r.ready).toBe(true)
  })
})
