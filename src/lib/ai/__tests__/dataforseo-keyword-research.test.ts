import { describe, expect, it } from 'vitest'

import {
  buildKeywordOverviewTasks,
  buildKeywordResearchDiscoveryRequests,
  buildKeywordResearchPlan,
  extractKeywordResearchRows,
  keywordResearchRowsToCsv,
  mergeKeywordResearchRows,
  parseResearchSeeds
} from '../dataforseo-keyword-research'

describe('DataForSEO keyword research', () => {
  it('builds a bounded multi-step plan with a conservative aggregate estimate', () => {
    const plan = buildKeywordResearchPlan({
      keyword: 'seo con ia, agencia seo',
      market: 'CL',
      target: 'example.com',
      discoveryLimit: 20,
      candidateLimit: 100,
      serpLimit: 5
    })

    expect(plan).toMatchObject({
      locationCode: 2152,
      languageCode: 'es',
      seeds: ['seo con ia', 'agencia seo'],
      target: 'example.com',
      discoveryLimit: 20,
      candidateLimit: 100,
      serpLimit: 5,
      estimateBasis: 'conservative_max_rows_v1'
    })
    expect(plan.steps.map(step => step.name)).toEqual([
      'suggestions',
      'related',
      'site',
      'overview',
      'serp',
      'competitors'
    ])
    expect(plan.estimatedCostUsd).toBeGreaterThan(0)
  })

  it('deduplicates seeds without changing their display value', () => {
    expect(parseResearchSeeds('SEO con IA, seo   con ia, Agencia SEO')).toEqual(['SEO con IA', 'Agencia SEO'])
  })

  it('keeps endpoint-specific fields out of ideas and site requests', () => {
    const requests = buildKeywordResearchDiscoveryRequests(
      buildKeywordResearchPlan({ keyword: 'seed', target: 'example.com', includeIdeas: true })
    )

    expect(requests.suggestions[0]).toMatchObject({ include_seed_keyword: true })
    expect(requests.related[0]).toMatchObject({ include_seed_keyword: true })
    expect(requests.ideas?.[0]).not.toHaveProperty('include_seed_keyword')
    expect(requests.site?.[0]).not.toHaveProperty('include_seed_keyword')
  })

  it('preserves missing, null and zero volume as distinct states', () => {
    const tasks = [
      {
        result: [
          {
            items: [
              { keyword_data: { keyword: 'missing', keyword_info: {} } },
              { keyword_data: { keyword: 'null', keyword_info: { search_volume: null } } },
              { keyword_data: { keyword: 'zero', keyword_info: { search_volume: 0 } } }
            ]
          }
        ]
      }
    ]

    expect(extractKeywordResearchRows(tasks, 'overview').map(row => [row.keyword, row.searchVolumeState])).toEqual([
      ['missing', 'missing'],
      ['null', 'null'],
      ['zero', 'value']
    ])
  })

  it('merges provenance and lets overview enrichment replace a missing metric', () => {
    const rows = mergeKeywordResearchRows([
      {
        keyword: 'SEO con IA',
        normalizedKeyword: 'seo con ia',
        coreKeyword: null,
        searchVolume: null,
        searchVolumeState: 'missing',
        cpc: null,
        competition: null,
        competitionLevel: null,
        keywordDifficulty: null,
        intent: null,
        sources: ['suggestions']
      },
      {
        keyword: 'seo con ia',
        normalizedKeyword: 'seo con ia',
        coreKeyword: 'seo ia',
        searchVolume: 90,
        searchVolumeState: 'value',
        cpc: 1.2,
        competition: 0.4,
        competitionLevel: 'MEDIUM',
        keywordDifficulty: 12,
        intent: 'commercial',
        sources: ['overview']
      }
    ])

    expect(rows).toEqual([
      expect.objectContaining({
        keyword: 'seo con ia',
        searchVolume: 90,
        searchVolumeState: 'value',
        sources: ['overview', 'suggestions']
      })
    ])
  })

  it('caps enrichment and produces a spreadsheet-safe CSV', () => {
    const plan = buildKeywordResearchPlan({ keyword: 'seed', candidateLimit: 1, serpLimit: 0 })

    const rows = extractKeywordResearchRows(
      [{ result: [{ items: [{ keyword_data: { keyword: 'uno, dos', keyword_info: { search_volume: 0 } } }] }] }],
      'suggestions'
    )

    expect(buildKeywordOverviewTasks(rows, plan)[0]?.keywords).toEqual(['uno, dos'])
    expect(keywordResearchRowsToCsv(rows)).toContain('"uno, dos"')
  })
})
