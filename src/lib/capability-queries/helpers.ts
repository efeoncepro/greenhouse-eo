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

export const buildCreativeRevenueCardData = (snapshot: CapabilityModuleSnapshot): CapabilityCardData => {
  const latestSignal = [...snapshot.qualitySignals].reverse()[0] ?? null
  const avgRpa = latestSignal?.avgRpa ?? null
  const ftrPct = latestSignal?.firstTimeRightPct ?? null
  const otdPct = snapshot.summary.avgOnTimePct

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

export const buildCreativePipelineCardData = (snapshot: CapabilityModuleSnapshot): CapabilityCardData => {
  const { activeWorkItems, reviewPressureTasks, queuedWorkItems, blockedTasks, completedLast30Days } = snapshot.summary

  const production = Math.max(0, activeWorkItems - reviewPressureTasks - blockedTasks)

  const phases: CapabilityPipelinePhase[] = [
    { id: 'planning',   label: 'Planning',   color: GH_COLORS.cscPhase.planning.source,   count: Math.ceil(queuedWorkItems * 0.5) },
    { id: 'briefing',   label: 'Briefing',   color: GH_COLORS.cscPhase.briefing.source,   count: Math.floor(queuedWorkItems * 0.5) },
    { id: 'produccion', label: 'Produccion', color: GH_COLORS.cscPhase.production.source, count: production },
    { id: 'aprobacion', label: 'Aprobacion', color: GH_COLORS.cscPhase.approval.source,   count: reviewPressureTasks },
    { id: 'asset-mgmt', label: 'Asset Mgmt', color: GH_COLORS.cscPhase.assetMgmt.source,  count: blockedTasks },
    { id: 'completado', label: 'Completado', color: GH_COLORS.cscPhase.completed.source,  count: completedLast30Days }
  ]

  const total = phases.reduce((sum, phase) => sum + phase.count, 0)

  return { type: 'pipeline', phases, total }
}

export const buildCreativeCscMetricsCardData = (snapshot: CapabilityModuleSnapshot): CapabilityCardData => {
  const { reviewPressureTasks, blockedTasks, completedLast30Days, queuedWorkItems } = snapshot.summary

  const bottleneck =
    reviewPressureTasks >= blockedTasks && reviewPressureTasks >= queuedWorkItems
      ? 'Aprobacion'
      : blockedTasks >= queuedWorkItems
        ? 'Asset Mgmt'
        : 'Planning'

  const velocityPerWeek = Math.round((completedLast30Days / 4) * 10) / 10

  const items: CapabilityMetricsRowItem[] = [
    {
      id: 'cycle-time',
      label: 'Cycle time referencia',
      value: `${INDUSTRY_CYCLE_DAYS}d industria`,
      description: `${formatInteger(completedLast30Days)} items completados este mes`,
      tone: 'info'
    },
    {
      id: 'bottleneck',
      label: 'Bottleneck actual',
      value: bottleneck,
      description: 'Fase con mayor concentracion de assets activos',
      tone: reviewPressureTasks > 5 ? 'error' : reviewPressureTasks > 2 ? 'warning' : 'success'
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
      value: formatInteger(blockedTasks),
      description: 'Items bloqueados sin movimiento en el pipeline',
      tone: blockedTasks === 0 ? 'success' : blockedTasks <= 2 ? 'warning' : 'error'
    }
  ]

  return { type: 'metrics-row', items }
}

export const buildCreativeStuckCardData = (snapshot: CapabilityModuleSnapshot): CapabilityCardData => {
  const items: CapabilityAlertItem[] = [...snapshot.projects]
    .filter(project => project.blockedTasks > 0)
    .sort((a, b) => b.blockedTasks - a.blockedTasks)
    .slice(0, 6)
    .map(project => ({
      id: project.id,
      name: `${formatInteger(project.blockedTasks)} ${project.blockedTasks === 1 ? 'asset bloqueado' : 'assets bloqueados'}`,
      project: project.name,
      phase: project.reviewPressureTasks > 0 ? 'Aprobacion' : 'Produccion',
      daysStuck: 2,
      severity: project.blockedTasks >= 3 ? 'danger' : 'warning',
      frameUrl: project.pageUrl
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
