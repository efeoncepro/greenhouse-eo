import { describe, expect, it } from 'vitest'

import {
  buildDataForSeoSiteKeywordsPlan,
  dataForSeoSiteKeywordsRowsToCsv,
  normalizeDataForSeoSiteKeywordsResponse,
  resolveDataForSeoSiteKeywordsSubject,
  summarizeDataForSeoSiteKeywordsScope
} from '../dataforseo-site-keywords'

const task = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  id: 'provider-task',
  status_code: 20000,
  result: [{ target: 'https://www.example.com/Article/?id=A', items }],
  ...extra
})

describe('DataForSEO Keywords for Site explicit subject', () => {
  it('preserves exact URL path, slash, case and query and accepts root pages', () => {
    for (const target of ['https://www.example.com/Article/?id=A', 'https://example.com/', 'https://example.com']) {
      expect(resolveDataForSeoSiteKeywordsSubject({ target, targetKind: 'url' }).providerTarget).toBe(target)
    }
  })

  it('adds only the documented scheme for a www URL and retains a literal www subdomain', () => {
    expect(resolveDataForSeoSiteKeywordsSubject({ target: 'www.example.com/Path/', targetKind: 'url' })).toMatchObject({
      providerTarget: 'https://www.example.com/Path/'
    })
    expect(resolveDataForSeoSiteKeywordsSubject({ target: 'WWW.EXAMPLE.COM', targetKind: 'subdomain' })).toMatchObject({
      providerTarget: 'www.example.com',
      kind: 'subdomain'
    })
  })

  it.each([
    ['example.com/Article', 'url'],
    ['http://example.com/Article', 'url'],
    ['https://example.com/Article#part', 'url'],
    ['https://name:password@example.com/Article', 'url'],
    ['https://example.com:443/Article', 'url'],
    ['https://example.com:8080/Article', 'url'],
    ['https:///example.com/Article', 'url'],
    ['https:////example.com/Article', 'url'],
    ['https://example%2Ecom/Article', 'url'],
    ['example%2Ecom', 'domain'],
    ['https://example.com/Article', 'domain'],
    ['example.com/Article', 'domain'],
    ['www.example.com', 'domain'],
    ['example.com?x=y', 'subdomain'],
    ['*.example.com', 'subdomain'],
    ['example.com\\path', 'url'],
    ['localhost', 'domain'],
    ['127.0.0.1', 'domain'],
    ['example.com', ''],
    ['example.com', 'subfolder']
  ])('rejects scope-unsafe target %s declared as %s', (target, targetKind) => {
    expect(() => resolveDataForSeoSiteKeywordsSubject({ target, targetKind })).toThrow()
  })

  it('builds one bounded relevance request and a conservative maximum-page estimate', () => {
    const plan = buildDataForSeoSiteKeywordsPlan({
      target: 'Blog.example.com',
      targetKind: 'subdomain',
      market: 'MX',
      limit: 50,
      maxPages: 3
    })

    expect(plan.task).toEqual({
      target: 'blog.example.com',
      location_code: 2484,
      language_code: 'es',
      limit: 50,
      order_by: ['relevance,desc'],
      include_subdomains: false,
      include_clickstream_data: false
    })
    expect(plan.pageEstimateUsd).toBe(0.018)
    expect(plan.estimatedCostUsd).toBe(0.054)
    expect(plan.cacheMaxAgeHours).toBe(24)
    expect(
      buildDataForSeoSiteKeywordsPlan({ target: 'https://example.com/', targetKind: 'url' }).task
    ).not.toHaveProperty('include_subdomains')
    expect(
      buildDataForSeoSiteKeywordsPlan({ target: 'example.com', targetKind: 'domain' }).task.include_subdomains
    ).toBe(false)
  })

  it.each([
    { limit: 0 },
    { limit: 1001 },
    { limit: 1.1 },
    { maxPages: 0 },
    { maxPages: 21 },
    { cacheMaxAgeHours: 721 }
  ])('rejects unbounded controls %j', controls => {
    expect(() =>
      buildDataForSeoSiteKeywordsPlan({ target: 'example.com', targetKind: 'domain', ...controls })
    ).toThrow()
  })

  it('uses the shared verified market resolver', () => {
    expect(
      buildDataForSeoSiteKeywordsPlan({ target: 'example.com', targetKind: 'domain', market: 'Perú', locale: 'es-PE' })
        .task.location_code
    ).toBe(2604)
    expect(() =>
      buildDataForSeoSiteKeywordsPlan({ target: 'example.com', targetKind: 'domain', market: 'unknown' })
    ).toThrow('aeo_market_unknown')
  })
})

