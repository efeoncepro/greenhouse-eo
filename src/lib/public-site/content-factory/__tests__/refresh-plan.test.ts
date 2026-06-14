import { describe, expect, it } from 'vitest'

import type { ContentFactoryPostDeepInspection } from '../contracts'
import {
  buildRefreshPlanSourceFingerprint,
  prepareGutenbergRefreshPlan,
  summarizeGutenbergRefreshPlan
} from '../refresh-plan'

const baseInspection: ContentFactoryPostDeepInspection = {
  contractVersion: 'contentFactoryPostDeepInspection.v1',
  scannedAt: '2026-06-14T19:40:52+00:00',
  source: 'wp_cli_parse_blocks',
  safetyPolicy: {
    writesWordPressContent: false,
    publishesContent: false,
    clearsCache: false,
    createsBackup: false,
    sendsSecretsToOutput: false
  },
  post: {
    id: 248398,
    type: 'post',
    status: 'publish',
    slug: 'que-es-loop-marketing',
    title: 'Que es Loop Marketing',
    modified: '2025-09-08T21:13:29+00:00',
    permalink: 'https://efeoncepro.com/loop-marketing/que-es-loop-marketing/',
    contentLength: 46737
  },
  seo: {
    yoastTitle: 'Que es Loop Marketing %%sep%% Efeonce',
    yoastDescription: 'Descubre Loop Marketing.',
    primaryCategory: '155'
  },
  summary: {
    totalBlocks: 5,
    topLevelBlocks: 5,
    counts: {
      'core/paragraph': 1,
      'core/heading': 1,
      'core/image': 1,
      'core/separator': 1,
      'yoast-seo/table-of-contents': 1
    },
    maxDepth: 0,
    linkCount: 1,
    nonEmptyFreeformCount: 0,
    mediaIssueCount: 0
  },
  headingOutline: [{ path: '2', level: 2, text: 'Que es Loop Marketing' }],
  blocks: [
    {
      path: '0',
      depth: 0,
      blockName: 'core/paragraph',
      attrs: {},
      text: 'Intro editable del post.',
      innerBlockCount: 0,
      fingerprint: 'paragraph-fingerprint',
      editability: 'safe_text_edit',
      risks: []
    },
    {
      path: '1',
      depth: 0,
      blockName: 'yoast-seo/table-of-contents',
      attrs: {},
      text: 'Tabla de contenidos',
      innerBlockCount: 0,
      fingerprint: 'toc-fingerprint',
      editability: 'preserve_structure',
      risks: []
    },
    {
      path: '2',
      depth: 0,
      blockName: 'core/heading',
      attrs: {},
      text: 'Que es Loop Marketing',
      innerBlockCount: 0,
      fingerprint: 'heading-fingerprint',
      editability: 'safe_text_edit',
      risks: []
    },
    {
      path: '3',
      depth: 0,
      blockName: 'core/image',
      attrs: { id: 248439 },
      text: '',
      innerBlockCount: 0,
      fingerprint: 'image-fingerprint',
      editability: 'media_requires_reconcile',
      risks: ['media_refs_must_be_reconciled_before_write'],
      media: {
        id: 248439,
        attachmentUrl: 'https://efeoncepro.com/wp-content/uploads/2025/09/Loop-MKT.svg',
        renderedSrc: 'https://efeoncepro.com/wp-content/uploads/2025/09/Loop-MKT.svg',
        alt: ''
      }
    },
    {
      path: '4',
      depth: 0,
      blockName: 'core/separator',
      attrs: {},
      text: '',
      innerBlockCount: 0,
      fingerprint: 'separator-fingerprint',
      editability: 'preserve_structure',
      risks: []
    }
  ],
  links: [
    {
      href: 'https://www.hubspot.es/loop-marketing',
      text: 'HubSpot Loop Marketing',
      kind: 'external_url'
    }
  ],
  mediaIssues: [],
  editabilityLegend: {
    safe_text_edit: 'text',
    safe_attrs_edit: 'attrs',
    media_requires_reconcile: 'media',
    preserve_structure: 'preserve',
    inspect_only: 'inspect'
  }
}

describe('prepareGutenbergRefreshPlan', () => {
  it('builds a plan-only refresh contract without WordPress writes', () => {
    const plan = prepareGutenbergRefreshPlan(baseInspection, {
      generatedAt: '2026-06-14T20:00:00.000Z',
      objective: 'Refresh intro and SEO angle'
    })

    expect(plan).toMatchObject({
      contractVersion: 'contentFactoryRefreshPlan.v1',
      mode: 'plan_only',
      sendsWordPressWrite: false,
      objective: 'Refresh intro and SEO angle',
      target: {
        wordpressPostId: 248398,
        status: 'publish',
        editorModel: 'gutenberg_blocks'
      },
      safetyPolicy: {
        writesWordPressContent: false,
        publishesContent: false,
        modifiesPublishedSource: false
      },
      readiness: {
        status: 'ready_for_brief',
        warnings: [expect.objectContaining({ code: 'published_source_plan_only' })]
      },
      rollback: {
        strategy: 'no_runtime_change_plan_only'
      }
    })
    expect(plan.changeCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: 'update_text',
          targetPath: '0',
          fingerprint: 'paragraph-fingerprint'
        }),
        expect.objectContaining({
          operation: 'preserve',
          targetPath: '1',
          fingerprint: 'toc-fingerprint'
        }),
        expect.objectContaining({
          operation: 'reconcile_media',
          targetPath: '3',
          fingerprint: 'image-fingerprint'
        }),
        expect.objectContaining({
          operation: 'review_link',
          targetPath: 'links.0'
        })
      ])
    )
  })

  it('blocks readiness when the source inspection has media issues', () => {
    const plan = prepareGutenbergRefreshPlan({
      ...baseInspection,
      mediaIssues: [
        {
          path: '3',
          blockName: 'core/image',
          code: 'attachment_url_missing',
          message: 'Attachment URL missing.'
        }
      ],
      summary: {
        ...baseInspection.summary,
        mediaIssueCount: 1
      }
    })

    expect(plan.readiness.status).toBe('blocked')
    expect(plan.readiness.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'media_issue_attachment_url_missing' })])
    )
  })

  it('summarizes candidate counts and keeps source fingerprint stable', () => {
    const plan = prepareGutenbergRefreshPlan(baseInspection, {
      generatedAt: '2026-06-14T20:00:00.000Z',
      maxEditableTextCandidates: 1
    })

    const summary = summarizeGutenbergRefreshPlan(plan)

    expect(plan.target.sourceFingerprint).toBe(buildRefreshPlanSourceFingerprint(baseInspection))
    expect(summary).toMatchObject({
      contractVersion: 'contentFactoryRefreshPlan.v1',
      sendsWordPressWrite: false,
      candidateCounts: {
        review_seo: 2,
        update_text: 1,
        preserve: 2,
        reconcile_media: 1,
        review_link: 1
      }
    })
  })
})
