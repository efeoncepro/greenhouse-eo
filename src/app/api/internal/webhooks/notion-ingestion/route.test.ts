import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  verifyTask: vi.fn(),
  ensureHandlersRegistered: vi.fn(),
  processInboundWebhook: vi.fn()
}))

vi.mock('@/lib/webhooks/cloud-tasks-oidc', () => ({
  verifyNotionWebhookTaskRequest: mocks.verifyTask
}))

vi.mock('@/lib/webhooks/handlers', () => ({
  ensureHandlersRegistered: mocks.ensureHandlersRegistered
}))

vi.mock('@/lib/webhooks/inbound', () => ({
  processInboundWebhook: mocks.processInboundWebhook
}))

import { POST } from './route'

const envelope = {
  endpointKey: 'notion-tasks-demo',
  rawBody: JSON.stringify({ id: 'evt-123' }),
  signature: 'sha256=signature',
  contentType: 'application/json',
  enqueuedAt: '2026-07-17T00:00:00.000Z'
}

describe('Notion ingestion Cloud Tasks worker route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyTask.mockResolvedValue(true)
    mocks.ensureHandlersRegistered.mockResolvedValue(undefined)
    mocks.processInboundWebhook.mockResolvedValue({
      status: 200,
      body: { received: true, processed: true }
    })
  })

  it('rejects requests without a valid Google OIDC identity', async () => {
    mocks.verifyTask.mockResolvedValue(false)

    const response = await POST(new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify(envelope)
    }))

    expect(response.status).toBe(401)
    expect(mocks.processInboundWebhook).not.toHaveBeenCalled()
  })

  it('reconstructs the original webhook and enables durable retry semantics', async () => {
    const response = await POST(new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify(envelope)
    }))

    expect(response.status).toBe(200)
    expect(mocks.processInboundWebhook).toHaveBeenCalledTimes(1)

    const [endpointKey, inboundRequest, options] = mocks.processInboundWebhook.mock.calls[0]

    expect(endpointKey).toBe('notion-tasks-demo')
    expect(inboundRequest.headers.get('x-notion-signature')).toBe('sha256=signature')
    expect(await inboundRequest.text()).toBe(envelope.rawBody)
    expect(options).toEqual({ retryFailedDuplicates: true, surfaceHandlerFailures: true })
  })
})
