import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'
import type {
  GitHubBillingActionsOverview,
  GitHubBillingAvailability,
  GitHubBillingDailyCost,
  GitHubBillingForecast,
  GitHubBillingGuardrails,
  GitHubBillingOverview,
  GitHubBillingPeriod,
  GitHubBillingProductCost,
  GitHubBillingRepositoryCost,
  GitHubBillingSkuCost,
  GitHubBillingThresholdStatus
} from '@/types/github-billing'

const GITHUB_BILLING_BASE_URL = 'https://api.github.com/organizations'
const GITHUB_API_VERSION = '2026-03-10'
const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_CURRENCY = 'USD'
const RECENT_WINDOW_DAYS = 7

interface CachedOverview {
  cacheKey: string
  fetchedAt: number
  overview: GitHubBillingOverview
}

interface GitHubUsageItem {
  date?: unknown
  product?: unknown
  sku?: unknown
  quantity?: unknown
  unitType?: unknown
  pricePerUnit?: unknown
  grossAmount?: unknown
  discountAmount?: unknown
  netAmount?: unknown
  organizationName?: unknown
  repositoryName?: unknown
}

interface GitHubSummaryItem {
  product?: unknown
  sku?: unknown
  unitType?: unknown
  pricePerUnit?: unknown
  grossQuantity?: unknown
  grossAmount?: unknown
  discountQuantity?: unknown
  discountAmount?: unknown
  netQuantity?: unknown
  netAmount?: unknown
}

interface GitHubUsageResponse {
  usageItems?: GitHubUsageItem[]
}

interface GitHubSummaryResponse {
  usageItems?: GitHubSummaryItem[]
}

export interface GitHubBillingOptions {
  year?: number
  month?: number
  day?: number
  repository?: string
  product?: string
  sku?: string
  forceRefresh?: boolean
}

let cache: CachedOverview | null = null

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const safeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const roundMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0

  return Math.round(value * 100) / 100
}

const computeShare = (cost: number, total: number): number => {
  if (total <= 0) return 0

  return Math.round((cost / total) * 1000) / 10
}

