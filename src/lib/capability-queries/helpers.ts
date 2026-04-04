import type {
  CapabilityAlertItem,
  CapabilityCardData,
  CapabilityMetric,
  CapabilityMetricListItem,
  CapabilityMetricsRowItem,
  CapabilityModuleData,
  CapabilityPipelinePhase,
  CapabilityQualityItem,
  CapabilityProjectItem,
  CapabilityToolItem
} from '@/types/capabilities'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { CreativeHubTask } from '@/lib/capability-queries/creative-hub-runtime'
import type { CreativeVelocityReviewContract } from '@/lib/ico-engine/creative-velocity-review'
import type { MethodologicalAcceleratorSignal } from '@/lib/ico-engine/methodological-accelerators'
import type { CapabilityModuleSnapshot, CapabilitySnapshotProject } from '@/lib/capability-queries/shared'
import type { MetricsSummary } from '@/lib/ico-engine/read-metrics'

const integerFormatter = new Intl.NumberFormat('es-CL')
const percentFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

const formatInteger = (value: number) => integerFormatter.format(value)
const formatPercent = (value: number | null) => `${percentFormatter.format(Math.max(0, value || 0))}%`

const formatIterationCadence = (value: number | null, windowDays: number) =>
  value !== null ? `${formatInteger(value)}/${windowDays}d` : null

type ProjectLens = 'creative' | 'crm' | 'onboarding' | 'web'

const creativeProjectRank = (project: CapabilitySnapshotProject) =>
  project.reviewPressureTasks * 6 + project.openFrameComments * 3 + project.blockedTasks * 8 + project.attentionScore

const crmProjectRank = (project: CapabilitySnapshotProject) =>
  project.clientChangeTasks * 7 + project.queuedWorkItems * 4 + project.reviewPressureTasks * 3 + project.attentionScore

const onboardingProjectRank = (project: CapabilitySnapshotProject) =>
  project.queuedWorkItems * 5 + project.activeWorkItems * 3 + project.reviewPressureTasks * 2 + project.attentionScore

const webProjectRank = (project: CapabilitySnapshotProject) =>
  project.blockedTasks * 9 + project.activeWorkItems * 3 + project.reviewPressureTasks * 3 + project.attentionScore

const rankByLens = (project: CapabilitySnapshotProject, lens: ProjectLens) => {
  switch (lens) {
    case 'creative':
      return creativeProjectRank(project)
    case 'crm':
      return crmProjectRank(project)
    case 'onboarding':
      return onboardingProjectRank(project)
    case 'web':
      return webProjectRank(project)
  }
}

const projectDetailByLens = (project: CapabilitySnapshotProject, lens: ProjectLens) => {
  switch (lens) {
    case 'creative':
      return `${formatInteger(project.reviewPressureTasks)} en revision, ${formatInteger(
        project.openFrameComments
      )} comentarios abiertos y OTD ${formatPercent(project.onTimePct)}.`
    case 'crm':
      return `${formatInteger(project.clientChangeTasks)} cambios cliente, ${formatInteger(
        project.queuedWorkItems
      )} en cola y OTD ${formatPercent(project.onTimePct)}.`
    case 'onboarding':
      return `${formatInteger(project.queuedWorkItems)} pendientes de entrar, ${formatInteger(
        project.activeWorkItems
      )} activos y OTD ${formatPercent(project.onTimePct)}.`
    case 'web':
      return `${formatInteger(project.blockedTasks)} bloqueos, ${formatInteger(
        project.activeWorkItems
      )} items activos y OTD ${formatPercent(project.onTimePct)}.`
  }
}

export const buildProjectItemsForLens = (snapshot: CapabilityModuleSnapshot, lens: ProjectLens): CapabilityProjectItem[] =>
  [...snapshot.projects]
    .sort((left, right) => rankByLens(right, lens) - rankByLens(left, lens))
    .slice(0, 5)
    .map(project => ({
      id: project.id,
      name: project.name,
      status: project.status,
      detail: projectDetailByLens(project, lens),
      href: `/proyectos/${project.id}`
    }))

