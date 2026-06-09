import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunAppReadRoute = vi.fn()
const mockGetAppOrganizationCompactSignalsPayload = vi.fn()

vi.mock('@/lib/api-platform/core/app-auth', () => ({
  runAppReadRoute: (...args: unknown[]) => mockRunAppReadRoute(...args)
}))

vi.mock('@/lib/api-platform/resources/app-organizations', () => ({
  getAppOrganizationCompactSignalsPayload: (...args: unknown[]) => mockGetAppOrganizationCompactSignalsPayload(...args)
}))

const { GET } = await import('./route')

describe('GET /api/platform/app/organizations/[id]/compact-signals', () => {
  it('uses the first-party app read lane', async () => {
    mockGetAppOrganizationCompactSignalsPayload.mockResolvedValue({ organizationId: 'org-1', status: 'ready' })
    mockRunAppReadRoute.mockImplementation(async ({ routeKey, request, handler }) => ({
      routeKey,
      result: await handler({ tenant: { userId: 'user-1' } }),
      request
    }))

    const request = new Request('https://example.com/api/platform/app/organizations/org-1/compact-signals')

    const response = await GET(request, { params: Promise.resolve({ id: 'org-1' }) }) as unknown as {
      routeKey: string
      result: { data: unknown }
    }

    expect(response.routeKey).toBe('platform.app.organizations.compact_signals')
    expect(response.result.data).toEqual({ organizationId: 'org-1', status: 'ready' })
    expect(mockGetAppOrganizationCompactSignalsPayload).toHaveBeenCalledWith(expect.objectContaining({
      request,
      organizationId: 'org-1',
      entrypointContext: 'agency'
    }))
  })
})
