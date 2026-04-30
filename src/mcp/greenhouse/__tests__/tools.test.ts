import { describe, expect, it, vi } from 'vitest'

import { GreenhouseMcpApiError } from '../http-client'
import { createGreenhouseMcpHandlers } from '../tools'

describe('createGreenhouseMcpHandlers', () => {
  it('preserves requestId and apiVersion on successful tool results', async () => {
    const handlers = createGreenhouseMcpHandlers({
      getContext: vi.fn().mockResolvedValue({
        ok: true,
        requestId: 'req-context',
        apiVersion: '2026-04-25',
        status: 200,
        data: {
          consumer: { publicId: 'EO-SPK-0001' },
          binding: { publicId: 'EO-SPB-0001' }
        },
        meta: {
          scope: { scopeType: 'organization' }
        }
      }),
      listOrganizations: vi.fn(),
      getOrganization: vi.fn(),
      listCapabilities: vi.fn(),
      getIntegrationReadiness: vi.fn()
    })

    const result = await handlers.getContext()

    expect(result.isError).toBe(false)
    expect(result.structuredContent).toMatchObject({
      ok: true,
      requestId: 'req-context',
      apiVersion: '2026-04-25'
    })
  })

  it('returns machine-readable errors for auth and scope failures', async () => {
    const handlers = createGreenhouseMcpHandlers({
      getContext: vi.fn(),
      listOrganizations: vi.fn(),
      getOrganization: vi.fn().mockRejectedValue(
        new GreenhouseMcpApiError('Organization is outside the resolved consumer scope.', {
          status: 403,
          code: 'forbidden',
          requestId: 'req-403',
          apiVersion: '2026-04-25',
          details: { identifier: 'org-1' }
        })
      ),
      listCapabilities: vi.fn(),
      getIntegrationReadiness: vi.fn().mockRejectedValue(
        new GreenhouseMcpApiError('Unauthorized', {
          status: 401,
          code: 'invalid_token',
          requestId: 'req-401',
          apiVersion: '2026-04-25',
          details: null
        })
      )
    })

    const forbiddenResult = await handlers.getOrganization({ id: 'org-1' })
    const authResult = await handlers.getIntegrationReadiness({})

    expect(forbiddenResult.isError).toBe(true)
    expect(forbiddenResult.structuredContent).toMatchObject({
      ok: false,
      requestId: 'req-403',
      status: 403,
      error: { code: 'forbidden' }
    })

    expect(authResult.isError).toBe(true)
    expect(authResult.structuredContent).toMatchObject({
      ok: false,
      requestId: 'req-401',
      status: 401,
      error: { code: 'invalid_token' }
    })
  })
})