const toolPriority = (tool: CapabilityToolItem) => {
  const withHref = tool.href ? 100 : 0
  const defaultWeight = tool.category.toLowerCase().includes('ai') ? 10 : 0

  return withHref + defaultWeight
}

export const buildToolItems = (snapshot: CapabilityModuleSnapshot): CapabilityToolItem[] =>
  [...snapshot.tooling.technologyTools, ...snapshot.tooling.aiTools]
    .map(item => ({
      key: item.key,
      label: item.label,
      category: item.category,
      description: item.description,
      href: item.href
    }))
    .sort((left, right) => toolPriority(right) - toolPriority(left) || left.label.localeCompare(right.label))
    .slice(0, 6)

export const buildQualityItems = (snapshot: CapabilityModuleSnapshot): CapabilityQualityItem[] =>
  snapshot.qualitySignals
    .slice(-3)
    .reverse()
    .map(item => ({
      month: item.label,
      avgRpa: item.avgRpa !== null ? item.avgRpa.toFixed(2) : 'N/A',
      firstTimeRight:
        item.firstTimeRightPct !== null ? `${percentFormatter.format(Math.max(0, item.firstTimeRightPct))}%` : 'N/A'
    }))

export const buildCapabilityScope = (snapshot: CapabilityModuleSnapshot): CapabilityModuleData['scope'] => snapshot.scope

export const buildBaseCapabilityCardData = ({
  metricCardId,
  metrics,
  projectCardId,
  projects,
  toolingCardId,
  tools,
  qualityCardId,
  quality
}: {
  metricCardId: string
  metrics: CapabilityMetric[]
  projectCardId?: string
  projects?: CapabilityProjectItem[]
  toolingCardId?: string
  tools?: CapabilityToolItem[]
  qualityCardId?: string
  quality?: CapabilityQualityItem[]
}): Record<string, CapabilityCardData> => {
  const cardData: Record<string, CapabilityCardData> = {
    [metricCardId]: {
      type: 'metric',
      metrics
    }
  }

  if (projectCardId && projects) {
    cardData[projectCardId] = {
      type: 'project-list',
      items: projects
    }
  }

  if (toolingCardId && tools) {
    cardData[toolingCardId] = {
      type: 'tooling-list',
      items: tools
    }
  }

  if (qualityCardId && quality) {
    cardData[qualityCardId] = {
      type: 'quality-list',
      items: quality
    }
  }

  return cardData
}

const buildCreativePipelineItems = (snapshot: CapabilityModuleSnapshot): CapabilityMetricListItem[] => [
  {
    label: 'Review pressure',
    value: formatInteger(snapshot.summary.reviewPressureTasks),
    detail: `${formatInteger(snapshot.summary.openFrameComments)} comentarios abiertos y ${formatInteger(
      snapshot.summary.clientChangeTasks
    )} items con cambios cliente.`
  },
  {
    label: 'Blocked tasks',
    value: formatInteger(snapshot.summary.blockedTasks),
    detail: `${formatInteger(snapshot.summary.queuedWorkItems)} items siguen en cola y ${formatInteger(
      snapshot.summary.activeWorkItems
    )} ya estan activos.`
  },
  {
    label: 'Recent output',
    value: formatInteger(snapshot.summary.completedLast30Days),
    detail: `${formatInteger(snapshot.summary.createdLast30Days)} items entraron al flujo en los ultimos 30 dias.`
  }
]

