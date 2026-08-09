import { describe, expect, it } from 'vitest'

import { selectFeaturedRankSeries } from './select-featured-series'

describe('selectFeaturedRankSeries', () => {
  it('keeps the best latest positions first and remains deterministic on ties', () => {
    const result = selectFeaturedRankSeries([
      { keyword: 'zeta', points: [{ date: '2026-08-01', position: 4, url: 'https://example.cl/zeta' }] },
      { keyword: 'alpha', points: [{ date: '2026-08-01', position: 2, url: 'https://example.cl/alpha' }] },
      { keyword: 'beta', points: [{ date: '2026-08-01', position: 2, url: 'https://example.cl/beta' }] },
      { keyword: 'pending', points: [{ date: '2026-08-01', position: null, url: null }] }
    ], 3)

    expect(result.map(serie => serie.keyword)).toEqual(['alpha', 'beta', 'zeta'])
  })

  it('does not mutate the source collection and respects a zero limit', () => {
    const source = [{ keyword: 'alpha', points: [{ date: '2026-08-01', position: 1, url: 'https://example.cl/alpha' }] }]

    expect(selectFeaturedRankSeries(source, 0)).toEqual([])
    expect(source).toEqual([{ keyword: 'alpha', points: [{ date: '2026-08-01', position: 1, url: 'https://example.cl/alpha' }] }])
  })
})

