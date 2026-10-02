import {
  buildDataForSeoPresetPayload,
  DATAFORSEO_CLI_PRESETS,
  type DataForSeoCliPreset
} from '@/lib/ai/dataforseo-cli-presets'

export const DATAFORSEO_AI_RESEARCH_PANEL_VERSION = 1

const AI_RESEARCH_PRESETS = [
  'chatgpt-response',
  'claude-response',
  'gemini-response',
  'perplexity-response',
  'chatgpt-scraper',
  'gemini-scraper',
  'ai-keyword-volume',
  'llm-mentions'
] as const satisfies readonly DataForSeoCliPreset[]

export type DataForSeoAiResearchPreset = (typeof AI_RESEARCH_PRESETS)[number]

export type DataForSeoAiResearchPanel = {
  version: typeof DATAFORSEO_AI_RESEARCH_PANEL_VERSION
  name: string
  market: string
  locale?: string
  queries: string[]
  target?: string
  maxOutputTokens?: number
  lanes: Array<{
    id: string
    preset: DataForSeoAiResearchPreset
    surface: 'api' | 'consumer'
    model?: string
    platform?: 'chat_gpt' | 'google'
    webSearch?: boolean
    forceWebSearch?: boolean
    estimatedCostUsdPerTask: number
  }>
}

export type DataForSeoAiResearchRequest = {
  key: string
  laneId: string
  query: string
  platform: string
  surface: 'api' | 'consumer'
  model: string | null
  endpoint: string
  estimatedCostUsd: number
  tasks: Record<string, unknown>[]
}

export type DataForSeoAiResearchRow = {
  query: string
  platform: string
  model: string | null
  surface: 'api' | 'consumer'
  market: string
  observedAt: string
  responseText: string | null
  citations: Array<{ url: string; domain: string | null; title: string | null }>
  fanOutQueries: string[]
  brandEntities: Array<{ name: string; category: string | null; urls: string[] }>
  mentions: string[]
  taskIds: string[]
  costUsd: number
  endpoint: string
  evidenceStatus: 'observed' | 'no_data' | 'error'
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const collectRecords = (value: unknown) => {
  const records: Record<string, unknown>[] = []

  const visit = (entry: unknown) => {
    if (Array.isArray(entry)) {
      entry.forEach(visit)

      return
    }

    const record = asRecord(entry)

    if (!record) return
    records.push(record)
    Object.values(record).forEach(visit)
  }

  visit(value)

  return records
}

const cleanStrings = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map(entry => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry))

const platformForPreset = (preset: DataForSeoAiResearchPreset) => {
  if (preset.startsWith('chatgpt')) return 'chatgpt'
  if (preset.startsWith('claude')) return 'claude'
  if (preset.startsWith('gemini')) return 'gemini'
  if (preset.startsWith('perplexity')) return 'perplexity'
  if (preset === 'llm-mentions') return 'llm_mentions'

  return 'ai_keyword_data'
}

export const parseDataForSeoAiResearchPanel = (value: unknown): DataForSeoAiResearchPanel => {
  const panel = asRecord(value)

  if (!panel || panel.version !== DATAFORSEO_AI_RESEARCH_PANEL_VERSION) {
    throw new Error(`ai-research exige panel version ${DATAFORSEO_AI_RESEARCH_PANEL_VERSION}.`)
  }

  if (typeof panel.name !== 'string' || !panel.name.trim()) throw new Error('El panel AI exige name.')
  if (typeof panel.market !== 'string' || !panel.market.trim()) throw new Error('El panel AI exige market.')

  const queries = cleanStrings(panel.queries)

  if (queries.length === 0 || queries.length > 50) throw new Error('El panel AI exige entre 1 y 50 queries.')

  if (!Array.isArray(panel.lanes) || panel.lanes.length === 0 || panel.lanes.length > 20) {
    throw new Error('El panel AI exige entre 1 y 20 lanes.')
  }

  const laneIds = new Set<string>()

  const lanes: DataForSeoAiResearchPanel['lanes'] = panel.lanes.map(value => {
    const lane = asRecord(value)

    if (!lane || typeof lane.id !== 'string' || !lane.id.trim()) throw new Error('Cada lane AI exige id.')
    if (laneIds.has(lane.id)) throw new Error(`Lane AI duplicada: ${lane.id}.`)
    laneIds.add(lane.id)

    if (!AI_RESEARCH_PRESETS.includes(lane.preset as DataForSeoAiResearchPreset)) {
      throw new Error(`Preset AI no permitido en panel: ${String(lane.preset)}.`)
    }

    if (lane.surface !== 'api' && lane.surface !== 'consumer') {
      throw new Error(`La lane ${lane.id} exige surface api|consumer.`)
    }

    const surface = lane.surface

    if (typeof lane.estimatedCostUsdPerTask !== 'number' || lane.estimatedCostUsdPerTask <= 0) {
      throw new Error(`La lane ${lane.id} exige estimatedCostUsdPerTask > 0.`)
    }

    const preset = lane.preset as DataForSeoAiResearchPreset
    const isScraper = preset.endsWith('-scraper')

    if ((isScraper && surface !== 'consumer') || (!isScraper && surface === 'consumer')) {
      throw new Error(`La lane ${lane.id} no coincide con la superficie de ${preset}.`)
    }

    if (preset.endsWith('-response') && (typeof lane.model !== 'string' || !lane.model.trim())) {
      throw new Error(`La lane ${lane.id} exige un modelo explícito y versionado.`)
    }

    if (preset === 'llm-mentions' && lane.platform !== 'chat_gpt' && lane.platform !== 'google') {
      throw new Error(`La lane ${lane.id} exige platform chat_gpt|google.`)
    }

    return {
      id: lane.id,
      preset,
      surface,
      ...(typeof lane.model === 'string' ? { model: lane.model } : {}),
      ...(lane.platform === 'chat_gpt' || lane.platform === 'google' ? { platform: lane.platform } : {}),
      ...(typeof lane.webSearch === 'boolean' ? { webSearch: lane.webSearch } : {}),
      ...(typeof lane.forceWebSearch === 'boolean' ? { forceWebSearch: lane.forceWebSearch } : {}),
      estimatedCostUsdPerTask: lane.estimatedCostUsdPerTask
    }
  })

  return {
    version: DATAFORSEO_AI_RESEARCH_PANEL_VERSION,
    name: panel.name.trim(),
    market: panel.market.trim(),
    ...(typeof panel.locale === 'string' && panel.locale.trim() ? { locale: panel.locale.trim() } : {}),
    queries,
    ...(typeof panel.target === 'string' && panel.target.trim() ? { target: panel.target.trim() } : {}),
    ...(typeof panel.maxOutputTokens === 'number' ? { maxOutputTokens: panel.maxOutputTokens } : {}),
    lanes
  }
}

