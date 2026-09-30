import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/public/growth/aeo-xray/shared/[token]/route'
import { runXrayAppRoute } from '@/lib/api-platform/resources/app-aeo-xray-route'

const mocks = vi.hoisted(() => ({ public: vi.fn(), operation: vi.fn() }))

vi.mock('./public-reader', () => ({ resolvePublicXray: mocks.public }))
vi.mock('@/lib/api-platform/core/app-auth', () => ({ runAppRoute: async ({ handler }: { handler: (context: unknown) => unknown }) => handler({ tenant: { userId: 'verified-operator' } }) }))
vi.mock('@/lib/api-platform/resources/app-aeo-xray', () => ({ runXrayOperation: mocks.operation }))

describe('X-Ray HTTP boundaries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns no client content or cacheable response for every denial', async () => {
    const token = `xrg_${'x'.repeat(43)}`

    for (const [status, code] of Object.entries({ not_found: 404, gone: 410, rate_limited: 429, unavailable: 503 })) {
      mocks.public.mockResolvedValue({ status })
      const response = await GET(new Request(`https://host/api/public/growth/aeo-xray/shared/${token}`), { params: Promise.resolve({ token }) })

      expect(response.status).toBe(code)
      expect(response.headers.get('Cache-Control')).toContain('no-store')
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
      expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
      expect(await response.json()).toEqual({ code: status })
    }
  })

  it('does not disclose raw provider exceptions or bearer strings', async () => {
    mocks.public.mockRejectedValue(new Error('private-token-and-connection-details'))
    const response = await GET(new Request('https://host/api/public/growth/aeo-xray/shared/secret'), { params: Promise.resolve({ token: 'secret' }) })

    expect(response.status).toBe(503)
    expect(await response.text()).not.toMatch(/private-token|connection|secret/)
  })

  it('rejects share response replay before generating a bearer', async () => {
    const request = new Request('https://host/api/platform/app/growth/aeo-xray/editions/id/shares', { method: 'POST', headers: { 'Idempotency-Key': 'same-key' }, body: '{}' })

    await expect(runXrayAppRoute(request, 'share', 'id')).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.operation).not.toHaveBeenCalled()
  })

  it('bounds authored JSON size and rejects malformed JSON before domain mutation', async () => {
    for (const [body, statusCode] of [['{', 400], ['x'.repeat(2 * 1024 * 1024 + 1), 413]] as const) {
      await expect(runXrayAppRoute(new Request('https://host/api/platform/app/growth/aeo-xray/cases', { method: 'POST', body }), 'create')).rejects.toMatchObject({ statusCode })
    }

    expect(mocks.operation).not.toHaveBeenCalled()
  })
})
