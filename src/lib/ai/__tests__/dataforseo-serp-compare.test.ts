import { describe, expect, it } from 'vitest'

import {
  buildDataForSeoSerpCompareTasks,
  estimateDataForSeoSerpCompareCost,
  normalizeDataForSeoSerpCompareResponse,
  parseDataForSeoSerpComparePanel
} from '../dataforseo-serp-compare'

const panel = parseDataForSeoSerpComparePanel({
  version: 1,
  market: 'CL',
  queries: ['iphone 18 pro max'],
  targets: ['falabella.com', 'https://www.paris.cl/'],
  devices: ['desktop', 'mobile'],
  depth: 20,
  loadAiOverview: true
})

describe('DataForSEO SERP compare', () => {
  it('builds one task per query and device, not per compared target', () => {
    expect(buildDataForSeoSerpCompareTasks(panel)).toHaveLength(2)
    expect(buildDataForSeoSerpCompareTasks(panel)[0]).toMatchObject({
      keyword: 'iphone 18 pro max',
      device: 'desktop',
      depth: 20,
      load_async_ai_overview: true
    })
    expect(estimateDataForSeoSerpCompareCost(panel)).toBe(0.016)
  })

  it('separates organic rank, AI direct links, formal citations and shopping offers', () => {
    const [falabella, paris] = normalizeDataForSeoSerpCompareResponse({
      panel: { ...panel, devices: ['desktop'], loadAiOverview: false },
      tasks: [
        {
          id: 'task-1',
          cost: 0.002,
          data: { keyword: 'iphone 18 pro max', device: 'desktop' },
          result: [
            {
              datetime: '2026-09-28 11:34:36 +00:00',
              items: [
                {
                  type: 'ai_overview',
                  asynchronous_ai_overview: false,
                  items: [
                    { type: 'link_element', domain: 'www.paris.cl', url: 'https://www.paris.cl/product' },
                    {
                      type: 'ai_overview_reference',
                      domain: 'falabella.com',
                      url: 'https://falabella.com/guide'
                    }
                  ]
                },
                {
                  type: 'organic',
                  domain: 'www.falabella.com',
                  title: 'Producto Falabella',
                  url: 'https://www.falabella.com/product',
                  rank_group: 4,
                  rank_absolute: 6
                },
                {
                  type: 'knowledge_graph',
                  items: [
                    {
                      type: 'knowledge_graph_shopping_element',
                      url: 'https://www.paris.cl/product',
                      source: 'Paris.cl',
                      price: { current: 1699990, currency: 'CLP' }
                    }
                  ]
                },
                { type: 'related_searches', items: [{ title: 'iPhone 18 Pro Max Paris' }] }
              ]
            }
          ]
        }
      ]
    })

    expect(falabella).toMatchObject({
      organicStatus: 'observed',
      organicRankGroup: 4,
      organicRankAbsolute: 6,
      aiDirectLink: false,
      aiCitation: true,
      shoppingObserved: false,
      aiOverviewAsyncRequested: false,
      aiFreshness: 'cached_provider_result'
    })
    expect(paris).toMatchObject({
      organicStatus: 'not_observed_in_captured_organic',
      organicRankGroup: null,
      capturedOrganicCount: 1,
      maxCapturedOrganicRank: 4,
      aiDirectLink: true,
      aiCitation: false,
      shoppingObserved: true,
      shoppingSource: 'Paris.cl',
      shoppingPrice: 1699990,
      relatedSearchObserved: true,
      signals: [
        'organic_not_observed',
        'ai_link_without_citation',
        'shopping_without_organic',
        'multi_surface_presence'
      ]
    })
  })

  it('uses the returned AI Overview freshness and skips failed provider tasks', () => {
    const rows = normalizeDataForSeoSerpCompareResponse({
      panel,
      tasks: [
        {
          id: 'desktop-ok',
          status_code: 20000,
          data: { keyword: panel.queries[0], device: 'desktop' },
          result: [{ items: [{ type: 'ai_overview', asynchronous_ai_overview: true }] }]
        },
        {
          id: 'mobile-failed',
          status_code: 40000,
          data: { keyword: panel.queries[0], device: 'mobile' },
          result: null
        }
      ]
    })

    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.device === 'desktop')).toBe(true)
    expect(rows.every(row => row.aiOverviewAsyncRequested)).toBe(true)
    expect(rows.every(row => row.aiFreshness === 'async_provider_result')).toBe(true)
  })

  it('rejects ambiguous devices and unbounded depth', () => {
    expect(() => parseDataForSeoSerpComparePanel({ ...panel, devices: ['tablet'] })).toThrow('desktop o mobile')
    expect(() => parseDataForSeoSerpComparePanel({ ...panel, depth: 201 })).toThrow('entre 1 y 200')
  })

  it('models any brand with aliases and multiple domains, without commerce assumptions', () => {
    const brandPanel = parseDataForSeoSerpComparePanel({
      version: 1,
      market: 'CL',
      queries: ['mejor consultora de transformación digital'],
      entities: [
        {
          id: 'efeonce',
          label: 'Efeonce',
          domains: ['efeonce.org', 'studio.efeonce.org'],
          aliases: ['Efeonce', 'Efeonce Studio']
        }
      ]
    })

    const [row] = normalizeDataForSeoSerpCompareResponse({
      panel: brandPanel,
      tasks: [
        {
          data: { keyword: brandPanel.queries[0], device: 'desktop' },
          result: [{ items: [{ type: 'ai_overview', text: 'Efeonce aparece entre las alternativas.' }] }]
        }
      ]
    })

    expect(row).toMatchObject({
      target: 'efeonce',
      targetLabel: 'Efeonce',
      targetDomains: ['efeonce.org', 'studio.efeonce.org'],
      aiMention: true,
      aiDirectLink: false,
      aiCitation: false,
      shoppingObserved: false,
      signals: ['organic_not_observed', 'ai_mention_without_link_or_citation']
    })
  })
})