export const buildDataForSeoAiResearchRequests = (panel: DataForSeoAiResearchPanel) =>
  panel.lanes.flatMap<DataForSeoAiResearchRequest>(lane => {
    const preset = DATAFORSEO_CLI_PRESETS[lane.preset]
    const laneQueries = lane.preset === 'llm-mentions' && panel.target ? [panel.queries[0]] : panel.queries

    return laneQueries.map((query, queryIndex) => ({
      key: `${lane.id}:${queryIndex}`,
      laneId: lane.id,
      query,
      platform: platformForPreset(lane.preset),
      surface: lane.surface,
      model: lane.model ?? null,
      endpoint: preset.endpoint,
      estimatedCostUsd: lane.estimatedCostUsdPerTask,
      tasks: buildDataForSeoPresetPayload({
        preset: lane.preset,
        keyword: query,
        prompt: query,
        target: panel.target,
        market: panel.market,
        locale: panel.locale,
        model: lane.model,
        platform: lane.platform,
        maxOutputTokens: panel.maxOutputTokens ?? 1024,
        webSearch: lane.webSearch,
        forceWebSearch: lane.forceWebSearch
      })
    }))
  })

const safeDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export const normalizeDataForSeoAiResearchResponse = (input: {
  request: DataForSeoAiResearchRequest
  tasks: unknown[]
  market: string
  observedAt: string
  costUsd: number
}): DataForSeoAiResearchRow => {
  const records = collectRecords(input.tasks)
  const citations = new Map<string, { url: string; domain: string | null; title: string | null }>()
  const fanOutQueries = new Set<string>()
  const brandEntities = new Map<string, { name: string; category: string | null; urls: string[] }>()
  const mentions = new Set<string>()
  const responseCandidates: string[] = []
  const taskIds = new Set<string>()

  for (const record of records) {
    if (typeof record.id === 'string' && typeof record.status_code === 'number') taskIds.add(record.id)

    for (const field of ['markdown', 'answer', 'response', 'text', 'content']) {
      if (typeof record[field] === 'string' && record[field].trim()) responseCandidates.push(record[field].trim())
    }

    for (const field of ['fan_out_queries', 'fanout_queries', 'related_queries']) {
      cleanStrings(record[field]).forEach(query => fanOutQueries.add(query))
    }

    for (const field of ['mentions', 'mentioned_entities']) {
      cleanStrings(record[field]).forEach(mention => mentions.add(mention))
    }

    const url = typeof record.url === 'string' && /^https?:\/\//.test(record.url) ? record.url : null

    if (url) {
      citations.set(url, {
        url,
        domain: typeof record.domain === 'string' ? record.domain : safeDomain(url),
        title: typeof record.title === 'string' ? record.title : null
      })
    }

    const entityName =
      typeof record.brand === 'string'
        ? record.brand
        : typeof record.name === 'string' && ('category' in record || 'urls' in record)
          ? record.name
          : null

    if (entityName) {
      const urls = cleanStrings(record.urls)

      if (url) urls.push(url)
      brandEntities.set(entityName, {
        name: entityName,
        category: typeof record.category === 'string' ? record.category : null,
        urls: [...new Set(urls)].sort()
      })
    }
  }

  return {
    query: input.request.query,
    platform: input.request.platform,
    model: input.request.model,
    surface: input.request.surface,
    market: input.market,
    observedAt: input.observedAt,
    responseText: responseCandidates.sort((left, right) => right.length - left.length)[0] ?? null,
    citations: [...citations.values()].sort((left, right) => left.url.localeCompare(right.url)),
    fanOutQueries: [...fanOutQueries].sort(),
    brandEntities: [...brandEntities.values()].sort((left, right) => left.name.localeCompare(right.name)),
    mentions: [...mentions].sort(),
    taskIds: [...taskIds].sort(),
    costUsd: input.costUsd,
    endpoint: input.request.endpoint,
    evidenceStatus: records.length > 0 ? 'observed' : 'no_data'
  }
}

const csvCell = (value: unknown) => {
  const text =
    value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const dataForSeoAiResearchRowsToCsv = (rows: DataForSeoAiResearchRow[]) => {
  const headers: Array<keyof DataForSeoAiResearchRow> = [
    'query',
    'platform',
    'model',
    'surface',
    'market',
    'observedAt',
    'responseText',
    'citations',
    'fanOutQueries',
    'brandEntities',
    'mentions',
    'taskIds',
    'costUsd',
    'endpoint',
    'evidenceStatus'
  ]

  return (
    [headers.join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n') + '\n'
  )
}
