import { createHmac } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authRequest: vi.fn(),
  resolveSecretByRef: vi.fn(),
  statusWebhookEnabled: vi.fn()
}))

vi.mock('@/lib/google-credentials', () => ({
  createGoogleAuth: () => ({ request: mocks.authRequest }),
  getGoogleProjectId: () => 'efeonce-group'
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecretByRef: mocks.resolveSecretByRef
}))

vi.mock('@/lib/notion-metrics/status-transitions-flags', () => ({
  isNotionStatusTransitionsWebhookEnabled: mocks.statusWebhookEnabled
}))

import {
  enqueueNotionWebhookRequest,
  isNotionWebhookAsyncIngestionEnabled,
  parseNotionWebhookTaskEnvelope
} from './notion-async-ingestion'

const secret = 'notion-signing-secret'

const payload = JSON.stringify({
  id: 'evt-123',
  type: 'page.properties_updated',
  entity: { id: 'page-123', type: 'page' }
})

const signatureFor = (body: string) =>
  `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`

const env = {
  NODE_ENV: 'test',
  GCP_PROJECT: 'efeonce-group',
  NOTION_WEBHOOK_TASKS_TARGET_BASE_URL: 'https://dev-greenhouse.efeoncepro.com',
  NOTION_WEBHOOK_TASKS_SERVICE_ACCOUNT_EMAIL: 'greenhouse-webhook-worker@efeonce-group.iam.gserviceaccount.com',
  NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF: 'notion-demo-secret',
  NOTION_STATUS_TRANSITIONS_WEBHOOK_SIGNING_SECRET_REF: 'notion-prod-secret'
} as NodeJS.ProcessEnv

describe('notion async webhook ingestion', () => {
  beforeEach(() => {
    mocks.authRequest.mockReset().mockResolvedValue({ data: { name: 'task' } })
    mocks.resolveSecretByRef.mockReset().mockResolvedValue(secret)
    mocks.statusWebhookEnabled.mockReset().mockReturnValue(true)
  })

  it('is opt-in', () => {
    expect(isNotionWebhookAsyncIngestionEnabled({} as NodeJS.ProcessEnv)).toBe(false)
    expect(isNotionWebhookAsyncIngestionEnabled({
      NODE_ENV: 'test',
      NOTION_WEBHOOK_ASYNC_INGESTION_ENABLED: 'true'
    } as NodeJS.ProcessEnv)).toBe(true)
  })

  it('validates HMAC and creates a deterministic OIDC Cloud Task', async () => {
    const request = new Request('https://example.test/api/webhooks/notion-tasks-demo', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-notion-signature': signatureFor(payload)
      },
      body: payload
    })

    const result = await enqueueNotionWebhookRequest('notion-tasks-demo', request, env)

    expect(result).toEqual({ status: 200, body: { received: true, queued: true } })
    expect(mocks.authRequest).toHaveBeenCalledTimes(1)

    const call = mocks.authRequest.mock.calls[0]?.[0]
    const task = call.data.task
    const decoded = JSON.parse(Buffer.from(task.httpRequest.body, 'base64').toString('utf8'))

    expect(call.url).toContain('/locations/us-east4/queues/notion-webhook-ingestion/tasks')
    expect(task.name).toMatch(/\/tasks\/notion-[a-f0-9]{64}$/u)
    expect(task.httpRequest.url).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notion-ingestion'
    )
    expect(task.httpRequest.oidcToken.serviceAccountEmail).toBe(
      'greenhouse-webhook-worker@efeonce-group.iam.gserviceaccount.com'
    )
    expect(decoded).toMatchObject({
      endpointKey: 'notion-tasks-demo',
      rawBody: payload,
      signature: signatureFor(payload)
    })
    expect(parseNotionWebhookTaskEnvelope(decoded)).not.toBeNull()
  })

  it('rejects an invalid signature before enqueueing', async () => {
    const request = new Request('https://example.test/api/webhooks/notion-tasks-demo', {
      method: 'POST',
      headers: { 'x-notion-signature': 'sha256=invalid' },
      body: payload
    })

    const result = await enqueueNotionWebhookRequest('notion-tasks-demo', request, env)

    expect(result.status).toBe(401)
    expect(mocks.authRequest).not.toHaveBeenCalled()
  })

  it('queues verification handshakes without requiring an existing secret', async () => {
    mocks.resolveSecretByRef.mockResolvedValue(null)

    const verification = JSON.stringify({ verification_token: 'secret_verification' })

    const request = new Request('https://example.test/api/webhooks/notion-tasks-demo', {
      method: 'POST',
      body: verification
    })

    const result = await enqueueNotionWebhookRequest('notion-tasks-demo', request, env)

    expect(result.status).toBe(200)
    expect(mocks.resolveSecretByRef).not.toHaveBeenCalled()
    expect(mocks.authRequest).toHaveBeenCalledTimes(1)
  })

  it('acknowledges disabled productive ingestion without PostgreSQL or Cloud Tasks', async () => {
    mocks.statusWebhookEnabled.mockReturnValue(false)

    const request = new Request('https://example.test/api/webhooks/notion-status-transitions', {
      method: 'POST',
      headers: { 'x-notion-signature': signatureFor(payload) },
      body: payload
    })

    const result = await enqueueNotionWebhookRequest('notion-status-transitions', request, env)

    expect(result).toEqual({
      status: 200,
      body: { received: true, queued: false, disabled: true }
    })
    expect(mocks.resolveSecretByRef).not.toHaveBeenCalled()
    expect(mocks.authRequest).not.toHaveBeenCalled()
  })

  it('treats an existing deterministic task as an acknowledged duplicate', async () => {
    mocks.authRequest.mockRejectedValue({ response: { status: 409 } })

    const request = new Request('https://example.test/api/webhooks/notion-tasks-demo', {
      method: 'POST',
      headers: { 'x-notion-signature': signatureFor(payload) },
      body: payload
    })

    const result = await enqueueNotionWebhookRequest('notion-tasks-demo', request, env)

    expect(result).toEqual({
      status: 200,
      body: { received: true, queued: true, duplicate: true }
    })
  })
})
