import { describe, expect, it } from 'vitest'

import type { ContractorInvoiceAsset } from './invoice-asset-contracts'
import type { PayableReadinessResult } from './payables/readiness'
import type { ContractorPayable } from './payables/types'
import { deriveScenarioKind, mapEngagementToSelfServiceScenario } from './self-service-scenario'
import type { ContractorEngagement } from './types'
import type { ContractorWorkSubmission } from './work-submissions/types'

const baseEngagement = (overrides: Partial<ContractorEngagement> = {}): ContractorEngagement => ({
  contractorEngagementId: 'ce-1',
  publicId: 'CTR-2026-0048',
  profileId: 'prof-1',
  memberId: 'mem-1',
  personLegalEntityRelationshipId: 'rel-1',
  legalEntityOrganizationId: 'org-1',
  countryCode: 'Chile',
  taxResidencyCountryCode: 'CL',
  relationshipSubtype: 'honorarios_cl',
  payrollVia: 'internal',
  currency: 'CLP',
  paymentCurrency: 'CLP',
  fxPolicyCode: null,
  providerContractId: null,
  providerWorkerId: null,
  paymentModel: 'payg_invoice',
  rateType: 'fixed',
  rateAmount: 1250000,
  paymentCadence: 'monthly',
  requiresInvoice: true,
  requiresWorkApproval: true,
  taxComplianceOwner: 'greenhouse_policy',
  taxWithholdingPolicyCode: 'cl_honorarios_2026_15_25',
  taxWithholdingRateSnapshot: 0.1525,
  bonusPolicy: 'none',
  classificationRiskStatus: 'clear',
  classificationReviewed: true,
  classificationRiskFactors: {},
  status: 'active',
  startDate: '2026-05-04',
  endDate: null,
  closureReason: null,
  closureEffectiveDate: null,
  providerTerminationRef: null,
  closureInitiatedAt: null,
  closureInitiatedBy: null,
  closureExecutedAt: null,
  closureExecutedBy: null,
  postClosureInvoicesAllowed: false,
  metadata: {},
  createdByUserId: 'u-1',
  createdAt: '2026-05-04T00:00:00Z',
  updatedAt: '2026-05-04T00:00:00Z',
  ...overrides
})

const submission = (overrides: Partial<ContractorWorkSubmission> = {}): ContractorWorkSubmission => ({
  contractorWorkSubmissionId: 'ws-1',
  publicId: 'SUB-1261',
  contractorEngagementId: 'ce-1',
  submissionType: 'deliverable',
  title: 'Entregable mayo',
  servicePeriodStart: '2026-05-04',
  servicePeriodEnd: '2026-05-31',
  quantity: null,
  unit: null,
  rateAmountSnapshot: null,
  grossAmount: 1250000,
  currency: 'CLP',
  status: 'submitted',
  submittedByUserId: 'u-1',
  submittedAt: '2026-05-29T00:00:00Z',
  reviewedByUserId: null,
  reviewedAt: null,
  reviewReason: null,
  consumedByPayableId: null,
  consumedAt: null,
  metadata: {},
  createdByUserId: 'u-1',
  createdAt: '2026-05-29T00:00:00Z',
  updatedAt: '2026-05-29T00:00:00Z',
  ...overrides
})

const payable = (overrides: Partial<ContractorPayable> = {}): ContractorPayable => ({
  contractorPayableId: 'pay-1',
  publicId: 'CPY-1',
  contractorEngagementId: 'ce-1',
  contractorWorkSubmissionId: 'ws-1',
  contractorInvoiceId: null,
  payableSourceKind: 'work_submission',
  beneficiaryType: 'member',
  beneficiaryId: 'mem-1',
  grossAmount: 1250000,
  withholdingAmount: 190625,
  netPayable: 1059375,
  currency: 'CLP',
  paymentCurrency: 'CLP',
  fxPolicyCode: null,
  taxComplianceOwner: 'greenhouse_policy',
  taxWithholdingPolicyCode: 'cl_honorarios_2026_15_25',
  economicCategory: 'labor_cost_external',
  payrollVia: 'internal',
  paymentProfileId: 'pp-1',
  paymentProfileWaiverReason: null,
  agreedAmountOverrideReason: null,
  dueDate: null,
  status: 'ready_for_finance',
  financeObligationId: null,
  paymentOrderId: null,
  readiness: {},
  sourceSnapshot: {},
  createdByUserId: 'u-1',
  createdAt: '2026-05-29T00:00:00Z',
  updatedAt: '2026-05-29T00:00:00Z',
  ...overrides
})

