import { resolveGrowthMarket } from '@/lib/growth/markets'

export const DATAFORSEO_RESEARCH_ENDPOINTS = {
  suggestions: '/v3/dataforseo_labs/google/keyword_suggestions/live',
  related: '/v3/dataforseo_labs/google/related_keywords/live',
  ideas: '/v3/dataforseo_labs/google/keyword_ideas/live',
  site: '/v3/dataforseo_labs/google/keywords_for_site/live',
  overview: '/v3/dataforseo_labs/google/keyword_overview/live',
  serp: '/v3/serp/google/organic/live/advanced',
  serpStandardPost: '/v3/serp/google/organic/task_post',
  serpStandardGet: '/v3/serp/google/organic/task_get/advanced/$id',
  competitors: '/v3/dataforseo_labs/google/competitors_domain/live'
} as const

type DataState = 'missing' | 'null' | 'value'

export type DataForSeoResearchEvidence = {
  source: string
  endpoint: string
  taskId: string | null
  observedAt: string
  status: 'observed' | 'not_requested' | 'no_data' | 'error'
}

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
  declaredIntent: string | null
  category: string | null
  businessPriority: number | null
  existingCoverage: 'covered' | 'partial' | 'gap' | 'unknown'
  finalistApproved: boolean
  selectionReasons: string[]
  ownUrls: string[]
  competitorUrls: string[]
  competitorDomains: string[]
  serpFeatures: string[]
  paaQuestions: string[]
  aiOverviewPresent: boolean | null
  aiOverviewCitations: string[]
  evidence: DataForSeoResearchEvidence[]
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
  pageSize: number
  maxPages: number
  cacheMaxAgeHours: number
  serpMode: 'standard' | 'live'
  loadAiOverview: boolean
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
const SERP_LIVE_TASK_USD = 0.002
const SERP_STANDARD_TASK_USD = 0.0006

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asRecords = (value: unknown) =>
  (Array.isArray(value) ? value.map(asRecord).filter(Boolean) : []) as Record<string, unknown>[]

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
  pageSize?: number
  maxPages?: number
  cacheMaxAgeHours?: number
  serpMode?: 'standard' | 'live'
  loadAiOverview?: boolean
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
  const pageSize = boundedInteger(input.pageSize ?? discoveryLimit, '--page-size', 1, 1000)
  const maxPages = boundedInteger(input.maxPages ?? 1, '--max-pages', 1, 20)
  const cacheMaxAgeHours = boundedInteger(input.cacheMaxAgeHours ?? 24, '--cache-max-age-hours', 1, 720)
  const serpMode = input.serpMode ?? 'standard'

  if (serpMode !== 'standard' && serpMode !== 'live') {
    throw new Error('--serp-mode debe ser standard o live.')
  }

  const loadAiOverview = input.loadAiOverview ?? false
  const target = input.target?.trim() || null

  if (candidateLimit < seeds.length) {
    throw new Error('--candidate-limit no puede ser menor que la cantidad de seeds manuales.')
  }

  const discoveryRows = seeds.length * pageSize * maxPages
  const relatedRows = seeds.length * pageSize * maxPages
  const ideasRows = input.includeIdeas ? pageSize * maxPages : 0
  const siteRows = target ? pageSize * maxPages : 0
  const overviewRows = candidateLimit
  const competitorRows = target ? competitorLimit : 0

  const paginatedDiscoveryTaskCount =
    (seeds.length * 2 + Number(Boolean(input.includeIdeas)) + Number(Boolean(target))) * maxPages

  const labsTaskCount = paginatedDiscoveryTaskCount + 1 + Number(Boolean(target))

  const estimatedCostUsd =
    labsCost(labsTaskCount, discoveryRows + relatedRows + ideasRows + siteRows + overviewRows + competitorRows) +
    serpLimit * (serpMode === 'standard' ? SERP_STANDARD_TASK_USD : SERP_LIVE_TASK_USD) * (loadAiOverview ? 2 : 1)

  const steps: DataForSeoKeywordResearchPlan['steps'] = [
    {
      name: 'suggestions',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.suggestions,
      phase: 'discovery',
      taskCount: seeds.length * maxPages
    },
    {
      name: 'related',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.related,
      phase: 'discovery',
      taskCount: seeds.length * maxPages
    }
  ]

  if (input.includeIdeas) {
    steps.push({
      name: 'ideas',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.ideas,
      phase: 'discovery',
      taskCount: maxPages
    })
  }

  if (target) {
    steps.push({
      name: 'site',
      endpoint: DATAFORSEO_RESEARCH_ENDPOINTS.site,
      phase: 'discovery',
      taskCount: maxPages
    })
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
      endpoint:
        serpMode === 'standard' ? DATAFORSEO_RESEARCH_ENDPOINTS.serpStandardPost : DATAFORSEO_RESEARCH_ENDPOINTS.serp,
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
    pageSize,
    maxPages,
    cacheMaxAgeHours,
    serpMode,
    loadAiOverview,
    steps,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    estimateBasis: 'conservative_max_rows_v1'
  }
}

