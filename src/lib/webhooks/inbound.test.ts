import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ensureWebhookSchema: vi.fn(),
  getEndpointByKey: vi.fn(),
  insertInboxEvent: vi.fn(),
  updateInboxEventStatus: vi.fn(),
  resolveSecret: vi.fn(),
  verifySignature: vi.fn()
}))

vi.mock('./store', () => ({
  ensureWebhookSchema: mocks.ensureWebhookSchema,
  getEndpointByKey: mocks.getEndpointByKey,
  insertInboxEvent: mocks.insertInboxEvent,
  updateInboxEventStatus: mocks.updateInboxEventStatus
}))

vi.mock('./signing', () => ({
  resolveSecret: mocks.resolveSecret,
  verifySignature: mocks.verifySignature
}))

import { processInboundWebhook, registerInboundHandler } from './inbound'

describe('queued inbound webhook retry behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureWebhookSchema.mockResolvedValue(undefined)
    mocks.getEndpointByKey.mockResolvedValue({
      webhook_endpoint_id: 'endpoint-1',
      endpoint_key: 'queued-test',
      provider_code: 'test',
      handler_code: 'queued-test',
      auth_mode: 'none',
      secret_ref: null,
      active: true
    })
    mocks.insertInboxEvent.mockResolvedValue({
      id: 'inbox-1',
      isDuplicate: true,
      status: 'failed',
      receivedAt: new Date().toISOString()
    })
    mocks.updateInboxEventStatus.mockResolvedValue(undefined)
  })

  it('reprocesses a failed duplicate when invoked by the durable worker', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    registerInboundHandler('queued-test', handler)

    const result = await processInboundWebhook(
      'queued-test',
      new Request('https://example.test', { method: 'POST', body: JSON.stringify({ id: 'evt-1' }) }),
      { retryFailedDuplicates: true, surfaceHandlerFailures: true }
    )

    expect(result).toEqual({ status: 200, body: { received: true, processed: true } })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(mocks.updateInboxEventStatus).toHaveBeenNthCalledWith(1, 'inbox-1', 'processing')
    expect(mocks.updateInboxEventStatus).toHaveBeenNthCalledWith(2, 'inbox-1', 'processed')
  })

  it('surfaces handler failures as retryable responses for Cloud Tasks', async () => {
    registerInboundHandler('queued-test', vi.fn().mockRejectedValue(new Error('temporary failure')))

    const result = await processInboundWebhook(
      'queued-test',
      new Request('https://example.test', { method: 'POST', body: JSON.stringify({ id: 'evt-1' }) }),
      { retryFailedDuplicates: true, surfaceHandlerFailures: true }
    )

    expect(result.status).toBe(503)
    expect(mocks.updateInboxEventStatus).toHaveBeenLastCalledWith(
      'inbox-1',
      'failed',
      'temporary failure'
    )
  })
})
