import { describe, expect, it } from 'vitest'

import {
  buildGithubDeliveryIdempotencyKey,
  normalizeGithubReleaseWebhook,
  redactGithubWebhookHeaders,
  redactGithubWebhookPayload
} from './github-webhook-ingestion'
import {
  signGithubWebhookPayload,
  verifyGithubWebhookSignature
} from './github-webhook-signature'

describe('github release webhook ingestion helpers', () => {
  it('verifies GitHub sha256 signatures using the raw body', () => {
    const rawBody = JSON.stringify({ action: 'completed', ok: true })
    const signature = signGithubWebhookPayload('secret-value', rawBody)

    expect(
      verifyGithubWebhookSignature({
        secret: 'secret-value',
        rawBody,
        signatureHeader: signature
      })
    ).toMatchObject({ ok: true })

    expect(
      verifyGithubWebhookSignature({
        secret: 'secret-value',
        rawBody: `${rawBody}\n`,
        signatureHeader: signature
      })
    ).toEqual({ ok: false, reason: 'signature_mismatch' })
  })

  it('normalizes workflow_run payloads into release evidence', () => {
    const event = normalizeGithubReleaseWebhook({
      deliveryId: 'delivery-123',
      eventName: 'workflow_run',
      payload: {
        action: 'completed',
        repository: { full_name: 'efeoncepro/greenhouse-eo' },
        workflow_run: {
          id: 25640114327,
          name: 'Production Release Orchestrator',
          head_sha: '390ac14e3dca3f44f4e9285b73956138ca707655',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/efeoncepro/greenhouse-eo/actions/runs/25640114327'
        }
      }
    })

    expect(event).toMatchObject({
      deliveryId: 'delivery-123',
      eventName: 'workflow_run',
      repositoryFullName: 'efeoncepro/greenhouse-eo',
      workflowName: 'Production Release Orchestrator',
      workflowRunId: 25640114327,
      targetSha: '390ac14e3dca3f44f4e9285b73956138ca707655',
      githubStatus: 'completed',
      githubConclusion: 'success'
    })
  })

  it('redacts headers and payload to release-safe metadata only', () => {
    const headers = new Headers({
      'x-github-delivery': 'delivery-123',
      'x-github-event': 'workflow_run',
      'x-hub-signature-256': 'sha256=secret',
      authorization: 'Bearer never-store'
    })

    expect(redactGithubWebhookHeaders(headers)).toEqual({
      'x-github-delivery': 'delivery-123',
      'x-github-event': 'workflow_run'
    })

    expect(
      redactGithubWebhookPayload({
        action: 'completed',
        token: 'never-store',
        repository: { full_name: 'efeoncepro/greenhouse-eo' },
        sender: { login: 'octocat' },
        workflow_run: {
          id: 1,
          name: 'Production Release Orchestrator',
          head_sha: '390ac14e3dca3f44f4e9285b73956138ca707655',
          status: 'completed',
          conclusion: 'success'
        }
      })
    ).toEqual({
      action: 'completed',
      repository: { full_name: 'efeoncepro/greenhouse-eo' },
      sender: { login: 'octocat' },
      workflow_run: {
        id: 1,
        name: 'Production Release Orchestrator',
        head_sha: '390ac14e3dca3f44f4e9285b73956138ca707655',
        status: 'completed',
        conclusion: 'success'
      }
    })
  })

  it('uses GitHub delivery id as stable idempotency key', () => {
    expect(buildGithubDeliveryIdempotencyKey('abc-123')).toBe('github:abc-123')
  })
})
