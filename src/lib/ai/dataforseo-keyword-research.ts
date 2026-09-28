import { resolveGrowthMarket } from '@/lib/growth/markets'

export const DATAFORSEO_RESEARCH_ENDPOINTS = {
  suggestions: '/v3/dataforseo_labs/google/keyword_suggestions/live',
  related: '/v3/dataforseo_labs/google/related_keywords/live',
  ideas: '/v3/dataforseo_labs/google/keyword_ideas/live',
  site: '/v3/dataforseo_labs/google/keywords_for_site/live',
  overview: '/v3/dataforseo_labs/google/keyword_overview/live',
  serp: '/v3/serp/google/organic/live/advanced',
  competitors: '/v3/dataforseo_labs/google/competitors_domain/live'
} as const

type DataState = 'missing' | 'null' | 'value'

export type DataForSeoKeywordResearchRow = {
  keyword: string
  normalizedKeyword: string
  coreKeyword: string | null
  searchVolume: number | null
  searchVolumeState: DataState
  cpc: number | null
  competition: number | null
  competitionLevel: string | null
  keywordDifficulty: number | null
  intent: string | null
  sources: string[]
}

export type DataForSeoKeywordResearchPlan = {
  market: string
  locationCode: number
  languageCode: string
  seeds: string[]
  target: string | null
  discoveryLimit: number
  candidateLimit: number
  serpLimit: number
  competitorLimit: number
  includeIdeas: boolean
  steps: Array<{
    name: keyof typeof DATAFORSEO_RESEARCH_ENDPOINTS
    endpoint: string
    phase: 'discovery' | 'enrichment' | 'validation'
    taskCount: number | 'dynamic'
  }>
  estimatedCostUsd: number
  estimateBasis: string
}

const LABS_SETUP_USD = 0.012
const LABS_ROW_USD = 0.00012
const SERP_TASK_USD = 0.002

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asRecords = (value: unknown) => (Array.isArray(value) ? value.map(asRecord).filter(Boolean) : []) as Record<
  string,
  unknown
>[]

const cleanKeyword = (value: string) => value.trim().replace(/\s+/g, ' ')

export const normalizeResearchKeyword = (value: string) => cleanKeyword(value).toLocaleLowerCase('es')

export const parseResearchSeeds = (value: string) => {
  const seen = new Set<string>()

  return value
    .split(',')
    .map(cleanKeyword)
    .filter(Boolean)
    .filter(keyword => {
      const normalized = normalizeResearchKeyword(keyword)

      if (seen.has(normalized)) return false
      seen.add(normalized)

      return true
    })
}