export const buildKeywordResearchDiscoveryRequests = (plan: DataForSeoKeywordResearchPlan) => {
  const common = {
    location_code: plan.locationCode,
    language_code: plan.languageCode,
    limit: plan.pageSize
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
        declaredIntent: null,
        category: null,
        businessPriority: null,
        existingCoverage: 'unknown',
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
      declaredIntent: row.declaredIntent ?? previous.declaredIntent ?? null,
      category: row.category ?? previous.category ?? null,
      businessPriority: row.businessPriority ?? previous.businessPriority ?? null,
      existingCoverage:
        !row.existingCoverage || row.existingCoverage === 'unknown'
          ? (previous.existingCoverage ?? 'unknown')
          : row.existingCoverage,
      finalistApproved: Boolean(row.finalistApproved || previous.finalistApproved),
      selectionReasons: [...new Set([...(previous.selectionReasons ?? []), ...(row.selectionReasons ?? [])])],
      ownUrls: [...new Set([...(previous.ownUrls ?? []), ...(row.ownUrls ?? [])])].sort(),
      competitorUrls: [...new Set([...(previous.competitorUrls ?? []), ...(row.competitorUrls ?? [])])].sort(),
      competitorDomains: [...new Set([...(previous.competitorDomains ?? []), ...(row.competitorDomains ?? [])])].sort(),
      serpFeatures: [...new Set([...(previous.serpFeatures ?? []), ...(row.serpFeatures ?? [])])].sort(),
      paaQuestions: [...new Set([...(previous.paaQuestions ?? []), ...(row.paaQuestions ?? [])])].sort(),
      aiOverviewPresent: row.aiOverviewPresent ?? previous.aiOverviewPresent,
      aiOverviewCitations: [
        ...new Set([...(previous.aiOverviewCitations ?? []), ...(row.aiOverviewCitations ?? [])])
      ].sort(),
      evidence: [...(previous.evidence ?? []), ...(row.evidence ?? [])],
      sources: [...new Set([...previous.sources, ...row.sources])].sort()
    })
  }

  return [...merged.values()].sort((left, right) => {
    if (left.searchVolumeState === 'value' && right.searchVolumeState !== 'value') return -1
    if (left.searchVolumeState !== 'value' && right.searchVolumeState === 'value') return 1

    return (right.searchVolume ?? -1) - (left.searchVolume ?? -1) || left.keyword.localeCompare(right.keyword)
  })
}

export const selectKeywordResearchCandidates = (rows: DataForSeoKeywordResearchRow[], limit: number) => {
  const required = rows.filter(row => row.sources.includes('manual_seed'))

  if (required.length > limit) {
    throw new Error('El límite de candidatas no alcanza para conservar todas las seeds manuales.')
  }

  const selected = new Set([
    ...required.map(row => row.normalizedKeyword),
    ...rows.filter(row => !row.sources.includes('manual_seed')).map(row => row.normalizedKeyword)
  ].slice(0, limit))

  return rows.filter(row => selected.has(row.normalizedKeyword))
}

