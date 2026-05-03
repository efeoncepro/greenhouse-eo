import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getLatestCloudCostAiObservation } from '@/lib/cloud/finops-ai/persist'
import type {
  BillingExportAvailability,
  GcpBillingForecast,
  GcpBillingOverview,
  GcpCostDriver,
  GcpDailyCost,
  GcpResourceCost,
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
const COST_DRIVER_ANALYSIS_DAYS = 30
const RECENT_WINDOW_DAYS = 7
const DEFAULT_MONTHLY_WARNING_CLP = 100_000
const DEFAULT_MONTHLY_ERROR_CLP = 135_000

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
  options: { error?: string; tableName?: string | null; resourceTableName?: string | null } = {}
): GcpBillingOverview => ({
  availability,
  generatedAt: new Date().toISOString(),
  period: buildPeriod(days),
  totalCost: 0,
  currency: DEFAULT_CURRENCY,
  costByDay: [],
  costByService: [],
  costByResource: [],
  topDrivers: [],
  forecast: null,
  spotlights: {
    cloudRun: null,
    bigQuery: null,
    cloudSql: null,
    notionBqSync: null
  },
  source: {
    dataset: BILLING_DATASET,
    table: options.tableName ?? null,
    resourceTable: options.resourceTableName ?? null,
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

const detectResourceBillingTable = async (projectId: string): Promise<string | null> => {
  const bigQuery = getBigQueryClient()

  try {
    const [rows] = await bigQuery.query({
      query: `
        SELECT table_name
        FROM \`${projectId}.${BILLING_DATASET}.INFORMATION_SCHEMA.TABLES\`
        WHERE table_name LIKE 'gcp_billing_export_resource_v1%'
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

const roundMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

const formatCost = (value: number, currency: string): string => {
  const rounded = value >= 100 ? Math.round(value) : roundMoney(value)

  return `${currency} ${rounded.toLocaleString('es-CL')}`
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64) || 'unknown'

const toDateString = (value: unknown): string => {
  const raw = safeString(value)

  if (!raw) return ''

  return raw.slice(0, 10)
}

const getMonthBounds = (reference = new Date()) => {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1))
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0))

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    daysInMonth: end.getUTCDate()
  }
}

const getForecastThresholds = (currency: string) => {
  const envWarning = Number(process.env.CLOUD_COST_MONTHLY_WARNING_AMOUNT)
  const envError = Number(process.env.CLOUD_COST_MONTHLY_ERROR_AMOUNT)
  const fallbackWarning = currency.toUpperCase() === 'CLP' ? DEFAULT_MONTHLY_WARNING_CLP : 100
  const fallbackError = currency.toUpperCase() === 'CLP' ? DEFAULT_MONTHLY_ERROR_CLP : 135

  return {
    warning: Number.isFinite(envWarning) && envWarning > 0 ? envWarning : fallbackWarning,
    error: Number.isFinite(envError) && envError > 0 ? envError : fallbackError
  }
}

const buildForecast = (dailies: GcpDailyCost[], currency: string): GcpBillingForecast | null => {
  const { startDate, endDate, daysInMonth } = getMonthBounds()
  const today = new Date().toISOString().slice(0, 10)
  const completeMonthDays = dailies.filter(day => day.date >= startDate && day.date < today)
  const completeDays = dailies.filter(day => day.date < today)

  const recentCutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const recentDays = completeDays.filter(day => day.date >= recentCutoff)

  const sourceDays =
    completeMonthDays.length >= RECENT_WINDOW_DAYS
      ? completeMonthDays
      : recentDays.length >= 3
        ? recentDays
        : completeDays

  if (sourceDays.length === 0) {
    return {
      monthStartDate: startDate,
      monthEndDate: endDate,
      observedCompleteDays: 0,
      observedCost: 0,
      averageDailyCost: 0,
      monthEndCost: 0,
      method: 'unavailable',
      confidence: 'low',
      note: 'Forecast no disponible: Billing Export aún no tiene días completos para proyectar.'
    }
  }

  const observedCost = sourceDays.reduce((sum, day) => sum + day.totalCost, 0)
  const averageDailyCost = observedCost / sourceDays.length
  const confidence = sourceDays.length >= 7 ? 'high' : sourceDays.length >= 3 ? 'medium' : 'low'

  const method =
    completeMonthDays.length >= RECENT_WINDOW_DAYS
      ? 'current_month_daily_average'
      : 'rolling_period_average'

  const thresholds = getForecastThresholds(currency)

  return {
    monthStartDate: startDate,
    monthEndDate: endDate,
    observedCompleteDays: sourceDays.length,
    observedCost: roundMoney(observedCost),
    averageDailyCost: roundMoney(averageDailyCost),
    monthEndCost: roundMoney(averageDailyCost * daysInMonth),
    method,
    confidence,
    note: `Proyección determinística por promedio diario; umbrales activos ${formatCost(
      thresholds.warning,
      currency
    )}/${formatCost(thresholds.error, currency)}.`
  }
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

type ServiceDailyRow = BillingRow

interface ResourceRow {
  service_description?: unknown
  sku_description?: unknown
  project_id?: unknown
  resource_name?: unknown
  cost?: unknown
  first_usage_date?: unknown
  last_usage_date?: unknown
}

const buildResourceCosts = (rows: ResourceRow[], totalCost: number): GcpResourceCost[] =>
  rows.map(row => ({
    serviceDescription: safeString(row.service_description) || 'Servicio sin nombre',
    skuDescription: safeString(row.sku_description) || 'SKU sin nombre',
    projectId: safeString(row.project_id) || null,
    resourceName: safeString(row.resource_name) || 'Recurso sin nombre',
    cost: roundMoney(safeNumber(row.cost)),
    share: computeShare(safeNumber(row.cost), totalCost),
    firstUsageDate: toDateString(row.first_usage_date) || null,
    lastUsageDate: toDateString(row.last_usage_date) || null
  }))

const enrichServices = (
  services: GcpServiceCost[],
  serviceDailyRows: ServiceDailyRow[],
  resources: GcpResourceCost[],
  totalCost: number
): GcpServiceCost[] => {
  const today = new Date().toISOString().slice(0, 10)

  const recentCutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const dailyByService = new Map<string, Array<{ date: string; cost: number }>>()

  for (const row of serviceDailyRows) {
    const service = safeString(row.service_description) || 'Servicio sin nombre'
    const date = toDateString(row.usage_date)

    if (!date || date >= today) continue

    const entries = dailyByService.get(service) ?? []

    entries.push({ date, cost: safeNumber(row.cost) })
    dailyByService.set(service, entries)
  }

  return services.map(service => {
    const entries = dailyByService.get(service.serviceDescription) ?? []
    const recent = entries.filter(day => day.date >= recentCutoff)
    const baseline = entries.filter(day => day.date < recentCutoff)
    const baselineSource = baseline.length > 0 ? baseline : entries

    const recentDailyCost =
      recent.length > 0 ? recent.reduce((sum, day) => sum + day.cost, 0) / recent.length : 0

    const baselineDailyCost =
      baselineSource.length > 0
        ? baselineSource.reduce((sum, day) => sum + day.cost, 0) / baselineSource.length
        : 0

    const deltaPercent =
      baselineDailyCost > 0 ? ((recentDailyCost - baselineDailyCost) / baselineDailyCost) * 100 : null

    return {
      ...service,
      cost: roundMoney(service.cost),
      share: computeShare(service.cost, totalCost),
      baselineDailyCost: roundMoney(baselineDailyCost),
      recentDailyCost: roundMoney(recentDailyCost),
      deltaPercent: deltaPercent === null ? null : Math.round(deltaPercent),
      topResources: resources
        .filter(resource => resource.serviceDescription === service.serviceDescription)
        .slice(0, 5)
    }
  })
}

const buildCostDrivers = (
  services: GcpServiceCost[],
  resources: GcpResourceCost[],
  forecast: GcpBillingForecast | null,
  totalCost: number,
  currency: string
): GcpCostDriver[] => {
  const drivers: GcpCostDriver[] = []
  const thresholds = getForecastThresholds(currency)

  if (forecast && forecast.monthEndCost >= thresholds.warning) {
    const severity = forecast.monthEndCost >= thresholds.error ? 'error' : 'warning'

    drivers.push({
      driverId: 'forecast.month_end_cost',
      kind: 'forecast_risk',
      severity,
      serviceDescription: 'GCP total',
      resourceName: null,
      summary: `El mes proyecta ${formatCost(forecast.monthEndCost, currency)} con ${forecast.confidence} confianza.`,
      currentCost: forecast.monthEndCost,
      baselineCost: thresholds.warning,
      deltaPercent: null,
      share: 100,
      threshold: `${formatCost(thresholds.warning, currency)} warning / ${formatCost(
        thresholds.error,
        currency
      )} error`,
      evidence: [
        { label: 'Promedio diario', value: formatCost(forecast.averageDailyCost, currency) },
        { label: 'Días completos observados', value: String(forecast.observedCompleteDays) }
      ]
    })
  }

  for (const service of services.slice(0, 10)) {
    const deltaPercent = service.deltaPercent ?? null
    const baseline = service.baselineDailyCost ?? 0
    const recent = service.recentDailyCost ?? 0
    const absoluteDelta = recent - baseline

    if (deltaPercent !== null && deltaPercent >= 100 && absoluteDelta >= 500) {
      const severity = deltaPercent >= 200 && absoluteDelta >= 1000 ? 'error' : 'warning'

      drivers.push({
        driverId: `service_spike.${slugify(service.serviceDescription)}`,
        kind: 'service_spike',
        severity,
        serviceDescription: service.serviceDescription,
        resourceName: service.topResources?.[0]?.resourceName ?? null,
        summary: `${service.serviceDescription} subió ${deltaPercent}% vs baseline diario.`,
        currentCost: recent,
        baselineCost: baseline,
        deltaPercent,
        share: service.share ?? computeShare(service.cost, totalCost),
        threshold: '>=100% y >= CLP/USD 500 de delta diario',
        evidence: [
          { label: 'Promedio reciente', value: formatCost(recent, currency) },
          { label: 'Baseline diario', value: formatCost(baseline, currency) },
          { label: 'Costo período', value: formatCost(service.cost, currency) }
        ]
      })
    }

    const share = service.share ?? computeShare(service.cost, totalCost)

    if (share >= 50) {
      drivers.push({
        driverId: `share_of_total.${slugify(service.serviceDescription)}`,
        kind: 'share_of_total',
        severity: share >= 65 ? 'error' : 'warning',
        serviceDescription: service.serviceDescription,
        resourceName: service.topResources?.[0]?.resourceName ?? null,
        summary: `${service.serviceDescription} concentra ${share}% del gasto cloud observado.`,
        currentCost: service.cost,
        baselineCost: totalCost,
        deltaPercent: null,
        share,
        threshold: '>=50% del total observado',
        evidence: [
          { label: 'Costo servicio', value: formatCost(service.cost, currency) },
          { label: 'Total período', value: formatCost(totalCost, currency) }
        ]
      })
    }
  }

  for (const resource of resources.slice(0, 5)) {
    if (resource.share < 15) continue

    drivers.push({
      driverId: `resource_driver.${slugify(resource.serviceDescription)}.${slugify(resource.resourceName)}`,
      kind: 'resource_driver',
      severity: resource.share >= 25 ? 'error' : 'warning',
      serviceDescription: resource.serviceDescription,
      resourceName: resource.resourceName,
      summary: `${resource.resourceName} concentra ${resource.share}% del costo observado en ${resource.serviceDescription}.`,
      currentCost: resource.cost,
      baselineCost: null,
      deltaPercent: null,
      share: resource.share,
      threshold: '>=15% del total observado',
      evidence: [
        { label: 'SKU', value: resource.skuDescription },
        { label: 'Costo recurso', value: formatCost(resource.cost, currency) },
        { label: 'Último uso', value: resource.lastUsageDate ?? 'sin dato' }
      ]
    })
  }

  const rank = { error: 0, warning: 1, ok: 2 } satisfies Record<GcpCostDriver['severity'], number>

  return drivers
    .sort((a, b) => rank[a.severity] - rank[b.severity] || b.currentCost - a.currentCost)
    .slice(0, 8)
}

export const getGcpBillingOverview = async ({
  days = DEFAULT_DAYS,
  forceRefresh = false,
  includeAiCopilot = false
}: { days?: number; forceRefresh?: boolean; includeAiCopilot?: boolean } = {}): Promise<GcpBillingOverview> => {
  if (
    !includeAiCopilot &&
    !forceRefresh &&
    cache &&
    cache.days === days &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return cache.overview
  }

  const projectId = getBigQueryProjectId()

  if (!projectId) {
    return buildEmpty('not_configured', days, ['No hay project ID configurado para BigQuery.'])
  }

  let tableName: string | null = null
  let resourceTableName: string | null = null

  try {
    tableName = await detectBillingTable(projectId)
    resourceTableName = await detectResourceBillingTable(projectId)
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
    const analysisDays = Math.max(days, COST_DRIVER_ANALYSIS_DAYS)

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

    const [serviceDailyRows] = await bigQuery.query({
      query: `
        SELECT
          DATE(usage_start_time) AS usage_date,
          service.id AS service_id,
          service.description AS service_description,
          SUM(cost) AS cost,
          ANY_VALUE(currency) AS currency
        FROM \`${projectId}.${BILLING_DATASET}.${tableName}\`
        WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @analysisDays DAY)
          AND cost IS NOT NULL
        GROUP BY usage_date, service_id, service_description
        ORDER BY usage_date ASC
      `,
      params: { analysisDays },
      ...getBigQueryQueryOptions()
    })

    const resourceRows = resourceTableName
      ? await bigQuery
          .query({
            query: `
              SELECT
                service.description AS service_description,
                sku.description AS sku_description,
                project.id AS project_id,
                COALESCE(resource.name, resource.global_name, '') AS resource_name,
                SUM(cost) AS cost,
                MIN(DATE(usage_start_time)) AS first_usage_date,
                MAX(DATE(usage_start_time)) AS last_usage_date
              FROM \`${projectId}.${BILLING_DATASET}.${resourceTableName}\`
              WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
                AND cost IS NOT NULL
              GROUP BY service_description, sku_description, project_id, resource_name
              HAVING cost > 0
              ORDER BY cost DESC
              LIMIT 30
            `,
            params: { days },
            ...getBigQueryQueryOptions()
          })
          .then(([rows]) => rows as ResourceRow[])
      : []

    const baseServices = (serviceRows as BillingRow[]).map<GcpServiceCost>(row => ({
      serviceId: safeString(row.service_id),
      serviceDescription: safeString(row.service_description) || 'Servicio sin nombre',
      cost: safeNumber(row.cost)
    }))

    const dailies = (dailyRows as BillingRow[]).map<GcpDailyCost>(row => ({
      date: toDateString(row.usage_date),
      totalCost: roundMoney(safeNumber(row.cost))
    }))

    const totalCost = roundMoney(baseServices.reduce((sum, item) => sum + item.cost, 0))

    const currency = safeString(
      (serviceRows as BillingRow[])[0]?.currency
    ) || safeString((dailyRows as BillingRow[])[0]?.currency) || DEFAULT_CURRENCY

    const resources = buildResourceCosts(resourceRows, totalCost)

    const services = enrichServices(
      baseServices,
      serviceDailyRows as ServiceDailyRow[],
      resources,
      totalCost
    )

    const forecast = buildForecast(dailies, currency)
    const topDrivers = buildCostDrivers(services, resources, forecast, totalCost, currency)

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
      costByResource: resources,
      topDrivers,
      forecast,
      aiCopilot: includeAiCopilot
        ? await getLatestCloudCostAiObservation()
            .then(observation =>
              observation
                ? {
                    severity: observation.severity,
                    executiveSummary: observation.executiveSummary,
                    recommendedActions: observation.recommendedActions,
                    attackPriority: observation.attackPriority,
                    confidence: observation.confidence,
                    observedAt: observation.observedAt,
                    model: observation.model
                  }
                : null
            )
            .catch(error => {
              console.warn('[gcp-billing] latest cloud cost AI observation unavailable', {
                error: (error as Error).message
              })

              return null
            })
        : null,
      spotlights: {
        cloudRun: buildSpotlight(services, SPOTLIGHT_SERVICES.cloudRun, totalCost),
        bigQuery: buildSpotlight(services, SPOTLIGHT_SERVICES.bigQuery, totalCost),
        cloudSql: buildSpotlight(services, SPOTLIGHT_SERVICES.cloudSql, totalCost),
        notionBqSync: notionSpotlight
      },
      source: {
        dataset: BILLING_DATASET,
        table: tableName,
        resourceTable: resourceTableName,
        latestUsageDate: dailies.length > 0 ? dailies[dailies.length - 1].date : null
      },
      notes: [
        `Período: ${days} días terminando hoy.`,
        'Billing Export tiene latencia natural ~24h. El dato más reciente puede no incluir el día actual.',
        resourceTableName
          ? 'Resource-level Billing Export disponible: se identifican recursos/SKUs que explican el gasto.'
          : 'Resource-level Billing Export no detectado: se muestran drivers por servicio, sin desglose por recurso.'
      ],
      error: null
    }

    if (!includeAiCopilot) {
      cache = { fetchedAt: Date.now(), days, overview }
    }

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
