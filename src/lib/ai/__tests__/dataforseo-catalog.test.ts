import { describe, expect, it } from 'vitest'

import { DATAFORSEO_CATALOG, findDataForSeoEndpoint, resolveCatalogExecution } from '../dataforseo-catalog'

describe('DataForSEO endpoint catalog', () => {
  it('comes from the official documentation and contains the daily-use routes', () => {
    expect(DATAFORSEO_CATALOG.source.type).toBe('official-wordpress-rest')
    expect(DATAFORSEO_CATALOG.source.pageCount).toBeGreaterThan(600)
    expect(DATAFORSEO_CATALOG.endpoints.length).toBeGreaterThan(500)

    for (const path of [
      '/v3/serp/google/organic/live/advanced',
      '/v3/serp/google/ai_mode/live/advanced',
      '/v3/dataforseo_labs/google/keyword_overview/live',
      '/v3/dataforseo_labs/google/ranked_keywords/live',
      '/v3/backlinks/summary/live',
      '/v3/on_page/task_post'
    ]) {
      expect(findDataForSeoEndpoint(path), path).not.toBeNull()
    }
  })

  it('separates official inventory coverage from governed executable coverage', () => {
    expect(resolveCatalogExecution('/v3/serp/google/organic/live/advanced')).toMatchObject({
      status: 'executable',
      internalFamily: 'serp'
    })
    expect(resolveCatalogExecution('/v3/ai_optimization/llm_mentions/search/live')).toMatchObject({
      status: 'executable',
      internalFamily: 'ai_optimization'
    })

    expect(
      DATAFORSEO_CATALOG.endpoints
        .filter(endpoint => endpoint.family === 'ai_optimization')
        .every(endpoint => resolveCatalogExecution(endpoint.path).status === 'executable')
    ).toBe(true)
  })

  it('exposes methods, fields, examples, mode, docs and source version', () => {
    const endpoint = findDataForSeoEndpoint('/v3/serp/google/ai_mode/live/advanced')

    expect(endpoint).toMatchObject({ method: 'POST', mode: 'live', free: false })
    expect(endpoint?.requestFields.some(field => field.name === 'keyword' && field.required)).toBe(true)
    expect(endpoint?.requestFields.some(field => field.name === 'location_code')).toBe(true)
    expect(endpoint?.example).not.toBeNull()
    expect(endpoint?.documentationUrl).toMatch(/^https:\/\/docs\.dataforseo\.com\/v3\//)
    expect(endpoint?.sourceModifiedAt).toMatch(/^20\d{2}-/)
  })
})
