import { describe, expect, it } from 'vitest'

/**
 * TASK-1290 Slice 0 — El scorer lee los tags del set RESUELTO del run (catálogo), NO del pack
 * estático. Prueba load-bearing del fix de ISSUE-110 (2º mecanismo): un set generado con ids
 * NUEVOS (no p01–p16) debe puntuar correcto. Sin el catálogo, los tags quedaban `undefined`
 * → `isDiscovery=false` / `isRevenueIntent=false` para toda query → score corrupto cerca de 0.
 *
 * También: caso agencia bit-for-bit (catálogo desde v1 == fallback estático) → no-regresión.
 */

import { createEmptyNormalizedFinding, type NormalizedFinding } from '../normalization/contracts'
import { computeGraderScore } from '../scoring/engine'
import { GROWTH_AI_VISIBILITY_PROMPT_PACK_V1 } from '../prompt-packs/prompt-pack-v1'
import { type PromptTag, type PromptTagCatalog } from '../prompt-packs/tag-vocabulary'

const finding = (over: Partial<NormalizedFinding> & { promptId: string; findingId: string }): NormalizedFinding => ({
  ...createEmptyNormalizedFinding({
    findingId: over.findingId,
    runId: 'run-1',
    promptId: over.promptId,
    provider: over.provider ?? 'openai'
  }),
  ...over
})

const catalogFromV1 = (): PromptTagCatalog => {
  const catalog: PromptTagCatalog = new Map()

  for (const p of GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts) {
    catalog.set(p.id, { family: p.family, fanOutType: p.fanOutType, intentStage: p.intentStage, namesBrand: p.namesBrand })
  }

  return catalog
}

describe('TASK-1290 Slice 0 — scorer desacoplado del pack estático', () => {
  it('caso agencia: catálogo (desde v1) == fallback estático → bit-for-bit', () => {
    const findings = [
      finding({ findingId: 'f1', promptId: 'p01', brandMentioned: 'yes', confidence: 0.85 }), // discovery
      finding({ findingId: 'f2', promptId: 'p03', brandMentioned: 'no', confidence: 0.85 }), // discovery
      finding({ findingId: 'f3', promptId: 'p09', brandMentioned: 'yes', confidence: 0.8 }), // purchase_intent
      finding({ findingId: 'f4', promptId: 'p05', brandMentioned: 'yes', confidence: 0.7 }) // comparison (namesBrand)
    ]

    const withCatalog = computeGraderScore('run-1', findings, catalogFromV1())
    const withFallback = computeGraderScore('run-1', findings) // sin catálogo → fallback al pack v1

    expect(withCatalog.overallScore).toBe(withFallback.overallScore)
    expect(JSON.stringify(withCatalog.dimensions)).toBe(JSON.stringify(withFallback.dimensions))
    expect(withCatalog.coverage.promptFamilies).toBe(withFallback.coverage.promptFamilies)
  })

  it('set generado con ids NUEVOS (no v1): con catálogo puntúa correcto; sin catálogo se corrompe', () => {
    // Marca de consumo: 3 prompts de descubrimiento (namesBrand=false) donde la marca SÍ aparece.
    const consumerTags: Record<string, PromptTag> = {
      cb01: { family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false },
      cb02: { family: 'product_discovery', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: false },
      cb03: { family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: false }
    }

    const catalog: PromptTagCatalog = new Map(Object.entries(consumerTags))

    const findings = [
      finding({ findingId: 'f1', promptId: 'cb01', brandMentioned: 'yes', confidence: 0.85 }),
      finding({ findingId: 'f2', promptId: 'cb02', brandMentioned: 'yes', confidence: 0.85 }),
      finding({ findingId: 'f3', promptId: 'cb03', brandMentioned: 'yes', confidence: 0.85 })
    ]

    const withCatalog = computeGraderScore('run-consumer', findings, catalog)
    const withoutCatalog = computeGraderScore('run-consumer', findings) // ids no en v1 → tags undefined

    // CON catálogo: las 3 son discovery con marca presente → AI Visibility 100.
    const aiVisWith = withCatalog.dimensions.find(d => d.key === 'ai_visibility')

    expect(aiVisWith?.score).toBe(100)
    expect(aiVisWith?.evidenceCount).toBe(3)
    // revenue intent (cb03=purchase_intent) presente → dimensión con evidencia.
    const revWith = withCatalog.dimensions.find(d => d.key === 'revenue_intent_coverage')

    expect(revWith?.score).toBe(100)
    expect(withCatalog.coverage.promptFamilies).toBe(3)

    // SIN catálogo (el bug): tags undefined → isDiscovery=false → AI Visibility SIN evidencia (null),
    // revenue intent SIN evidencia, 0 familias. El score se corrompe (no refleja la realidad).
    const aiVisWithout = withoutCatalog.dimensions.find(d => d.key === 'ai_visibility')

    expect(aiVisWithout?.score).toBeNull()
    expect(withoutCatalog.dimensions.find(d => d.key === 'revenue_intent_coverage')?.score).toBeNull()
    expect(withoutCatalog.coverage.promptFamilies).toBe(0)

    // La prueba de que el catálogo IMPORTA: con catálogo se puntúan 3 dimensiones tag-dependientes
    // (AI Visibility / Category Ownership / Revenue Intent) que sin él quedan SIN evidencia.
    const scoredWith = withCatalog.dimensions.filter(d => d.score !== null).length
    const scoredWithout = withoutCatalog.dimensions.filter(d => d.score !== null).length

    expect(scoredWith).toBeGreaterThan(scoredWithout)
    expect(scoredWith - scoredWithout).toBe(3)
  })
})
