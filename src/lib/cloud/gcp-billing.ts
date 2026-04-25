import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type {
  BillingExportAvailability,
  GcpBillingOverview,
  GcpDailyCost,
  GcpServiceCost,
  GcpServiceSpotlight
} from '@/types/billing-export'

import { getBigQueryQueryOptions } from './bigquery'

const BILLING_DATASET = 'billing_export'
const DEFAULT_DAYS = 7
const DEFAULT_CURRENCY = 'USD'

const NOTION_BQ_SYNC_SERVICE_HINTS = ['Cloud Run', 'Cloud Logging', 'Cloud Monitoring']
const NOTION_BQ_SYNC_LABEL_KEY = 'cloud-run-resource-name'
const NOTION_BQ_SYNC_LABEL_VALUE = 'notion-bq-sync'

const SPOTLIGHT_SERVICES = {
  cloudRun: ['Cloud Run', 'Cloud Run Functions'],
  bigQuery: ['BigQuery', 'BigQuery Storage API', 'BigQuery Reservation API'],
  cloudSql: ['Cloud SQL']
}

const CACHE_TTL_MS = 30 * 60 * 1000

interface CachedOverview {
  fetchedAt: number
  days: number
  overview: GcpBillingOverview
}

let cache: CachedOverview | null = null

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return safeNumber((value as { value?: unknown }).value)
  }

  return 0
}

const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object' && 'value' in value) {
    const raw = (value as { value?: unknown }).value

    return typeof raw === 'string' ? raw : ''
  }

  return ''
}

const buildPeriod = (days: number) => {
  const today = new Date()
  const start = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    days
  }
}

const buildEmpty = (
  availability: BillingExportAvailability,
  days: number,
  notes: string[],
  options: { error?: string; tableName?: string | null } = {}
): GcpBillingOverview => ({
  availability,
  generatedAt: new Date().toISOString(),
  period: buildPeriod(days),
  totalCost: 0,
  currency: DEFAULT_CURRENCY,
  costByDay: [],
  costByService: [],
  spotlights: {
    cloudRun: null,
    bigQuery: null,
    cloudSql: null,
    notionBqSync: null
  },
  source: {
    dataset: BILLING_DATASET,
    table: options.tableName ?? null,
    latestUsageDate: null
  },
  notes,
  error: options.error ?? null
})

const detectBillingTable = async (projectId: string): Promise<string | null> => {
  const bigQuery = getBigQueryClient()

  try {
    const [rows] = await bigQuery.query({
      query: `
        SELECT table_name
        FROM \`${projectId}.${BILLING_DATASET}.INFORMATION_SCHEMA.TABLES\`
        WHERE table_name LIKE 'gcp_billing_export_v1%'
          AND table_name NOT LIKE 'gcp_billing_export_resource_v1%'
        ORDER BY table_name
        LIMIT 1
      `,
      ...getBigQueryQueryOptions()
    })

    const tableName = (rows as Array<{ table_name?: string }>)[0]?.table_name

    return typeof tableName === 'string' && tableName.length > 0 ? tableName : null
  } catch (error) {
    if (isDatasetNotFound(error)) {
      return null
    }

    throw error
  }
}

const isDatasetNotFound = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const message = (error as { message?: string }).message ?? ''
  const code = (error as { code?: number }).code

  return code === 404 || /Not found: Dataset/i.test(message) || /not found/i.test(message)
}

const computeShare = (cost: number, total: number): number => {
  if (total <= 0) return 0

  return Math.round((cost / total) * 1000) / 10
}

const buildSpotlight = (
  costByService: GcpServiceCost[],
  hints: string[],
  total: number
): GcpServiceSpotlight | null => {
  const matches = costByService.filter(item =>
    hints.some(hint => item.serviceDescription.toLowerCase().includes(hint.toLowerCase()))
  )

  if (matches.length === 0) return null

  const aggregateCost = matches.reduce((sum, item) => sum + item.cost, 0)

  return {
    serviceDescription: matches.map(m => m.serviceDescription).join(' · '),
    cost: aggregateCost,
    share: computeShare(aggregateCost, total)
  }
}

const detectNotionBqSyncCost = async (
  projectId: string,
  tableName: string,
  days: number,
  totalCost: number
): Promise<GcpBillingOverview['spotlights']['notionBqSync']> => {
  const bigQuery = getBigQueryClient()

  try {
    const [rows] = await bigQuery.query({
      query: `
        SELECT
          COALESCE(SUM(cost), 0) AS notion_cost
        FROM \`${projectId}.${BILLING_DATASET}.${tableName}\`,
          UNNEST(labels) AS label
        WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
          AND label.key = @labelKey
          AND label.value = @labelValue
      `,
      params: {
        days,
        labelKey: NOTION_BQ_SYNC_LABEL_KEY,
        labelValue: NOTION_BQ_SYNC_LABEL_VALUE
      },
      ...getBigQueryQueryOptions()
    })

    const labelCost = safeNumber((rows as Array<{ notion_cost?: unknown }>)[0]?.notion_cost)

    if (labelCost > 0) {
      return {
        cost: labelCost,
        share: computeShare(labelCost, totalCost),
        detected: true,
        detectionStrategy: 'label_cloud_run_service'
      }
    }
  } catch (error) {
    if (!isDatasetNotFound(error)) {
      console.warn('[gcp-billing] notion-bq-sync label probe failed', {
        error: (error as Error).message
      })
    }
  }

  // Fallback: rough proxy via Cloud Run/Logging/Monitoring spend, flagged as imprecise.
  try {
    const [rows] = await bigQuery.query({
      query: `
        SELECT
          COALESCE(SUM(cost), 0) AS approx_cost
        FROM \`${projectId}.${BILLING_DATASET}.${tableName}\`
        WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
          AND service.description IN UNNEST(@services)
      `,
      params: {
        days,
        services: NOTION_BQ_SYNC_SERVICE_HINTS
      },
      ...getBigQueryQueryOptions()
    })

    const approxCost = safeNumber((rows as Array<{ approx_cost?: unknown }>)[0]?.approx_cost)

    if (approxCost > 0) {
      return {
        cost: approxCost,
        share: computeShare(approxCost, totalCost),
        detected: false,
        detectionStrategy: 'service_description'
      }
    }
  } catch (error) {
    if (!isDatasetNotFound(error)) {
      console.warn('[gcp-billing] notion-bq-sync service probe failed', {
        error: (error as Error).message
      })
    }
  }

  return {
    cost: 0,
    share: 0,
    detected: false,
    detectionStrategy: 'unavailable'
  }
}

