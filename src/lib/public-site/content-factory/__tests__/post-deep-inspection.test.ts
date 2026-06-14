import { describe, expect, it } from 'vitest'

import {
  buildPostDeepInspectionEvalPhp,
  CONTENT_FACTORY_POST_DEEP_INSPECTION_CONTRACT_VERSION,
  getPostBlockEditability,
  getPostBlockRisks,
  summarizePostDeepInspection
} from '../post-deep-inspection'
import type { ContentFactoryPostDeepInspection } from '../contracts'

describe('post deep inspection helpers', () => {
  it('classifies Gutenberg blocks by editability', () => {
    expect(getPostBlockEditability('core/paragraph')).toBe('safe_text_edit')
    expect(getPostBlockEditability('core/image')).toBe('media_requires_reconcile')
    expect(getPostBlockEditability('core/columns')).toBe('preserve_structure')
    expect(getPostBlockEditability('core/freeform')).toBe('inspect_only')
    expect(getPostBlockEditability('essential-blocks/testimonial')).toBe('inspect_only')
  })

  it('flags media and third-party risks', () => {
    expect(
      getPostBlockRisks({
        blockName: 'core/image',
        editability: 'media_requires_reconcile',
        text: '',
        media: {
          id: 123,
          attachmentUrl: false,
          renderedSrc: 'https://efeoncepro.com/wp-content/uploads/test.png'
        }
      })
    ).toEqual(expect.arrayContaining(['media_refs_must_be_reconciled_before_write', 'attachment_url_missing']))

    expect(
      getPostBlockRisks({
        blockName: 'essential-blocks/testimonial',
        editability: 'inspect_only',
        text: 'CTA',
        media: undefined
      })
    ).toEqual(expect.arrayContaining(['third_party_block_preserve_until_serialization_known']))
  })

  it('builds a read-only WP-CLI eval script for a concrete post id', () => {
    const php = buildPostDeepInspectionEvalPhp(248398)

    expect(php).toContain('$post_id = 248398;')
    expect(php).toContain(CONTENT_FACTORY_POST_DEEP_INSPECTION_CONTRACT_VERSION)
    expect(php).toContain("'writesWordPressContent' => false")
    expect(() => buildPostDeepInspectionEvalPhp(0)).toThrow('post_id_invalid')
  })

  it('summarizes full deep inspection output without dropping safety context', () => {
    const inspection: ContentFactoryPostDeepInspection = {
      contractVersion: 'contentFactoryPostDeepInspection.v1',
      scannedAt: '2026-06-14T00:00:00+00:00',
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
        contentLength: 100
      },
      seo: {
        yoastTitle: 'SEO title',
        yoastDescription: 'SEO description',
        primaryCategory: '155'
      },
      summary: {
        totalBlocks: 1,
        topLevelBlocks: 1,
        counts: { 'core/paragraph': 1 },
        maxDepth: 0,
        linkCount: 0,
        nonEmptyFreeformCount: 0,
        mediaIssueCount: 0
      },
      headingOutline: [],
      blocks: [
        {
          path: '0',
          depth: 0,
          blockName: 'core/paragraph',
          attrs: {},
          text: 'Intro',
          innerBlockCount: 0,
          fingerprint: 'abc',
          editability: 'safe_text_edit',
          risks: []
        }
      ],
      links: [],
      mediaIssues: [],
      editabilityLegend: {
        safe_text_edit: 'text',
        safe_attrs_edit: 'attrs',
        media_requires_reconcile: 'media',
        preserve_structure: 'preserve',
        inspect_only: 'inspect'
      }
    }

    expect(summarizePostDeepInspection(inspection)).toMatchObject({
      contractVersion: 'contentFactoryPostDeepInspection.v1',
      safetyPolicy: {
        writesWordPressContent: false
      },
      topBlocks: [
        {
          path: '0',
          editability: 'safe_text_edit'
        }
      ]
    })
  })
})
