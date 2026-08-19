import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { issueTalentPoolSelfServiceTokenWithClient } = await import('./self-service')

describe('talent-pool token issuance under consent lock', () => {
  it('does not issue when the requested consent is no longer current', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })

    const result = await issueTalentPoolSelfServiceTokenWithClient({ query } as never, {
      membershipId: 'tlpm-11111111-1111-4111-8111-111111111111',
      consentEventId: 'tlpc-22222222-2222-4222-8222-222222222222'
    })

    expect(result).toBeNull()
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE OF m,cf,ce')
    expect(query.mock.calls.some(call => String(call[0]).includes('access_token_hash'))).toBe(false)
  })

  it('issues only after the locked consent request passes revalidation', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ consent_event_id: 'tlpc-22222222-2222-4222-8222-222222222222' }] })
      .mockResolvedValue({ rows: [] })

    const result = await issueTalentPoolSelfServiceTokenWithClient({ query } as never, {
      membershipId: 'tlpm-11111111-1111-4111-8111-111111111111',
      consentEventId: 'tlpc-22222222-2222-4222-8222-222222222222'
    })

    expect(result?.token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(query.mock.calls.filter(call => String(call[0]).includes('talent_pool_self_service_token'))).toHaveLength(2)
  })
})
