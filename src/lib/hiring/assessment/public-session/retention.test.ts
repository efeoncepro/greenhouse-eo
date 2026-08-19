import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), capture: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: mocks.capture }))

import { purgeAssessmentPublicAccessRetention } from './retention'

describe('assessment public access retention owner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ejecuta ambas purgas, hace readback y queda steady', async () => {
    mocks.query.mockResolvedValueOnce([{
      purged_sessions: 3,
      purged_request_buckets: 18,
      overdue_sessions: 0,
      overdue_request_buckets: 0,
    }])

    await expect(purgeAssessmentPublicAccessRetention()).resolves.toEqual({
      purgedSessions: 3,
      purgedRequestBuckets: 18,
      overdueSessions: 0,
      overdueRequestBuckets: 0,
      batches: 1,
      steady: true,
    })
    expect(mocks.capture).not.toHaveBeenCalled()
  })

  it('emite señal global IDs-only si el readback sigue overdue', async () => {
    mocks.query.mockResolvedValue([{
      purged_sessions: 5000,
      purged_request_buckets: 20000,
      overdue_sessions: 2,
      overdue_request_buckets: 4,
    }])

    await purgeAssessmentPublicAccessRetention()

    expect(mocks.capture).toHaveBeenCalledWith(expect.any(Error), 'hiring', expect.objectContaining({
      tags: { source: 'assessment_public_access_retention_overdue' },
      extra: expect.objectContaining({ overdueSessions: 2, overdueRequestBuckets: 4, batches: 10, steady: false }),
    }))
  })

  it('drena backlog en lotes hasta readback steady', async () => {
    mocks.query
      .mockResolvedValueOnce([{
        purged_sessions: 5000,
        purged_request_buckets: 20000,
        overdue_sessions: 1,
        overdue_request_buckets: 1,
      }])
      .mockResolvedValueOnce([{
        purged_sessions: 2,
        purged_request_buckets: 7,
        overdue_sessions: 0,
        overdue_request_buckets: 0,
      }])

    await expect(purgeAssessmentPublicAccessRetention()).resolves.toMatchObject({
      purgedSessions: 5002,
      purgedRequestBuckets: 20007,
      batches: 2,
      steady: true,
    })
    expect(mocks.capture).not.toHaveBeenCalled()
  })
})
