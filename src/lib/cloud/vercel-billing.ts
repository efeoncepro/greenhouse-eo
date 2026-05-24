import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'
import type {
  VercelBillingAvailability,
  VercelBillingCategoryCost,
  VercelBillingDailyCost,
  VercelBillingForecast,
  VercelBillingGuardrails,
  VercelBillingOverview,
  VercelBillingPeriod,
  VercelBillingProjectCost,
  VercelBillingServiceCost,
  VercelBillingThresholdStatus
} from '@/types/vercel-billing'

const VERCEL_BILLING_ENDPOINT = 'https://api.vercel.com/v1/billing/charges'
const DEFAULT_DAYS = 30
const MAX_DAYS = 366
const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_CURRENCY = 'USD'
const RECENT_WINDOW_DAYS = 7

type JsonRecord = Record<string, unknown>

interface CachedOverview {
  cacheKey: string
  fetchedAt: number
  overview: VercelBillingOverview
}

interface VercelFocusCharge {
  BilledCost?: unknown
  BillingCurrency?: unknown
  ChargeCategory?: unknown
  ChargePeriodStart?: unknown
  EffectiveCost?: unknown
  ServiceName?: unknown
  ServiceCategory?: unknown
  Tags?: unknown
}

export interface VercelBillingOptions {
  days?: number
  from?: string
  to?: string
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

const clampDays = (days: number | undefined): number => {
  if (!days || !Number.isFinite(days) || days <= 0) return DEFAULT_DAYS

  return Math.min(Math.floor(days), MAX_DAYS)
}

const toIsoDateTime = (date: Date): string => date.toISOString()

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const parseDateInput = (raw: string | undefined): Date | null => {
  if (!raw) return null

  const parsed = new Date(raw)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const diffDays = (from: Date, to: Date): number => {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()

  return Math.max(1, Math.ceil(ms / 86_400_000))
}

const buildPeriod = (options: VercelBillingOptions = {}): VercelBillingPeriod => {
  const explicitFrom = parseDateInput(options.from)
  const explicitTo = parseDateInput(options.to)
  const to = explicitTo ? startOfUtcDay(explicitTo) : startOfUtcDay(new Date())

  if (!explicitTo) {
    to.setUTCDate(to.getUTCDate() + 1)
  }

  const days = clampDays(options.days)
  const from = explicitFrom ?? new Date(to.getTime() - days * 86_400_000)
  const clampedDays = Math.min(diffDays(from, to), MAX_DAYS)
  const clampedFrom = new Date(to.getTime() - clampedDays * 86_400_000)

  const startDate = (explicitFrom && diffDays(explicitFrom, to) <= MAX_DAYS ? explicitFrom : clampedFrom)
    .toISOString()
    .slice(0, 10)

  const endDate = to.toISOString().slice(0, 10)

  return {
    startDate,
    endDate,
    days: diffDays(new Date(`${startDate}T00:00:00.000Z`), new Date(`${endDate}T00:00:00.000Z`))
  }
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

const readPositiveEnvNumber = (name: string): number | null => {
  const parsed = Number(process.env[name])

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const buildGuardrailConfig = (): Pick<
  VercelBillingGuardrails,
  'monthlyWarnUsd' | 'monthlyCriticalUsd' | 'dailySpikePct'
> => ({
  monthlyWarnUsd: readPositiveEnvNumber('GREENHOUSE_VERCEL_BILLING_MONTHLY_WARN_USD'),
  monthlyCriticalUsd: readPositiveEnvNumber('GREENHOUSE_VERCEL_BILLING_MONTHLY_CRITICAL_USD'),
  dailySpikePct: readPositiveEnvNumber('GREENHOUSE_VERCEL_BILLING_DAILY_SPIKE_PCT')
})

const formatUsd = (value: number): string => `USD ${roundMoney(value).toLocaleString('es-CL')}`

const maxDateString = (current: string | null, next: string): string => {
  if (!current) return next

  return next > current ? next : current
}

const buildEmpty = (
  availability: VercelBillingAvailability,
  period: VercelBillingPeriod,
  notes: string[],
  options: {
    error?: string | null
    tokenSource?: SecretResolutionSource
    teamId?: string | null
    teamSlug?: string | null
  } = {}
): VercelBillingOverview => ({
  availability,
  generatedAt: new Date().toISOString(),
  period,
  totalBilledCost: 0,
  totalEffectiveCost: 0,
  currency: DEFAULT_CURRENCY,
  costByDay: [],
  costByService: [],
  costByProject: [],
  costByCategory: [],
  forecast: null,
  guardrails: {
    ...buildGuardrailConfig(),
    spikeDetected: false,
    spikeSeverity: 'unconfigured',
    spikeSummary: null,
    baselineDailyBilledCost: null,
    maxDayCost: null
  },
  source: {
    endpoint: '/v1/billing/charges',
    focusVersion: '1.3',
    teamId: options.teamId ?? null,
    teamSlug: options.teamSlug ?? null,
    tokenSource: options.tokenSource ?? 'unconfigured',
    latestChargeDate: null
  },
  notes,
  error: options.error ?? null
})

export const parseVercelFocusJsonl = (body: string): VercelFocusCharge[] => {
  const lines = body
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  return lines.map((line, index) => {
    try {
      const parsed = JSON.parse(line)

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('line is not a JSON object')
      }

      return parsed as VercelFocusCharge
    } catch (error) {
      throw new Error(
        `Invalid Vercel Billing JSONL at line ${index + 1}: ${
          error instanceof Error ? error.message : 'unknown_error'
        }`
      )
    }
  })
}

const getTagValue = (tags: unknown, keys: string[]): string => {
  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) return ''

  const record = tags as JsonRecord

  for (const key of keys) {
    const direct = safeString(record[key])

    if (direct) return direct

    const lowerMatch = Object.entries(record).find(([entryKey]) => entryKey.toLowerCase() === key.toLowerCase())
    const value = lowerMatch ? safeString(lowerMatch[1]) : ''

    if (value) return value
  }

  return ''
}

const addCost = <T extends { billedCost: number; effectiveCost: number }>(
  map: Map<string, T>,
  key: string,
  initial: Omit<T, 'billedCost' | 'effectiveCost'>,
  billedCost: number,
  effectiveCost: number
) => {
  const current = map.get(key) ?? ({
    ...initial,
    billedCost: 0,
    effectiveCost: 0
  } as T)

  current.billedCost += billedCost
  current.effectiveCost += effectiveCost
  map.set(key, current)
}

const sortAndRound = <T extends { billedCost: number; effectiveCost: number; share?: number }>(
  rows: T[],
  total: number
): T[] =>
  rows
    .map(row => ({
      ...row,
      billedCost: roundMoney(row.billedCost),
      effectiveCost: roundMoney(row.effectiveCost),
      share: computeShare(row.billedCost, total)
    }))
    .sort((left, right) => right.billedCost - left.billedCost)

const buildForecast = (
  dailies: VercelBillingDailyCost[],
  guardrails: Pick<VercelBillingGuardrails, 'monthlyWarnUsd' | 'monthlyCriticalUsd'>
): VercelBillingForecast | null => {
  const { startDate, endDate, daysInMonth } = getMonthBounds()
  const today = new Date().toISOString().slice(0, 10)
  const completeMonthDays = dailies.filter(day => day.date >= startDate && day.date < today)
  const completeDays = dailies.filter(day => day.date < today)
  const recentCutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)
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
      observedBilledCost: 0,
      observedEffectiveCost: 0,
      averageDailyBilledCost: 0,
      averageDailyEffectiveCost: 0,
      monthEndBilledCost: 0,
      monthEndEffectiveCost: 0,
      method: 'unavailable',
      confidence: 'low',
      thresholdStatus: 'unconfigured',
      note: 'Forecast no disponible: Vercel Billing aun no tiene dias completos para proyectar.'
    }
  }

  const observedBilledCost = sourceDays.reduce((sum, day) => sum + day.billedCost, 0)
  const observedEffectiveCost = sourceDays.reduce((sum, day) => sum + day.effectiveCost, 0)
  const averageDailyBilledCost = observedBilledCost / sourceDays.length
  const averageDailyEffectiveCost = observedEffectiveCost / sourceDays.length
  const monthEndBilledCost = averageDailyBilledCost * daysInMonth
  const confidence = sourceDays.length >= 7 ? 'high' : sourceDays.length >= 3 ? 'medium' : 'low'

  const method =
    completeMonthDays.length >= RECENT_WINDOW_DAYS
      ? 'current_month_daily_average'
      : 'rolling_period_average'

  let thresholdStatus: VercelBillingThresholdStatus = 'unconfigured'

  if (guardrails.monthlyCriticalUsd !== null && monthEndBilledCost >= guardrails.monthlyCriticalUsd) {
    thresholdStatus = 'critical'
  } else if (guardrails.monthlyWarnUsd !== null && monthEndBilledCost >= guardrails.monthlyWarnUsd) {
    thresholdStatus = 'warning'
  } else if (guardrails.monthlyWarnUsd !== null || guardrails.monthlyCriticalUsd !== null) {
    thresholdStatus = 'ok'
  }

  const thresholdNote =
    thresholdStatus === 'unconfigured'
      ? 'Sin umbrales GREENHOUSE_VERCEL_BILLING_MONTHLY_* configurados; forecast informativo.'
      : `Umbrales activos: warning ${guardrails.monthlyWarnUsd ? formatUsd(guardrails.monthlyWarnUsd) : 'n/a'} / critical ${
          guardrails.monthlyCriticalUsd ? formatUsd(guardrails.monthlyCriticalUsd) : 'n/a'
        }.`

  return {
    monthStartDate: startDate,
    monthEndDate: endDate,
    observedCompleteDays: sourceDays.length,
    observedBilledCost: roundMoney(observedBilledCost),
    observedEffectiveCost: roundMoney(observedEffectiveCost),
    averageDailyBilledCost: roundMoney(averageDailyBilledCost),
    averageDailyEffectiveCost: roundMoney(averageDailyEffectiveCost),
    monthEndBilledCost: roundMoney(monthEndBilledCost),
    monthEndEffectiveCost: roundMoney(averageDailyEffectiveCost * daysInMonth),
    method,
    confidence,
    thresholdStatus,
    note: `Proyeccion deterministica por promedio diario. ${thresholdNote}`
  }
}

