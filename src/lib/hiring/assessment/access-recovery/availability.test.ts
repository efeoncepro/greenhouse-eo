import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))

import { getAssessmentAccessRecoveryAvailability } from './availability'

const row = {
  assessment_id: 'asmt-1',
  application_id: 'happ-1',
  opening_id: 'hopn-1',
  method: 'candidate_test',
  status: 'sent',
  started_at: null,
  token_expires_at: new Date('2026-08-30T00:00:00Z'),
  application_stage: 'screening',
  application_decision: null,
  consent_status: 'granted',
  now_at: new Date('2026-08-19T12:00:00Z'),
  effective_deadline_at: null,
  has_candidate_email: true,
  email_provider_status: null,
  recovery_count_24h: 0,
  latest_recovery_at: null,
}

describe('getAssessmentAccessRecoveryAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([row])
  })

  it('expone evidencia mínima sin bearer, hash, email ni versión', async () => {
    const availability = await getAssessmentAccessRecoveryAvailability('asmt-1')
    const serialized = JSON.stringify(availability)

    expect(availability?.channels.email.available).toBe(true)
    expect(availability?.channels.secureLink.available).toBe(true)
    expect(serialized).not.toMatch(/token|hash|canonical_email|@/i)
  })

  it('bloquea sólo email con evidencia provider y conserva secure_link', async () => {
    mocks.query.mockResolvedValue([{ ...row, email_provider_status: 'bounced' }])

    const availability = await getAssessmentAccessRecoveryAvailability('asmt-1')

    expect(availability?.channels.email).toMatchObject({ available: false, providerStatus: 'bounced' })
    expect(availability?.channels.secureLink.available).toBe(true)
  })
})
