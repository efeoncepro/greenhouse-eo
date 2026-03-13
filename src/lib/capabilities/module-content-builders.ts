import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import type { CapabilityHeroSummary, CapabilityMetric, CapabilityViewerContext } from '@/types/capabilities'

const integerFormatter = new Intl.NumberFormat('es-CL')
const percentFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

const serviceModuleLabelMap: Record<string, string> = {
  agencia_creativa: 'Agencia creativa',
  consultoria_crm: 'Consultoria CRM',
  desarrollo_web: 'Desarrollo web',
  implementacion_onboarding: 'Implementacion onboarding',
  licenciamiento_hubspot: 'Licenciamiento HubSpot'
}

const businessLineLabelMap: Record<string, string> = {
  crm_solutions: 'CRM Solutions',
  globe: 'Globe',
  wave: 'Wave',
  unknown: 'Unknown'
}

const formatModuleLabel = (value: string, dictionary: Record<string, string>) =>
  dictionary[value] || value.replace(/_/g, ' ')

const formatInteger = (value: number) => integerFormatter.format(value)
const formatPercent = (value: number | null) => `${percentFormatter.format(Math.max(0, value || 0))}%`

const buildBadges = (viewer: CapabilityViewerContext) => [
  ...viewer.businessLines.map(moduleCode => formatModuleLabel(moduleCode, businessLineLabelMap)),
  ...viewer.serviceModules.map(moduleCode => formatModuleLabel(moduleCode, serviceModuleLabelMap))
]

type BuilderArgs = {
  dashboardData: GreenhouseDashboardData
  viewer: CapabilityViewerContext
}

type ModuleContent = {
  hero: CapabilityHeroSummary
  metrics: CapabilityMetric[]
}

const buildCreativeContent = ({ dashboardData, viewer }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'Creative capability',
    title: 'Creative delivery, revision y salida visibles en una sola superficie.',
    description:
      'Este modulo condensa la lectura ejecutiva para cuentas creativas sin abrir una pared de tablas. Prioriza revision, volumen de salida y friccion del portfolio.',
    summaryLabel: 'Piezas entregadas',
    summaryValue: formatInteger(dashboardData.summary.completedLast30Days),
    summaryDetail: `${formatInteger(dashboardData.summary.reviewPressureTasks)} items esperan revision y ${formatInteger(
      dashboardData.summary.openFrameComments
    )} comentarios siguen abiertos.`,
    highlights: [
      { label: 'Portfolio visible', value: formatInteger(dashboardData.scope.projectCount) },
      { label: 'En revision', value: formatInteger(dashboardData.summary.reviewPressureTasks) },
      { label: 'OTD%', value: formatPercent(dashboardData.summary.avgOnTimePct) }
    ],
    badges: buildBadges(viewer)
  },
  metrics: [
    {
      id: 'creative-otd',
      chipLabel: 'Delivery health',
      chipTone: dashboardData.summary.avgOnTimePct >= 75 ? 'success' : dashboardData.summary.avgOnTimePct >= 60 ? 'warning' : 'error',
      title: 'On-time delivery',
      value: formatPercent(dashboardData.summary.avgOnTimePct),
      detail: `${formatInteger(dashboardData.summary.healthyProjects)} proyectos saludables y ${formatInteger(
        dashboardData.summary.projectsAtRisk
      )} bajo observacion.`
    },
    {
      id: 'creative-review',
      chipLabel: 'Review pressure',
      chipTone:
        dashboardData.summary.reviewPressureTasks >= 8 ? 'error' : dashboardData.summary.reviewPressureTasks >= 4 ? 'warning' : 'info',
      title: 'Revision abierta',
      value: formatInteger(dashboardData.summary.reviewPressureTasks),
      detail: `${formatInteger(dashboardData.summary.openFrameComments)} comentarios abiertos y ${formatInteger(
        dashboardData.summary.clientChangeTasks
      )} items con cambios cliente.`
    },
    {
      id: 'creative-active',
      chipLabel: 'Flow load',
      chipTone: dashboardData.summary.blockedTasks > 0 ? 'warning' : 'success',
      title: 'Trabajo activo',
      value: formatInteger(dashboardData.summary.activeWorkItems),
      detail: `${formatInteger(dashboardData.summary.queuedWorkItems)} items en cola y ${formatInteger(
        dashboardData.summary.blockedTasks
      )} bloqueadas.`
    }
  ]
})

