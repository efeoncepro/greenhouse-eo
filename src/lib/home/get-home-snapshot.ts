import 'server-only'

import { NotificationService } from '@/lib/notifications/notification-service'
import { buildHomeEntitlementsContext } from '@/lib/home/build-home-entitlements-context'
import { readAgencyAiLlmSummary, readTopAiLlmEnrichments } from '@/lib/ico-engine/ai/llm-enrichment-reader'
import { HOME_GREETINGS, HOME_SUBTITLE } from '@/config/home-greetings'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { HomeSnapshot, HomeNexaInsightItem, ModuleCard, PendingTask } from '@/types/home'

export interface HomeSnapshotInput {
  userId: string
  clientId?: string
  firstName: string
  lastName: string | null
  roleName: string
  tenantType: 'client' | 'efeonce_internal'
  primaryRoleCode: string
  businessLines: string[]
  serviceModules: string[]
  roleCodes: string[]
  routeGroups: string[]
  authorizedViews: string[]
  portalHomePath: string
  memberId?: string
  organizationId?: string | null
}

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const HOME_INSIGHTS_LIMIT = 3
const HOME_TIMEZONE = 'America/Santiago'

const HOME_PERIOD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: HOME_TIMEZONE,
  year: 'numeric',
  month: '2-digit'
})

const mapHomeInsight = (row: {
  enrichmentId: string
  signalType: string
  metricName: string
  severity: string | null
  explanationSummary: string | null
  rootCauseNarrative: string | null
  recommendedAction: string | null
}): HomeNexaInsightItem => ({
  id: row.enrichmentId,
  signalType: row.signalType,
  metricId: row.metricName,
  severity: row.severity,
  explanation: row.explanationSummary,
  rootCauseNarrative: row.rootCauseNarrative,
  recommendedAction: row.recommendedAction
})

const getHomeCurrentPeriod = () => {
  const parts = HOME_PERIOD_FORMATTER.formatToParts(new Date())
  const year = Number(parts.find(part => part.type === 'year')?.value ?? new Date().getFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? new Date().getMonth() + 1)

  return { year, month }
}

export const getHomeFinanceStatus = async () => {
  const [currentPeriod, latestMargin] = await Promise.all([
    runGreenhousePostgresQuery<{
      period_year: number | string
      period_month: number | string
      closure_status: string | null
      readiness_pct: number | string | null
    } & Record<string, unknown>>(
      `SELECT period_year, period_month, closure_status, readiness_pct
       FROM greenhouse_serving.period_closure_status
       ORDER BY period_year DESC, period_month DESC
       LIMIT 1`
    ).catch(() => []),
    runGreenhousePostgresQuery<{
      period_year: number | string
      period_month: number | string
      gross_margin_pct: number | string | null
      period_closed: boolean | null
    } & Record<string, unknown>>(
      `SELECT period_year, period_month, gross_margin_pct, period_closed
       FROM greenhouse_serving.operational_pl_snapshots
       WHERE scope_type = 'organization'
       ORDER BY period_year DESC, period_month DESC, revenue_clp DESC
       LIMIT 1`
    ).catch(() => [])
  ])

  const current = currentPeriod[0]
  const margin = latestMargin[0]

  if (!current && !margin) {
    return null
  }

  const currentYear = current ? Number(current.period_year) : Number(margin?.period_year)
  const currentMonth = current ? Number(current.period_month) : Number(margin?.period_month)
  const marginYear = margin ? Number(margin.period_year) : null
  const marginMonth = margin ? Number(margin.period_month) : null

  return {
    periodLabel: `${MONTH_SHORT[currentMonth]} ${currentYear}`,
    closureStatus: current?.closure_status ?? null,
    readinessPct: current?.readiness_pct == null ? null : Number(current.readiness_pct),
    latestMarginPct: margin?.gross_margin_pct == null ? null : Math.round(Number(margin.gross_margin_pct) * 10) / 10,
    latestMarginPeriodLabel: marginYear && marginMonth ? `${MONTH_SHORT[marginMonth]} ${marginYear}` : null,
    latestPeriodClosed: margin?.period_closed === true
  }
}

/**
 * Orchestrates the gathering of all data needed for the Home view.
 * This is a server-side helper to be used by the /api/home/snapshot route.
 */
