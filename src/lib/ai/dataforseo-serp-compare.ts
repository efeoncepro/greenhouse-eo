import { buildDataForSeoPresetPayload } from './dataforseo-cli-presets'

export type DataForSeoSerpComparePanel = {
  version: 1
  market: string
  locale?: string
  queries: string[]
  targets: string[]
  entities: DataForSeoSerpCompareEntity[]
  devices?: Array<'desktop' | 'mobile'>
  depth?: number
  loadAiOverview?: boolean
}

export type DataForSeoSerpCompareEntity = {
  id: string
  label: string
  domains: string[]
  aliases: string[]
}

export type DataForSeoSerpCompareRow = {
  query: string
  device: string
  market: string
  observedAt: string | null
  target: string
  targetLabel: string
  targetDomains: string[]
  organicStatus: 'observed' | 'not_observed_in_captured_organic'
  organicRankGroup: number | null
  organicRankAbsolute: number | null
  organicUrl: string | null
  organicTitle: string | null
  capturedOrganicCount: number
  maxCapturedOrganicRank: number | null
  aiFreshness: 'async_requested' | 'cached_provider_result'
  aiOverviewPresent: boolean
  aiDirectLink: boolean
  aiCitation: boolean
  aiMention: boolean
  shoppingObserved: boolean
  shoppingUrl: string | null
  shoppingSource: string | null
  shoppingPrice: number | null
  shoppingCurrency: string | null
  relatedSearchObserved: boolean
  signals: string[]
  taskId: string | null
  taskCostUsd: number | null
}

type JsonRecord = Record<string, unknown>

const asRecord = (value: unknown): JsonRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null

const asRecords = (value: unknown) => (Array.isArray(value) ? value.map(asRecord).filter(Boolean) as JsonRecord[] : [])

const cleanList = (value: unknown, field: string) => {
  if (!Array.isArray(value)) throw new Error(`${field} debe ser un arreglo.`)
  const items = [...new Set(value.map(item => String(item).trim()).filter(Boolean))]

  if (items.length === 0) throw new Error(`${field} no puede quedar vacío.`)

  return items
}

export const parseDataForSeoSerpComparePanel = (value: unknown): DataForSeoSerpComparePanel => {
  const panel = asRecord(value)

  if (!panel || panel.version !== 1) throw new Error('El panel SERP exige version: 1.')

  const queries = cleanList(panel.queries, 'queries')
  const targetValues = panel.targets === undefined ? [] : cleanList(panel.targets, 'targets')

  const shorthandEntities = targetValues.map(value => {
    const domain = normalizeTarget(value)
    const label = domain.split('.')[0]

    return { id: domain, label, domains: [domain], aliases: [label] }
  })

  const explicitEntities = Array.isArray(panel.entities)
    ? panel.entities.map((value, index) => parseEntity(value, index))
    : []

  const entities = [...shorthandEntities, ...explicitEntities]

  if (entities.length === 0) throw new Error('El panel exige targets o entities.')
  const targets = [...new Set(entities.flatMap(entity => entity.domains))]
  const devices = panel.devices === undefined ? ['desktop'] : cleanList(panel.devices, 'devices')

  if (queries.length > 20 || entities.length > 20) throw new Error('El panel admite hasta 20 queries y 20 entidades.')

  if (!devices.every(device => device === 'desktop' || device === 'mobile')) {
    throw new Error('devices sólo admite desktop o mobile.')
  }

  const depth = panel.depth === undefined ? 10 : Number(panel.depth)

  if (!Number.isInteger(depth) || depth < 1 || depth > 200) throw new Error('depth debe ser un entero entre 1 y 200.')

  const market = String(panel.market ?? '').trim()

  if (!market) throw new Error('El panel SERP exige market.')

  if (queries.length * devices.length > 100) throw new Error('El panel supera el máximo de 100 capturas SERP.')

  return {
    version: 1,
    market,
    ...(typeof panel.locale === 'string' && panel.locale.trim() ? { locale: panel.locale.trim() } : {}),
    queries,
    targets,
    entities,
    devices: devices as Array<'desktop' | 'mobile'>,
    depth,
    loadAiOverview: panel.loadAiOverview === true
  }
}