const buildCrmContent = ({ dashboardData, viewer }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'CRM capability',
    title: 'Backlog, estabilidad y cambios del cliente visibles para operaciones CRM.',
    description:
      'El modulo resume la lectura principal del servicio CRM: avance visible, friccion, salud on-time y carga operativa del portfolio.',
    summaryLabel: 'Completion rate',
    summaryValue: formatPercent(dashboardData.summary.completionRate),
    summaryDetail: `${formatInteger(dashboardData.summary.activeWorkItems)} items activos sobre ${formatInteger(
      dashboardData.summary.totalTasks
    )} visibles en Greenhouse.`,
    highlights: [
      { label: 'Projects', value: formatInteger(dashboardData.scope.projectCount) },
      { label: 'Queued', value: formatInteger(dashboardData.summary.queuedWorkItems) },
      { label: 'OTD%', value: formatPercent(dashboardData.summary.avgOnTimePct) }
    ],
    badges: buildBadges(viewer)
  },
  metrics: [
    {
      id: 'crm-active',
      chipLabel: 'Operations',
      chipTone: dashboardData.summary.activeWorkItems >= 15 ? 'warning' : 'info',
      title: 'Carga activa',
      value: formatInteger(dashboardData.summary.activeWorkItems),
      detail: `${formatInteger(dashboardData.summary.queuedWorkItems)} pendientes de entrar al flujo.`
    },
    {
      id: 'crm-client-changes',
      chipLabel: 'Client friction',
      chipTone:
        dashboardData.summary.clientChangeTasks >= 5 ? 'error' : dashboardData.summary.clientChangeTasks >= 2 ? 'warning' : 'success',
      title: 'Cambios del cliente',
      value: formatInteger(dashboardData.summary.clientChangeTasks),
      detail: `${formatInteger(dashboardData.summary.reviewPressureTasks)} items siguen con revision o feedback abierto.`
    },
    {
      id: 'crm-risk',
      chipLabel: 'Portfolio risk',
      chipTone: dashboardData.summary.projectsAtRisk > 0 ? 'warning' : 'success',
      title: 'Projects at risk',
      value: formatInteger(dashboardData.summary.projectsAtRisk),
      detail: `${formatInteger(dashboardData.summary.healthyProjects)} proyectos hoy estan en zona saludable.`
    }
  ]
})

const buildOnboardingContent = ({ dashboardData, viewer }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'Onboarding capability',
    title: 'Onboarding e implementacion con una lectura ejecutiva mas compacta.',
    description:
      'El modulo reduce el onboarding a progreso, cola visible, riesgo y ritmo de cierre sin convertir Greenhouse en un workspace de ejecucion.',
    summaryLabel: 'Visible progress',
    summaryValue: formatPercent(dashboardData.summary.completionRate),
    summaryDetail: `${formatInteger(dashboardData.summary.completedLast30Days)} cierres recientes frente a ${formatInteger(
      dashboardData.summary.createdLast30Days
    )} items creados en 30 dias.`,
    highlights: [
      { label: 'Healthy projects', value: formatInteger(dashboardData.summary.healthyProjects) },
      { label: 'Queued', value: formatInteger(dashboardData.summary.queuedWorkItems) },
      { label: 'At risk', value: formatInteger(dashboardData.summary.projectsAtRisk) }
    ],
    badges: buildBadges(viewer)
  },
  metrics: [
    {
      id: 'onboarding-completion',
      chipLabel: 'Completion',
      chipTone: dashboardData.summary.completionRate >= 65 ? 'success' : dashboardData.summary.completionRate >= 45 ? 'warning' : 'error',
      title: 'Completion rate',
      value: formatPercent(dashboardData.summary.completionRate),
      detail: `${formatInteger(dashboardData.summary.completedTasks)} items completados de ${formatInteger(
        dashboardData.summary.totalTasks
      )} visibles.`
    },
    {
      id: 'onboarding-queue',
      chipLabel: 'Pipeline',
      chipTone: dashboardData.summary.queuedWorkItems > dashboardData.summary.activeWorkItems ? 'warning' : 'info',
      title: 'Backlog pendiente',
      value: formatInteger(dashboardData.summary.queuedWorkItems),
      detail: `${formatInteger(dashboardData.summary.activeWorkItems)} items ya estan en ejecucion.`
    },
    {
      id: 'onboarding-risk',
      chipLabel: 'Risk watch',
      chipTone: dashboardData.summary.projectsAtRisk > 0 ? 'warning' : 'success',
      title: 'Projects under watch',
      value: formatInteger(dashboardData.summary.projectsAtRisk),
      detail: `${formatInteger(dashboardData.summary.reviewPressureTasks)} items con revision abierta o feedback pendiente.`
    }
  ]
})

