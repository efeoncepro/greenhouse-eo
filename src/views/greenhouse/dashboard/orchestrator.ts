import type { GreenhouseDashboardData, GreenhouseKpiTone } from '@/types/greenhouse-dashboard'
import {
  buildModuleFocusCards,
  formatDelta,
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
  icon?: string
  delta?: string
  miniChart?: {
    variant: 'bars' | 'area' | 'split-bars'
    data: number[]
    categories?: string[]
  }
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
  isSnapshotMode: boolean
  layoutMode: 'snapshot' | 'standard' | 'rich'
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
    : 'Todavia no hay una primera actividad visible para calcular tenure.'

const lastValues = (values: Array<number | null | undefined>, length = 7) =>
  values
    .slice(-length)
    .map(value => Math.max(0, Math.round(value ?? 0)))

const formatSignedDelta = (current: number | null | undefined, previous: number | null | undefined) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return undefined
  }

  const delta = Math.round(current - previous)

  if (delta === 0) {
    return '0%'
  }

  return `${delta > 0 ? '+' : ''}${delta}%`
}

export const buildExecutiveDashboardLayout = (data: GreenhouseDashboardData): ExecutiveDashboardLayout => {
  const dashboardTheme = resolveDashboardTheme(data)
  const themeCopy = buildThemeCopy(dashboardTheme)
  const moduleBadges = buildModuleBadges(data)
  const moduleFocusCards = buildModuleFocusCards(data, dashboardTheme)
  const syncedAtLabel = formatSyncedAt(data.scope.lastSyncedAt)
  const maxHistoryDepth = Math.max(data.charts.monthlyDelivery.length, data.charts.throughput.length, data.qualitySignals.length)
  const isSnapshotMode = maxHistoryDepth < 2

  const layoutMode: ExecutiveDashboardLayout['layoutMode'] = isSnapshotMode
    ? 'snapshot'
    : data.scope.projectCount >= 8 ||
        data.summary.totalTasks >= 180 ||
        data.charts.monthlyDelivery.length >= 4 ||
        data.accountTeam.members.length >= 5
      ? 'rich'
      : 'standard'

  const latestMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 1] || null
  const previousMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 2] || null

  const firstPassSeries = lastValues(
    data.charts.monthlyDelivery.map(item =>
      item.totalDeliverables > 0 ? (item.withoutClientAdjustments / item.totalDeliverables) * 100 : 0
    )
  )

  const onTimeSeries = lastValues(data.charts.monthlyDelivery.map(item => item.onTimePct))
  const createdSeries = lastValues(data.charts.throughput.map(item => item.created))
  const completedSeries = lastValues(data.charts.throughput.map(item => item.completed))
  const reviewRoundsSeries = lastValues(data.charts.monthlyDelivery.map(item => item.totalClientAdjustmentRounds))
  const monthCategories = data.charts.monthlyDelivery.slice(-7).map(item => item.label.replace(/\s\d{2}$/, ''))

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

  if (!isSnapshotMode) {
    blocks.push('statusMix', 'effortMix')
  }

  blocks.push('projects')

  return {
    isSnapshotMode,
    layoutMode,
    themeCopy,
    hero: {
      eyebrow: themeCopy.heroLabel,
      title: themeCopy.heroTitle,
      description: isSnapshotMode
        ? `${themeCopy.heroDescription} Snapshot mode activo con ${data.scope.projectCount} proyectos visibles. Sync: ${syncedAtLabel}.`
        : `${themeCopy.heroDescription} Alcance visible: ${data.scope.projectCount} proyectos. Sync: ${syncedAtLabel}.`,
      highlights: [
        { label: 'Entregadas 30d', value: String(data.summary.completedLast30Days) },
        { label: 'Review abierta', value: String(data.summary.reviewPressureTasks) }
      ],
      summaryLabel: 'On-time portfolio',
      summaryValue: `${data.summary.avgOnTimePct}%`,
      summaryDetail: isSnapshotMode
        ? `${data.summary.healthyProjects} proyectos saludables hoy.`
        : `${data.summary.healthyProjects} proyectos saludables dentro del alcance visible.`,
      badges: moduleBadges.map(badge => badge.label)
    },
    topStats: [
      {
        key: 'relationship',
        eyebrow: 'Relacion',
        tone: 'info',
        title: 'Tiempo compartido',
        value: formatRelationshipValue(data),
        detail: formatRelationshipDetail(data),
        icon: 'tabler-timeline'
      },
      {
        key: 'active-work',
        eyebrow: 'Active work',
        tone: data.summary.projectsAtRisk > 0 ? 'warning' : 'info',
        title: 'Carga activa del space',
        value: String(data.summary.activeWorkItems),
        detail: `${data.summary.queuedWorkItems} items en cola y ${data.summary.projectsAtRisk} proyectos bajo observacion.`,
        icon: 'tabler-briefcase'
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
          : 'Todavia no hay meses con entregables visibles en el alcance actual.',
        delta: formatSignedDelta(latestMonthlyDelivery?.onTimePct, previousMonthlyDelivery?.onTimePct),
        miniChart: {
          variant: 'bars',
          data: onTimeSeries
        }
      }
    ],
    focusCards: moduleFocusCards.slice(0, isSnapshotMode ? 2 : 3).map(card => ({
      key: card.key,
      eyebrow: card.eyebrow,
      tone: card.tone,
      title: card.title,
      value: card.value,
      detail: card.detail,
      icon:
        card.key === 'agencia_creativa'
          ? 'tabler-palette'
          : card.key === 'desarrollo_web'
            ? 'tabler-code'
            : card.key === 'consultoria_crm'
              ? 'tabler-building-store'
              : 'tabler-sparkles'
    })),
    kpiCards: data.kpis.slice(0, isSnapshotMode ? 3 : data.kpis.length).map(kpi => ({
      key: kpi.label,
      eyebrow: kpi.label,
      tone: kpi.tone,
      title: kpi.label,
      value: kpi.value,
      detail: kpi.detail,
      delta:
        kpi.label === 'Piezas entregadas'
          ? formatDelta(data.summary.netFlowLast30Days)
          : kpi.label === 'Salud on-time'
            ? `${data.summary.healthyProjects} healthy`
            : kpi.label === 'Trabajo activo'
              ? `${data.summary.queuedWorkItems} cola`
              : `${data.summary.openFrameComments} comentarios`,
      icon:
        kpi.label === 'Piezas entregadas'
          ? 'tabler-checkup-list'
          : kpi.label === 'Salud on-time'
            ? 'tabler-heart-rate-monitor'
            : kpi.label === 'Trabajo activo'
              ? 'tabler-briefcase'
              : 'tabler-message-2',
      miniChart:
        kpi.label === 'Piezas entregadas'
          ? {
              variant: 'area',
              data: completedSeries
            }
          : kpi.label === 'Salud on-time'
            ? {
                variant: 'split-bars',
                data: onTimeSeries,
                categories: monthCategories
              }
            : kpi.label === 'Trabajo activo'
              ? {
                  variant: 'bars',
                  data: createdSeries
                }
              : {
                  variant: 'bars',
                  data: firstPassSeries.length > 0 ? firstPassSeries : reviewRoundsSeries
                }
    })),
    blocks
  }
}
