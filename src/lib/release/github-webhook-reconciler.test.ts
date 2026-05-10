import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReleaseManifest } from './manifest-store'
import type { NormalizedGithubReleaseWebhookEvent } from './github-webhook-reconciler'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transitionReleaseState: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

vi.mock('./manifest-store', () => ({
  transitionReleaseState: mocks.transitionReleaseState
}))

import { reconcileGithubReleaseWebhookEvent } from './github-webhook-reconciler'

const baseEvent: NormalizedGithubReleaseWebhookEvent = {
  id: 'gh-rel-wh-1',
  inboxEventId: 'wh-inbox-1',
  deliveryId: 'delivery-1',
  eventName: 'workflow_run',
  action: 'completed',
  repositoryFullName: 'efeoncepro/greenhouse-eo',
  workflowName: 'Production Release Orchestrator',
  workflowRunId: 123,
  workflowJobId: null,
  checkSuiteId: null,
  checkRunId: null,
  deploymentId: null,
  targetSha: '390ac14e3dca3f44f4e9285b73956138ca707655',
  githubStatus: 'completed',
  githubConclusion: 'success',
  redactedPayload: {},
  evidence: {}
}

const releaseRow = (state: ReleaseManifest['state']) => ({
  release_id: '390ac14e3dca-release',
  target_sha: baseEvent.targetSha,
  source_branch: 'develop',
  target_branch: 'main',
  state,
  attempt_n: 1,
  triggered_by: 'cli:jreye',
  operator_member_id: null,
  started_at: '2026-05-10T12:00:00.000Z',
  completed_at: null,
  vercel_deployment_url: null,
  previous_vercel_deployment_url: null,
  worker_revisions: {},
  previous_worker_revisions: {},
  workflow_runs: [],
  preflight_result: {},
  post_release_health: {},
  rollback_plan: {}
})

describe('github release webhook reconciler', () => {
  beforeEach(() => {
    mocks.query.mockReset()
    mocks.transitionReleaseState.mockReset()
  })

  it('ignores non-release workflow events without touching release state', async () => {
    const result = await reconcileGithubReleaseWebhookEvent({
      ...baseEvent,
      workflowName: 'Unit Tests'
    })

    expect(result.processingStatus).toBe('ignored')
    expect(result.errorCode).toBe('not_release_workflow')
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.transitionReleaseState).not.toHaveBeenCalled()
  })

  it('marks allowlisted events unmatched when no recent release manifest exists', async () => {
    mocks.query.mockResolvedValueOnce([])
    mocks.query.mockResolvedValueOnce([])

    const result = await reconcileGithubReleaseWebhookEvent(baseEvent)

    expect(result.processingStatus).toBe('unmatched')
    expect(result.errorCode).toBe('release_manifest_not_found')
    expect(mocks.transitionReleaseState).not.toHaveBeenCalled()
  })

  it('matches successful events without applying release transitions', async () => {
    mocks.query.mockResolvedValueOnce([releaseRow('deploying')])

    const result = await reconcileGithubReleaseWebhookEvent(baseEvent)

    expect(result.processingStatus).toBe('matched')
    expect(result.releaseId).toBe('390ac14e3dca-release')
    expect(result.transitionApplied).toBe(false)
    expect(mocks.transitionReleaseState).not.toHaveBeenCalled()
  })

  it('aborts an active deployment when a matched release workflow fails', async () => {
    mocks.query.mockResolvedValueOnce([releaseRow('deploying')])
    mocks.transitionReleaseState.mockResolvedValueOnce(undefined)

    const result = await reconcileGithubReleaseWebhookEvent({
      ...baseEvent,
      githubConclusion: 'failure'
    })

    expect(result.processingStatus).toBe('reconciled')
    expect(result.transitionApplied).toBe(true)
    expect(result.transitionFromState).toBe('deploying')
    expect(result.transitionToState).toBe('aborted')
    expect(mocks.transitionReleaseState).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseId: '390ac14e3dca-release',
        fromState: 'deploying',
        toState: 'aborted',
        actorLabel: 'system:github-release-webhook'
      })
    )
  })

  it('degrades verification when a matched deployment_status fails', async () => {
    mocks.query.mockResolvedValueOnce([releaseRow('verifying')])
    mocks.transitionReleaseState.mockResolvedValueOnce(undefined)

    const result = await reconcileGithubReleaseWebhookEvent({
      ...baseEvent,
      eventName: 'deployment_status',
      workflowName: null,
      githubStatus: 'failure',
      githubConclusion: null
    })

    expect(result.processingStatus).toBe('reconciled')
    expect(result.transitionFromState).toBe('verifying')
    expect(result.transitionToState).toBe('degraded')
  })
})