export const buildKeywordOverviewTasks = (
  rows: DataForSeoKeywordResearchRow[],
  plan: DataForSeoKeywordResearchPlan
) => {
  const keywords = rows.slice(0, plan.candidateLimit).map(row => row.keyword)

  return keywords.length === 0 ? [] : [{ keywords, location_code: plan.locationCode, language_code: plan.languageCode }]
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
    depth: 10,
    ...(plan.loadAiOverview ? { load_async_ai_overview: true } : {})
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

export type DataForSeoKeywordFinalistInput = {
  keyword: string
  intent?: string | null
  category?: string | null
  businessPriority?: number | null
  existingCoverage?: DataForSeoKeywordResearchRow['existingCoverage']
  approved?: boolean
}

const coveragePriority: Record<DataForSeoKeywordResearchRow['existingCoverage'], number> = {
  gap: 3,
  partial: 2,
  unknown: 1,
  covered: 0
}

export const applyKeywordResearchGovernance = (
  rows: DataForSeoKeywordResearchRow[],
  inputs: DataForSeoKeywordFinalistInput[]
) => {
  const decisions = new Map(inputs.map(input => [normalizeResearchKeyword(input.keyword), input]))

  return rows.map(row => {
    const decision = decisions.get(row.normalizedKeyword)

    if (!decision) return row

    const priority = decision.businessPriority

    if (priority !== undefined && priority !== null && (!Number.isInteger(priority) || priority < 0 || priority > 5)) {
      throw new Error(`businessPriority de ${row.keyword} debe ser un entero entre 0 y 5.`)
    }

    return {
      ...row,
      declaredIntent: decision.intent?.trim() || null,
      category: decision.category?.trim() || null,
      businessPriority: priority ?? null,
      existingCoverage: decision.existingCoverage ?? row.existingCoverage,
      finalistApproved: decision.approved ?? true,
      selectionReasons: [
        ...(decision.approved === false ? ['operator_rejected'] : ['operator_approved']),
        ...(decision.intent ? ['intent_reviewed'] : []),
        ...(decision.category ? ['category_reviewed'] : []),
        ...(priority !== undefined && priority !== null ? ['business_priority_reviewed'] : []),
        ...(decision.existingCoverage ? ['coverage_reviewed'] : [])
      ]
    }
  })
}

export const selectKeywordResearchFinalists = (
  rows: DataForSeoKeywordResearchRow[],
  limit: number,
  mode: 'approved' | 'automatic'
) =>
  [...rows]
    .filter(row => mode === 'automatic' || row.finalistApproved)
    .sort((left, right) => {
      if (left.finalistApproved !== right.finalistApproved) return left.finalistApproved ? -1 : 1

      const leftIntent = Number(Boolean(left.declaredIntent || left.intent))
      const rightIntent = Number(Boolean(right.declaredIntent || right.intent))

      return (
        rightIntent - leftIntent ||
        Number(Boolean(right.category)) - Number(Boolean(left.category)) ||
        (right.businessPriority ?? -1) - (left.businessPriority ?? -1) ||
        coveragePriority[right.existingCoverage] - coveragePriority[left.existingCoverage] ||
        (right.searchVolume ?? -1) - (left.searchVolume ?? -1) ||
        left.keyword.localeCompare(right.keyword)
      )
    })
    .slice(0, limit)

const nestedRecords = (value: unknown): Record<string, unknown>[] => {
  const output: Record<string, unknown>[] = []

  const visit = (entry: unknown) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit)

      return
    }

    const record = asRecord(entry)

    if (!record) return
    output.push(record)
    Object.values(record).forEach(visit)
  }

  visit(value)

  return output
}

const urlDomain = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLocaleLowerCase('en')
  } catch {
    return null
  }
}

const targetDomain = (target: string | null) =>
  target
    ?.replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLocaleLowerCase('en') ?? null