const parseEntity = (value: unknown, index: number): DataForSeoSerpCompareEntity => {
  const entity = asRecord(value)

  if (!entity) throw new Error(`entities[${index}] debe ser un objeto.`)
  const label = String(entity.label ?? '').trim()

  if (!label) throw new Error(`entities[${index}] exige label.`)
  const domains = cleanList(entity.domains, `entities[${index}].domains`).map(normalizeTarget)
  const aliases = entity.aliases === undefined ? [label] : cleanList(entity.aliases, `entities[${index}].aliases`)

  return {
    id: String(entity.id ?? label).trim().toLowerCase().replace(/\s+/g, '-'),
    label,
    domains,
    aliases: [...new Set([label, ...aliases].map(alias => alias.trim()).filter(Boolean))]
  }
}

export const buildDataForSeoSerpCompareTasks = (panel: DataForSeoSerpComparePanel) =>
  panel.queries.flatMap(query =>
    (panel.devices ?? ['desktop']).flatMap(device =>
      buildDataForSeoPresetPayload({
        preset: 'organic',
        keyword: query,
        market: panel.market,
        locale: panel.locale,
        device,
        depth: panel.depth ?? 10,
        loadAiOverview: panel.loadAiOverview
      }) as Record<string, unknown>[]
    )
  )

export const estimateDataForSeoSerpCompareCost = (panel: DataForSeoSerpComparePanel) => {
  const taskCount = panel.queries.length * (panel.devices ?? ['desktop']).length
  const depthMultiplier = Math.ceil((panel.depth ?? 10) / 10)
  const aiOverviewMultiplier = panel.loadAiOverview ? 2 : 1

  return Number((taskCount * 0.002 * depthMultiplier * aiOverviewMultiplier).toFixed(6))
}

const normalizeTarget = (value: string) => {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    throw new Error(`Target inválido: ${value}.`)
  }
}

const hostname = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return value.toLowerCase().replace(/^www\./, '').split('/')[0]
  }
}

const matchesTarget = (value: unknown, target: string) => {
  const domain = hostname(value)

  return domain === target || Boolean(domain?.endsWith(`.${target}`))
}

const matchesEntity = (value: unknown, entity: DataForSeoSerpCompareEntity) =>
  entity.domains.some(domain => matchesTarget(value, domain))

const mentionsEntity = (value: unknown, entity: DataForSeoSerpCompareEntity) => {
  if (typeof value !== 'string') return false
  const text = value.toLocaleLowerCase()

  return entity.aliases.some(alias => {
    const escaped = alias.toLocaleLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(text)
  })
}

const walk = (value: unknown, visit: (record: JsonRecord) => void) => {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit)

    return
  }

  const record = asRecord(value)

  if (!record) return
  visit(record)
  for (const nested of Object.values(record)) walk(nested, visit)
}

const numberOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const stringOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)

