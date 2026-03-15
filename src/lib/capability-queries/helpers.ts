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
import type { CapabilityModuleSnapshot, CapabilitySnapshotProject } from '@/lib/capability-queries/shared'

const integerFormatter = new Intl.NumberFormat('es-CL')
const percentFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

const formatInteger = (value: number) => integerFormatter.format(value)
const formatPercent = (value: number | null) => `${percentFormatter.format(Math.max(0, value || 0))}%`

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

const INDUSTRY_RPA = 3.5
const INDUSTRY_CYCLE_DAYS = 14.2
const INDUSTRY_OTD = 0.7

const average = (values: number[]) => {
  if (values.length === 0) {
    return null
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const formatDays = (value: number | null) => (value !== null ? `${Math.round(value * 10) / 10} dias` : null)
const formatRatio = (value: number | null, suffix = 'x') => (value !== null ? `${Math.round(value * 10) / 10}${suffix}` : null)

const buildCreativeBrandConsistency = (tasks: CreativeHubTask[]) => {
  const completedTasks = tasks.filter(task => task.cscPhase === 'Completado')
  const firstTimeRightBase = completedTasks.filter(task => task.clientChangeRounds !== null)

  if (completedTasks.length === 0 || firstTimeRightBase.length === 0) {
    return null
  }

  const firstTimeRightPct = Math.round(
    (firstTimeRightBase.filter(task => task.clientChangeRounds === 0).length / firstTimeRightBase.length) * 100
  )

  const lowFrictionBase = completedTasks.filter(task => task.rpaValue !== null)

  const lowFrictionPct =
    lowFrictionBase.length > 0
      ? Math.round((lowFrictionBase.filter(task => (task.rpaValue || 0) <= 2).length / lowFrictionBase.length) * 100)
      : null

  if (lowFrictionPct === null) {
    return firstTimeRightPct
  }

  return Math.round((firstTimeRightPct + lowFrictionPct) / 2)
}

export const buildCreativeRevenueCardData = (
  snapshot: CapabilityModuleSnapshot,
  tasks: CreativeHubTask[]
): CapabilityCardData => {
  const completedTasks = tasks.filter(task => task.cscPhase === 'Completado')
  const firstTimeRightBase = completedTasks.filter(task => task.clientChangeRounds !== null)

  const avgRpa = average(
    completedTasks
      .map(task => task.rpaValue)
      .filter((value): value is number => value !== null && value > 0)
  )

  const ftrPct =
    firstTimeRightBase.length > 0
      ? Math.round((firstTimeRightBase.filter(task => task.clientChangeRounds === 0).length / firstTimeRightBase.length) * 100)
      : null

  const otdBase = completedTasks.filter(task => task.completedAt && task.deadlineAt)

  const otdPct =
    otdBase.length > 0
      ? Math.round(
          (otdBase.filter(task => new Date(task.completedAt || '').getTime() <= new Date(task.deadlineAt || '').getTime()).length /
            otdBase.length) *
            100
        )
      : snapshot.summary.avgOnTimePct

  const daysGained =
    otdPct > INDUSTRY_OTD * 100
      ? Math.round((otdPct / 100 - INDUSTRY_OTD) * INDUSTRY_CYCLE_DAYS * 10) / 10
      : 0

  const iterationVelocity =
    avgRpa !== null && avgRpa > 0 ? Math.round((INDUSTRY_RPA / avgRpa) * 10) / 10 : null

  const throughputGain =
    avgRpa !== null && avgRpa > 0 ? Math.round(((INDUSTRY_RPA / avgRpa) - 1) * 100) : null

  const items: CapabilityMetricsRowItem[] = [
    {
      id: 'early-launch',
      label: 'Early Launch Advantage',
      value: daysGained > 0 ? `+${daysGained} dias` : '0 dias',
      description: `Dias de mercado ganados vs industria (OTD ${formatPercent(otdPct)} vs ${formatPercent(INDUSTRY_OTD * 100)} std)`,
      tone: daysGained > 0 ? 'success' : otdPct >= 55 ? 'warning' : 'error'
    },
    {
      id: 'iteration-velocity',
      label: 'Iteration Velocity',
      value: iterationVelocity !== null ? `${iterationVelocity}x` : null,
      description: 'Ciclos creativos posibles vs velocidad estandar de industria',
      tone: iterationVelocity !== null && iterationVelocity > 1 ? 'success' : 'warning'
    },
    {
      id: 'creative-throughput',
      label: 'Creative Throughput',
      value: throughputGain !== null ? `+${throughputGain}%` : null,
      description: 'Mas assets producidos con la misma capacidad vs RpA de industria (3.5x)',
      tone: throughputGain !== null && throughputGain > 0 ? 'success' : 'info'
    },
    {
      id: 'ftr',
      label: 'First Time Right',
      value: ftrPct !== null ? formatPercent(ftrPct) : null,
      description: 'Piezas aprobadas sin rondas de cambio en el ultimo periodo',
      tone: ftrPct !== null && ftrPct >= 70 ? 'success' : ftrPct !== null && ftrPct >= 50 ? 'warning' : 'error'
    }
  ]

  return { type: 'metrics-row', items }
}

export const buildCreativeBrandMetricsCardData = (tasks: CreativeHubTask[]): CapabilityCardData => {
  const completedTasks = tasks.filter(task => task.cscPhase === 'Completado')
  const firstTimeRightBase = completedTasks.filter(task => task.clientChangeRounds !== null)

  const firstTimeRightPct =
    firstTimeRightBase.length > 0
      ? Math.round((firstTimeRightBase.filter(task => task.clientChangeRounds === 0).length / firstTimeRightBase.length) * 100)
      : null

  const avgRpa = average(
    completedTasks
      .map(task => task.rpaValue)
      .filter((value): value is number => value !== null && value > 0)
  )

  const reviewOpenCount = tasks.filter(task => task.cscPhase === 'Aprobacion').length
  const brandConsistency = buildCreativeBrandConsistency(tasks)

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
      description: 'Indice derivado de First Time Right y friccion de revision del portfolio creativo.',
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
