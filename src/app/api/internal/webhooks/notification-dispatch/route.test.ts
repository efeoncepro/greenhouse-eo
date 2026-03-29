import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockResolveSecret = vi.fn()
const mockVerifySignature = vi.fn()
const mockDispatchNotificationWebhook = vi.fn()

vi.mock('@/lib/webhooks/signing', () => ({
  resolveSecret: (...args: unknown[]) => mockResolveSecret(...args),
  verifySignature: (...args: unknown[]) => mockVerifySignature(...args)
}))

vi.mock('@/lib/webhooks/consumers/notification-dispatch', () => ({
  dispatchNotificationWebhook: (...args: unknown[]) => mockDispatchNotificationWebhook(...args)
}))

const { POST } = await import('./route')

const makeRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Request('https://greenhouse.test/api/internal/webhooks/notification-dispatch', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-greenhouse-timestamp': '1700000000',
      'x-greenhouse-signature': 'sig-1',
      'x-greenhouse-event-type': String(body.eventType ?? 'unknown'),
      ...headers
    },
    body: JSON.stringify(body)
  })

const envelope = {
  eventId: 'evt-1',
  eventType: 'assignment.created',
  aggregateType: 'assignment',
  aggregateId: 'assignment-1',
  occurredAt: '2026-03-29T10:00:00.000Z',
  version: 1,
  source: 'greenhouse',
  data: {
    assignmentId: 'assignment-1',
    memberId: 'member-1',
    clientId: 'client-1'
  }
}

describe('notification-dispatch route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveSecret.mockResolvedValue('notif-secret')
    mockVerifySignature.mockReturnValue(true)
    mockDispatchNotificationWebhook.mockResolvedValue({
      eventType: 'assignment.created',
      mapped: true,
      recipientsResolved: 1,
      unresolvedRecipients: 0,
      deduped: 0,
      sent: 1,
      skipped: 0,
      failed: 0
    })
  })

  it('returns 200 for a valid delivery', async () => {
    const response = await POST(makeRequest(envelope))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      eventType: 'assignment.created',
      sent: 1
    })
  })

  it('returns 401 for an invalid signature', async () => {
    mockVerifySignature.mockReturnValue(false)

    const response = await POST(makeRequest(envelope))

    expect(response.status).toBe(401)
  })

  it('returns 401 when a secret exists but the signature header is missing', async () => {
    const response = await POST(makeRequest(envelope, { 'x-greenhouse-signature': '' }))

    expect(response.status).toBe(401)
    expect(mockVerifySignature).not.toHaveBeenCalled()
  })

  it('returns 200 for an unmapped event', async () => {
    mockDispatchNotificationWebhook.mockResolvedValue({
      eventType: 'service.created',
      mapped: false,
      recipientsResolved: 0,
      unresolvedRecipients: 0,
      deduped: 0,
      sent: 0,
      skipped: 0,
      failed: 0
    })

    const response = await POST(makeRequest({
      ...envelope,
      eventType: 'service.created'
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      received: true,
      mapped: false
    })
  })

  it('returns 500 when the envelope is invalid', async () => {
    const response = await POST(
      new Request('https://greenhouse.test/api/internal/webhooks/notification-dispatch', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-greenhouse-timestamp': '1700000000',
          'x-greenhouse-signature': 'sig-1',
          'x-greenhouse-event-type': 'assignment.created'
        },
        body: JSON.stringify({ nope: true })
      })
    )

    expect(response.status).toBe(500)
  })
})
