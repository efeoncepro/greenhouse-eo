import type {
  CapabilityCardData,
  CapabilityMetric,
  CapabilityMetricListItem,
  CapabilityModuleData,
  CapabilityQualityItem,
  CapabilityProjectItem,
  CapabilityToolItem
} from '@/types/capabilities'
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