const buildWebContent = ({ dashboardData, viewer }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'Web capability',
    title: 'Delivery web visible con foco en bloqueos, carga activa y salida.',
    description:
      'Este modulo resume el estado del delivery web sin exponer la cocina completa. Sirve para leer ejecucion, bloqueos y riesgo de salida.',
    summaryLabel: 'Blocked tasks',
    summaryValue: formatInteger(dashboardData.summary.blockedTasks),
    summaryDetail: `${formatInteger(dashboardData.summary.activeWorkItems)} items activos y ${formatInteger(
      dashboardData.summary.queuedWorkItems
    )} en cola siguen visibles hoy.`,
    highlights: [
      { label: 'Projects', value: formatInteger(dashboardData.scope.projectCount) },
      { label: 'Active work', value: formatInteger(dashboardData.summary.activeWorkItems) },
      { label: 'OTD%', value: formatPercent(dashboardData.summary.avgOnTimePct) }
    ],
    badges: buildBadges(viewer)
  },
  metrics: [
    {
      id: 'web-blocked',
      chipLabel: 'Blockers',
      chipTone: dashboardData.summary.blockedTasks >= 3 ? 'error' : dashboardData.summary.blockedTasks > 0 ? 'warning' : 'success',
      title: 'Bloqueos activos',
      value: formatInteger(dashboardData.summary.blockedTasks),
      detail: `${formatInteger(dashboardData.summary.reviewPressureTasks)} items siguen con presion de revision.`
    },
    {
      id: 'web-output',
      chipLabel: 'Recent output',
      chipTone: dashboardData.summary.completedLast30Days > 0 ? 'success' : 'info',
      title: 'Salida reciente',
      value: formatInteger(dashboardData.summary.completedLast30Days),
      detail: `${formatInteger(dashboardData.summary.createdLast30Days)} items entraron al flujo en 30 dias.`
    },
    {
      id: 'web-risk',
      chipLabel: 'Delivery health',
      chipTone: dashboardData.summary.avgOnTimePct >= 75 ? 'success' : dashboardData.summary.avgOnTimePct >= 60 ? 'warning' : 'error',
      title: 'On-time delivery',
      value: formatPercent(dashboardData.summary.avgOnTimePct),
      detail: `${formatInteger(dashboardData.summary.projectsAtRisk)} proyectos bajo observacion dentro del scope visible.`
    }
  ]
})

const builders: Record<string, (args: BuilderArgs) => ModuleContent> = {
  'creative-hub': buildCreativeContent,
  'crm-command-center': buildCrmContent,
  'onboarding-center': buildOnboardingContent,
  'web-delivery-lab': buildWebContent
}

export const buildCapabilityModuleContent = ({
  moduleId,
  dashboardData,
  viewer
}: BuilderArgs & { moduleId: string }): ModuleContent | null => {
  const builder = builders[moduleId]

  return builder ? builder({ dashboardData, viewer }) : null
}
