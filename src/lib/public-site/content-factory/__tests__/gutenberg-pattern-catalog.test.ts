import { describe, expect, it } from 'vitest'

import {
  EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES,
  getEfeonceGutenbergBlockPatternCatalog,
  listAllowedGeneratedGutenbergPatternBlocks
} from '../gutenberg-pattern-catalog'
import { listAllowedGeneratedGutenbergBlocks } from '../gutenberg-validator'

describe('getEfeonceGutenbergBlockPatternCatalog', () => {
  it('exposes an agent-facing governed Gutenberg pattern catalog', () => {
    const catalog = getEfeonceGutenbergBlockPatternCatalog({ generatedAt: '2026-06-14T00:00:00.000Z' })

    expect(catalog).toMatchObject({
      contractVersion: 'gutenbergBlockPatternCatalog.v1',
      key: 'efeonce_gutenberg_blogpost',
      generatedAt: '2026-06-14T00:00:00.000Z',
      source: {
        recipePath: 'docs/documentation/public-site/gutenberg-post-authoring-recipes.md',
        validatorProfile: 'EFEONCE_BLOGPOST_COMPOSITION_PROFILE'
      }
    })
    expect(catalog.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockName: 'yoast-seo/table-of-contents',
          generationPolicy: 'recommended',
          refreshPolicy: 'preserve'
        }),
        expect.objectContaining({
          blockName: 'core/image',
          generationPolicy: 'requires_source_asset',
          refreshPolicy: 'preserve'
        }),
        expect.objectContaining({
          blockName: 'core/freeform',
          generationPolicy: 'inspect_only',
          refreshPolicy: 'inspect_only'
        })
      ])
    )
  })

  it('keeps generated blocks within the validator allowlist', () => {
    const allowedValidatorBlocks = new Set(listAllowedGeneratedGutenbergBlocks())
    const generatedBlocks = listAllowedGeneratedGutenbergPatternBlocks()

    expect(generatedBlocks).toEqual(expect.arrayContaining(['core/heading', 'core/paragraph', 'core/list']))
    expect(generatedBlocks).not.toContain('core/freeform')

    for (const blockName of generatedBlocks) {
      expect(allowedValidatorBlocks.has(blockName)).toBe(true)
    }
  })

  it('requires inspect-only policy for third-party blocks until serialization is inspected', () => {
    const thirdPartyEntries = EFEONCE_GUTENBERG_BLOCK_PATTERN_ENTRIES.filter(entry => entry.role === 'third_party')

    expect(thirdPartyEntries.length).toBeGreaterThan(0)
    expect(thirdPartyEntries.every(entry => entry.generationPolicy === 'inspect_only')).toBe(true)
  })
})
