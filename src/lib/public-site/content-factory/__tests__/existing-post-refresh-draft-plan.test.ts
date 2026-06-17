import { describe, expect, it } from 'vitest'

import type { ContentFactoryPatchPlan } from '../contracts'
import { prepareExistingPostRefreshDraftPlan } from '../existing-post-refresh-draft-plan'

const readyPatchPlan: ContentFactoryPatchPlan = {
  contractVersion: 'contentFactoryPatchPlan.v1',
  generatedAt: '2026-06-14T20:34:34.777Z',
  mode: 'plan_only',
  sendsWordPressWrite: false,
  modifiesPublishedSource: false,
  objective: 'Replace the inbound/Loop pullquote with a verified factual HubSpot highlight.',
  target: {
    wordpressPostId: 248398,
    url: 'https://efeoncepro.com/loop-marketing/que-es-loop-marketing/',
    slug: 'que-es-loop-marketing',
    status: 'publish',
    editorModel: 'gutenberg_blocks',
    sourceScannedAt: '2026-06-14T20:32:39+00:00',
    sourceModified: '2025-09-08T21:13:29+00:00',
    sourceFingerprint: 'source-fingerprint'
  },
  sourceRefreshPlan: {
    contractVersion: 'contentFactoryRefreshPlan.v1',
    generatedAt: '2026-06-14T20:33:56.793Z',
    sourceFingerprint: 'source-fingerprint'
  },
  safetyPolicy: {
    writesWordPressContent: false,
    publishesContent: false,
    modifiesPublishedSource: false,
    clearsCache: false,
    createsBackup: false,
    sendsSecretsToOutput: false
  },
  readiness: {
    status: 'ready_for_draft_clone',
    blockers: [],
    warnings: []
  },
  operations: [
    {
      operation: 'update_text',
      targetPath: '36',
      nativeKind: 'blockName',
      key: 'core/pullquote',
      fingerprint: 'pullquote-fingerprint',
      currentText: 'Old pullquote.',
      proposedText:
        'Según HubSpot, el 61 % de los marketers cree que el marketing vive su mayor disrupción en 20 años por la IA.',
      rationale: 'Use a verified HubSpot factual highlight.',
      risk: 'low',
      status: 'ready',
      blockers: [],
      warnings: [],
      guardrails: ['Patch a draft/private clone first.']
    }
  ],
  nextStep: {
    command: 'prepare_existing_post_refresh_draft_clone',
    status: 'not_implemented',
    notes: 'Prepare a draft/private clone plan.'
  },
  rollback: {
    strategy: 'no_runtime_change_plan_only',
    notes: 'Delete local artifact.'
  }
}

describe('prepareExistingPostRefreshDraftPlan', () => {
  it('builds a signed dry-run bridge request for clone-and-patch refresh', () => {
    const plan = prepareExistingPostRefreshDraftPlan(readyPatchPlan, {
      generatedAt: '2026-06-14T21:00:00.000Z',
      manifestId: 'content-factory.refresh.quote-test',
      status: 'private',
      actor: 'codex-test',
      environment: 'test',
      secret: 'test-secret',
      timestamp: 1780000000,
      requestId: 'gh-refresh-draft-plan-test'
    })

    expect(plan).toMatchObject({
      contractVersion: 'contentFactoryExistingPostRefreshDraftPlan.v1',
      mode: 'dry_run',
      sendsWordPressWrite: false,
      modifiesPublishedSource: false,
      bridgeRequest: {
        contractVersion: 'greenhouse-wp-bridge-existing-post-refresh.v1',
        method: 'POST',
        route: '/greenhouse-wp-bridge/v1/drafts/from-existing-post',
        status: 'private',
        greenhouseManifestId: 'content-factory.refresh.quote-test',
        body: {
          sourcePostId: 248398,
          sourceFingerprint: 'source-fingerprint',
          operations: [
            expect.objectContaining({
              operation: 'update_text',
              targetPath: '36',
              expectedFingerprint: 'pullquote-fingerprint'
            })
          ]
        }
      },
      rollback: {
        strategy: 'trash_refresh_draft_by_manifest_id'
      }
    })
    expect(plan.bridgeRequest.signedHeaders['X-Greenhouse-Signature']).toContain('...redacted')
    expect(plan.bridgeRequest.canonicalRequestPreview).toContain('/greenhouse-wp-bridge/v1/drafts/from-existing-post')
    expect(plan.rolloutPreconditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'source_revalidation_required', status: 'satisfied' }),
        expect.objectContaining({ code: 'bridge_endpoint_deployed', status: 'pending' })
      ])
    )
  })

  it('blocks plans that are not ready for draft clone', () => {
    expect(() =>
      prepareExistingPostRefreshDraftPlan({
        ...readyPatchPlan,
        readiness: {
          status: 'needs_review',
          blockers: [],
          warnings: [{ code: 'review', message: 'Needs review.' }]
        }
      })
    ).toThrow('content_factory_refresh_draft_plan_requires_ready_patch_plan')
  })

  it('blocks unsupported non-text operations until the bridge can apply them safely', () => {
    expect(() =>
      prepareExistingPostRefreshDraftPlan({
        ...readyPatchPlan,
        operations: [
          {
            ...readyPatchPlan.operations[0],
            operation: 'preserve',
            proposedText: undefined
          }
        ]
      })
    ).toThrow('content_factory_refresh_draft_plan_unsupported_operation:preserve')
  })
})
