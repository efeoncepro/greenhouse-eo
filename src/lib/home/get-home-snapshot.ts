import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import { NotificationService } from '@/lib/notifications/notification-service'
import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { HOME_GREETINGS, HOME_SUBTITLE } from '@/config/home-greetings'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { HomeSnapshot, ModuleCard, PendingTask } from '@/types/home'

export interface HomeSnapshotInput {
  userId: string
  firstName: string
  lastName: string | null
  roleName: string
  businessLines: string[]
  serviceModules: string[]
  roleCodes?: string[]
  routeGroups?: string[]
  organizationId?: string | null
}

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const canSeeFinanceStatus = (input: Pick<HomeSnapshotInput, 'roleCodes' | 'routeGroups'>) =>
  (input.routeGroups || []).includes('finance') ||
  (input.roleCodes || []).some(code => code === ROLE_CODES.FINANCE_ADMIN || code === ROLE_CODES.EFEONCE_ADMIN || code === ROLE_CODES.EFEONCE_OPERATIONS)

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

  // 1. Resolve Greeting
  let greetingPool = HOME_GREETINGS.default

  if (hour >= 5 && hour < 12) greetingPool = HOME_GREETINGS.morning
  else if (hour >= 12 && hour < 19) greetingPool = HOME_GREETINGS.afternoon
  else if (hour >= 19 || hour < 5) greetingPool = HOME_GREETINGS.evening

  const randomGreeting = greetingPool[Math.floor(Math.random() * greetingPool.length)]
  const resolvedGreeting = randomGreeting.replace('{name}', input.firstName)

  // 2. Resolve Modules (Capabilities)
  const resolvedCapabilities = resolveCapabilityModules({
    businessLines: input.businessLines,
    serviceModules: input.serviceModules
  })

  const modules: ModuleCard[] = resolvedCapabilities.map(cap => ({
    id: cap.id,
    title: cap.label,
    subtitle: cap.description || '',
    icon: cap.icon,
    route: cap.route,
    color: 'primary' // Default color for now
  }))

  // 3. Resolve Tasks (Unread Notifications) — graceful fallback if DB unavailable
  let notifications: Awaited<ReturnType<typeof NotificationService.getNotifications>>['items'] = []

  try {
    const result = await NotificationService.getNotifications(input.userId, {
      unreadOnly: true,
      pageSize: 5
    })

    notifications = result.items
  } catch (error) {
    console.warn('[home-snapshot] Failed to fetch notifications, continuing with empty tasks:', error instanceof Error ? error.message : error)
  }

  const tasks: PendingTask[] = notifications.map(n => ({
    id: n.notification_id,
    title: n.title,
    description: n.body || '',
    type: (n.category as any) || 'other',
    priority: n.metadata?.priority === 'high' ? 'high' : 'medium',
    dueDate: n.metadata?.dueDate as string | undefined,
    ctaLabel: 'Ver',
    ctaRoute: n.action_url || undefined
  }))

  const financeStatus = canSeeFinanceStatus(input)
    ? await getHomeFinanceStatus()
    : null

  // 4. Nexa Intro (Simple logic for now)
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
    financeStatus,
    nexaIntro,
    computedAt: now.toISOString()
  }
}
