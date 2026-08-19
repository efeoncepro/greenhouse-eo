import { createHmac } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveWebhookSecret = vi.fn()
const mockProcessWebhook = vi.fn()

vi.mock('@/lib/resend', () => ({
  resolveResendWebhookSigningSecret: () => mockResolveWebhookSecret()
}))

vi.mock('@/lib/email/resend-webhook', () => ({
  processResendWebhookEvent: (...args: unknown[]) => mockProcessWebhook(...args)
}))

import { POST, verifyResendWebhookSignature } from '@/app/api/webhooks/resend/route'

const secret = `whsec_${Buffer.from('resend-test-secret').toString('base64')}`

const signedRequest = (body: string, now = new Date()) => {
  const eventId = 'evt-resend-1'
  const timestamp = String(Math.floor(now.getTime() / 1000))

  const signature = createHmac('sha256', Buffer.from(secret.slice(6), 'base64'))
    .update(`${eventId}.${timestamp}.${body}`)
    .digest('base64')

  return new Request('http://localhost/api/webhooks/resend', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': eventId,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`
    },
    body
  })
}

describe('POST /api/webhooks/resend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveWebhookSecret.mockResolvedValue(secret)
  })

  it('returns a retryable failure when the inbound secret is unavailable', async () => {
    mockResolveWebhookSecret.mockResolvedValue(null)

    const response = await POST(signedRequest('{}'))

    expect(response.status).toBe(503)
    expect(mockProcessWebhook).not.toHaveBeenCalled()
  })

  it('rejects a stale signature before persistence', () => {
    const body = '{}'
    const signedAt = new Date('2026-08-19T12:00:00.000Z')
    const request = signedRequest(body, signedAt)

    expect(
      verifyResendWebhookSignature({
        body,
        eventId: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
        secret,
        now: new Date('2026-08-19T12:06:00.000Z')
      })
    ).toBe(false)
  })

  it('persists a valid event and acknowledges only the completed result', async () => {
    const payload = {
      type: 'email.delivered',
      created_at: new Date().toISOString(),
      data: { email_id: 'resend-1' }
    }

    const body = JSON.stringify(payload)

    mockProcessWebhook.mockResolvedValue({
      outcome: 'processed',
      eventType: 'email.delivered',
      deliveryId: 'delivery-1'
    })

    const response = await POST(signedRequest(body))

    expect(response.status).toBe(200)
    expect(mockProcessWebhook).toHaveBeenCalledWith({
      providerEventId: 'evt-resend-1',
      payload
    })
  })

  it('returns 503 for a persisted pending event so Resend retries it', async () => {
    const payload = {
      type: 'email.sent',
      created_at: new Date().toISOString(),
      data: { email_id: 'resend-racing' }
    }

    mockProcessWebhook.mockResolvedValue({
      outcome: 'retry',
      eventType: 'email.sent',
      reason: 'delivery_not_yet_visible'
    })

    const response = await POST(signedRequest(JSON.stringify(payload)))

    expect(response.status).toBe(503)
  })
})