const readPositiveEnvNumber = (name: string): number | null => {
  const parsed = Number(process.env[name])

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const buildGuardrailConfig = (): Pick<
  GitHubBillingGuardrails,
  'monthlyWarnUsd' | 'monthlyCriticalUsd' | 'dailySpikePct'
> => ({
  monthlyWarnUsd: readPositiveEnvNumber('GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD'),
  monthlyCriticalUsd: readPositiveEnvNumber('GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD'),
  dailySpikePct: readPositiveEnvNumber('GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT')
})

const formatUsd = (value: number): string => `USD ${roundMoney(value).toLocaleString('es-CL')}`

const toDateString = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

const isValidYear = (year: number | undefined): year is number =>
  Number.isInteger(year) && year >= 2020 && year <= 2100

const isValidMonth = (month: number | undefined): month is number =>
  Number.isInteger(month) && month >= 1 && month <= 12

const isValidDay = (year: number, month: number, day: number | undefined): day is number =>
  Number.isInteger(day) && day >= 1 && day <= daysInMonth(year, month)

const buildPeriod = (options: GitHubBillingOptions = {}, reference = new Date()): GitHubBillingPeriod => {
  const currentYear = reference.getUTCFullYear()
  const currentMonth = reference.getUTCMonth() + 1
  const year = isValidYear(options.year) ? options.year : currentYear
  const month = isValidMonth(options.month) ? options.month : currentMonth
  const day = isValidDay(year, month, options.day) ? options.day : null
  const monthDays = daysInMonth(year, month)

  if (day !== null) {
    const date = toDateString(year, month, day)

    return {
      year,
      month,
      day,
      startDate: date,
      endDate: date,
      days: 1,
      daysInMonth: monthDays
    }
  }

  const isCurrentMonth = year === currentYear && month === currentMonth
  const observedEndDay = isCurrentMonth ? reference.getUTCDate() : monthDays

  return {
    year,
    month,
    day: null,
    startDate: toDateString(year, month, 1),
    endDate: toDateString(year, month, observedEndDay),
    days: observedEndDay,
    daysInMonth: monthDays
  }
}

const buildEmpty = (
  availability: GitHubBillingAvailability,
  period: GitHubBillingPeriod,
  notes: string[],
  options: {
    error?: string | null
    org?: string | null
    tokenSource?: SecretResolutionSource
  } = {}
): GitHubBillingOverview => ({
  availability,
  generatedAt: new Date().toISOString(),
  period,
  totalGrossAmount: 0,
  totalDiscountAmount: 0,
  totalNetAmount: 0,
  currency: DEFAULT_CURRENCY,
  daily: [],
  byProduct: [],
  bySku: [],
  byRepository: [],
  actions: {
    grossAmount: 0,
    discountAmount: 0,
    netAmount: 0,
    minutes: null,
    storageGigabyteHours: null,
    topSku: null,
    topRepository: null
  },
  forecast: null,
  guardrails: {
    ...buildGuardrailConfig(),
    spikeDetected: false,
    spikeSeverity: 'unconfigured',
    spikeSummary: null,
    baselineDailyGrossAmount: null,
    maxDayGrossAmount: null
  },
  source: {
    provider: 'github',
    org: options.org ?? null,
    endpoint: '/organizations/{org}/settings/billing/usage',
    summaryEndpoint: '/organizations/{org}/settings/billing/usage/summary',
    apiVersion: GITHUB_API_VERSION,
    tokenSource: options.tokenSource ?? 'unconfigured',
    latestUsageDate: null
  },
  notes,
  error: options.error ?? null
})

const normalizeFilter = (value: string | undefined): string | null => {
  const normalized = value?.trim().toLowerCase()

  return normalized ? normalized : null
}

const itemMatchesFilters = (item: GitHubUsageItem, options: GitHubBillingOptions): boolean => {
  const repository = normalizeFilter(options.repository)
  const product = normalizeFilter(options.product)
  const sku = normalizeFilter(options.sku)

  if (repository && safeString(item.repositoryName).toLowerCase() !== repository) return false
  if (product && safeString(item.product).toLowerCase() !== product) return false
  if (sku && safeString(item.sku).toLowerCase() !== sku) return false

  return true
}

const maxDateString = (current: string | null, next: string): string => {
  if (!current) return next

  return next > current ? next : current
}

const addMoney = <T extends { grossAmount: number; discountAmount: number; netAmount: number }>(
  map: Map<string, T>,
  key: string,
  initial: Omit<T, 'grossAmount' | 'discountAmount' | 'netAmount'>,
  grossAmount: number,
  discountAmount: number,
  netAmount: number
) => {
  const current = map.get(key) ?? ({
    ...initial,
    grossAmount: 0,
    discountAmount: 0,
    netAmount: 0
  } as T)

  current.grossAmount += grossAmount
  current.discountAmount += discountAmount
  current.netAmount += netAmount
  map.set(key, current)
}

const sortAndRound = <T extends { grossAmount: number; discountAmount: number; netAmount: number; share?: number }>(
  rows: T[],
  total: number
): T[] =>
  rows
    .map(row => ({
      ...row,
      grossAmount: roundMoney(row.grossAmount),
      discountAmount: roundMoney(row.discountAmount),
      netAmount: roundMoney(row.netAmount),
      share: computeShare(row.grossAmount, total)
    }))
    .sort((left, right) => right.grossAmount - left.grossAmount)

const buildForecast = (
  period: GitHubBillingPeriod,
  dailies: GitHubBillingDailyCost[],
  guardrails: Pick<GitHubBillingGuardrails, 'monthlyWarnUsd' | 'monthlyCriticalUsd'>
): GitHubBillingForecast | null => {
  if (period.day !== null) return null

  const today = new Date().toISOString().slice(0, 10)
  const completeDays = dailies.filter(day => day.date < today)

  if (completeDays.length === 0) {
    return {
      monthStartDate: period.startDate,
      monthEndDate: toDateString(period.year, period.month, period.daysInMonth),
      observedCompleteDays: 0,
      observedGrossAmount: 0,
      observedNetAmount: 0,
      averageDailyGrossAmount: 0,
      averageDailyNetAmount: 0,
      monthEndGrossAmount: 0,
      monthEndNetAmount: 0,
      method: 'unavailable',
      confidence: 'low',
      thresholdStatus: 'unconfigured',
      note: 'Forecast no disponible: GitHub Billing aun no tiene dias completos para proyectar.'
    }
  }

  const recentCutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)
  const recentDays = completeDays.filter(day => day.date >= recentCutoff)
  const sourceDays = recentDays.length >= 3 ? recentDays : completeDays
  const observedGrossAmount = sourceDays.reduce((sum, day) => sum + day.grossAmount, 0)
  const observedNetAmount = sourceDays.reduce((sum, day) => sum + day.netAmount, 0)
  const averageDailyGrossAmount = observedGrossAmount / sourceDays.length
  const averageDailyNetAmount = observedNetAmount / sourceDays.length
  const monthEndGrossAmount = averageDailyGrossAmount * period.daysInMonth
  const monthEndNetAmount = averageDailyNetAmount * period.daysInMonth
  const confidence = sourceDays.length >= 7 ? 'high' : sourceDays.length >= 3 ? 'medium' : 'low'

  let thresholdStatus: GitHubBillingThresholdStatus = 'unconfigured'

  if (guardrails.monthlyCriticalUsd !== null && monthEndNetAmount >= guardrails.monthlyCriticalUsd) {
    thresholdStatus = 'critical'
  } else if (guardrails.monthlyWarnUsd !== null && monthEndNetAmount >= guardrails.monthlyWarnUsd) {
    thresholdStatus = 'warning'
  } else if (guardrails.monthlyWarnUsd !== null || guardrails.monthlyCriticalUsd !== null) {
    thresholdStatus = 'ok'
  }

  const thresholdNote =
    thresholdStatus === 'unconfigured'
      ? 'Sin umbrales GREENHOUSE_GITHUB_BILLING_MONTHLY_* configurados; forecast informativo.'
      : `Umbrales activos: warning ${guardrails.monthlyWarnUsd ? formatUsd(guardrails.monthlyWarnUsd) : 'n/a'} / critical ${
          guardrails.monthlyCriticalUsd ? formatUsd(guardrails.monthlyCriticalUsd) : 'n/a'
        }.`

  return {
    monthStartDate: period.startDate,
    monthEndDate: toDateString(period.year, period.month, period.daysInMonth),
    observedCompleteDays: sourceDays.length,
    observedGrossAmount: roundMoney(observedGrossAmount),
    observedNetAmount: roundMoney(observedNetAmount),
    averageDailyGrossAmount: roundMoney(averageDailyGrossAmount),
    averageDailyNetAmount: roundMoney(averageDailyNetAmount),
    monthEndGrossAmount: roundMoney(monthEndGrossAmount),
    monthEndNetAmount: roundMoney(monthEndNetAmount),
    method: 'current_month_daily_average',
    confidence,
    thresholdStatus,
    note: `Proyeccion deterministica por promedio diario sobre netAmount. ${thresholdNote}`
  }
}