const invoiceAsset = (
  role: ContractorInvoiceAsset['assetRole'],
  id = role
): ContractorInvoiceAsset => ({
  invoiceAssetId: `ia-${id}`,
  publicId: `ASSET-${id}`,
  contractorEngagementId: 'ce-1',
  contractorInvoiceId: null,
  contractorWorkSubmissionId: null,
  assetId: `asset-${id}`,
  assetRole: role,
  artifactKind: 'human_readable',
  source: 'contractor_upload',
  countryCode: 'CL',
  uploadedByUserId: 'u-1',
  metadata: {},
  createdAt: '2026-05-29T00:00:00Z'
})

const labels = {
  legalEntityLabel: 'Efeonce Group SpA',
  contractorName: 'Valentina Hoyos',
  paymentProfileLabel: 'Cuenta activa',
  paymentProfileDetail: 'Banco de Chile.',
  paidRemittances: []
}

describe('deriveScenarioKind', () => {
  it('honorarios_ready when active with no submission/payable', () => {
    expect(deriveScenarioKind(baseEngagement(), null, null, null)).toBe('honorarios_ready')
  })

  it('submitted_review when latest submission is submitted', () => {
    expect(deriveScenarioKind(baseEngagement(), submission({ status: 'submitted' }), null, null)).toBe(
      'submitted_review'
    )
  })

  it('disputed when latest submission is disputed', () => {
    expect(deriveScenarioKind(baseEngagement(), submission({ status: 'disputed' }), null, null)).toBe(
      'disputed'
    )
  })

  it('paid when latest payable is paid', () => {
    expect(
      deriveScenarioKind(baseEngagement(), submission({ status: 'approved' }), payable({ status: 'paid' }), null)
    ).toBe('paid')
  })

  it('international_blocked when payable blocked with FX boundary blocker', () => {
    const readiness: PayableReadinessResult = {
      ready: false,
      blockers: [{ code: 'fx_policy_unresolved', message: 'Falta política FX.' }],
      evaluatedAt: '2026-05-29T00:00:00Z'
    }

    expect(
      deriveScenarioKind(
        baseEngagement({ currency: 'USD', paymentCurrency: 'CLP', relationshipSubtype: 'international_contractor' }),
        submission({ status: 'approved' }),
        payable({ status: 'blocked', currency: 'USD', paymentCurrency: 'CLP' }),
        readiness
      )
    ).toBe('international_blocked')
  })

  it('closure_pending when engagement is ending', () => {
    expect(deriveScenarioKind(baseEngagement({ status: 'ending' }), null, null, null)).toBe('closure_pending')
  })
})

