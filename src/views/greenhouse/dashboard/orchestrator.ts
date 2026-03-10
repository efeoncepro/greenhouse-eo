import type { GreenhouseDashboardData, GreenhouseKpiTone } from '@/types/greenhouse-dashboard'
import {
  buildModuleFocusCards,
  formatSyncedAt,
  hasAccountTeam,
  hasMonthlyDeliverySignals,
  hasQualitySignals,
  hasTooling,
  resolveDashboardTheme,
  buildThemeCopy,
  buildModuleBadges
} from '@views/greenhouse/dashboard/config'

type ExecutiveMiniStatDescriptor = {
  key: string
  eyebrow?: string
  tone?: GreenhouseKpiTone
  title: string
  value: string
  detail: string
  supportItems?: { label: string; value: string }[]
}

type ExecutiveBlockKey =
  | 'delivery'
  | 'quality'
  | 'accountTeam'
  | 'tooling'
  | 'statusMix'
  | 'effortMix'
  | 'projects'

export type ExecutiveDashboardLayout = {
  themeCopy: ReturnType<typeof buildThemeCopy>
  hero: {
    eyebrow: string
    title: string
    description: string
    highlights: { label: string; value: string }[]
    summaryLabel: string
    summaryValue: string
    summaryDetail: string
    badges: string[]
  }
  topStats: ExecutiveMiniStatDescriptor[]
  focusCards: ExecutiveMiniStatDescriptor[]
  kpiCards: ExecutiveMiniStatDescriptor[]
  blocks: ExecutiveBlockKey[]
}

const formatRelationshipValue = (data: GreenhouseDashboardData) =>
  data.relationship.startedAt !== null ? `${data.relationship.months}m ${data.relationship.days}d` : 'Sin dato'

const formatRelationshipDetail = (data: GreenhouseDashboardData) =>
  data.relationship.startedAt
    ? `${data.relationship.label}. Inicio visible: ${new Date(`${data.relationship.startedAt}T00:00:00.000Z`).toLocaleDateString('es-CL')}.`
    : 'Aun no hay una primera actividad visible para calcular tenure.'

export const buildExecutiveDashboardLayout = (data: GreenhouseDashboardData): ExecutiveDashboardLayout => {
  const dashboardTheme = resolveDashboardTheme(data)
  const themeCopy = buildThemeCopy(dashboardTheme)
  const moduleBadges = buildModuleBadges(data)
  const moduleFocusCards = buildModuleFocusCards(data, dashboardTheme)
  const syncedAtLabel = formatSyncedAt(data.scope.lastSyncedAt)

  const latestMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 1] || null
  const totalDeliverablesVisible = data.charts.monthlyDelivery.reduce((sum, item) => sum + item.totalDeliverables, 0)

  const totalDeliverablesWithoutAdjustments = data.charts.monthlyDelivery.reduce(
    (sum, item) => sum + item.withoutClientAdjustments,
    0
  )

  const noAdjustmentRate =
    totalDeliverablesVisible > 0 ? Math.round((totalDeliverablesWithoutAdjustments / totalDeliverablesVisible) * 100) : 0

  const blocks: ExecutiveBlockKey[] = []

  if (hasMonthlyDeliverySignals(data)) {
    blocks.push('delivery')
  }

  if (hasQualitySignals(data)) {
    blocks.push('quality')
  }

  if (hasAccountTeam(data)) {
    blocks.push('accountTeam')
  }

  if (hasTooling(data)) {
    blocks.push('tooling')
  }

  blocks.push('statusMix', 'effortMix', 'projects')

  return {
    themeCopy,
    hero: {
      eyebrow: themeCopy.heroLabel,
      title: themeCopy.heroTitle,
      description: `${themeCopy.heroDescription} Alcance visible: ${data.scope.projectCount} proyectos. Ultima sincronizacion: ${syncedAtLabel}.`,
      highlights: [
        { label: 'Entregadas 30d', value: String(data.summary.completedLast30Days) },
        { label: 'Review abierta', value: String(data.summary.reviewPressureTasks) },
        { label: 'Proyectos en riesgo', value: String(data.summary.projectsAtRisk) },
        { label: 'Trabajo activo', value: String(data.summary.activeWorkItems) }
      ],
      summaryLabel: 'On-time portfolio',
      summaryValue: `${data.summary.avgOnTimePct}%`,
      summaryDetail: `${data.summary.healthyProjects} proyectos saludables dentro del alcance visible.`,
      badges: moduleBadges.map(badge => badge.label)
    },
    topStats: [
      {
        key: 'relationship',
        eyebrow: 'Relacion',
        tone: 'info',
        title: 'Tiempo compartido',
        value: formatRelationshipValue(data),
        detail: formatRelationshipDetail(data)
      },
      {
        key: 'monthly-on-time',
        eyebrow: 'On-time mensual',
        tone:
          latestMonthlyDelivery?.onTimePct === null
            ? 'info'
            : (latestMonthlyDelivery?.onTimePct ?? 0) >= 75
              ? 'success'
              : 'warning',
        title: latestMonthlyDelivery ? latestMonthlyDelivery.label : 'Ultimo mes activo',
        value: latestMonthlyDelivery?.onTimePct !== null ? `${latestMonthlyDelivery?.onTimePct}%` : 'Sin dato',
        detail: latestMonthlyDelivery
          ? `Serie agrupada por fecha de creacion sobre ${latestMonthlyDelivery.totalDeliverables} entregables visibles.`
          : 'Todavia no hay meses con entregables visibles en el alcance actual.'
      },
      {
        key: 'first-pass',
        eyebrow: 'Primera pasada',
        tone: totalDeliverablesVisible === 0 ? 'info' : noAdjustmentRate >= 75 ? 'success' : noAdjustmentRate >= 50 ? 'warning' : 'error',
        title: 'Sin ajustes cliente',
        value: `${noAdjustmentRate}%`,
        detail: `${totalDeliverablesWithoutAdjustments} de ${totalDeliverablesVisible} entregables visibles no registran ajustes cliente.`
      }
    ],
    focusCards: moduleFocusCards.map(card => ({
      key: card.key,
      eyebrow: card.eyebrow,
      tone: card.tone,
      title: card.title,
      value: card.value,
      detail: card.detail
    })),
    kpiCards: data.kpis.map(kpi => ({
      key: kpi.label,
      eyebrow: kpi.label,
      tone: kpi.tone,
      title: kpi.label,
      value: kpi.value,
      detail: kpi.detail
    })),
    blocks
  }
}
