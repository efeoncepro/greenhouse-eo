import { describe, expect, it } from 'vitest'

import type { ContentFactoryPatchBrief, ContentFactoryRefreshPlan } from '../contracts'
import { prepareGutenbergPatchPlan, summarizeGutenbergPatchPlan } from '../patch-plan'

const refreshPlan: ContentFactoryRefreshPlan = {
  contractVersion: 'contentFactoryRefreshPlan.v1',
  generatedAt: '2026-06-14T19:46:00.721Z',
  mode: 'plan_only',
  sendsWordPressWrite: false,
  objective: 'Plan guided refresh',
  target: {
    wordpressPostId: 248398,
    url: 'https://efeoncepro.com/loop-marketing/que-es-loop-marketing/',
    slug: 'que-es-loop-marketing',
    status: 'publish',
    editorModel: 'gutenberg_blocks',
    sourceScannedAt: '2026-06-14T19:40:52+00:00',
    sourceModified: '2025-09-08T21:13:29+00:00',
    sourceFingerprint: 'source-fingerprint'
  },
  sourceInspection: {
    contractVersion: 'contentFactoryPostDeepInspection.v1',
    summary: {
      totalBlocks: 3,
      topLevelBlocks: 3,
      counts: { 'core/paragraph': 1, 'core/image': 1, 'yoast-seo/table-of-contents': 1 },
      maxDepth: 0,
      linkCount: 1,
      nonEmptyFreeformCount: 0,
      mediaIssueCount: 0
    },
    headingOutlineCount: 1,
    mediaIssueCount: 0
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
    status: 'ready_for_brief',
    blockers: [],
    warnings: [{ code: 'published_source_plan_only', message: 'Use draft clone.' }]
  },
  changeCandidates: [
    {
      operation: 'review_seo',
      targetPath: 'seo.yoastDescription',
      nativeKind: 'seo',
      key: 'yoastDescription',
      currentText: 'Old SEO description.',
      rationale: 'Review SEO.',
      risk: 'medium',
      guardrails: ['Do not change index policy.']
    },
    {
      operation: 'update_text',
      targetPath: '0',
      nativeKind: 'blockName',
      key: 'core/paragraph',
      fingerprint: 'paragraph-fingerprint',
      editability: 'safe_text_edit',
      currentText: 'Old intro.',
      rationale: 'Editable text.',
      risk: 'low',
      guardrails: ['Match path and fingerprint.']
    },
    {
      operation: 'reconcile_media',
      targetPath: '16',
      nativeKind: 'media',
      key: 'core/image',
      fingerprint: 'image-fingerprint',
      editability: 'media_requires_reconcile',
      rationale: 'Preserve media.',
      risk: 'low',
      guardrails: ['Do not invent media IDs.']
    },
    {
      operation: 'review_link',
      targetPath: 'links.0',
      nativeKind: 'link',
      key: 'https://www.hubspot.es/loop-marketing',
      currentText: 'HubSpot',
      rationale: 'Review link.',
      risk: 'medium',
      guardrails: ['Validate destination.']
    }
  ],
  rollback: {
    strategy: 'no_runtime_change_plan_only',
    notes: 'Delete artifact.'
  }
}

const validBrief: ContentFactoryPatchBrief = {
  contractVersion: 'contentFactoryPatchBrief.v1',
  objective: 'Refresh intro and SEO while preserving the post structure.',
  target: {
    wordpressPostId: 248398,
    sourceFingerprint: 'source-fingerprint'
  },
  constraints: {
    preservePublishedSource: true,
    requireDraftClone: true,
    preserveMedia: true,
    preserveStructure: true
  },
  changes: [
    {
      operation: 'review_seo',
      targetPath: 'seo.yoastDescription',
      proposedText: 'Loop Marketing explicado con foco en IA, buyer journey moderno y mejora continua.',
      rationale: 'Align SEO with refreshed AEO/search angle.'
    },
    {
      operation: 'update_text',
      targetPath: '0',
      expectedFingerprint: 'paragraph-fingerprint',
      proposedText: 'El funnel ya no alcanza para explicar cómo compran las personas cuando investigan, comparan y vuelven por distintos canales.',
      rationale: 'Clarify the opening without changing structure.'
    },
    {
      operation: 'preserve',
      targetPath: '16',
      expectedFingerprint: 'image-fingerprint',
      rationale: 'Keep the existing SVG media block.'
    }
  ]
}

describe('prepareGutenbergPatchPlan', () => {
  it('builds a plan-only patch contract with ready operations', () => {
    const plan = prepareGutenbergPatchPlan(refreshPlan, validBrief, {
      generatedAt: '2026-06-14T20:20:00.000Z'
    })

    expect(plan).toMatchObject({
      contractVersion: 'contentFactoryPatchPlan.v1',
      mode: 'plan_only',
      sendsWordPressWrite: false,
      modifiesPublishedSource: false,
      readiness: {
        status: 'ready_for_draft_clone',
        blockers: []
      },
      nextStep: {
        command: 'prepare_existing_post_refresh_draft_clone',
        status: 'not_implemented'
      }
    })
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: 'update_text',
          targetPath: '0',
          fingerprint: 'paragraph-fingerprint',
          status: 'ready'
        }),
        expect.objectContaining({
          operation: 'preserve',
          targetPath: '16',
          fingerprint: 'image-fingerprint',
          status: 'ready'
        })
      ])
    )
    expect(summarizeGutenbergPatchPlan(plan).operationCounts).toEqual({ ready: 3 })
  })

  it('blocks when a requested block fingerprint does not match the refresh plan', () => {
    const plan = prepareGutenbergPatchPlan(refreshPlan, {
      ...validBrief,
      changes: [
        {
          ...validBrief.changes[1],
          expectedFingerprint: 'stale-fingerprint'
        }
      ]
    })

    expect(plan.readiness.status).toBe('blocked')
    expect(plan.operations[0]).toMatchObject({
      status: 'blocked',
      blockers: [expect.objectContaining({ code: 'fingerprint_mismatch' })]
    })
  })

  it('blocks unsafe briefs that do not require a draft clone', () => {
    const unsafeBrief = {
      ...validBrief,
      constraints: {
        ...validBrief.constraints,
        requireDraftClone: false
      }
    } as unknown as ContentFactoryPatchBrief

    const plan = prepareGutenbergPatchPlan(refreshPlan, unsafeBrief)

    expect(plan.readiness.status).toBe('blocked')
    expect(plan.readiness.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unsafe_patch_constraints' })])
    )
  })
})
