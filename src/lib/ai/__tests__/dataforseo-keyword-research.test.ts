import { describe, expect, it } from 'vitest'

import {
  buildKeywordOverviewTasks,
  buildKeywordResearchDiscoveryRequests,
  buildKeywordResearchPlan,
  buildNextResearchPageTasks,
  enrichKeywordResearchWithSerp,
  extractKeywordResearchRows,
  extractResearchCursor,
  applyKeywordResearchGovernance,
  keywordResearchRowsToCsv,
  mergeKeywordResearchRows,
  parseResearchSeeds,
  selectKeywordResearchFinalists,
  type DataForSeoKeywordResearchRow
} from '../dataforseo-keyword-research'

const row = (input: Partial<DataForSeoKeywordResearchRow> & Pick<DataForSeoKeywordResearchRow, 'keyword'>) => ({
  normalizedKeyword: input.keyword.toLocaleLowerCase('es'),
  coreKeyword: null,
  searchVolume: null,
  searchVolumeState: 'missing' as const,
  cpc: null,
  competition: null,
  competitionLevel: null,
  keywordDifficulty: null,
  intent: null,
  declaredIntent: null,
  category: null,
  businessPriority: null,
  existingCoverage: 'unknown' as const,
  finalistApproved: false,
  selectionReasons: [],
  ownUrls: [],
  competitorUrls: [],
  competitorDomains: [],
  serpFeatures: [],
  paaQuestions: [],
  aiOverviewPresent: null,
  aiOverviewCitations: [],
  evidence: [],
  sources: [],
  ...input
})

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
      serpMode: 'standard',
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
      row({
        keyword: 'SEO con IA',
        normalizedKeyword: 'seo con ia',
        sources: ['suggestions']
      }),
      row({
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
      })
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

  it('ranks governed relevance and coverage before volume', () => {
    const governed = applyKeywordResearchGovernance(
      [row({ keyword: 'mucho volumen', searchVolume: 10_000 }), row({ keyword: 'brecha clave', searchVolume: 50 })],
      [
        {
          keyword: 'brecha clave',
          intent: 'commercial',
          category: 'servicio',
          businessPriority: 5,
          existingCoverage: 'gap'
        }
      ]
    )

    expect(selectKeywordResearchFinalists(governed, 1, 'approved')[0]).toMatchObject({
      keyword: 'brecha clave',
      finalistApproved: true,
      businessPriority: 5,
      existingCoverage: 'gap'
    })
  })

  it('normalizes SERP features, PAA, owned URLs, competitor URLs and AI citations', () => {
    const enriched = enrichKeywordResearchWithSerp({
      rows: [row({ keyword: 'seo con ia' })],
      target: 'efeonce.org',
      endpoint: '/v3/serp/google/organic/live/advanced',
      observedAt: '2026-09-28T12:00:00.000Z',
      tasks: [
        {
          id: 'task-1',
          result: [
            {
              keyword: 'seo con ia',
              items: [
                { type: 'organic', url: 'https://efeonce.org/seo', domain: 'efeonce.org' },
                { type: 'organic', url: 'https://competidor.cl/a', domain: 'competidor.cl' },
                { type: 'people_also_ask', title: '¿Qué es AEO?' },
                {
                  type: 'ai_overview',
                  references: [{ type: 'ai_overview_reference', url: 'https://fuente.cl/a' }]
                }
              ]
            }
          ]
        }
      ]
    })[0]

    expect(enriched).toMatchObject({
      ownUrls: ['https://efeonce.org/seo'],
      paaQuestions: ['¿Qué es AEO?'],
      aiOverviewPresent: true
    })
    expect(enriched.competitorUrls).toEqual(expect.arrayContaining(['https://competidor.cl/a', 'https://fuente.cl/a']))
    expect(enriched.aiOverviewCitations).toEqual(['https://fuente.cl/a'])
  })

  it('uses provider cursors for subsequent pages and falls back to bounded offset', () => {
    const cursor = extractResearchCursor([{ result: [{ offset_token: 'opaque' }] }])

    expect(buildNextResearchPageTasks([{ keyword: 'seo', limit: 100 }], cursor, 100, 1)).toEqual([
      { limit: 100, offset_token: 'opaque' }
    ])
    expect(buildNextResearchPageTasks([{ keyword: 'seo', limit: 100 }], null, 100, 2)).toEqual([
      { keyword: 'seo', limit: 100, offset: 200 }
    ])
  })
})