const buildSpikeGuardrail = (
  dailies: VercelBillingDailyCost[],
  dailySpikePct: number | null
): Pick<
  VercelBillingGuardrails,
  'spikeDetected' | 'spikeSeverity' | 'spikeSummary' | 'baselineDailyBilledCost' | 'maxDayCost'
> => {
  if (dailySpikePct === null) {
    return {
      spikeDetected: false,
      spikeSeverity: 'unconfigured',
      spikeSummary: null,
      baselineDailyBilledCost: null,
      maxDayCost: null
    }
  }

  const completeDays = dailies.filter(day => day.date < new Date().toISOString().slice(0, 10))

  if (completeDays.length < 2) {
    return {
      spikeDetected: false,
      spikeSeverity: 'ok',
      spikeSummary: null,
      baselineDailyBilledCost: null,
      maxDayCost: null
    }
  }

  const maxDay = completeDays.reduce((winner, day) => (day.billedCost > winner.billedCost ? day : winner))
  const baselineDays = completeDays.filter(day => day.date !== maxDay.date)

  const baseline =
    baselineDays.length > 0 ? baselineDays.reduce((sum, day) => sum + day.billedCost, 0) / baselineDays.length : 0

  if (baseline <= 0) {
    return {
      spikeDetected: false,
      spikeSeverity: 'ok',
      spikeSummary: null,
      baselineDailyBilledCost: roundMoney(baseline),
      maxDayCost: roundMoney(maxDay.billedCost)
    }
  }

  const deltaPct = ((maxDay.billedCost - baseline) / baseline) * 100
  const spikeDetected = deltaPct >= dailySpikePct

  return {
    spikeDetected,
    spikeSeverity: spikeDetected ? (deltaPct >= dailySpikePct * 2 ? 'critical' : 'warning') : 'ok',
    spikeSummary: spikeDetected
      ? `${maxDay.date}: ${formatUsd(maxDay.billedCost)} (${Math.round(deltaPct)}% sobre baseline diario).`
      : null,
    baselineDailyBilledCost: roundMoney(baseline),
    maxDayCost: roundMoney(maxDay.billedCost)
  }
}

