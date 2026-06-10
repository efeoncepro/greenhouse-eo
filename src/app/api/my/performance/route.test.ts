import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireMyTenantContext = vi.fn()
const mockComposeMyPerformance = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireMyTenantContext: (...args: unknown[]) => mockRequireMyTenantContext(...args)
}))

vi.mock('@/lib/my-performance/dto', () => ({
  composeMyPerformance: (...args: unknown[]) => mockComposeMyPerformance(...args),
  resolveCurrentSantiagoPeriod: () => ({ year: 2026, month: 6 })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { GET } from '@/app/api/my/performance/route'

const req = (url: string) => new Request(url)

describe('GET /api/my/performance (TASK-1027 anti-IDOR + validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMyTenantContext.mockResolvedValue({
      tenant: { tenantType: 'efeonce_internal' },
      memberId: 'member-session',
      errorResponse: null
    })
    mockComposeMyPerformance.mockResolvedValue({ subject: { memberId: 'member-session' } })
  })

  it('ignores a client-supplied memberId and uses the session subject (anti-IDOR)', async () => {
    const res = await GET(req('https://x/api/my/performance?memberId=other-member&year=2026&month=5'))

    expect(res.status).toBe(200)
    expect(mockComposeMyPerformance).toHaveBeenCalledTimes(1)
    expect(mockComposeMyPerformance).toHaveBeenCalledWith({
      memberId: 'member-session',
      year: 2026,
      month: 5
    })
  })

  it('defaults to the current Santiago period when no params are supplied', async () => {
    await GET(req('https://x/api/my/performance'))

    expect(mockComposeMyPerformance).toHaveBeenCalledWith({
      memberId: 'member-session',
      year: 2026,
      month: 6
    })
  })

  it('rejects an out-of-range year with invalid_period (400)', async () => {
    const res = await GET(req('https://x/api/my/performance?year=1999&month=5'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.code).toBe('invalid_period')
    expect(mockComposeMyPerformance).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range month with invalid_period (400)', async () => {
    const res = await GET(req('https://x/api/my/performance?year=2026&month=13'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.code).toBe('invalid_period')
  })

  it('rejects a non-numeric period param with invalid_period (400)', async () => {
    const res = await GET(req('https://x/api/my/performance?month=abc'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.code).toBe('invalid_period')
  })

  it('passes through the auth guard error response when unauthorized', async () => {
    mockRequireMyTenantContext.mockResolvedValue({
      tenant: null,
      memberId: null,
      errorResponse: new Response('no', { status: 401 })
    })

    const res = await GET(req('https://x/api/my/performance'))

    expect(res.status).toBe(401)
    expect(mockComposeMyPerformance).not.toHaveBeenCalled()
  })

  it('returns a sanitized internal_error (no raw message) when compose throws', async () => {
    mockComposeMyPerformance.mockRejectedValue(new Error('SELECT * FROM secrets failed'))

    const res = await GET(req('https://x/api/my/performance?year=2026&month=6'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.code).toBe('internal_error')
    expect(JSON.stringify(body)).not.toContain('secrets')
  })
})