const buildSpikeGuardrail = (
  dailies: GitHubBillingDailyCost[],
  dailySpikePct: number | null
): Pick<
  GitHubBillingGuardrails,
  'spikeDetected' | 'spikeSeverity' | 'spikeSummary' | 'baselineDailyGrossAmount' | 'maxDayGrossAmount'
> => {
  if (dailySpikePct === null) {
    return {
      spikeDetected: false,
      spikeSeverity: 'unconfigured',
      spikeSummary: null,
      baselineDailyGrossAmount: null,
      maxDayGrossAmount: null
    }
  }

  const completeDays = dailies.filter(day => day.date < new Date().toISOString().slice(0, 10))

  if (completeDays.length < 2) {
    return {
      spikeDetected: false,
      spikeSeverity: 'ok',
      spikeSummary: null,
      baselineDailyGrossAmount: null,
      maxDayGrossAmount: null
    }
  }

  const maxDay = completeDays.reduce((winner, day) => (day.grossAmount > winner.grossAmount ? day : winner))
  const baselineDays = completeDays.filter(day => day.date !== maxDay.date)

  const baseline =
    baselineDays.length > 0 ? baselineDays.reduce((sum, day) => sum + day.grossAmount, 0) / baselineDays.length : 0

  if (baseline <= 0) {
    return {
      spikeDetected: false,
      spikeSeverity: 'ok',
      spikeSummary: null,
      baselineDailyGrossAmount: roundMoney(baseline),
      maxDayGrossAmount: roundMoney(maxDay.grossAmount)
    }
  }

  const deltaPct = ((maxDay.grossAmount - baseline) / baseline) * 100
  const spikeDetected = deltaPct >= dailySpikePct

  return {
    spikeDetected,
    spikeSeverity: spikeDetected ? (deltaPct >= dailySpikePct * 2 ? 'critical' : 'warning') : 'ok',
    spikeSummary: spikeDetected
      ? `${maxDay.date}: ${formatUsd(maxDay.grossAmount)} gross (${Math.round(deltaPct)}% sobre baseline diario).`
      : null,
    baselineDailyGrossAmount: roundMoney(baseline),
    maxDayGrossAmount: roundMoney(maxDay.grossAmount)
  }
}

