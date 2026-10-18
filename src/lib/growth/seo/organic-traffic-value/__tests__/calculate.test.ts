import { describe, expect, it } from 'vitest'

import { calculateOrganicTrafficValue } from '../calculate'
import { reportLensCoverage } from '../../lens-coverage'

const page = 'https://blog.skyairline.com/equipaje/'

const base = () => ({
  totalClicks: 100,
  controls: [{ page, clicks: 100 }],
  gscCapturedAt: '2026-10-15T20:00:00Z',
  brandPattern: /\bsky\b|skyairlines?/i,
  rows: [
    { page, query: 'equipaje sky', normalizedQuery: 'equipaje sky', country: 'chl', clicks: 20 },
    { page, query: 'equipaje sky', normalizedQuery: 'equipaje sky', country: 'per', clicks: 10 },
    { page, query: 'skydiving', normalizedQuery: 'skydiving', country: 'chl', clicks: 5 }
  ],
  cpc: [
    {
      normalizedQuery: 'equipaje sky',
      country: 'chl',
      cpcUsd: 0.2,
      capturedAt: '2026-10-15',
      providerUpdatedAt: '2026-10-01'
    },
    {
      normalizedQuery: 'equipaje sky',
      country: 'per',
      cpcUsd: 0.5,
      capturedAt: '2026-10-15',
      providerUpdatedAt: '2026-10-01'
    }
  ]
})

describe('organic traffic value', () => {
  it('uses each country CPC and reports actual coverage without extrapolating hidden queries', () => {
    const result = calculateOrganicTrafficValue(base())

    expect(result.summary).toMatchObject({
      estimatedValueUsd: 9,
      visibleQueryClicks: 35,
      valuedClicks: 30,
      coverageOfTotal: 0.3,
      unexposedClicks: 65,
      unvaluedVisibleClicks: 5
    })
    expect(result.pages[0].estimatedValueUsd).toBe(9)
    expect(result.countries.find(c => c.country === 'per')?.estimatedValueUsd).toBe(5)
    expect(result.countries[0].coverageOfTotal).toBeNull()
    expect(result.brands.find(b => b.brand === 'non_brand')?.visibleQueryClicks).toBe(5)
    expect(result.provenance.find(p => p.section === 'summary.estimatedValueUsd')?.lens).toBe('estimated')
    expect(result.provenance.find(p => p.section === 'summary.totalClicks')?.lens).toBe('measured')
    expect(reportLensCoverage({ dto: result, provenance: result.provenance })).toMatchObject({
      unclaimed: [],
      ambiguous: [],
      figuresWithoutAsOf: []
    })
  })

  it('keeps absent CPC null and preserves a real zero CPC', () => {
    const input = base()

    input.cpc = []
    expect(calculateOrganicTrafficValue(input).summary.estimatedValueUsd).toBeNull()
    input.cpc = [
      {
        normalizedQuery: 'equipaje sky',
        country: 'chl',
        cpcUsd: 0,
        capturedAt: '2026-10-15',
        providerUpdatedAt: '2026-10-01'
      }
    ]
    const result = calculateOrganicTrafficValue(input)

    expect(result.summary.estimatedValueUsd).toBe(0)
    expect(result.summary.valuedClicks).toBe(20)
    expect(result.detail[1].estimatedValueUsd).toBeNull()
  })

  it('rejects duplicate source keys and duplicate prices', () => {
    const input = base()

    input.rows.push(input.rows[0])
    expect(() => calculateOrganicTrafficValue(input)).toThrow('duplicate_query_page_country')
    const second = base()

    second.cpc.push(second.cpc[0])
    expect(() => calculateOrganicTrafficValue(second)).toThrow('duplicate_cpc_key')
  })

  it('rejects inconsistent or negative control data', () => {
    expect(() => calculateOrganicTrafficValue({ ...base(), totalClicks: 101 })).toThrow(
      'page_controls_do_not_reconcile'
    )
    const input = base()

    input.rows[0].clicks = 101
    expect(() => calculateOrganicTrafficValue(input)).toThrow('query_clicks_exceed_control')
    input.rows[0].clicks = -1
    expect(() => calculateOrganicTrafficValue(input)).toThrow('invalid_query_row')
  })

  it('leaves empty/zero traffic unavailable and rounds only after summing', () => {
    expect(calculateOrganicTrafficValue({ ...base(), rows: [], controls: [], totalClicks: 0 }).summary).toMatchObject({
      estimatedValueUsd: null,
      coverageOfTotal: null
    })
    const input = base()

    input.cpc[0].cpcUsd = 0.003
    input.cpc[1].cpcUsd = 0.003
    expect(calculateOrganicTrafficValue(input).summary.estimatedValueUsd).toBe(0.09)
  })
})