const aggregateCharges = (
  charges: VercelFocusCharge[],
  period: VercelBillingPeriod,
  source: Pick<VercelBillingOverview['source'], 'teamId' | 'teamSlug' | 'tokenSource'>
): VercelBillingOverview => {
  const daily = new Map<string, VercelBillingDailyCost>()
  const services = new Map<string, VercelBillingServiceCost>()
  const projects = new Map<string, VercelBillingProjectCost>()
  const categories = new Map<string, VercelBillingCategoryCost>()
  const guardrailConfig = buildGuardrailConfig()
  let currency = DEFAULT_CURRENCY
  let latestChargeDate: string | null = null

  for (const charge of charges) {
    const billedCost = safeNumber(charge.BilledCost)
    const effectiveCost = safeNumber(charge.EffectiveCost)
    const date = safeString(charge.ChargePeriodStart).slice(0, 10)

    if (!date) continue

    currency = safeString(charge.BillingCurrency) || currency
    latestChargeDate = maxDateString(latestChargeDate, date)

    addCost(
      daily,
      date,
      { date },
      billedCost,
      effectiveCost
    )

    const serviceName = safeString(charge.ServiceName) || 'Vercel service'
    const serviceCategory = safeString(charge.ServiceCategory) || null
    const serviceKey = `${serviceName}|${serviceCategory ?? ''}`

    addCost(
      services,
      serviceKey,
      { serviceName, serviceCategory, share: 0 },
      billedCost,
      effectiveCost
    )

    const projectId = getTagValue(charge.Tags, ['ProjectId', 'projectId', 'project_id']) || null

    const projectName =
      getTagValue(charge.Tags, ['ProjectName', 'projectName', 'project_name']) ||
      projectId ||
      'Proyecto sin tag'

    addCost(
      projects,
      projectId ?? projectName,
      { projectId, projectName, share: 0 },
      billedCost,
      effectiveCost
    )

    const chargeCategory = safeString(charge.ChargeCategory) || 'Unclassified'

    addCost(
      categories,
      chargeCategory,
      { chargeCategory, share: 0 },
      billedCost,
      effectiveCost
    )
  }

  const costByDay = Array.from(daily.values())
    .map(day => ({
      ...day,
      billedCost: roundMoney(day.billedCost),
      effectiveCost: roundMoney(day.effectiveCost)
    }))
    .sort((left, right) => left.date.localeCompare(right.date))

  const totalBilledCost = roundMoney(costByDay.reduce((sum, day) => sum + day.billedCost, 0))
  const totalEffectiveCost = roundMoney(costByDay.reduce((sum, day) => sum + day.effectiveCost, 0))
  const forecast = buildForecast(costByDay, guardrailConfig)
  const spikeGuardrail = buildSpikeGuardrail(costByDay, guardrailConfig.dailySpikePct)

  return {
    availability: charges.length > 0 ? 'configured' : 'awaiting_data',
    generatedAt: new Date().toISOString(),
    period,
    totalBilledCost,
    totalEffectiveCost,
    currency,
    costByDay,
    costByService: sortAndRound(Array.from(services.values()), totalBilledCost).slice(0, 12),
    costByProject: sortAndRound(Array.from(projects.values()), totalBilledCost).slice(0, 12),
    costByCategory: sortAndRound(Array.from(categories.values()), totalBilledCost).slice(0, 12),
    forecast,
    guardrails: {
      ...guardrailConfig,
      ...spikeGuardrail
    },
    source: {
      endpoint: '/v1/billing/charges',
      focusVersion: '1.3',
      teamId: source.teamId,
      teamSlug: source.teamSlug,
      tokenSource: source.tokenSource,
      latestChargeDate
    },
    notes:
      charges.length > 0
        ? ['Lectura read-only desde Vercel Billing FOCUS v1.3; sin persistencia propia en Greenhouse V1.']
        : ['Vercel Billing respondio sin cargos para el rango solicitado. Esto puede ser latencia o ausencia real de uso.'],
    error: null
  }
}

