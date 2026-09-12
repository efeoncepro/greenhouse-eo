import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, capture } = vi.hoisted(() => ({
  query: vi.fn(),
  capture: vi.fn(),
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: query,
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: capture,
}))

import { getHiringAssessmentRotationNoticeSignal } from './hiring-assessment-rotation-notice-signals'

describe('getHiringAssessmentRotationNoticeSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('excluye el motivo provider_delivery_failed usando reason_code, el contrato real del recovery', async () => {
    query.mockResolvedValue([{ rotations_window: 0, unnotified: 0 }])

    await expect(getHiringAssessmentRotationNoticeSignal()).resolves.toMatchObject({ severity: 'ok' })

    const sql = String(query.mock.calls[0]?.[0])

    expect(sql).toContain("recovery.reason_code IS DISTINCT FROM 'provider_delivery_failed'")
    expect(sql).not.toContain('recovery.outcome_reason')
  })
})
