import { describe, expect, it, vi } from 'vitest'

import { GreenhouseApiPlatformClient } from '../http-client'
import type { GreenhouseMcpApiError } from '../http-client'
import type { GreenhouseMcpConfig } from '../types'

const config: GreenhouseMcpConfig = {
  apiBaseUrl: 'https://greenhouse.example.com',
  consumerToken: 'secret-token',
  externalScopeType: 'organization',
  externalScopeId: 'org_123',
  apiVersion: '2026-04-25',
  requestTimeoutMs: 15000
}

describe('GreenhouseApiPlatformClient', () => {
  it('calls ecosystem routes with auth, version and scope query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: 'req-123',
          servedAt: '2026-04-30T12:00:00.000Z',
          version: '2026-04-25',
          data: { page: 1, pageSize: 25, count: 0, items: [] },
          meta: { scope: { scopeType: 'organization' } }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    )

    const client = new GreenhouseApiPlatformClient(config, fetchMock)

    const result = await client.listOrganizations({
      page: 2,
      pageSize: 10,
      search: 'efe'
    })

    expect(result.requestId).toBe('req-123')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://greenhouse.example.com/api/platform/ecosystem/organizations?externalScopeType=organization&externalScopeId=org_123&page=2&pageSize=10&search=efe',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer secret-token',
          'x-greenhouse-api-version': '2026-04-25'
        })
      })
    )
  })

  it('surfaces machine-readable API errors with status and requestId', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: 'req-403',
          servedAt: '2026-04-30T12:00:00.000Z',
          version: '2026-04-25',
          data: null,
          errors: [
            {
              code: 'forbidden',
              message: 'Organization is outside the resolved consumer scope.',
              details: { routeKey: 'platform.ecosystem.organizations.detail' }
            }
          ],
          meta: {}
        }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' }
        }
      )
    )

    const client = new GreenhouseApiPlatformClient(config, fetchMock)

    await expect(client.getOrganization({ id: 'org-1' })).rejects.toMatchObject({
      name: 'GreenhouseMcpApiError',
      status: 403,
      code: 'forbidden',
      requestId: 'req-403',
      apiVersion: '2026-04-25'
    } satisfies Partial<GreenhouseMcpApiError>)
  })

  it('calls platform health and event control plane routes through the same scoped client', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requestId: 'req-health',
            servedAt: '2026-04-30T12:00:00.000Z',
            version: '2026-04-25',
            data: {
              contractVersion: 'platform-health.v1',
              overallStatus: 'healthy'
            },
            meta: {}
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requestId: 'req-events',
            servedAt: '2026-04-30T12:00:00.000Z',
            version: '2026-04-25',
            data: { count: 1, items: [{ code: 'delivery.updated' }] },
            meta: {}
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )

    const client = new GreenhouseApiPlatformClient(config, fetchMock)

    await client.getPlatformHealth()
    await client.listEventTypes({ namespace: 'delivery' })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://greenhouse.example.com/api/platform/ecosystem/health?externalScopeType=organization&externalScopeId=org_123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer secret-token',
          'x-greenhouse-api-version': '2026-04-25'
        }),
        signal: expect.any(AbortSignal)
      })
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://greenhouse.example.com/api/platform/ecosystem/event-types?externalScopeType=organization&externalScopeId=org_123&namespace=delivery',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
    )
  })
})