interface BillingRow {
  service_description?: unknown
  service_id?: unknown
  cost?: unknown
  usage_date?: unknown
  currency?: unknown
}

export const getGcpBillingOverview = async ({
  days = DEFAULT_DAYS,
  forceRefresh = false
}: { days?: number; forceRefresh?: boolean } = {}): Promise<GcpBillingOverview> => {
  if (!forceRefresh && cache && cache.days === days && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.overview
  }

  const projectId = getBigQueryProjectId()

  if (!projectId) {
    return buildEmpty('not_configured', days, ['No hay project ID configurado para BigQuery.'])
  }

  let tableName: string | null = null

  try {
    tableName = await detectBillingTable(projectId)
  } catch (error) {
    return buildEmpty('error', days, [], { error: (error as Error).message })
  }

  if (!tableName) {
    const overview = buildEmpty(
      'awaiting_data',
      days,
      [
        'Billing Export aún no materializa tablas en BigQuery. Latencia natural post-enable: ~24h.',
        'La UI rinde datos automáticamente cuando el dataset reciba sus primeras filas.'
      ],
      { tableName: null }
    )

    cache = { fetchedAt: Date.now(), days, overview }

    return overview
  }

  const bigQuery = getBigQueryClient()

  try {
    const [serviceRows] = await bigQuery.query({
      query: `
        SELECT
          service.id AS service_id,
          service.description AS service_description,
          SUM(cost) AS cost,
          ANY_VALUE(currency) AS currency
        FROM \`${projectId}.${BILLING_DATASET}.${tableName}\`
        WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
          AND cost IS NOT NULL
        GROUP BY service_id, service_description
        HAVING cost > 0
        ORDER BY cost DESC
        LIMIT 25
      `,
      params: { days },
      ...getBigQueryQueryOptions()
    })

    const [dailyRows] = await bigQuery.query({
      query: `
        SELECT
          DATE(usage_start_time) AS usage_date,
          SUM(cost) AS cost,
          ANY_VALUE(currency) AS currency
        FROM \`${projectId}.${BILLING_DATASET}.${tableName}\`
        WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
          AND cost IS NOT NULL
        GROUP BY usage_date
        ORDER BY usage_date ASC
      `,
      params: { days },
      ...getBigQueryQueryOptions()
    })

    const services = (serviceRows as BillingRow[]).map<GcpServiceCost>(row => ({
      serviceId: safeString(row.service_id),
      serviceDescription: safeString(row.service_description) || 'Servicio sin nombre',
      cost: safeNumber(row.cost)
    }))

    const dailies = (dailyRows as BillingRow[]).map<GcpDailyCost>(row => ({
      date: safeString(row.usage_date),
      totalCost: safeNumber(row.cost)
    }))

    const totalCost = services.reduce((sum, item) => sum + item.cost, 0)

    const currency = safeString(
      (serviceRows as BillingRow[])[0]?.currency
    ) || safeString((dailyRows as BillingRow[])[0]?.currency) || DEFAULT_CURRENCY

    if (services.length === 0 && dailies.length === 0) {
      const overview = buildEmpty(
        'awaiting_data',
        days,
        ['Tabla detectada pero sin filas en el período observado.'],
        { tableName }
      )

      cache = { fetchedAt: Date.now(), days, overview }

      return overview
    }

    const notionSpotlight = await detectNotionBqSyncCost(projectId, tableName, days, totalCost)

    const overview: GcpBillingOverview = {
      availability: 'configured',
      generatedAt: new Date().toISOString(),
      period: buildPeriod(days),
      totalCost,
      currency,
      costByDay: dailies,
      costByService: services,
      spotlights: {
        cloudRun: buildSpotlight(services, SPOTLIGHT_SERVICES.cloudRun, totalCost),
        bigQuery: buildSpotlight(services, SPOTLIGHT_SERVICES.bigQuery, totalCost),
        cloudSql: buildSpotlight(services, SPOTLIGHT_SERVICES.cloudSql, totalCost),
        notionBqSync: notionSpotlight
      },
      source: {
        dataset: BILLING_DATASET,
        table: tableName,
        latestUsageDate: dailies.length > 0 ? dailies[dailies.length - 1].date : null
      },
      notes: [
        `Período: ${days} días terminando hoy.`,
        'Billing Export tiene latencia natural ~24h. El dato más reciente puede no incluir el día actual.'
      ],
      error: null
    }

    cache = { fetchedAt: Date.now(), days, overview }

    return overview
  } catch (error) {
    if (isDatasetNotFound(error)) {
      const overview = buildEmpty('awaiting_data', days, [
        'Tabla detectada inicialmente pero query falló con dataset/table not found.'
      ])

      cache = { fetchedAt: Date.now(), days, overview }

      return overview
    }

    return buildEmpty('error', days, [], {
      error: (error as Error).message,
      tableName
    })
  }
}

export const __resetGcpBillingCacheForTesting = () => {
  cache = null
}