export async function getHomeSnapshot(input: HomeSnapshotInput): Promise<HomeSnapshot> {
  const now = new Date()
  const hour = now.getHours()
  const { year: currentYear, month: currentMonth } = getHomeCurrentPeriod()

  // 1. Resolve Greeting
  let greetingPool = HOME_GREETINGS.default

  if (hour >= 5 && hour < 12) greetingPool = HOME_GREETINGS.morning
  else if (hour >= 12 && hour < 19) greetingPool = HOME_GREETINGS.afternoon
  else if (hour >= 19 || hour < 5) greetingPool = HOME_GREETINGS.evening

  const randomGreeting = greetingPool[Math.floor(Math.random() * greetingPool.length)]
  const resolvedGreeting = randomGreeting.replace('{name}', input.firstName)

  // 2. Resolve Modules (Capabilities)
  const homeEntitlements = buildHomeEntitlementsContext({
    userId: input.userId,
    tenantType: input.tenantType,
    roleCodes: input.roleCodes,
    primaryRoleCode: input.primaryRoleCode,
    routeGroups: input.routeGroups,
    authorizedViews: input.authorizedViews,
    businessLines: input.businessLines,
    serviceModules: input.serviceModules,
    portalHomePath: input.portalHomePath,
    memberId: input.memberId
  })

  const resolvedCapabilities = homeEntitlements.visibleCapabilityModules

  const modules: ModuleCard[] = resolvedCapabilities.map(cap => ({
    id: cap.id,
    title: cap.label,
    subtitle: cap.description || '',
    icon: cap.icon,
    route: cap.route,
    color: 'primary'
  }))

  const notificationsPromise = NotificationService.getNotifications(input.userId, {
    unreadOnly: true,
    pageSize: 5
  }).catch(error => {
    console.warn('[home-snapshot] Failed to fetch notifications, continuing with empty tasks:', error instanceof Error ? error.message : error)

    return { items: [], total: 0 } as Awaited<ReturnType<typeof NotificationService.getNotifications>>
  })

  const topInsightsPromise = readTopAiLlmEnrichments(currentYear, currentMonth, HOME_INSIGHTS_LIMIT).catch(error => {
    console.warn('[home-snapshot] Failed to fetch Nexa insights, continuing with an empty widget:', error instanceof Error ? error.message : error)

    return []
  })

  const insightsSummaryPromise = readAgencyAiLlmSummary(currentYear, currentMonth, 1).catch(error => {
    console.warn('[home-snapshot] Failed to fetch Nexa insights summary, continuing with empty summary metadata:', error instanceof Error ? error.message : error)

    return {
      totals: {
        total: 0,
        succeeded: 0,
        failed: 0,
        avgQualityScore: null
      },
      latestRun: null,
      recentEnrichments: [],
      lastProcessedAt: null
    }
  })

  const financeStatusPromise = homeEntitlements.canSeeFinanceStatus
    ? getHomeFinanceStatus()
    : Promise.resolve(null)

  const [notificationResult, topInsightsRows, insightsSummary, financeStatus] = await Promise.all([
    notificationsPromise,
    topInsightsPromise,
    insightsSummaryPromise,
    financeStatusPromise
  ])

  const tasks: PendingTask[] = notificationResult.items.map(n => ({
    id: n.notification_id,
    title: n.title,
    description: n.body || '',
    type: (n.category as any) || 'other',
    priority: n.metadata?.priority === 'high' ? 'high' : 'medium',
    dueDate: n.metadata?.dueDate as string | undefined,
    ctaLabel: 'Ver',
    ctaRoute: n.action_url || undefined
  }))

  const visibleInsightsCount = topInsightsRows.length

  const nexaInsights = {
    totalAnalyzed: visibleInsightsCount > 0 ? insightsSummary.totals.succeeded : 0,
    lastAnalysis: insightsSummary.lastProcessedAt,
    runStatus: insightsSummary.latestRun?.status ?? null,
    insights: topInsightsRows.map(mapHomeInsight)
  }

  // 5. Nexa Intro (Simple logic for now)
  const nexaIntro = `Hola ${input.firstName}, soy Nexa. Tengo acceso al catálogo reactivo de Greenhouse y puedo ayudarte a navegar tu operación. Veo que tienes ${tasks.length} pendientes hoy. ¿Por dónde quieres empezar?`

  return {
    user: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.roleName
    },
    greeting: {
      title: resolvedGreeting,
      subtitle: HOME_SUBTITLE
    },
    modules,
    tasks,
    recommendedShortcuts: homeEntitlements.recommendedShortcuts,
    accessContext: homeEntitlements.accessContext,
    nexaInsights,
    financeStatus,
    nexaIntro,
    computedAt: now.toISOString()
  }
}
