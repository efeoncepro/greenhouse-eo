import { describe, expect, it } from 'vitest'

import type { ContentFactoryRefreshPlanChangeOperation } from '../contracts'
import {
  EFEONCE_GUTENBERG_BLOCK_CAPABILITIES,
  getEfeonceGutenbergBlockCapabilityRegistry,
  getGutenbergCapabilityForBlock,
  listGutenbergSemanticOperations
} from '../gutenberg-capability-registry'

const knownRefreshOperations: ContentFactoryRefreshPlanChangeOperation[] = [
  'update_text',
  'update_attrs',
  'preserve',
  'reconcile_media',
  'review_link',
  'review_seo'
]

describe('getEfeonceGutenbergBlockCapabilityRegistry', () => {
  it('exposes semantic block capabilities as an agent-facing registry', () => {
    const registry = getEfeonceGutenbergBlockCapabilityRegistry({ generatedAt: '2026-06-14T00:00:00.000Z' })

    expect(registry).toMatchObject({
      contractVersion: 'gutenbergBlockCapabilityRegistry.v1',
      key: 'efeonce_gutenberg_blogpost_capabilities',
      generatedAt: '2026-06-14T00:00:00.000Z',
      source: {
        patternCatalog: 'gutenbergBlockPatternCatalog.v1',
        deepInspectionContract: 'contentFactoryPostDeepInspection.v1',
        refreshPlanContract: 'contentFactoryRefreshPlan.v1'
      }
    })
    expect(registry.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockName: 'core/pullquote',
          semanticKind: 'editorial_pullquote',
          semanticOperations: ['refresh_editorial_pullquote']
        }),
        expect.objectContaining({
          blockName: 'yoast-seo/table-of-contents',
          freedomLevel: 'preserve_only'
        }),
        expect.objectContaining({
          blockName: 'core/image',
          requiredEvidence: expect.arrayContaining(['media_reconciliation'])
        })
      ])
    )
  })

  it('keeps all capabilities draft-only and mapped to known refresh operations', () => {
    const known = new Set(knownRefreshOperations)

    for (const capability of EFEONCE_GUTENBERG_BLOCK_CAPABILITIES) {
      expect(capability.applyPolicy.directPublishedMutation).toBe(false)
      expect(capability.applyPolicy.requiresDraftClone).toBe(true)
      expect(capability.requiredEvidence).toContain('fresh_deep_inspection')

      for (const operation of capability.compilesTo) {
        expect(known.has(operation)).toBe(true)
      }
    }
  })

  it('models pullquote refresh as guided semantic freedom rather than raw path editing', () => {
    const pullquote = getGutenbergCapabilityForBlock('core/pullquote')

    expect(pullquote).toMatchObject({
      semanticKind: 'editorial_pullquote',
      freedomLevel: 'guided',
      editableSurfaces: ['text'],
      semanticOperations: ['refresh_editorial_pullquote'],
      compilesTo: ['update_text']
    })
    expect(pullquote?.guardrails).toEqual(expect.arrayContaining(['Do not use fragile external statistics without source validation.']))
  })

  it('lists semantic operations for future API/MCP adapters', () => {
    expect(listGutenbergSemanticOperations()).toEqual(
      expect.arrayContaining(['refresh_editorial_pullquote', 'preserve_or_regenerate_toc', 'review_image_asset'])
    )
  })
})