export const normalizeDataForSeoSerpCompareResponse = (input: {
  tasks: unknown[]
  panel: DataForSeoSerpComparePanel
}): DataForSeoSerpCompareRow[] => {
  const rows: DataForSeoSerpCompareRow[] = []

  for (const task of input.tasks.map(asRecord).filter(Boolean) as JsonRecord[]) {
    const taskData = asRecord(task.data) ?? {}
    const result = asRecords(task.result)[0] ?? {}
    const query = String(taskData.keyword ?? result.keyword ?? '')
    const device = String(taskData.device ?? result.device ?? 'desktop')
    const items = asRecords(result.items)
    const organic = items.filter(item => item.type === 'organic')

    const maxCapturedOrganicRank = organic.reduce<number | null>((max, item) => {
      const rank = numberOrNull(item.rank_group)

      return rank === null ? max : max === null ? rank : Math.max(max, rank)
    }, null)

    const aiOverview = items.find(item => item.type === 'ai_overview')
    const relatedSearches = items.filter(item => item.type === 'related_searches')

    for (const entity of input.panel.entities) {
      const organicMatch = organic.find(item => matchesEntity(item.domain ?? item.url, entity))
      let aiDirectLink = false
      let aiCitation = false
      let aiMention = false
      let shopping: JsonRecord | null = null
      let relatedSearchObserved = false

      walk(aiOverview, record => {
        if (mentionsEntity(record.text, entity) || mentionsEntity(record.markdown, entity)) aiMention = true

        if (matchesEntity(record.domain ?? record.url, entity)) {
          if (record.type === 'ai_overview_reference') aiCitation = true
          else if (record.type === 'link_element') aiDirectLink = true
        }
      })

      walk(items, record => {
        if (shopping || !String(record.type ?? '').includes('shopping')) return
        if (matchesEntity(record.url ?? record.domain, entity)) shopping = record
      })

      walk(relatedSearches, record => {
        const text = [record.title, record.text, record.keyword].filter(Boolean).join(' ')

        if (mentionsEntity(text, entity)) relatedSearchObserved = true
      })

      const shoppingMatch = shopping as JsonRecord | null
      const price = asRecord(shoppingMatch?.price)
      const organicObserved = Boolean(organicMatch)
      const shoppingObserved = Boolean(shopping)

      const signals = [
        ...(!organicObserved ? ['organic_not_observed'] : []),
        ...(aiDirectLink && !aiCitation ? ['ai_link_without_citation'] : []),
        ...(shoppingObserved && !organicObserved ? ['shopping_without_organic'] : []),
        ...(aiMention && !aiDirectLink && !aiCitation ? ['ai_mention_without_link_or_citation'] : []),
        ...([organicObserved, aiDirectLink || aiCitation || aiMention, shoppingObserved].filter(Boolean).length > 1
          ? ['multi_surface_presence']
          : [])
      ]

      rows.push({
        query,
        device,
        market: input.panel.market,
        observedAt: stringOrNull(result.datetime),
        target: entity.id,
        targetLabel: entity.label,
        targetDomains: entity.domains,
        organicStatus: organicObserved ? 'observed' : 'not_observed_in_captured_organic',
        organicRankGroup: numberOrNull(organicMatch?.rank_group),
        organicRankAbsolute: numberOrNull(organicMatch?.rank_absolute),
        organicUrl: stringOrNull(organicMatch?.url),
        organicTitle: stringOrNull(organicMatch?.title),
        capturedOrganicCount: organic.length,
        maxCapturedOrganicRank,
        aiFreshness: input.panel.loadAiOverview ? 'async_requested' : 'cached_provider_result',
        aiOverviewPresent: Boolean(aiOverview),
        aiDirectLink,
        aiCitation,
        aiMention,
        shoppingObserved,
        shoppingUrl: stringOrNull(shoppingMatch?.url),
        shoppingSource: stringOrNull(shoppingMatch?.source),
        shoppingPrice: numberOrNull(price?.current),
        shoppingCurrency: stringOrNull(price?.currency),
        relatedSearchObserved,
        signals,
        taskId: stringOrNull(task.id),
        taskCostUsd: numberOrNull(task.cost)
      })
    }
  }

  return rows
}

const csvCell = (value: unknown) => {
  const normalized = Array.isArray(value) ? value.join('|') : value === null || value === undefined ? '' : String(value)

  return `"${normalized.replaceAll('"', '""')}"`
}

export const dataForSeoSerpCompareRowsToCsv = (rows: DataForSeoSerpCompareRow[]) => {
  const columns = Object.keys(rows[0] ?? {}) as Array<keyof DataForSeoSerpCompareRow>

  return [columns.join(','), ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\n') + '\n'
}
