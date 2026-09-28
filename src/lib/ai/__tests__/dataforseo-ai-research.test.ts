import { describe, expect, it } from 'vitest'

import {
  buildDataForSeoAiResearchRequests,
  dataForSeoAiResearchRowsToCsv,
  normalizeDataForSeoAiResearchResponse,
  parseDataForSeoAiResearchPanel
} from '../dataforseo-ai-research'

const panel = parseDataForSeoAiResearchPanel({
  version: 1,
  name: 'panel reputación',
  market: 'CL',
  queries: ['¿Qué agencias recomiendas?'],
  target: 'efeonce.org',
  lanes: [
    {
      id: 'chatgpt-api',
      preset: 'chatgpt-response',
      surface: 'api',
      model: 'gpt-live-versioned',
      webSearch: true,
      estimatedCostUsdPerTask: 0.02
    },
    {
      id: 'chatgpt-consumer',
      preset: 'chatgpt-scraper',
      surface: 'consumer',
      estimatedCostUsdPerTask: 0.03
    }
  ]
})

describe('DataForSEO AI research', () => {
  it('builds reproducible API and consumer-surface lanes without conflating them', () => {
    expect(buildDataForSeoAiResearchRequests(panel)).toEqual([
      expect.objectContaining({
        key: 'chatgpt-api:0',
        platform: 'chatgpt',
        surface: 'api',
        model: 'gpt-live-versioned',
        endpoint: '/v3/ai_optimization/chat_gpt/llm_responses/live'
      }),
      expect.objectContaining({
        key: 'chatgpt-consumer:0',
        platform: 'chatgpt',
        surface: 'consumer',
        model: null,
        endpoint: '/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced'
      })
    ])
  })

  it('fails closed when surface and provider operation are inconsistent', () => {
    expect(() =>
      parseDataForSeoAiResearchPanel({
        version: 1,
        name: 'bad',
        market: 'CL',
        queries: ['x'],
        lanes: [
          {
            id: 'wrong',
            preset: 'gemini-scraper',
            surface: 'api',
            estimatedCostUsdPerTask: 0.01
          }
        ]
      })
    ).toThrow('no coincide con la superficie')
  })

  it('normalizes citations, fan-out and brand entities with provenance', () => {
    const request = buildDataForSeoAiResearchRequests(panel)[0]

    const row = normalizeDataForSeoAiResearchResponse({
      request,
      market: 'CL',
      observedAt: '2026-09-28T12:00:00.000Z',
      costUsd: 0.004,
      tasks: [
        {
          id: 'task-1',
          status_code: 20000,
          result: [
            {
              markdown: 'Respuesta con evidencia.',
              fan_out_queries: ['mejores agencias chile'],
              brand_entities: [{ name: 'Efeonce', category: 'agency', urls: ['https://efeonce.org/servicios'] }],
              sources: [{ title: 'Fuente', url: 'https://example.com/a' }]
            }
          ]
        }
      ]
    })

    expect(row).toMatchObject({
      surface: 'api',
      responseText: 'Respuesta con evidencia.',
      fanOutQueries: ['mejores agencias chile'],
      taskIds: ['task-1'],
      evidenceStatus: 'observed'
    })
    expect(row.citations).toContainEqual({ url: 'https://example.com/a', domain: 'example.com', title: 'Fuente' })
    expect(row.brandEntities).toContainEqual({
      name: 'Efeonce',
      category: 'agency',
      urls: ['https://efeonce.org/servicios']
    })
    expect(dataForSeoAiResearchRowsToCsv([row])).toContain('fanOutQueries')
  })
})
