import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunAppReadRoute = vi.fn()
const mockBuildAppContextPayload = vi.fn()

vi.mock('@/lib/api-platform/core/app-auth', () => ({
  runAppReadRoute: (...args: unknown[]) => mockRunAppReadRoute(...args)
}))

vi.mock('@/lib/api-platform/resources/app', () => ({
  buildAppContextPayload: (...args: unknown[]) => mockBuildAppContextPayload(...args)
}))

const { GET } = await import('./route')

describe('GET /api/platform/app/context', () => {
  it('uses the first-party app runner and context resource', async () => {
    mockBuildAppContextPayload.mockReturnValue({ user: { userId: 'user-1' } })
    mockRunAppReadRoute.mockImplementation(async ({ routeKey, handler }) => ({
      routeKey,
      result: await handler({ tenant: { userId: 'user-1' } })
    }))

    const response = await GET(new Request('https://example.com/api/platform/app/context'))

    expect(response).toEqual({
      routeKey: 'platform.app.context',
      result: {
        data: {
          user: {
            userId: 'user-1'
          }
        }
      }
    })
  })
})
