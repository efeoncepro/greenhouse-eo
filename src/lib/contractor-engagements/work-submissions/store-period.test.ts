import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  clientQuery: vi.fn(),
  getEngagement: vi.fn()
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: mocks.query, withGreenhousePostgresTransaction: mocks.transaction }))
vi.mock('../store', () => ({ getContractorEngagementById: mocks.getEngagement }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import { createContractorWorkSubmission, updateContractorWorkSubmissionDraft } from './store'

describe('work submission period at the command boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(fn => fn({ query: mocks.clientQuery }))
  })

  it('rejects the localized composer value before reading or writing the database', async () => {
    await expect(
      createContractorWorkSubmission({
        contractorEngagementId: 'ceng-test',
        submissionType: 'deliverable',
        servicePeriodStart: '20 ago - 31 ago 2026',
        actorUserId: 'contractor-test'
      })
    ).rejects.toMatchObject({ code: 'invalid_service_period_date', statusCode: 422 })
    expect(mocks.getEngagement).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('checks an edited start against the existing end, without persisting an invalid draft', async () => {
    mocks.clientQuery.mockResolvedValueOnce({
      rows: [
        {
          contractor_work_submission_id: 'cws-test',
          public_id: 'EO-CWS-TEST',
          status: 'draft',
          service_period_start: '2026-09-01',
          service_period_end: '2026-09-30',
          created_at: '2026-10-05T00:00:00Z',
          updated_at: '2026-10-05T00:00:00Z'
        }
      ]
    })

    await expect(
      updateContractorWorkSubmissionDraft({
        contractorWorkSubmissionId: 'cws-test',
        servicePeriodStart: '2026-10-01',
        actorUserId: 'admin-test'
      })
    ).rejects.toMatchObject({ code: 'invalid_service_period_range', statusCode: 422 })
    expect(mocks.clientQuery).toHaveBeenCalledTimes(1)
  })

  const mockPersistedDraft = (metadata: Record<string, unknown> = {}) => {
    const current: Record<string, unknown> = {
      contractor_work_submission_id: 'cws-test',
      contractor_engagement_id: 'eng-test',
      status: 'draft',
      service_period_start: '2026-09-01',
      service_period_end: '2026-09-30',
      quantity: 2,
      gross_amount: 2000,
      rate_amount_snapshot: 1000,
      currency: 'CLP',
      metadata_json: metadata,
      created_at: '2026-10-05',
      updated_at: '2026-10-05'
    }

    mocks.clientQuery.mockReset()
    mocks.clientQuery.mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.includes('FOR UPDATE')) return { rows: [{ ...current }] }

      if (sql.startsWith('UPDATE greenhouse_hr.contractor_work_submissions')) {
        for (const match of sql.matchAll(/(\w+) = \$(\d+)/g)) {
          if (match[1] !== 'contractor_work_submission_id') current[match[1]] = values[Number(match[2]) - 1]
        }

        const metadataParameter = sql.match(/metadata_json = metadata_json \|\| \$(\d+)::jsonb/)

        if (metadataParameter)
          current.metadata_json = {
            ...(current.metadata_json as object),
            ...JSON.parse(values[Number(metadataParameter[1]) - 1] as string)
          }

        return { rows: [{ ...current }] }
      }

      return { rows: [] }
    })
  }

  it('persists the refreshed agreement snapshot with the new draft economics', async () => {
    mockPersistedDraft()

    const updated = await updateContractorWorkSubmissionDraft({
      contractorWorkSubmissionId: 'cws-test',
      grossAmount: 4000,
      rateAmountSnapshot: 2000,
      actorUserId: 'own-test'
    })

    expect(updated.grossAmount).toBe(updated.quantity! * updated.rateAmountSnapshot!)
    expect(updated.rateAmountSnapshot).toBe(2000)
  })

  it('invalidates legacy support after an administrative draft period edit', async () => {
    mockPersistedDraft()

    const updated = await updateContractorWorkSubmissionDraft({
      contractorWorkSubmissionId: 'cws-test',
      servicePeriodStart: '2026-09-02',
      actorUserId: 'hr-test'
    })

    expect(updated.metadata.selfServicePeriodChanged).toBe(true)
  })

  it('does not let a metadata patch re-enable legacy support after an edited period', async () => {
    mockPersistedDraft({ selfServicePeriodChanged: true })

    const updated = await updateContractorWorkSubmissionDraft({
      contractorWorkSubmissionId: 'cws-test',
      metadataPatch: { selfServicePeriodChanged: false, annotation: 'reviewed' },
      actorUserId: 'hr-test'
    })

    expect(updated.metadata).toEqual({ selfServicePeriodChanged: true, annotation: 'reviewed' })
  })
})