export const enrichKeywordResearchWithSerp = (input: {
  rows: DataForSeoKeywordResearchRow[]
  tasks: unknown[]
  target: string | null
  endpoint: string
  observedAt: string
}) => {
  const byKeyword = new Map(input.rows.map(row => [row.normalizedKeyword, row]))
  const ownedDomain = targetDomain(input.target)

  for (const task of asRecords(input.tasks)) {
    const taskId = stringOrNull(task.id)
    const taskData = asRecord(task.data)

    for (const result of asRecords(task.result)) {
      const keyword = stringOrNull(result.keyword) ?? stringOrNull(taskData?.keyword)

      if (!keyword) continue

      const normalized = normalizeResearchKeyword(keyword)
      const row = byKeyword.get(normalized)

      if (!row) continue

      const records = nestedRecords(result.items)
      const features = new Set(row.serpFeatures)
      const paa = new Set(row.paaQuestions)
      const ownUrls = new Set(row.ownUrls)
      const competitorUrls = new Set(row.competitorUrls)
      const competitorDomains = new Set(row.competitorDomains)
      const citations = new Set(row.aiOverviewCitations)

      for (const item of records) {
        const type = stringOrNull(item.type)
        const url = stringOrNull(item.url)
        const title = stringOrNull(item.title)

        if (type) features.add(type)
        if ((type === 'people_also_ask' || type === 'people_also_ask_element') && title) paa.add(title)

        if (url) {
          const domain =
            stringOrNull(item.domain)
              ?.replace(/^www\./, '')
              .toLocaleLowerCase('en') ?? urlDomain(url)

          const isOwned = Boolean(
            ownedDomain && domain && (domain === ownedDomain || domain.endsWith(`.${ownedDomain}`))
          )

          if (isOwned) ownUrls.add(url)
          else {
            competitorUrls.add(url)
            if (domain) competitorDomains.add(domain)
          }

          if (type?.includes('ai_overview') || type === 'ai_overview_reference') citations.add(url)
        }
      }

      byKeyword.set(normalized, {
        ...row,
        ownUrls: [...ownUrls].sort(),
        competitorUrls: [...competitorUrls].sort(),
        competitorDomains: [...competitorDomains].sort(),
        serpFeatures: [...features].sort(),
        paaQuestions: [...paa].sort(),
        aiOverviewPresent: [...features].some(feature => feature.includes('ai_overview')),
        aiOverviewCitations: [...citations].sort(),
        evidence: [
          ...row.evidence,
          {
            source: 'serp',
            endpoint: input.endpoint,
            taskId,
            observedAt: input.observedAt,
            status: records.length > 0 ? 'observed' : 'no_data'
          }
        ],
        sources: [...new Set([...row.sources, 'serp'])].sort()
      })
    }
  }

  return input.rows.map(row => byKeyword.get(row.normalizedKeyword) ?? row)
}

export const enrichKeywordResearchWithCompetitors = (input: {
  rows: DataForSeoKeywordResearchRow[]
  tasks: unknown[]
  endpoint: string
  observedAt: string
}) => {
  const records = nestedRecords(input.tasks)
  const domains = new Set<string>()
  const urls = new Set<string>()

  const taskId =
    asRecords(input.tasks)
      .map(task => stringOrNull(task.id))
      .find(Boolean) ?? null

  for (const record of records) {
    const url = stringOrNull(record.url)

    const domain =
      stringOrNull(record.domain)
        ?.replace(/^www\./, '')
        .toLocaleLowerCase('en') ?? (url ? urlDomain(url) : null)

    if (url) urls.add(url)
    if (domain) domains.add(domain)
  }

  return input.rows.map(row => ({
    ...row,
    competitorUrls: [...new Set([...row.competitorUrls, ...urls])].sort(),
    competitorDomains: [...new Set([...row.competitorDomains, ...domains])].sort(),
    evidence: [
      ...row.evidence,
      {
        source: 'competitors',
        endpoint: input.endpoint,
        taskId,
        observedAt: input.observedAt,
        status: domains.size > 0 || urls.size > 0 ? ('observed' as const) : ('no_data' as const)
      }
    ],
    sources: [...new Set([...row.sources, 'competitors'])].sort()
  }))
}

export const extractResearchCursor = (tasks: unknown[]) => {
  for (const record of nestedRecords(tasks)) {
    if (typeof record.offset_token === 'string' && record.offset_token) {
      return { offsetToken: record.offset_token }
    }

    if (typeof record.search_after_token === 'string' && record.search_after_token) {
      return { searchAfterToken: record.search_after_token }
    }
  }

  return null
}

export const buildNextResearchPageTasks = (
  previousTasks: Record<string, unknown>[],
  cursor: ReturnType<typeof extractResearchCursor>,
  pageSize: number,
  page: number
) =>
  previousTasks.map(task => {
    if (cursor?.offsetToken) return { limit: pageSize, offset_token: cursor.offsetToken }
    if (cursor?.searchAfterToken) return { ...task, limit: pageSize, search_after_token: cursor.searchAfterToken }

    return { ...task, limit: pageSize, offset: page * pageSize }
  })

const csvCell = (value: unknown) => {
  const text =
    value === null || value === undefined
      ? ''
      : Array.isArray(value) || typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)

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
    'declaredIntent',
    'category',
    'businessPriority',
    'existingCoverage',
    'finalistApproved',
    'selectionReasons',
    'ownUrls',
    'competitorUrls',
    'competitorDomains',
    'serpFeatures',
    'paaQuestions',
    'aiOverviewPresent',
    'aiOverviewCitations',
    'evidence',
    'sources'
  ]

  return (
    [headers.join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n') + '\n'
  )
}