const buildCreativeReviewHotspotCard = (snapshot: CapabilityModuleSnapshot): CapabilityCardData => {
  const rankedProjects = [...snapshot.projects]
    .sort((left, right) => creativeProjectRank(right) - creativeProjectRank(left))
    .slice(0, 5)

  const categories = rankedProjects.map(project => project.name)
  const pressureSeries = rankedProjects.map(project => project.reviewPressureTasks)
  const commentsSeries = rankedProjects.map(project => project.openFrameComments)
  const topProject = rankedProjects[0]
  const totalPressure = rankedProjects.reduce((sum, project) => sum + project.reviewPressureTasks, 0)

  return {
    type: 'chart-bar',
    chart: {
      categories,
      series: [
        {
          name: 'Revision abierta',
          data: pressureSeries
        },
        {
          name: 'Comentarios abiertos',
          data: commentsSeries
        }
      ],
      summaryLabel: 'Mayor hotspot',
      summaryValue: topProject ? topProject.name : 'Sin datos',
      summaryDetail: topProject
        ? `${formatInteger(topProject.reviewPressureTasks)} items en revision y ${formatInteger(
            topProject.openFrameComments
          )} comentarios abiertos.`
        : 'Aun no hay proyectos suficientes para construir la comparativa.',
      totalLabel: 'Review pressure visible',
      totalValue: formatInteger(totalPressure)
    }
  }
}

const INDUSTRY_CYCLE_DAYS = 14.2

