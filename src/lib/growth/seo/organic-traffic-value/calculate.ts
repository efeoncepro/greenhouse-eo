import { seoProvenance } from '../lens'

export const ORGANIC_TRAFFIC_VALUE_METHOD = 'gsc_clicks_country_cpc_v1' as const

export interface OrganicValueQuery {
  page: string
  query: string
  normalizedQuery: string
  country: string
  clicks: number
}

export interface OrganicValueCpc {
  normalizedQuery: string
  country: string
  cpcUsd: number | null
  capturedAt: string
  providerUpdatedAt: string | null
}

export interface OrganicValueControl {
  page: string
  clicks: number
}

const key = (country: string, keyword: string) => JSON.stringify([country.toLowerCase(), keyword])
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const validCount = (value: number) => Number.isSafeInteger(value) && value >= 0

/** Estimación monetaria sobre clics medidos. Sin CPC, el valor permanece null. */
export const calculateOrganicTrafficValue = (input: {
  rows: OrganicValueQuery[]
  controls: OrganicValueControl[]
  totalClicks: number
  gscCapturedAt: string
  brandPattern: RegExp
  cpc: OrganicValueCpc[]
}) => {
  if (!validCount(input.totalClicks)) throw new Error('invalid_total_clicks')
  const controls = new Map<string, number>()

  for (const control of input.controls) {
    if (controls.has(control.page) || !validCount(control.clicks)) throw new Error('invalid_page_control')
    controls.set(control.page, control.clicks)
  }

  if ([...controls.values()].reduce((a, b) => a + b, 0) !== input.totalClicks)
    throw new Error('page_controls_do_not_reconcile')
  const prices = new Map<string, OrganicValueCpc>()

  for (const price of input.cpc) {
    const id = key(price.country, price.normalizedQuery)

    if (prices.has(id)) throw new Error('duplicate_cpc_key')
    if (!price.capturedAt || (price.cpcUsd !== null && (!Number.isFinite(price.cpcUsd) || price.cpcUsd < 0)))
      throw new Error('invalid_cpc')
    prices.set(id, price)
  }

  const seen = new Set<string>()

  const detail = input.rows.map(row => {
    const id = JSON.stringify([row.page, row.query, row.country.toLowerCase()])

    if (seen.has(id)) throw new Error('duplicate_query_page_country')
    seen.add(id)
    if (!controls.has(row.page) || !validCount(row.clicks) || !row.query || !row.normalizedQuery || !row.country)
      throw new Error('invalid_query_row')
    const price = prices.get(key(row.country, row.normalizedQuery))
    const cpcUsd = price?.cpcUsd ?? null

    input.brandPattern.lastIndex = 0

    return {
      ...row,
      country: row.country.toLowerCase(),
      brand: input.brandPattern.test(row.query) ? ('brand' as const) : ('non_brand' as const),
      cpcUsd,
      cpcCapturedAt: price?.capturedAt ?? null,
      cpcProviderUpdatedAt: price?.providerUpdatedAt ?? null,
      estimatedValueUsd: cpcUsd === null ? null : row.clicks * cpcUsd
    }
  })

  const summarize = (rows: typeof detail, totalClicks: number | null) => {
    const visibleQueryClicks = rows.reduce((sum, row) => sum + row.clicks, 0)

    if (totalClicks !== null && visibleQueryClicks > totalClicks) throw new Error('query_clicks_exceed_control')
    const valued = rows.filter(row => row.cpcUsd !== null && row.clicks > 0)
    const valuedClicks = valued.reduce((sum, row) => sum + row.clicks, 0)

    return {
      totalClicks,
      visibleQueryClicks,
      valuedClicks,
      unvaluedVisibleClicks: visibleQueryClicks - valuedClicks,
      unexposedClicks: totalClicks === null ? null : totalClicks - visibleQueryClicks,
      coverageOfTotal: totalClicks === null || totalClicks === 0 ? null : valuedClicks / totalClicks,
      queryCoverageOfTotal: totalClicks === null || totalClicks === 0 ? null : visibleQueryClicks / totalClicks,
      estimatedValueUsd:
        valued.length === 0 ? null : money(valued.reduce((sum, row) => sum + row.estimatedValueUsd!, 0))
    }
  }

  const pages = input.controls.map(control => ({
    page: control.page,
    ...summarize(
      detail.filter(row => row.page === control.page),
      control.clicks
    )
  }))

  const countries = [...new Set(detail.map(row => row.country))].sort().map(country => ({
    country,
    ...summarize(
      detail.filter(row => row.country === country),
      null
    )
  }))

  const brands = (['brand', 'non_brand'] as const).map(brand => ({
    brand,
    ...summarize(
      detail.filter(row => row.brand === brand),
      null
    )
  }))

  const cpcAsOf =
    input.cpc
      .map(row => row.capturedAt)
      .sort()
      .at(-1) ?? null

  return {
    methodology: ORGANIC_TRAFFIC_VALUE_METHOD,
    currency: 'USD' as const,
    summary: summarize(detail, input.totalClicks),
    pages,
    countries,
    brands,
    detail,
    provenance: [
      ...['summary', 'pages[]', 'countries[]', 'brands[]'].flatMap(section => [
        ...[
          'totalClicks',
          'visibleQueryClicks',
          'valuedClicks',
          'unvaluedVisibleClicks',
          'unexposedClicks',
          'coverageOfTotal',
          'queryCoverageOfTotal'
        ].map(field =>
          seoProvenance({ section: `${section}.${field}`, source: 'gsc', capturedAt: input.gscCapturedAt })
        ),
        seoProvenance({ section: `${section}.estimatedValueUsd`, source: 'dataforseo_labs', capturedAt: cpcAsOf })
      ]),
      seoProvenance({ section: 'detail[].clicks', source: 'gsc', capturedAt: input.gscCapturedAt }),
      seoProvenance({ section: 'detail[].cpcUsd', source: 'dataforseo_labs', capturedAt: cpcAsOf }),
      seoProvenance({ section: 'detail[].estimatedValueUsd', source: 'dataforseo_labs', capturedAt: cpcAsOf })
    ]
  }
}
