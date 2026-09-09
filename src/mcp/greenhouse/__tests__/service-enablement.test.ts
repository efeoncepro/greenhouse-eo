import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'

import { createGreenhouseMcpServer } from '../server'

describe('service enablement serialized MCP contract', () => {
  it('publishes annotations/schemas and preserves preview or authority denial through tools/call', async () => {
    const requests: Array<{ path: string; body: unknown }> = []

    const preview = { version: 1, organizationId: 'org-a', fingerprint: 'a'.repeat(64), canApply: false,
      blockers: [{ code: 'commercial_mapping_unresolved' }], readiness: [{ code: 'human_login_unverified' }] }

    const server = createGreenhouseMcpServer({ apiBaseUrl: 'https://example.invalid', consumerToken: 'test-token',
      externalScopeType: 'other', externalScopeId: 'test-scope', apiVersion: '2026-04-25', requestTimeoutMs: 1000 }, {
      fetch: async (url, init) => {
        const request = new Request(url, init)

        requests.push({ path: new URL(request.url).pathname, body: await request.json() })
        const allowed = request.url.includes('/preview')

        return Response.json({ requestId: 'request-a', servedAt: '2026-09-09T00:00:00Z', version: '2026-04-25',
          data: allowed ? preview : null,
          ...allowed ? {} : { errors: [{ code: 'invalid_delegated_context', message: 'Human administration authority required.' }] }
        }, { status: allowed ? 200 : 403 })
      }
    })

    const client = new Client({ name: 'enablement-test', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await server.connect(serverTransport)
    await client.connect(clientTransport)

    try {
      const { tools } = await client.listTools()
      const read = tools.find(tool => tool.name === 'preview_client_service_enablement')!
      const apply = tools.find(tool => tool.name === 'apply_client_service_enablement')!

      expect(read.annotations).toEqual({ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false })
      expect(apply.annotations).toEqual({ readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false })
      expect(read.inputSchema.required).toEqual(expect.arrayContaining(['organizationId', 'targets', 'personIds']))
      const proposal = { organizationId: 'org-a', targets: [{ serviceId: null, moduleKey: 'seo_v2' }], personIds: [] }
      const result = await client.callTool({ name: read.name, arguments: proposal })

      expect(result.structuredContent).toMatchObject({ ok: true, data: preview })
      const denied = await client.callTool({ name: apply.name, arguments: { proposal, fingerprint: preview.fingerprint, idempotencyKey: 'apply-key' } })

      expect(denied.isError).toBe(true)
      expect(denied.structuredContent).toMatchObject({ ok: false, status: 403, error: { code: 'invalid_delegated_context' } })
      expect(requests[0]).toEqual({ path: '/api/platform/ecosystem/client-services/enablement/preview', body: proposal })
      expect(JSON.stringify(result)).not.toContain('test-token')
    } finally {
      await client.close()
      await server.close()
    }
  })
})