const boundedInteger = (value: number, name: string, minimum: number, maximum: number) => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} debe ser un entero entre ${minimum} y ${maximum}.`)
  }

  return value
}

const labsCost = (taskCount: number, maximumRows: number) => taskCount * LABS_SETUP_USD + maximumRows * LABS_ROW_USD

export const buildKeywordResearchPlan = (input: {
  keyword: string
  market?: string
  locale?: string
  target?: string
  discoveryLimit?: number
  candidateLimit?: number
  serpLimit?: number
  competitorLimit?: number
  includeIdeas?: boolean
}): DataForSeoKeywordResearchPlan => {
  const seeds = parseResearchSeeds(input.keyword)

  if (seeds.length === 0) throw new Error('research exige al menos una seed en --keyword.')
  if (seeds.length > 20) throw new Error('research admite hasta 20 seeds por corrida.')

  const market = resolveGrowthMarket(input.market ?? 'CL', input.locale)

  if (market.locationCode === null) throw new Error(`El mercado ${market.code} no tiene location_code verificado.`)

  const discoveryLimit = boundedInteger(input.discoveryLimit ?? 50, '--limit', 1, 200)
  const candidateLimit = boundedInteger(input.candidateLimit ?? 500, '--candidate-limit', 1, 700)
  const serpLimit = boundedInteger(input.serpLimit ?? 10, '--serp-limit', 0, 25)
  const competitorLimit = boundedInteger(input.competitorLimit ?? 20, '--competitor-limit', 1, 100)
  const target = input.target?.trim() || null
  const discoveryRows = seeds.length * discoveryLimit
  const relatedRows = seeds.length * discoveryLimit
  const ideasRows = input.includeIdeas ? discoveryLimit : 0
  const siteRows = target ? discoveryLimit : 0
  const overviewRows = candidateLimit
  const competitorRows = target ? competitorLimit : 0

  const labsTaskCount =
    seeds.length * 2 + Number(Boolean(input.includeIdeas)) + Number(Boolean(target)) + 1 + Number(Boolean(target))

  const estimatedCostUsd =
    labsCost(labsTaskCount, discoveryRows + relatedRows + ideasRows + siteRows + overviewRows + competitorRows) +
    serpLimit * SERP_TASK_USD

  const steps: DataForSeoKeywordResearchPlan['steps'] = [
    {
      name: 'suggestions',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.suggestions,
      phase: 'discovery',
      taskCount: seeds.length
    },
    {
      name: 'related',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.related,
      phase: 'discovery',
      taskCount: seeds.length
    }
  ]

  if (input.includeIdeas) {
    steps.push({
      name: 'ideas',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.ideas,
      phase: 'discovery',
      taskCount: 1
    })
  }

  if (target) {
    steps.push({ name: 'site', endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.site, phase: 'discovery', taskCount: 1 })
  }

  steps.push({
    name: 'overview',
    endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.overview,
    phase: 'enrichment',
    taskCount: 'dynamic'
  })

  if (serpLimit > 0) {
    steps.push({
      name: 'serp',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.serp,
      phase: 'validation',
      taskCount: 'dynamic'
    })
  }

  if (target) {
    steps.push({
      name: 'competitors',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.competitors,
      phase: 'validation',
      taskCount: 1
    })
  }

  return {
    market: market.code,
    locationCode: market.locationCode,
    languageCode: market.language,
    seeds,
    target,
    discoveryLimit,
    candidateLimit,
    serpLimit,
    competitorLimit,
    includeIdeas: input.includeIdeas ?? false,
    steps,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    estimateBasis: 'conservative_max_rows_v1'
  }
}

export const buildKeywordResearchDiscoveryRequests = (plan: DataForSeoKeywordResearchPlan) => {
  const common = {
    location_code: plan.locationCode,
    language_code: plan.languageCode,
    limit: plan.discoveryLimit
  }

  return {
    suggestions: plan.seeds.map(keyword => ({ ...common, keyword, include_seed_keyword: true })),
    related: plan.seeds.map(keyword => ({ ...common, keyword, depth: 1, include_seed_keyword: true })),
    ...(plan.includeIdeas ? { ideas: [{ ...common, keywords: plan.seeds }] } : {}),
    ...(plan.target ? { site: [{ ...common, target: plan.target }] } : {})
  }
}

const readField = (record: Record<string, unknown> | null, key: string) => {
  if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return { state: 'missing' as const, value: null }
  if (record[key] === null) return { state: 'null' as const, value: null }

  return { state: 'value' as const, value: record[key] }
}

const numberOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const stringOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

const keywordItems = (responseTasks: unknown[]) => {
  const items: Record<string, unknown>[] = []

  for (const task of asRecords(responseTasks)) {
    for (const result of asRecords(task.result)) {
      items.push(...asRecords(result.items))
      items.push(...asRecords(result.seed_keyword_data))
    }
  }

  return items
}

export const extractKeywordResearchRows = (responseTasks: unknown[], source: string) =>
  keywordItems(responseTasks).flatMap<DataForSeoKeywordResearchRow>(item => {
    const keywordData = asRecord(item.keyword_data)
    const keywordInfo = asRecord(keywordData?.keyword_info) ?? asRecord(item.keyword_info)
    const properties = asRecord(keywordData?.keyword_properties) ?? asRecord(item.keyword_properties)
    const intentInfo = asRecord(keywordData?.search_intent_info) ?? asRecord(item.search_intent_info)
    const keyword = stringOrNull(keywordData?.keyword) ?? stringOrNull(item.keyword)

    if (!keyword) return []

    const volume = readField(keywordInfo, 'search_volume')

    return [
      {
        keyword,
        normalizedKeyword: normalizeResearchKeyword(keyword),
        coreKeyword: stringOrNull(properties?.core_keyword),
        searchVolume: numberOrNull(volume.value),
        searchVolumeState: volume.state,
        cpc: numberOrNull(keywordInfo?.cpc),
        competition: numberOrNull(keywordInfo?.competition),
        competitionLevel: stringOrNull(keywordInfo?.competition_level),
        keywordDifficulty: numberOrNull(properties?.keyword_difficulty),
        intent: stringOrNull(intentInfo?.main_intent),
        sources: [source]
      }
    ]
  })

const statePriority: Record<DataState, number> = { missing: 0, null: 1, value: 2 }

export const mergeKeywordResearchRows = (rows: DataForSeoKeywordResearchRow[]) => {
  const merged = new Map<string, DataForSeoKeywordResearchRow>()

  for (const row of rows) {
    const previous = merged.get(row.normalizedKeyword)

    if (!previous) {
      merged.set(row.normalizedKeyword, { ...row, sources: [...row.sources] })
      continue
    }

    const preferIncoming = statePriority[row.searchVolumeState] > statePriority[previous.searchVolumeState]

    merged.set(row.normalizedKeyword, {
      ...(preferIncoming ? { ...previous, ...row } : previous),
      coreKeyword: row.coreKeyword ?? previous.coreKeyword,
      cpc: row.cpc ?? previous.cpc,
      competition: row.competition ?? previous.competition,
      competitionLevel: row.competitionLevel ?? previous.competitionLevel,
      keywordDifficulty: row.keywordDifficulty ?? previous.keywordDifficulty,
      intent: row.intent ?? previous.intent,
      sources: [...new Set([...previous.sources, ...row.sources])].sort()
    })
  }

  return [...merged.values()].sort((left, right) => {
    if (left.searchVolumeState === 'value' && right.searchVolumeState !== 'value') return -1
    if (left.searchVolumeState !== 'value' && right.searchVolumeState === 'value') return 1

    return (right.searchVolume ?? -1) - (left.searchVolume ?? -1) || left.keyword.localeCompare(right.keyword)
  })
}

export const buildKeywordOverviewTasks = (rows: DataForSeoKeywordResearchRow[], plan: DataForSeoKeywordResearchPlan) => {
  const keywords = rows.slice(0, plan.candidateLimit).map(row => row.keyword)

  return keywords.length === 0
    ? []
    : [{ keywords, location_code: plan.locationCode, language_code: plan.languageCode }]
}

export const buildKeywordResearchValidationRequests = (
  rows: DataForSeoKeywordResearchRow[],
  plan: DataForSeoKeywordResearchPlan
) => ({
  serp: rows.slice(0, plan.serpLimit).map(row => ({
    keyword: row.keyword,
    location_code: plan.locationCode,
    language_code: plan.languageCode,
    device: 'desktop',
    depth: 10
  })),
  ...(plan.target
    ? {
        competitors: [
          {
            target: plan.target,
            location_code: plan.locationCode,
            language_code: plan.languageCode,
            item_types: ['organic'],
            exclude_top_domains: true,
            limit: plan.competitorLimit
          }
        ]
      }
    : {})
})

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : Array.isArray(value) ? value.join('|') : String(value)

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const keywordResearchRowsToCsv = (rows: DataForSeoKeywordResearchRow[]) => {
  const headers: Array<keyof DataForSeoKeywordResearchRow> = [
    'keyword',
    'normalizedKeyword',
    'coreKeyword',
    'searchVolume',
    'searchVolumeState',
    'cpc',
    'competition',
    'competitionLevel',
    'keywordDifficulty',
    'intent',
    'sources'
  ]

  return [headers.join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n') + '\n'
}