const buildSummarySkuRows = (items: GitHubSummaryItem[], totalGrossAmount: number): GitHubBillingSkuCost[] =>
  sortAndRound(
    items.map(item => ({
      sku: safeString(item.sku) || 'Unclassified',
      product: safeString(item.product) || 'GitHub',
      unitType: safeString(item.unitType) || null,
      quantity: safeNumber(item.grossQuantity),
      grossAmount: safeNumber(item.grossAmount),
      discountAmount: safeNumber(item.discountAmount),
      netAmount: safeNumber(item.netAmount),
      share: 0
    })),
    totalGrossAmount
  )

const buildActionsOverview = (
  bySku: GitHubBillingSkuCost[],
  byRepository: GitHubBillingRepositoryCost[]
): GitHubBillingActionsOverview => {
  const actionSkus = bySku.filter(row => row.product.toLowerCase().includes('actions'))
  const grossAmount = roundMoney(actionSkus.reduce((sum, row) => sum + row.grossAmount, 0))
  const discountAmount = roundMoney(actionSkus.reduce((sum, row) => sum + row.discountAmount, 0))
  const netAmount = roundMoney(actionSkus.reduce((sum, row) => sum + row.netAmount, 0))

  const minutes = actionSkus
    .filter(row => row.unitType?.toLowerCase().includes('minute'))
    .reduce((sum, row) => sum + row.quantity, 0)

  const storageGigabyteHours = actionSkus
    .filter(row => row.unitType?.toLowerCase().includes('gigabyte'))
    .reduce((sum, row) => sum + row.quantity, 0)

  return {
    grossAmount,
    discountAmount,
    netAmount,
    minutes: minutes > 0 ? Math.round(minutes * 100) / 100 : null,
    storageGigabyteHours: storageGigabyteHours > 0 ? Math.round(storageGigabyteHours * 100) / 100 : null,
    topSku: actionSkus[0]?.sku ?? null,
    topRepository: byRepository[0]?.repositoryName ?? null
  }
}