const buildUrl = (period: VercelBillingPeriod, teamId: string | null, teamSlug: string | null): string => {
  const params = new URLSearchParams({
    from: toIsoDateTime(new Date(`${period.startDate}T00:00:00.000Z`)),
    to: toIsoDateTime(new Date(`${period.endDate}T00:00:00.000Z`))
  })

  if (teamId) {
    params.set('teamId', teamId)
  } else if (teamSlug) {
    params.set('slug', teamSlug)
  }

  return `${VERCEL_BILLING_ENDPOINT}?${params.toString()}`
}

export const getVercelBillingOverview = async (
  options: VercelBillingOptions = {}
): Promise<VercelBillingOverview> => {
  const period = buildPeriod(options)
  const tokenResolution = await resolveSecret({ envVarName: 'GREENHOUSE_VERCEL_API_TOKEN' })
  const teamId = process.env.GREENHOUSE_VERCEL_TEAM_ID?.trim() || null
  const teamSlug = process.env.GREENHOUSE_VERCEL_TEAM_SLUG?.trim() || null
  const cacheKey = `${period.startDate}|${period.endDate}|${teamId ?? ''}|${teamSlug ?? ''}|${tokenResolution.source}`
  const now = Date.now()

  if (!options.forceRefresh && cache && cache.cacheKey === cacheKey && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.overview
  }

  if (!tokenResolution.value || (!teamId && !teamSlug)) {
    return buildEmpty(
      'not_configured',
      period,
      [
        'Configurar GREENHOUSE_VERCEL_API_TOKEN o GREENHOUSE_VERCEL_API_TOKEN_SECRET_REF.',
        'Configurar GREENHOUSE_VERCEL_TEAM_ID (preferido) o GREENHOUSE_VERCEL_TEAM_SLUG.'
      ],
      {
        tokenSource: tokenResolution.source,
        teamId,
        teamSlug
      }
    )
  }

  try {
    const response = await fetch(buildUrl(period, teamId, teamSlug), {
      headers: {
        Authorization: `Bearer ${tokenResolution.value}`,
        Accept: 'application/jsonl'
      }
    })

    if (!response.ok) {
      const statusMessage =
        response.status === 401 || response.status === 403
          ? 'Token Vercel sin permisos suficientes para Billing API.'
          : `Vercel Billing API respondio HTTP ${response.status}.`

      return buildEmpty('error', period, [statusMessage], {
        error: `vercel_billing_http_${response.status}`,
        tokenSource: tokenResolution.source,
        teamId,
        teamSlug
      })
    }

    const body = await response.text()
    const charges = parseVercelFocusJsonl(body)

    const overview = aggregateCharges(charges, period, {
      teamId,
      teamSlug,
      tokenSource: tokenResolution.source
    })

    cache = {
      cacheKey,
      fetchedAt: now,
      overview
    }

    return overview
  } catch (error) {
    return buildEmpty('error', period, ['No se pudo leer Vercel Billing FOCUS.'], {
      error: error instanceof Error ? error.message : 'unknown_error',
      tokenSource: tokenResolution.source,
      teamId,
      teamSlug
    })
  }
}

export const __resetVercelBillingCacheForTesting = () => {
  cache = null
}
