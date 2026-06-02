import { describe, expect, it } from 'vitest'

import { resolveCurrentWorkbenchSubmissions } from './hr-workbench-submissions'
import type { ContractorWorkSubmission } from './work-submissions/types'

const submissionFixture = (
  overrides: Partial<ContractorWorkSubmission>
): ContractorWorkSubmission => ({
  contractorWorkSubmissionId: 'cws-1',
  publicId: 'EO-CWS-0001',
  contractorEngagementId: 'ceng-1',
  submissionType: 'project_fee',
  title: null,
  servicePeriodStart: '2026-05-01',
  servicePeriodEnd: null,
  quantity: 1,
  unit: 'fixed',
  rateAmountSnapshot: 1000,
  grossAmount: 1000,
  currency: 'CLP',
  status: 'submitted',
  submittedByUserId: 'contractor',
  submittedAt: '2026-06-02T14:00:00.000Z',
  reviewedByUserId: null,
  reviewedAt: null,
  reviewReason: null,
  consumedByPayableId: null,
  consumedAt: null,
  metadata: {},
  createdByUserId: 'contractor',
  createdAt: '2026-06-02T14:00:00.000Z',
  updatedAt: '2026-06-02T14:00:00.000Z',
  ...overrides
})

describe('resolveCurrentWorkbenchSubmissions', () => {
  it('keeps an approved unconsumed correction and drops the older dispute for the same period', () => {
    const current = resolveCurrentWorkbenchSubmissions([
      submissionFixture({
        contractorWorkSubmissionId: 'cws-disputed',
        publicId: 'EO-CWS-0002',
        status: 'disputed',
        reviewedAt: '2026-06-02T15:29:17.069Z',
        createdAt: '2026-06-02T14:37:42.172Z'
      }),
      submissionFixture({
        contractorWorkSubmissionId: 'cws-approved',
        publicId: 'EO-CWS-0003',
        status: 'approved',
        submittedAt: '2026-06-02T15:30:25.580Z',
        reviewedAt: '2026-06-02T15:31:19.353Z',
        createdAt: '2026-06-02T15:30:25.566Z'
      })
    ])

    expect(current.map(submission => submission.publicId)).toEqual(['EO-CWS-0003'])
  })

  it('keeps a dispute when the later approved submission belongs to another service period', () => {
    const current = resolveCurrentWorkbenchSubmissions([
      submissionFixture({
        contractorWorkSubmissionId: 'cws-disputed',
        publicId: 'EO-CWS-0002',
        status: 'disputed',
        reviewedAt: '2026-06-02T15:29:17.069Z'
      }),
      submissionFixture({
        contractorWorkSubmissionId: 'cws-approved',
        publicId: 'EO-CWS-0003',
        servicePeriodStart: '2026-06-01',
        status: 'approved',
        reviewedAt: '2026-06-02T15:31:19.353Z'
      })
    ])

    expect(current.map(submission => submission.publicId)).toEqual(['EO-CWS-0002', 'EO-CWS-0003'])
  })

  it('drops approved submissions already consumed by a payable', () => {
    const current = resolveCurrentWorkbenchSubmissions([
      submissionFixture({
        status: 'approved',
        consumedByPayableId: 'cpay-1',
        consumedAt: '2026-06-02T16:00:00.000Z'
      })
    ])

    expect(current).toHaveLength(0)
  })
})