export const aggregateGitHubBillingUsage = (
  usageItems: GitHubUsageItem[],
  summaryItems: GitHubSummaryItem[],
  period: GitHubBillingPeriod,
  source: Pick<GitHubBillingOverview['source'], 'org' | 'tokenSource'>,
  options: GitHubBillingOptions = {}
): GitHubBillingOverview => {
  const filteredUsage = usageItems.filter(item => itemMatchesFilters(item, options))
  const daily = new Map<string, GitHubBillingDailyCost>()
  const products = new Map<string, GitHubBillingProductCost>()
  const skus = new Map<string, GitHubBillingSkuCost>()
  const repositories = new Map<string, GitHubBillingRepositoryCost>()
  const guardrailConfig = buildGuardrailConfig()
  let latestUsageDate: string | null = null

  for (const item of filteredUsage) {
    const date = safeString(item.date).slice(0, 10)

    if (!date) continue

    const grossAmount = safeNumber(item.grossAmount)
    const discountAmount = safeNumber(item.discountAmount)
    const netAmount = safeNumber(item.netAmount)

    latestUsageDate = maxDateString(latestUsageDate, date)
    addMoney(daily, date, { date }, grossAmount, discountAmount, netAmount)

    const product = safeString(item.product) || 'GitHub'

    addMoney(products, product, { product, share: 0 }, grossAmount, discountAmount, netAmount)

    const sku = safeString(item.sku) || 'Unclassified'
    const unitType = safeString(item.unitType) || null
    const skuKey = `${product}|${sku}|${unitType ?? ''}`
    const currentSku = skus.get(skuKey)

    addMoney(skus, skuKey, { sku, product, unitType, quantity: 0, share: 0 }, grossAmount, discountAmount, netAmount)
    const nextSku = skus.get(skuKey)

    if (nextSku && nextSku !== currentSku) {
      nextSku.quantity += safeNumber(item.quantity)
    } else if (nextSku) {
      nextSku.quantity += safeNumber(item.quantity)
    }

    const repositoryName = safeString(item.repositoryName) || 'Repositorio sin detalle'

    addMoney(repositories, repositoryName, { repositoryName, share: 0 }, grossAmount, discountAmount, netAmount)
  }

  const costByDay = Array.from(daily.values())
    .map(day => ({
      ...day,
      grossAmount: roundMoney(day.grossAmount),
      discountAmount: roundMoney(day.discountAmount),
      netAmount: roundMoney(day.netAmount)
    }))
    .sort((left, right) => left.date.localeCompare(right.date))

  const totalGrossAmount = roundMoney(costByDay.reduce((sum, day) => sum + day.grossAmount, 0))
  const totalDiscountAmount = roundMoney(costByDay.reduce((sum, day) => sum + day.discountAmount, 0))
  const totalNetAmount = roundMoney(costByDay.reduce((sum, day) => sum + day.netAmount, 0))
  const byRepository = sortAndRound(Array.from(repositories.values()), totalGrossAmount).slice(0, 12)
  const byProduct = sortAndRound(Array.from(products.values()), totalGrossAmount).slice(0, 12)
  const summaryBySku = buildSummarySkuRows(summaryItems, totalGrossAmount).slice(0, 12)

  const bySku =
    summaryBySku.length > 0
      ? summaryBySku
      : sortAndRound(Array.from(skus.values()), totalGrossAmount).slice(0, 12)

  const forecast = buildForecast(period, costByDay, guardrailConfig)
  const spikeGuardrail = buildSpikeGuardrail(costByDay, guardrailConfig.dailySpikePct)
  const hasUsage = filteredUsage.length > 0 || summaryItems.length > 0

  return {
    availability: hasUsage ? 'configured' : 'awaiting_data',
    generatedAt: new Date().toISOString(),
    period,
    totalGrossAmount,
    totalDiscountAmount,
    totalNetAmount,
    currency: DEFAULT_CURRENCY,
    daily: costByDay,
    byProduct,
    bySku,
    byRepository,
    actions: buildActionsOverview(bySku, byRepository),
    forecast,
    guardrails: {
      ...guardrailConfig,
      ...spikeGuardrail
    },
    source: {
      provider: 'github',
      org: source.org,
      endpoint: '/organizations/{org}/settings/billing/usage',
      summaryEndpoint: '/organizations/{org}/settings/billing/usage/summary',
      apiVersion: GITHUB_API_VERSION,
      tokenSource: source.tokenSource,
      latestUsageDate
    },
    notes: hasUsage
      ? [
          'Lectura read-only desde GitHub Billing Usage API; sin persistencia propia en Greenhouse V1.',
          'GitHub puede descontar cuota incluida: grossAmount muestra consumo bruto y netAmount el impacto facturable.'
        ]
      : ['GitHub Billing respondio sin usage items para el periodo solicitado. Esto puede ser latencia o ausencia real de uso.'],
    error: null
  }
}