const average = (values: number[]) => {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const formatDays = (value: number | null) => (value !== null ? `${Math.round(value * 10) / 10} dias` : null)
const formatRatio = (value: number | null, suffix = 'x') => (value !== null ? `${Math.round(value * 10) / 10}${suffix}` : null)

const buildIterationVelocityDescription = (
  metric: CreativeVelocityReviewContract['iterationVelocity']
) => {
  if (metric.dataStatus === 'unavailable') {
    return 'Sin evidencia suficiente para estimar iteraciones utiles cerradas en los ultimos 30 dias.'
  }

  const modeLabel = metric.evidenceMode === 'observed' ? 'Dato observado' : 'Proxy operativo'

  return `${modeLabel}: ${formatInteger(metric.evidence.usefulIterationTasks)} iteraciones utiles cerradas sobre ${formatInteger(
    metric.evidence.candidateTasks
  )} assets completados; ${formatInteger(metric.evidence.correctiveReworkTasks)} quedaron dominados por correccion.`
}

const formatRevenueEnabledClass = (value: CreativeVelocityReviewContract['revenueEnabled']['attributionClass']) => {
  switch (value) {
    case 'observed':
      return 'Observado'
    case 'range':
      return 'Rango'
    case 'estimated':
      return 'Estimado'
    default:
      return 'No disponible'
  }
}

const toneByRevenueEnabledClass = (
  value: CreativeVelocityReviewContract['revenueEnabled']['attributionClass']
): CapabilityMetricsRowItem['tone'] => {
  switch (value) {
    case 'observed':
      return 'success'
    case 'range':
      return 'warning'
    case 'estimated':
      return 'info'
    default:
      return 'error'
  }
}

const summarizeRevenueEnabledReasons = (reasons: string[]) =>
  reasons.slice(0, 2).join(' ')

export const buildCreativeRevenueCardData = (
  creativeVelocityReview: CreativeVelocityReviewContract
): CapabilityCardData => {
  const iterationVelocity = creativeVelocityReview.iterationVelocity
  const revenueEnabled = creativeVelocityReview.revenueEnabled

  const earlyLaunch = revenueEnabled.levers.earlyLaunch
  const iteration = revenueEnabled.levers.iteration
  const throughput = revenueEnabled.levers.throughput

  const items: CapabilityMetricsRowItem[] = [
    {
      id: 'early-launch',
      label: 'Early Launch Advantage',
      value: earlyLaunch.supportingValue !== null ? `TTM ${formatInteger(earlyLaunch.supportingValue)}d` : 'Sin TTM',
      description: summarizeRevenueEnabledReasons(earlyLaunch.qualityGateReasons),
      tone: toneByRevenueEnabledClass(earlyLaunch.attributionClass)
    },
    {
      id: 'iteration',
      label: 'Iteration Velocity Impact',
      value: formatIterationCadence(iterationVelocity.value, iterationVelocity.cadenceWindowDays),
      description: summarizeRevenueEnabledReasons(iteration.qualityGateReasons) || buildIterationVelocityDescription(iterationVelocity),
      tone: toneByRevenueEnabledClass(iteration.attributionClass)
    },
    {
      id: 'throughput',
      label: 'Throughput Expandido',
      value: throughput.supportingValue !== null ? formatInteger(Math.round(throughput.supportingValue)) : null,
      description: summarizeRevenueEnabledReasons(throughput.qualityGateReasons),
      tone: toneByRevenueEnabledClass(throughput.attributionClass)
    },
    {
      id: 'attribution-policy',
      label: 'Attribution Policy',
      value: formatRevenueEnabledClass(revenueEnabled.attributionClass),
      description:
        revenueEnabled.attributionClass === 'unavailable'
          ? 'Observed exige linkage directo a revenue. Range exige baseline comparable. Estimated usa solo evidencia operativa.'
          : `Policy ${formatRevenueEnabledClass(revenueEnabled.attributionClass).toLowerCase()}: no se presenta revenue total canónico mientras falte atribucion defendible por palanca.`,
      tone: toneByRevenueEnabledClass(revenueEnabled.attributionClass)
    }
  ]

  return { type: 'metrics-row', items }
}

export const buildCreativeBrandMetricsCardData = (
  tasks: CreativeHubTask[],
  icoSummary?: MetricsSummary | null,
  brandVoiceAi?: MethodologicalAcceleratorSignal | null
): CapabilityCardData => {
  const completedTasks = tasks.filter(task => task.cscPhase === 'Completado')
  const firstTimeRightBase = completedTasks.filter(task => task.clientChangeRounds !== null)

  const firstTimeRightPct = icoSummary?.ftrPct ??
    (firstTimeRightBase.length > 0
      ? Math.round((firstTimeRightBase.filter(task => task.clientChangeRounds === 0).length / firstTimeRightBase.length) * 100)
      : null)

  const avgRpa = icoSummary?.rpaAvg ?? average(
    completedTasks
      .map(task => task.rpaValue)
      .filter((value): value is number => value !== null && value > 0)
  )

  const reviewOpenCount = tasks.filter(task => task.cscPhase === 'Aprobacion').length
  const observedBrandConsistency = brandVoiceAi?.evidence.brandVoiceAi?.averageScore ?? null
  const brandConsistency = observedBrandConsistency

  const brandConsistencyDescription =
    observedBrandConsistency !== null
      ? 'Score auditado de Brand Consistency desde `ico_engine.ai_metric_scores`, sin reconstruir heurísticas locales.'
      : 'Sin score auditado de Brand Consistency; la lectura visible queda parcial hasta activar el carril observacional.'

  const items: CapabilityMetricsRowItem[] = [
    {
      id: 'first-time-right',
      label: 'First Time Right',
      value: firstTimeRightPct !== null ? formatPercent(firstTimeRightPct) : null,
      description: 'Piezas aprobadas sin rondas de cambio dentro del scope visible.',
      tone:
        firstTimeRightPct !== null && firstTimeRightPct >= 70
          ? 'success'
          : firstTimeRightPct !== null && firstTimeRightPct >= 50
            ? 'warning'
            : 'error'
    },
    {
      id: 'brand-consistency',
      label: 'Brand Consistency',
      value: brandConsistency !== null ? formatPercent(brandConsistency) : null,
      description: brandConsistencyDescription,
      tone:
        brandConsistency !== null && brandConsistency >= 80
          ? 'success'
          : brandConsistency !== null && brandConsistency >= 65
            ? 'warning'
            : 'error'
    },
    {
      id: 'review-loop-health',
      label: 'RpA operativo',
      value: formatRatio(avgRpa),
      description: `${formatInteger(reviewOpenCount)} assets hoy estan en aprobacion o con feedback abierto.`,
      tone:
        avgRpa !== null && avgRpa <= 2
          ? 'success'
          : avgRpa !== null && avgRpa <= 3
            ? 'warning'
            : 'error'
    },
    {
      id: 'knowledge-base',
      label: 'Knowledge Base',
      value: null,
      description: 'Reservado para la futura lectura de wiki y aprendizaje acumulado por marca.',
      tone: 'info'
    }
  ]

  return { type: 'metrics-row', items }
}

export const buildCreativeRpaTrendCardData = (tasks: CreativeHubTask[]): CapabilityCardData => {
  const byMonth = new Map<string, { sum: number; count: number }>()

  for (const task of tasks) {
    const month = (task.completedAt || task.lastEditedAt || task.createdAt || '').slice(0, 7)

    if (!month || task.rpaValue === null || task.rpaValue <= 0) {
      continue
    }

    const current = byMonth.get(month) || { sum: 0, count: 0 }

    current.sum += task.rpaValue
    current.count += 1
    byMonth.set(month, current)
  }

  const points = [...byMonth.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)

  return {
    type: 'chart-bar',
    chart: {
      categories: points.map(([month]) => month),
      series: [
        {
          name: 'RpA promedio',
          data: points.map(([, value]) => Math.round((value.sum / value.count) * 10) / 10)
        }
      ],
      summaryLabel: 'Tendencia reciente',
      summaryValue: points.length > 0 ? points[points.length - 1][0] : 'Sin datos',
      summaryDetail:
        points.length > 0
          ? 'La barra muestra la evolucion mensual de rondas por asset visibles en la cuenta.'
          : 'Todavia no hay suficientes cierres con RpA para construir la tendencia.',
      totalLabel: 'Meses visibles',
      totalValue: formatInteger(points.length)
    }
  }
}

export const buildCreativePipelineCardData = (tasks: CreativeHubTask[]): CapabilityCardData => {
  const phases: CapabilityPipelinePhase[] = [
    { id: 'planning', label: 'Planning', color: GH_COLORS.cscPhase.planning.source, count: 0 },
    { id: 'briefing', label: 'Briefing', color: GH_COLORS.cscPhase.briefing.source, count: 0 },
    { id: 'produccion', label: 'Produccion', color: GH_COLORS.cscPhase.production.source, count: 0 },
    { id: 'aprobacion', label: 'Aprobacion', color: GH_COLORS.cscPhase.approval.source, count: 0 },
    { id: 'asset-mgmt', label: 'Asset Mgmt', color: GH_COLORS.cscPhase.assetMgmt.source, count: 0 },
    { id: 'activacion', label: 'Activacion', color: GH_COLORS.cscPhase.activation.source, count: 0 },
    { id: 'completado', label: 'Completado', color: GH_COLORS.cscPhase.completed.source, count: 0 }
  ]

  for (const task of tasks) {
    const phase = phases.find(item => item.label === task.cscPhase)

    if (phase) {
      phase.count += 1
    }
  }

  const total = phases.reduce((sum, phase) => sum + phase.count, 0)

  return { type: 'pipeline', phases, total }
}

export const buildCreativeCscMetricsCardData = (tasks: CreativeHubTask[]): CapabilityCardData => {
  const phaseCounts = tasks.reduce<Record<string, number>>((accumulator, task) => {
    accumulator[task.cscPhase] = (accumulator[task.cscPhase] || 0) + 1

    return accumulator
  }, {})

  const activeTasks = tasks.filter(task => task.cscPhase !== 'Completado')
  const completedTasks = tasks.filter(task => task.cscPhase === 'Completado')

  const cycleDays = completedTasks
    .filter(task => task.createdAt && task.completedAt)
    .map(task => (new Date(task.completedAt || '').getTime() - new Date(task.createdAt || '').getTime()) / (1000 * 60 * 60 * 24))
    .filter(value => Number.isFinite(value) && value >= 0)

  const avgCycleDays = average(cycleDays)

  const bottleneck =
    Object.entries(phaseCounts)
      .filter(([phase]) => phase !== 'Completado')
      .sort((left, right) => right[1] - left[1])[0]?.[0] || 'Sin fase dominante'

  const recentCompleted = completedTasks.filter(task => {
    if (!task.completedAt) {
      return false
    }

    return new Date(task.completedAt).getTime() >= Date.now() - 28 * 24 * 60 * 60 * 1000
  })

  const velocityPerWeek = Math.round((recentCompleted.length / 4) * 10) / 10
  const stuckCount = activeTasks.filter(task => (task.hoursSinceUpdate || 0) > 48).length

  const items: CapabilityMetricsRowItem[] = [
    {
      id: 'cycle-time',
      label: 'Cycle time',
      value: avgCycleDays !== null ? formatDays(avgCycleDays) : `${INDUSTRY_CYCLE_DAYS}d ref`,
      description:
        avgCycleDays !== null
          ? 'Promedio real de dias entre creacion y completado dentro del scope visible.'
          : 'Sin cierres suficientes; se muestra referencia de industria.',
      tone: avgCycleDays !== null && avgCycleDays <= INDUSTRY_CYCLE_DAYS ? 'success' : 'info'
    },
    {
      id: 'bottleneck',
      label: 'Bottleneck actual',
      value: bottleneck,
      description: 'Fase con mayor concentracion de assets visibles hoy.',
      tone: bottleneck === 'Aprobacion' ? 'error' : bottleneck === 'Asset Mgmt' ? 'warning' : 'info'
    },
    {
      id: 'pipeline-velocity',
      label: 'Pipeline velocity',
      value: `${velocityPerWeek} assets/sem`,
      description: 'Promedio de assets completados por semana (ultimo mes)',
      tone: velocityPerWeek > 3 ? 'success' : velocityPerWeek > 1 ? 'warning' : 'error'
    },
    {
      id: 'stuck-count',
      label: 'Stuck assets',
      value: formatInteger(stuckCount),
      description: 'Items sin movimiento por mas de 48h en fases activas.',
      tone: stuckCount === 0 ? 'success' : stuckCount <= 2 ? 'warning' : 'error'
    }
  ]

  return { type: 'metrics-row', items }
}

export const buildCreativeStuckCardData = (tasks: CreativeHubTask[]): CapabilityCardData => {
  const items: CapabilityAlertItem[] = [...tasks]
    .filter(task => task.cscPhase !== 'Completado' && (task.hoursSinceUpdate || 0) > 48)
    .sort((left, right) => (right.hoursSinceUpdate || 0) - (left.hoursSinceUpdate || 0))
    .slice(0, 6)
    .map(task => ({
      id: task.id,
      name: task.name,
      project: task.projectName,
      phase: task.cscPhase,
      daysStuck: Math.round(((((task.hoursSinceUpdate || 0) / 24) + Number.EPSILON) * 10)) / 10,
      severity: (task.hoursSinceUpdate || 0) >= 96 ? 'danger' : 'warning',
      frameUrl: task.frameUrl || task.projectPageUrl
    }))

  return {
    type: 'alert-list',
    items,
    emptyMessage: 'No hay assets detenidos. El pipeline fluye sin obstaculos.'
  }
}

export const buildCreativeHubCardData = ({
  snapshot,
  metrics,
  projects,
  quality
}: {
  snapshot: CapabilityModuleSnapshot
  metrics: CapabilityMetric[]
  projects: CapabilityProjectItem[]
  quality: CapabilityQualityItem[]
}): Record<string, CapabilityCardData> => ({
  ...buildBaseCapabilityCardData({
    metricCardId: 'creative-metrics',
    metrics,
    projectCardId: 'creative-projects',
    projects,
    qualityCardId: 'creative-quality',
    quality
  }),
  'creative-review-pipeline': {
    type: 'metric-list',
    items: buildCreativePipelineItems(snapshot)
  },
  'creative-review-hotspots': buildCreativeReviewHotspotCard(snapshot)
})
