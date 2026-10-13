import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ auth: vi.fn(), engagement: vi.fn(), save: vi.fn(), attach: vi.fn(), can: vi.fn() }))

vi.mock('@/lib/tenant/authorization', () => ({ requireMyTenantContext: m.auth }))
vi.mock('@/lib/entitlements/runtime', () => ({ can: m.can }))
vi.mock('@/lib/contractor-engagements', async () => import('@/lib/contractor-engagements/errors'))
vi.mock('@/lib/contractor-engagements/self-service-projection', () => ({
  getActiveContractorEngagementForProfile: m.engagement,
  clearContractorSelfServiceCacheForProfile: vi.fn()
}))
vi.mock('@/lib/contractor-engagements/hr-workbench-projection', () => ({ __clearContractorHrWorkbenchCache: vi.fn() }))
vi.mock('@/lib/contractor-engagements/work-submissions/self-service', () => ({ saveOwnContractorSubmission: m.save }))
vi.mock('@/lib/contractor-engagements/invoice-assets', () => ({ attachContractorInvoiceAsset: m.attach }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements/errors'
import { POST } from './route'
import { POST as attach } from '../attach-asset/route'

const request = (body: object) =>
  new Request('http://localhost/api/my/contractor/work-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

describe('own contractor HTTP boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.auth.mockResolvedValue({
      tenant: { userId: 'own-user', identityProfileId: 'own-profile' },
      memberId: 'own-member'
    })
    m.can.mockReturnValue(true)
    m.engagement.mockResolvedValue({ contractorEngagementId: 'own-engagement', status: 'active' })
    m.save.mockResolvedValue({ submission: { contractorWorkSubmissionId: 'owned-draft' }, created: true })
    m.attach.mockResolvedValue({ invoiceAssetId: 'owned-link' })
  })
  it('passes session authority and retry/support fields, excluding arbitrary agreement money', async () => {
    const response = await POST(
      request({
        contractorEngagementId: 'foreign-eng',
        identityProfileId: 'foreign-profile',
        memberId: 'foreign-member',
        submissionType: 'deliverable',
        grossAmount: 0.01,
        rateAmountSnapshot: 0.01,
        currency: 'USD',
        unit: 'days',
        quantity: 3,
        idempotencyKey: 'attempt-1234567890',
        contractorWorkSubmissionId: 'owned-draft',
        invoiceAssetId: 'own-invoice',
        evidenceAssetId: 'own-evidence',
        submit: true
      })
    )

    expect(response.status).toBe(201)
    const command = m.save.mock.calls[0][0]

    expect(command).toMatchObject({
      contractorEngagementId: 'own-engagement',
      identityProfileId: 'own-profile',
      memberId: 'own-member',
      actorUserId: 'own-user',
      idempotencyKey: 'attempt-1234567890',
      contractorWorkSubmissionId: 'owned-draft',
      invoiceAssetId: 'own-invoice',
      evidenceAssetId: 'own-evidence'
    })
    expect(command).not.toHaveProperty('grossAmount')
    expect(command).not.toHaveProperty('rateAmountSnapshot')
    expect(command).not.toHaveProperty('currency')
    expect(command).not.toHaveProperty('unit')
  })
  it('returns the replay result and preserves domain error status/code', async () => {
    m.save.mockResolvedValueOnce({ submission: { contractorWorkSubmissionId: 'owned-draft' }, created: false })
    expect((await POST(request({ submissionType: 'deliverable' }))).status).toBe(200)
    m.save.mockRejectedValueOnce(new ContractorEngagementValidationError('No disponible', 'asset_not_owned', 404))
    const response = await POST(request({ submissionType: 'deliverable' }))

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ code: 'asset_not_owned' })
  })
  it('keeps the own capability gate before any command', async () => {
    m.can.mockReturnValue(false)
    expect((await POST(request({ submissionType: 'deliverable' }))).status).toBe(403)
    expect(m.save).not.toHaveBeenCalled()
  })
  it('passes the session member to enforce asset ownership on standalone support attachment', async () => {
    await attach(
      request({
        assetId: 'candidate-asset',
        contractorWorkSubmissionId: 'candidate-submission',
        assetRole: 'work_evidence',
        ownerMemberId: 'forged-member'
      })
    )
    expect(m.attach).toHaveBeenCalledWith(
      expect.objectContaining({ ownerMemberId: 'own-member', contractorEngagementId: 'own-engagement' })
    )
  })
})