describe('mapEngagementToSelfServiceScenario', () => {
  it('reads the contracting legal entity from the resolved label (never hardcoded)', () => {
    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement(),
      submissions: [],
      payables: [],
      invoiceAssets: [],
      latestPayableReadiness: null,
      ...labels
    })

    expect(scenario.legalEntityLabel).toBe('Efeonce Group SpA')
    expect(scenario.contractorName).toBe('Valentina Hoyos')
    expect(scenario.secondaryHref).toBe('/my/payment-profile')
  })

  it('honorarios_ready synthesizes a contractor-actionable missing-support blocker', () => {
    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement(),
      submissions: [],
      payables: [],
      invoiceAssets: [],
      latestPayableReadiness: null,
      ...labels
    })

    expect(scenario.kind).toBe('honorarios_ready')
    expect(scenario.blockers).toHaveLength(1)
    expect(scenario.blockers[0]?.responsable).toBe('Contractor')
    expect(scenario.supportItems.find(i => i.kind === 'invoice')?.status).toBe('Pendiente')
  })

  it('marks support items Adjunta when contractor-visible assets exist', () => {
    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement(),
      submissions: [submission({ status: 'submitted' })],
      payables: [],
      invoiceAssets: [invoiceAsset('invoice_pdf'), invoiceAsset('work_evidence')],
      latestPayableReadiness: null,
      ...labels
    })

    expect(scenario.supportItems.find(i => i.kind === 'invoice')?.status).toBe('Adjunta')
    expect(scenario.supportItems.find(i => i.kind === 'evidence')?.status).toBe('Adjunta')
  })

  it('NEVER surfaces Finance-only provider statements as contractor support items', () => {
    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement(),
      submissions: [],
      payables: [],
      invoiceAssets: [invoiceAsset('provider_statement'), invoiceAsset('payout_receipt'), invoiceAsset('fx_receipt')],
      latestPayableReadiness: null,
      ...labels
    })

    // Provider statement / payout / fx receipts are Finance-only → invoice slot stays Pendiente.
    expect(scenario.supportItems.find(i => i.kind === 'invoice')?.status).toBe('Pendiente')
    expect(scenario.supportItems.every(i => i.kind !== 'provider')).toBe(true)
  })

  it('maps payable readiness blockers with Finance responsable for FX/tax-owner gates', () => {
    const readiness: PayableReadinessResult = {
      ready: false,
      blockers: [
        { code: 'fx_policy_unresolved', message: 'Falta política FX.' },
        { code: 'invoice_asset_missing', message: 'Falta la boleta.' }
      ],
      evaluatedAt: '2026-05-29T00:00:00Z'
    }

    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement({ currency: 'USD', paymentCurrency: 'CLP' }),
      submissions: [submission({ status: 'approved' })],
      payables: [payable({ status: 'blocked', currency: 'USD', paymentCurrency: 'CLP' })],
      invoiceAssets: [],
      latestPayableReadiness: readiness,
      ...labels
    })

    const fxBlocker = scenario.blockers.find(b => b.id === 'fx_policy_unresolved')
    const invoiceBlocker = scenario.blockers.find(b => b.id === 'invoice_asset_missing')

    expect(fxBlocker?.responsable).toBe('Finance')
    expect(invoiceBlocker?.responsable).toBe('Contractor')
  })

  it('derives paid KPIs + done timeline when payable is paid', () => {
    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement(),
      submissions: [submission({ status: 'approved' })],
      payables: [payable({ status: 'paid' })],
      invoiceAssets: [invoiceAsset('invoice_pdf')],
      latestPayableReadiness: null,
      ...labels
    })

    expect(scenario.kind).toBe('paid')
    expect(scenario.kpis.find(k => k.id === 'net')?.title).toBe('Neto pagado')
    expect(scenario.timeline.find(t => t.id === 'paid')?.status).toBe('done')
  })

  it('closure_pending sets closureVisible and the closure copy', () => {
    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement({ status: 'ending' }),
      submissions: [],
      payables: [],
      invoiceAssets: [],
      latestPayableReadiness: null,
      ...labels
    })

    expect(scenario.kind).toBe('closure_pending')
    expect(scenario.closureVisible).toBe(true)
  })

  it('international_blocked disables the primary action (HR/Finance resolves)', () => {
    const readiness: PayableReadinessResult = {
      ready: false,
      blockers: [{ code: 'fx_policy_unresolved', message: 'Falta política FX.' }],
      evaluatedAt: '2026-05-29T00:00:00Z'
    }

    const scenario = mapEngagementToSelfServiceScenario({
      engagement: baseEngagement({ currency: 'USD', paymentCurrency: 'CLP', relationshipSubtype: 'international_contractor' }),
      submissions: [submission({ status: 'approved' })],
      payables: [payable({ status: 'blocked', currency: 'USD', paymentCurrency: 'CLP' })],
      invoiceAssets: [invoiceAsset('invoice_pdf')],
      latestPayableReadiness: readiness,
      ...labels
    })

    expect(scenario.kind).toBe('international_blocked')
    expect(scenario.primaryActionDisabled).toBe(true)
  })
})
