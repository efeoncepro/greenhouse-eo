import { resolveGrowthMarket } from '@/lib/growth/markets'

export const DATAFORSEO_SITE_KEYWORDS_ENDPOINT = '/v3/dataforseo_labs/google/keywords_for_site/live'

export type DataForSeoSiteKeywordsTargetKind = 'domain' | 'subdomain' | 'url'

export type DataForSeoSiteKeywordsSubject = {
  kind: DataForSeoSiteKeywordsTargetKind
  raw: string
  providerTarget: string
  hostname: string
}

/** Scope is declared by the operator. A missing URL prefix can silently buy an entire domain. */
export const resolveDataForSeoSiteKeywordsSubject = (input: {
  target: string
  targetKind: string
}): DataForSeoSiteKeywordsSubject => {
  if (!['domain', 'subdomain', 'url'].includes(input.targetKind)) {
    throw new Error('--target-kind exige domain, subdomain o url.')
  }

  const kind = input.targetKind as DataForSeoSiteKeywordsTargetKind
  const raw = input.target?.trim() ?? ''

  if (!raw || /[\s\\*]/u.test(raw)) throw new Error('--target exige un host o URL válido, sin espacios ni comodines.')

  let providerTarget = raw

  if (kind === 'url') {
    if (/^www\./i.test(raw)) providerTarget = `https://${raw}`

    if (!/^https:\/\//i.test(providerTarget)) {
      throw new Error('Un target url exige https:// o el prefijo www.; sin prefijo el proveedor consulta el dominio.')
    }

    if (providerTarget.includes('#')) throw new Error('Un target url no admite fragmentos; declara la URL exacta.')
  } else {
    if (/[\/:?#@]/u.test(raw)) throw new Error(`Un target ${kind} exige sólo hostname, sin esquema, path ni query.`)

    if (kind === 'domain' && /^www\./i.test(raw)) {
      throw new Error('Un target domain se declara sin www.; usa subdomain para el host literal www.')
    }

    providerTarget = raw.toLowerCase()
  }

  let parsed: URL

  try {
    parsed = new URL(kind === 'url' ? providerTarget : `https://${providerTarget}`)
  } catch {
    throw new Error('--target no es un hostname o URL válido.')
  }

  const authority = (kind === 'url' ? providerTarget.replace(/^https:\/\//i, '') : providerTarget).split(/[/?#]/)[0]

  if (parsed.username || parsed.password || /[:@]/u.test(authority)) {
    throw new Error('--target no admite credenciales ni puertos.')
  }

  const hostname = parsed.hostname.toLowerCase()
  const labels = hostname.split('.')

  if (
    !authority ||
    authority.toLowerCase() !== hostname ||
    labels.length < 2 ||
    hostname.length > 253 ||
    labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)) ||
    /^\d+$/u.test(labels.at(-1) ?? '')
  ) {
    throw new Error('--target exige un hostname público válido.')
  }

  return { kind, raw, providerTarget, hostname }
}

const boundedInteger = (value: number, name: string, minimum: number, maximum: number) => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} debe ser un entero entre ${minimum} y ${maximum}.`)
  }

  return value
}

export const buildDataForSeoSiteKeywordsPlan = (input: {
  target: string
  targetKind: string
  market?: string
  locale?: string
  limit?: number
  maxPages?: number
  cacheMaxAgeHours?: number
}) => {
  const subject = resolveDataForSeoSiteKeywordsSubject(input)
  const market = resolveGrowthMarket(input.market ?? 'CL', input.locale)

  if (market.locationCode === null) throw new Error(`El mercado ${market.code} no tiene location_code verificado.`)

  const limit = boundedInteger(input.limit ?? 100, '--limit', 1, 1000)
  const maxPages = boundedInteger(input.maxPages ?? 1, '--max-pages', 1, 20)
  const cacheMaxAgeHours = boundedInteger(input.cacheMaxAgeHours ?? 24, '--cache-max-age-hours', 1, 720)
  const pageEstimateUsd = Number((0.012 + 0.00012 * limit).toFixed(6))

  return {
    endpoint: DATAFORSEO_SITE_KEYWORDS_ENDPOINT,
    source: {
      provider: 'DataForSEO Labs',
      documentationUrl: 'https://docs.dataforseo.com/v3/dataforseo_labs-google-keywords_for_site-live/',
      lens: 'market_estimate',
      semantics: 'category_relevance',
      competitionMeaning: 'google_ads',
      estimatePriceVerifiedAt: '2026-09-30'
    },
    subject,
    market: market.code,
    locationCode: market.locationCode,
    languageCode: market.language,
    limit,
    maxPages,
    cacheMaxAgeHours,
    task: {
      target: subject.providerTarget,
      location_code: market.locationCode,
      language_code: market.language,
      limit,
      // Keep the most relevant ideas first. Relevance is not exposed as a numerical score.
      order_by: ['relevance,desc'],
      // Host research does not silently include additional subdomains.
      ...(subject.kind === 'url' ? {} : { include_subdomains: false }),
      include_clickstream_data: false
    },
    pageEstimateUsd,
    estimatedCostUsd: Number((maxPages * pageEstimateUsd).toFixed(6)),
    estimateBasis: 'labs_setup_plus_maximum_rows_v1' as const
  }
}

export type DataForSeoSiteKeywordsPlan = ReturnType<typeof buildDataForSeoSiteKeywordsPlan>

type DataState = 'missing' | 'null' | 'value' | 'invalid'

export type DataForSeoSiteKeywordRow = {
  keyword: string
  searchVolume: number | null
  searchVolumeState: DataState
  cpc: number | null
  competition: number | null
  competitionLevel: string | null
  categories: number[] | null
  monthlySearches: Array<{ year: number; month: number; searchVolume: number | null }> | null
  searchVolumeTrend: { monthly: number | null; quarterly: number | null; yearly: number | null } | null
  lastUpdatedTime: string | null
  taskId: string | null
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asRecords = (value: unknown): Record<string, unknown>[] =>
  (Array.isArray(value) ? value.map(asRecord).filter(Boolean) : []) as Record<string, unknown>[]

const numberOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const stringOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

/** These are relevance suggestions and Ads market metrics, never evidence of the target's ranking. */
export const normalizeDataForSeoSiteKeywordsResponse = (tasks: unknown[]): DataForSeoSiteKeywordRow[] =>
  asRecords(tasks).flatMap(task => {
    if (task.status_code !== 20000) return []

    return asRecords(task.result).flatMap(result =>
      asRecords(result.items).flatMap(item => {
        const keyword = stringOrNull(item.keyword)

        if (!keyword) return []

        const info = asRecord(item.keyword_info)
        const trend = asRecord(info?.search_volume_trend)

        const volumeState: DataState =
          !info || !Object.prototype.hasOwnProperty.call(info, 'search_volume')
            ? 'missing'
            : info.search_volume === null
              ? 'null'
              : numberOrNull(info.search_volume) === null
                ? 'invalid'
                : 'value'

        return [
          {
            keyword,
            searchVolume: numberOrNull(info?.search_volume),
            searchVolumeState: volumeState,
            cpc: numberOrNull(info?.cpc),
            competition: numberOrNull(info?.competition),
            competitionLevel: stringOrNull(info?.competition_level),
            categories: Array.isArray(info?.categories)
              ? info.categories.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
              : null,
            monthlySearches: Array.isArray(info?.monthly_searches)
              ? asRecords(info.monthly_searches).flatMap(month => {
                  const year = numberOrNull(month.year)
                  const monthNumber = numberOrNull(month.month)

                  return year !== null && monthNumber !== null
                    ? [{ year, month: monthNumber, searchVolume: numberOrNull(month.search_volume) }]
                    : []
                })
              : null,
            searchVolumeTrend: trend
              ? {
                  monthly: numberOrNull(trend.monthly),
                  quarterly: numberOrNull(trend.quarterly),
                  yearly: numberOrNull(trend.yearly)
                }
              : null,
            lastUpdatedTime: stringOrNull(info?.last_updated_time),
            taskId: stringOrNull(task.id)
          }
        ]
      })
    )
  })

/** Only result.target is provider scope evidence; request echoes do not certify returned scope. */
export const summarizeDataForSeoSiteKeywordsScope = (tasks: unknown[], subject: DataForSeoSiteKeywordsSubject) => {
  const results = asRecords(tasks)
    .filter(task => task.status_code === 20000)
    .flatMap(task => asRecords(task.result))

  const hasUnreportedTargets = results.some(result => !stringOrNull(result.target))
  const unreportedResults = results.filter(result => !stringOrNull(result.target)).length

  const returnedTargets = [
    ...new Set(
      results.flatMap(result => {
        const target = stringOrNull(result.target)

        return target ? [target] : []
      })
    )
  ]

  const mismatchTargets = returnedTargets.filter(target => target !== subject.providerTarget)

  return {
    status:
      mismatchTargets.length > 0
        ? ('mismatch' as const)
        : returnedTargets.length > 0 && !hasUnreportedTargets
          ? ('matched' as const)
          : ('unreported' as const),
    requestedTarget: subject.providerTarget,
    returnedTargets,
    hasUnreportedTargets,
    resultCount: results.length,
    unreportedResults,
    mismatchTargets
  }
}

const csvCell = (value: unknown) => {
  const text =
    value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

  // Formula-leading provider strings must remain literal in spreadsheet applications.
  const safe = /^[=+\-@\t\r]/u.test(text) ? `'${text}` : text

  return /[",\n\r]/u.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const dataForSeoSiteKeywordsRowsToCsv = (rows: DataForSeoSiteKeywordRow[]) => {
  const headers: Array<keyof DataForSeoSiteKeywordRow> = [
    'keyword',
    'searchVolume',
    'searchVolumeState',
    'cpc',
    'competition',
    'competitionLevel',
    'categories',
    'monthlySearches',
    'searchVolumeTrend',
    'lastUpdatedTime',
    'taskId'
  ]

  return (
    [headers.join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n') + '\n'
  )
}