describe('DataForSEO Keywords for Site result semantics', () => {
  it('retains provider relevance order, market metrics, categories and monthly/trend evidence', () => {
    const rows = normalizeDataForSeoSiteKeywordsResponse([
      task([
        {
          keyword: 'specific first',
          keyword_info: {
            search_volume: 20,
            cpc: 1.2,
            competition: 0.6,
            competition_level: 'HIGH',
            categories: [2, 8],
            last_updated_time: '2026-09-01 00:00:00 +00:00',
            monthly_searches: [
              { year: 2026, month: 8, search_volume: 0 },
              { year: 2026, month: 7, search_volume: null }
            ],
            search_volume_trend: { monthly: -12, quarterly: null, yearly: 8 }
          }
        },
        { keyword: 'broad second', keyword_info: { search_volume: 1000 } }
      ])
    ])

    expect(rows.map(row => row.keyword)).toEqual(['specific first', 'broad second'])
    expect(rows[0]).toMatchObject({
      searchVolume: 20,
      cpc: 1.2,
      competition: 0.6,
      competitionLevel: 'HIGH',
      categories: [2, 8],
      monthlySearches: [
        { year: 2026, month: 8, searchVolume: 0 },
        { year: 2026, month: 7, searchVolume: null }
      ],
      searchVolumeTrend: { monthly: -12, quarterly: null, yearly: 8 },
      taskId: 'provider-task'
    })
    expect(rows[0]).not.toHaveProperty('relevance')
    expect(rows[0]).not.toHaveProperty('rank')
  })

  it('preserves missing, null and true zero without inventing data', () => {
    const rows = normalizeDataForSeoSiteKeywordsResponse([
      task([
        { keyword: 'missing' },
        { keyword: 'null', keyword_info: { search_volume: null, categories: null, monthly_searches: null } },
        { keyword: 'zero', keyword_info: { search_volume: 0, categories: [], monthly_searches: [] } }
      ])
    ])

    expect(rows.map(row => [row.searchVolumeState, row.searchVolume])).toEqual([
      ['missing', null],
      ['null', null],
      ['value', 0]
    ])
    expect(rows[0].categories).toBeNull()
    expect(rows[1].monthlySearches).toBeNull()
    expect(rows[2].monthlySearches).toEqual([])
  })

  it('never turns failed or pending tasks into apparent keyword evidence', () => {
    expect(
      normalizeDataForSeoSiteKeywordsResponse([
        task([{ keyword: 'failed' }], { status_code: 40501 }),
        task([{ keyword: 'pending' }], { status_code: 40602 }),
        task([{ keyword: 'missing status' }], { status_code: undefined })
      ])
    ).toEqual([])
  })

  it('marks malformed present volume as invalid rather than observed or absent', () => {
    const rows = normalizeDataForSeoSiteKeywordsResponse([
      task([
        { keyword: 'string', keyword_info: { search_volume: '100' } },
        { keyword: 'boolean', keyword_info: { search_volume: false } },
        { keyword: 'non-finite', keyword_info: { search_volume: Number.NaN } }
      ])
    ])

    expect(rows.map(row => [row.searchVolumeState, row.searchVolume])).toEqual([
      ['invalid', null],
      ['invalid', null],
      ['invalid', null]
    ])
  })

  it('validates provider returned target and exposes scope uncertainty', () => {
    const subject = resolveDataForSeoSiteKeywordsSubject({
      target: 'https://www.example.com/Article/?id=A',
      targetKind: 'url'
    })

    expect(summarizeDataForSeoSiteKeywordsScope([task([])], subject).status).toBe('matched')
    expect(
      summarizeDataForSeoSiteKeywordsScope([task([], { result: [{ target: 'example.com', items: [] }] })], subject)
    ).toMatchObject({ status: 'mismatch', mismatchTargets: ['example.com'] })
    expect(
      summarizeDataForSeoSiteKeywordsScope(
        [task([], { data: { target: subject.providerTarget }, result: [{ items: [] }] })],
        subject
      ).status
    ).toBe('unreported')
    expect(
      summarizeDataForSeoSiteKeywordsScope(
        [
          task([], {
            result: [{ target: subject.providerTarget, items: [] }, { items: [{ keyword: 'unknown scope' }] }]
          })
        ],
        subject
      )
    ).toMatchObject({ status: 'unreported', hasUnreportedTargets: true })
    expect(
      summarizeDataForSeoSiteKeywordsScope(
        [task([], { result: [{ target: 'https://www.example.com/Article?id=A', items: [] }] })],
        subject
      ).status
    ).toBe('mismatch')
  })

  it('exports complete trend data while preventing spreadsheet formulas from provider strings', () => {
    const rows = normalizeDataForSeoSiteKeywordsResponse([
      task([
        {
          keyword: '=SUM(A1:A2),\nother',
          keyword_info: {
            search_volume: 0,
            categories: [1],
            monthly_searches: [{ year: 2026, month: 8, search_volume: 0 }]
          }
        }
      ])
    ])

    const csv = dataForSeoSiteKeywordsRowsToCsv(rows)

    expect(csv).toContain('monthlySearches,searchVolumeTrend,lastUpdatedTime,taskId')
    expect(csv).toContain('"\'=SUM(A1:A2),\nother"')
    expect(csv).toContain('"[{""year"":2026,""month"":8,""searchVolume"":0}]"')
  })
})
