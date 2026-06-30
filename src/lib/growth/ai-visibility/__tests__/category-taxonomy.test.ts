import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CATEGORY_TAXONOMY,
  CATEGORY_TAXONOMY_VERSION,
  mapCategoryCandidateToTaxonomy,
  mapCategoryCandidatesToTaxonomy,
  normalizeCategoryAssociationIds,
  validateCategoryTaxonomy
} from '../taxonomy'

type CategoryTaxonomyEval = {
  cases: Array<{
    id: string
    candidate: string
    expectedStatus: string
    expectedNodeId: string | null
  }>
}

const taxonomyEval = JSON.parse(
  readFileSync(join(__dirname, '../evals/category-taxonomy-eval.v1.json'), 'utf8')
) as CategoryTaxonomyEval

describe('growth/ai-visibility — governed category taxonomy', () => {
  it('catalogo versionado valida IDs, niveles, parentIds y labels', () => {
    const validation = validateCategoryTaxonomy()

    expect(validation).toEqual({ ok: true, errors: [] })
    expect(CATEGORY_TAXONOMY.nodes.length).toBeGreaterThanOrEqual(90)
  })

  it('mapea aliases legacy/free-form conocidos a IDs canonicos', () => {
    expect(mapCategoryCandidateToTaxonomy('ASaaS')).toMatchObject({
      taxonomyVersion: CATEGORY_TAXONOMY_VERSION,
      mappingStatus: 'mapped',
      nodeId: 'category:growth_operating_system',
      level: 'product_service_category'
    })

    expect(mapCategoryCandidateToTaxonomy('Inbound Marketing')).toMatchObject({
      mappingStatus: 'mapped',
      nodeId: 'category:inbound_marketing'
    })
  })

  it('degrada candidatos desconocidos o ambiguos sin inventar categoria', () => {
    expect(mapCategoryCandidateToTaxonomy('categoria inventada por el proveedor')).toMatchObject({
      mappingStatus: 'needs_review',
      nodeId: null,
      confidence: 0
    })

    expect(mapCategoryCandidateToTaxonomy('automation')).toMatchObject({
      mappingStatus: 'ambiguous',
      nodeId: null
    })
  })

  it('cubre categorias granulares sin colapsarlas a industrias amplias', () => {
    expect(mapCategoryCandidateToTaxonomy('telemedicine')).toMatchObject({
      mappingStatus: 'mapped',
      nodeId: 'category:telemedicine',
      level: 'product_service_category'
    })

    expect(mapCategoryCandidateToTaxonomy('business intelligence')).toMatchObject({
      mappingStatus: 'mapped',
      nodeId: 'category:business_intelligence',
      level: 'product_service_category'
    })

    expect(mapCategoryCandidateToTaxonomy('ecommerce')).toMatchObject({
      mappingStatus: 'mapped',
      nodeId: 'sector:ecommerce_marketplaces',
      level: 'sector'
    })

    expect(mapCategoryCandidateToTaxonomy('CFO')).toMatchObject({
      mappingStatus: 'mapped',
      nodeId: 'buyer:cfo',
      level: 'buyer_persona'
    })
  })

  it('normaliza listas a IDs canonicos deduplicados y descarta candidatos no gobernados', () => {
    const associations = mapCategoryCandidatesToTaxonomy({
      candidates: ['marketing', 'ASaaS', 'ASaaS', 'categoria inventada'],
      evidenceSource: 'llm_candidate'
    })

    expect(normalizeCategoryAssociationIds(associations.map(association => association.nodeId ?? 'categoria inventada'))).toEqual([
      'sector:marketing_services',
      'category:growth_operating_system'
    ])
  })

  it('eval fixture: cubre multiples industrias/sectores/personas/mercados y degradaciones', () => {
    expect(taxonomyEval.cases.length).toBeGreaterThanOrEqual(20)

    for (const fixture of taxonomyEval.cases) {
      const mapped = mapCategoryCandidateToTaxonomy(fixture.candidate)

      expect(mapped.mappingStatus, fixture.id).toBe(fixture.expectedStatus)
      expect(mapped.nodeId, fixture.id).toBe(fixture.expectedNodeId)
    }
  })
})