const buildUsageUrl = (org: string, period: GitHubBillingPeriod): string => {
  const params = new URLSearchParams({
    year: String(period.year),
    month: String(period.month)
  })

  if (period.day !== null) params.set('day', String(period.day))

  return `${GITHUB_BILLING_BASE_URL}/${encodeURIComponent(org)}/settings/billing/usage?${params.toString()}`
}

const buildSummaryUrl = (org: string, period: GitHubBillingPeriod, options: GitHubBillingOptions): string => {
  const params = new URLSearchParams({
    year: String(period.year),
    month: String(period.month)
  })

  if (period.day !== null) params.set('day', String(period.day))
  if (options.repository?.trim()) params.set('repository', options.repository.trim())
  if (options.product?.trim()) params.set('product', options.product.trim())
  if (options.sku?.trim()) params.set('sku', options.sku.trim())

  return `${GITHUB_BILLING_BASE_URL}/${encodeURIComponent(org)}/settings/billing/usage/summary?${params.toString()}`
}

const fetchJson = async <T>(url: string, token: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'greenhouse-github-billing-observer'
    }
  })

  if (!response.ok) {
    throw new Error(`github_billing_http_${response.status}`)
  }

  return (await response.json()) as T
}

export const getGitHubBillingOverview = async (
  options: GitHubBillingOptions = {}
): Promise<GitHubBillingOverview> => {
  const period = buildPeriod(options)
  const tokenResolution = await resolveSecret({ envVarName: 'GREENHOUSE_GITHUB_BILLING_TOKEN' })
  const org = process.env.GREENHOUSE_GITHUB_BILLING_ORG?.trim() || null

  const cacheKey = [
    period.year,
    period.month,
    period.day ?? '',
    org ?? '',
    options.repository ?? '',
    options.product ?? '',
    options.sku ?? '',
    tokenResolution.source
  ].join('|')

  const now = Date.now()

  if (!options.forceRefresh && cache && cache.cacheKey === cacheKey && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.overview
  }

  if (!tokenResolution.value || !org) {
    return buildEmpty(
      'not_configured',
      period,
      [
        'Configurar GREENHOUSE_GITHUB_BILLING_TOKEN o GREENHOUSE_GITHUB_BILLING_TOKEN_SECRET_REF.',
        'Configurar GREENHOUSE_GITHUB_BILLING_ORG con la organizacion que recibe el cobro.'
      ],
      {
        org,
        tokenSource: tokenResolution.source
      }
    )
  }

  try {
    const [usage, summary] = await Promise.all([
      fetchJson<GitHubUsageResponse>(buildUsageUrl(org, period), tokenResolution.value),
      fetchJson<GitHubSummaryResponse>(buildSummaryUrl(org, period, options), tokenResolution.value)
    ])

    const overview = aggregateGitHubBillingUsage(
      Array.isArray(usage.usageItems) ? usage.usageItems : [],
      Array.isArray(summary.usageItems) ? summary.usageItems : [],
      period,
      {
        org,
        tokenSource: tokenResolution.source
      },
      options
    )

    cache = {
      cacheKey,
      fetchedAt: now,
      overview
    }

    return overview
  } catch (error) {
    const message = error instanceof Error ? error.message : 'github_billing_unknown_error'
    const status = message.match(/github_billing_http_(\d+)/)?.[1]

    const note =
      status === '401' || status === '403'
        ? 'Token GitHub sin permisos suficientes para Billing Usage API.'
        : status === '404'
          ? 'GitHub Billing Usage API no esta disponible para el scope configurado.'
          : 'No se pudo leer GitHub Billing Usage API.'

    return buildEmpty('error', period, [note], {
      error: status ? `github_billing_http_${status}` : 'github_billing_fetch_failed',
      org,
      tokenSource: tokenResolution.source
    })
  }
}

export const __resetGitHubBillingCacheForTesting = (): void => {
  cache = null
}
