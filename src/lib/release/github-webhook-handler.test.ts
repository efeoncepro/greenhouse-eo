import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as GithubWebhookSignatureModule from './github-webhook-signature'

const mocks = vi.hoisted(() => ({
  ensureWebhookSchema: vi.fn(),
  getEndpointByKey: vi.fn(),
  insertInboxEvent: vi.fn(),
  updateInboxEventStatus: vi.fn(),
  query: vi.fn(),
  reconcileGithubReleaseWebhookEvent: vi.fn(),
  resolveGithubReleaseWebhookSecret: vi.fn()
}))

vi.mock('@/lib/webhooks/store', () => ({
  ensureWebhookSchema: mocks.ensureWebhookSchema,
  getEndpointByKey: mocks.getEndpointByKey,
  insertInboxEvent: mocks.insertInboxEvent,
  updateInboxEventStatus: mocks.updateInboxEventStatus
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

vi.mock('./github-webhook-reconciler', () => ({
  reconcileGithubReleaseWebhookEvent: mocks.reconcileGithubReleaseWebhookEvent
}))

vi.mock('./github-webhook-signature', async importOriginal => {
  const actual = await importOriginal<typeof GithubWebhookSignatureModule>()

  return {
    ...actual,
    resolveGithubReleaseWebhookSecret: mocks.resolveGithubReleaseWebhookSecret
  }
})

import { handleGithubReleaseWebhookRequest } from './github-webhook-ingestion'
import { signGithubWebhookPayload } from './github-webhook-signature'

const buildWebhookRequest = (params: {
  rawBody: string
  signature?: string
  eventName?: string
  deliveryId?: string
}) => {
  return new Request('https://greenhouse.efeoncepro.com/api/webhooks/github/release-events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'GitHub-Hookshot/test',
      'x-github-delivery': params.deliveryId ?? 'delivery-123',
      'x-github-event': params.eventName ?? 'workflow_run',
      'x-hub-signature-256': params.signature ?? signGithubWebhookPayload('secret-value', params.rawBody)
    },
    body: params.rawBody
  })
}

describe('github release webhook handler', () => {
  beforeEach(() => {
    mocks.ensureWebhookSchema.mockReset().mockResolvedValue(undefined)
    mocks.getEndpointByKey.mockReset().mockResolvedValue({
      webhook_endpoint_id: 'wh-endpoint-github-release-events',
      endpoint_key: 'github-release-events',
      provider_code: 'github',
      handler_code: 'github-release-events',
      auth_mode: 'provider_native',
      secret_ref: 'GITHUB_RELEASE_WEBHOOK_SECRET',
      active: true
    })
    mocks.insertInboxEvent.mockReset().mockResolvedValue({
      id: 'wh-inbox-1',
      isDuplicate: false
    })
    mocks.updateInboxEventStatus.mockReset().mockResolvedValue(undefined)
    mocks.query.mockReset().mockResolvedValue([])
    mocks.reconcileGithubReleaseWebhookEvent.mockReset().mockResolvedValue({
      processingStatus: 'matched',
      releaseId: 'release-1',
      matchedBy: 'target_sha',
      transitionApplied: false,
      transitionFromState: 'deploying',
      transitionToState: null,
      errorCode: null,
      errorMessage: null,
      evidence: { ok: true }
    })
    mocks.resolveGithubReleaseWebhookSecret.mockReset().mockResolvedValue('secret-value')
  })

  it('rejects invalid signatures before touching webhook storage', async () => {
    const rawBody = JSON.stringify({ action: 'completed' })

    const result = await handleGithubReleaseWebhookRequest(
      buildWebhookRequest({
        rawBody,
        signature: signGithubWebhookPayload('other-secret', rawBody)
      })
    )

    expect(result.status).toBe(401)
    expect(result.body).toMatchObject({
      ok: false,
      code: 'invalid_signature'
    })
    expect(mocks.ensureWebhookSchema).not.toHaveBeenCalled()
    expect(mocks.insertInboxEvent).not.toHaveBeenCalled()
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('persists a signed delivery, reconciles it and returns accepted', async () => {
    const rawBody = JSON.stringify({
      action: 'completed',
      repository: { full_name: 'efeoncepro/greenhouse-eo' },
      workflow_run: {
        id: 25640114327,
        name: 'Production Release Orchestrator',
        head_sha: '390ac14e3dca3f44f4e9285b73956138ca707655',
        status: 'completed',
        conclusion: 'success'
      }
    })

    const result = await handleGithubReleaseWebhookRequest(buildWebhookRequest({ rawBody }))

    expect(result.status).toBe(202)
    expect(result.body).toMatchObject({
      ok: true,
      code: 'accepted',
      deliveryId: 'delivery-123',
      inboxEventId: 'wh-inbox-1',
      processingStatus: 'matched',
      releaseId: 'release-1'
    })

    expect(mocks.insertInboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointId: 'wh-endpoint-github-release-events',
        providerCode: 'github',
        sourceEventId: 'delivery-123',
        idempotencyKey: 'github:delivery-123',
        rawBodyText: null,
        signatureVerified: true
      })
    )
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('greenhouse_sync.github_release_webhook_events'),
      expect.arrayContaining(['wh-inbox-1', 'delivery-123', 'workflow_run'])
    )
    expect(mocks.reconcileGithubReleaseWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        inboxEventId: 'wh-inbox-1',
        deliveryId: 'delivery-123',
        workflowName: 'Production Release Orchestrator',
        targetSha: '390ac14e3dca3f44f4e9285b73956138ca707655'
      })
    )
    expect(mocks.updateInboxEventStatus).toHaveBeenCalledWith('wh-inbox-1', 'processed')
  })

  it('accepts duplicate deliveries without reprocessing', async () => {
    mocks.insertInboxEvent.mockResolvedValueOnce({
      id: 'wh-inbox-existing',
      isDuplicate: true
    })

    const rawBody = JSON.stringify({
      action: 'completed',
      workflow_run: {
        id: 25640114327,
        name: 'Production Release Orchestrator',
        head_sha: '390ac14e3dca3f44f4e9285b73956138ca707655',
        status: 'completed',
        conclusion: 'success'
      }
    })

    const result = await handleGithubReleaseWebhookRequest(buildWebhookRequest({ rawBody }))

    expect(result.status).toBe(202)
    expect(result.body).toMatchObject({
      code: 'duplicate_delivery',
      duplicate: true,
      inboxEventId: 'wh-inbox-existing'
    })
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.reconcileGithubReleaseWebhookEvent).not.toHaveBeenCalled()
  })
})
