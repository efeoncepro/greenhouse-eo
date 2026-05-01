import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { describe, expect, it, vi } from 'vitest'

import { handleGreenhouseMcpRemoteRequest, resolveGreenhouseMcpRemoteGatewayConfig } from '../remote'

const baseEnv = {
  GREENHOUSE_MCP_REMOTE_GATEWAY_TOKEN: 'gateway-secret',
  GREENHOUSE_MCP_API_BASE_URL: 'https://greenhouse.example.com',
  GREENHOUSE_MCP_CONSUMER_TOKEN: 'consumer-secret',
  GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE: 'organization',
  GREENHOUSE_MCP_EXTERNAL_SCOPE_ID: 'org_123'
}

const createFetchForRemoteHandler =
  (handlerFetch?: typeof fetch): typeof fetch =>
  async (input, init) => {
    const request = new Request(input, init)

    return handleGreenhouseMcpRemoteRequest(request, {
      env: baseEnv,
      fetch: handlerFetch
    })
  }

describe('Greenhouse MCP remote gateway', () => {
  it('requires an explicit private gateway token before serving MCP traffic', async () => {
    const response = await handleGreenhouseMcpRemoteRequest(
      new Request('https://example.com/api/mcp/greenhouse', {
        method: 'POST',
        headers: { authorization: 'Bearer gateway-secret' },
        body: '{}'
      }),
      {
        env: {}
      }
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: '2.0',
      error: {
        message: 'Greenhouse MCP remote gateway is not configured.'
      }
    })
  })

  it('rejects unauthorized requests without leaking gateway or consumer secrets', async () => {
    const response = await handleGreenhouseMcpRemoteRequest(
      new Request('https://example.com/api/mcp/greenhouse', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-secret' },
        body: '{}'
      }),
      {
        env: baseEnv
      }
    )

    expect(response.status).toBe(401)

    const body = await response.json()

    expect(JSON.stringify(body)).not.toContain('gateway-secret')
    expect(JSON.stringify(body)).not.toContain('consumer-secret')
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      error: {
        message: 'Unauthorized Greenhouse MCP remote request.'
      }
    })
  })

  it('enforces an explicit request body budget for the remote gateway', async () => {
    const response = await handleGreenhouseMcpRemoteRequest(
      new Request('https://example.com/api/mcp/greenhouse', {
        method: 'POST',
        headers: {
          authorization: 'Bearer gateway-secret',
          'content-length': '12'
        },
        body: '{}'
      }),
      {
        env: {
          ...baseEnv,
          GREENHOUSE_MCP_REMOTE_MAX_BODY_BYTES: '8'
        }
      }
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        message: 'MCP request body exceeds the remote gateway limit.'
      }
    })
  })

  it('serves the same registered read-only tools over the official Streamable HTTP transport', async () => {
    const client = new Client({
      name: 'greenhouse-remote-test-client',
      version: '1.0.0'
    })

    const transport = new StreamableHTTPClientTransport(new URL('https://example.com/api/mcp/greenhouse'), {
      requestInit: {
        headers: {
          authorization: 'Bearer gateway-secret'
        }
      },
      fetch: createFetchForRemoteHandler()
    })

    await client.connect(transport)

    const tools = await client.listTools()

    expect(tools.tools.map(tool => tool.name)).toEqual(
      expect.arrayContaining([
        'get_context',
        'list_organizations',
        'get_organization',
        'list_capabilities',
        'get_integration_readiness',
        'get_platform_health',
        'list_event_types',
        'list_webhook_subscriptions',
        'get_webhook_subscription',
        'list_webhook_deliveries',
        'get_webhook_delivery'
      ])
    )

    await transport.close()
  })

  it('keeps tool calls downstream of api/platform/ecosystem routes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: 'req-context',
          servedAt: '2026-05-01T12:00:00.000Z',
          version: '2026-04-25',
          data: {
            consumer: { publicId: 'EO-SPK-0001' },
            binding: { publicId: 'EO-SPB-0001' }
          },
          meta: {
            scope: { scopeType: 'organization' }
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    )

    const client = new Client({
      name: 'greenhouse-remote-test-client',
      version: '1.0.0'
    })

    const transport = new StreamableHTTPClientTransport(new URL('https://example.com/api/mcp/greenhouse'), {
      requestInit: {
        headers: {
          authorization: 'Bearer gateway-secret'
        }
      },
      fetch: createFetchForRemoteHandler(fetchMock)
    })

    await client.connect(transport)

    const result = await client.callTool({
      name: 'get_context',
      arguments: {}
    })

    expect(result.structuredContent).toMatchObject({
      ok: true,
      requestId: 'req-context'
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://greenhouse.example.com/api/platform/ecosystem/context?externalScopeType=organization&externalScopeId=org_123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer consumer-secret'
        })
      })
    )

    await transport.close()
  })

  it('normalizes remote config defaults', () => {
    expect(resolveGreenhouseMcpRemoteGatewayConfig(baseEnv)).toEqual({
      gatewayToken: 'gateway-secret',
      maxBodyBytes: 1_000_000
    })
  })
})
