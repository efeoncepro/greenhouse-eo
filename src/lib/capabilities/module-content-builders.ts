import type { CapabilityHeroSummary, CapabilityMetric, CapabilityViewerContext } from '@/types/capabilities'
import type { CapabilityModuleSnapshot } from '@/lib/capability-queries/shared'

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
  snapshot: CapabilityModuleSnapshot
}

type ModuleContent = {
  hero: CapabilityHeroSummary
  metrics: CapabilityMetric[]
}

const buildCreativeContent = ({ snapshot }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'Creative capability',
    title: 'Creative delivery, growth signal y guardrails visibles en una sola superficie.',
    description:
      'Este modulo prepara la conversacion tipo Creative Velocity Review para cuentas creativas. Separa drivers operativos, metricas puente y Revenue Enabled sin vender precision falsa.',
    summaryLabel: 'Output visible',
    summaryValue: formatInteger(snapshot.summary.completedLast30Days),
    summaryDetail: `${formatInteger(snapshot.summary.reviewPressureTasks)} items esperan revision y ${formatInteger(
      snapshot.summary.openFrameComments
    )} comentarios siguen abiertos. El resto del review baja esa senal a narrativa trimestral y policy visible.`,
    highlights: [
      { label: 'Portfolio visible', value: formatInteger(snapshot.scope.projectCount) },
      { label: 'En revision', value: formatInteger(snapshot.summary.reviewPressureTasks) },
      { label: 'OTD%', value: formatPercent(snapshot.summary.avgOnTimePct) }
    ],
    badges: buildBadges(snapshot.viewer)
  },
  metrics: [
    {
      id: 'creative-otd',
      chipLabel: 'Delivery health',
      chipTone: snapshot.summary.avgOnTimePct >= 75 ? 'success' : snapshot.summary.avgOnTimePct >= 60 ? 'warning' : 'error',
      title: 'On-time delivery',
      value: formatPercent(snapshot.summary.avgOnTimePct),
      detail: `${formatInteger(snapshot.summary.healthyProjects)} proyectos saludables y ${formatInteger(
        snapshot.summary.projectsAtRisk
      )} bajo observacion.`
    },
    {
      id: 'creative-review',
      chipLabel: 'Review pressure',
      chipTone:
        snapshot.summary.reviewPressureTasks >= 8 ? 'error' : snapshot.summary.reviewPressureTasks >= 4 ? 'warning' : 'info',
      title: 'Revision abierta',
      value: formatInteger(snapshot.summary.reviewPressureTasks),
      detail: `${formatInteger(snapshot.summary.openFrameComments)} comentarios abiertos y ${formatInteger(
        snapshot.summary.clientChangeTasks
      )} items con cambios cliente.`
    },
    {
      id: 'creative-active',
      chipLabel: 'Flow load',
      chipTone: snapshot.summary.blockedTasks > 0 ? 'warning' : 'success',
      title: 'Trabajo activo',
      value: formatInteger(snapshot.summary.activeWorkItems),
      detail: `${formatInteger(snapshot.summary.queuedWorkItems)} items en cola y ${formatInteger(
        snapshot.summary.blockedTasks
      )} bloqueadas.`
    }
  ]
})

const buildCrmContent = ({ snapshot }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'CRM capability',
    title: 'Backlog, estabilidad y cambios del cliente visibles para operaciones CRM.',
    description:
      'El modulo resume la lectura principal del servicio CRM: avance visible, friccion, salud on-time y carga operativa del portfolio.',
    summaryLabel: 'Completion rate',
    summaryValue: formatPercent(snapshot.summary.completionRate),
    summaryDetail: `${formatInteger(snapshot.summary.activeWorkItems)} items activos sobre ${formatInteger(
      snapshot.summary.totalTasks
    )} visibles en Greenhouse.`,
    highlights: [
      { label: 'Projects', value: formatInteger(snapshot.scope.projectCount) },
      { label: 'Queued', value: formatInteger(snapshot.summary.queuedWorkItems) },
      { label: 'OTD%', value: formatPercent(snapshot.summary.avgOnTimePct) }
    ],
    badges: buildBadges(snapshot.viewer)
  },
  metrics: [
    {
      id: 'crm-active',
      chipLabel: 'Operations',
      chipTone: snapshot.summary.activeWorkItems >= 15 ? 'warning' : 'info',
      title: 'Carga activa',
      value: formatInteger(snapshot.summary.activeWorkItems),
      detail: `${formatInteger(snapshot.summary.queuedWorkItems)} pendientes de entrar al flujo.`
    },
    {
      id: 'crm-client-changes',
      chipLabel: 'Client friction',
      chipTone:
        snapshot.summary.clientChangeTasks >= 5 ? 'error' : snapshot.summary.clientChangeTasks >= 2 ? 'warning' : 'success',
      title: 'Cambios del cliente',
      value: formatInteger(snapshot.summary.clientChangeTasks),
      detail: `${formatInteger(snapshot.summary.reviewPressureTasks)} items siguen con revision o feedback abierto.`
    },
    {
      id: 'crm-risk',
      chipLabel: 'Portfolio risk',
      chipTone: snapshot.summary.projectsAtRisk > 0 ? 'warning' : 'success',
      title: 'Projects at risk',
      value: formatInteger(snapshot.summary.projectsAtRisk),
      detail: `${formatInteger(snapshot.summary.healthyProjects)} proyectos hoy estan en zona saludable.`
    }
  ]
})

const buildOnboardingContent = ({ snapshot }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'Onboarding capability',
    title: 'Onboarding e implementacion con una lectura ejecutiva mas compacta.',
    description:
      'El modulo reduce el onboarding a progreso, cola visible, riesgo y ritmo de cierre sin convertir Greenhouse en un workspace de ejecucion.',
    summaryLabel: 'Visible progress',
    summaryValue: formatPercent(snapshot.summary.completionRate),
    summaryDetail: `${formatInteger(snapshot.summary.completedLast30Days)} cierres recientes frente a ${formatInteger(
      snapshot.summary.createdLast30Days
    )} items creados en 30 dias.`,
    highlights: [
      { label: 'Healthy projects', value: formatInteger(snapshot.summary.healthyProjects) },
      { label: 'Queued', value: formatInteger(snapshot.summary.queuedWorkItems) },
      { label: 'At risk', value: formatInteger(snapshot.summary.projectsAtRisk) }
    ],
    badges: buildBadges(snapshot.viewer)
  },
  metrics: [
    {
      id: 'onboarding-completion',
      chipLabel: 'Completion',
      chipTone: snapshot.summary.completionRate >= 65 ? 'success' : snapshot.summary.completionRate >= 45 ? 'warning' : 'error',
      title: 'Completion rate',
      value: formatPercent(snapshot.summary.completionRate),
      detail: `${formatInteger(snapshot.summary.completedTasks)} items completados de ${formatInteger(
        snapshot.summary.totalTasks
      )} visibles.`
    },
    {
      id: 'onboarding-queue',
      chipLabel: 'Pipeline',
      chipTone: snapshot.summary.queuedWorkItems > snapshot.summary.activeWorkItems ? 'warning' : 'info',
      title: 'Backlog pendiente',
      value: formatInteger(snapshot.summary.queuedWorkItems),
      detail: `${formatInteger(snapshot.summary.activeWorkItems)} items ya estan en ejecucion.`
    },
    {
      id: 'onboarding-risk',
      chipLabel: 'Risk watch',
      chipTone: snapshot.summary.projectsAtRisk > 0 ? 'warning' : 'success',
      title: 'Projects under watch',
      value: formatInteger(snapshot.summary.projectsAtRisk),
      detail: `${formatInteger(snapshot.summary.reviewPressureTasks)} items con revision abierta o feedback pendiente.`
    }
  ]
})

const buildWebContent = ({ snapshot }: BuilderArgs): ModuleContent => ({
  hero: {
    eyebrow: 'Web capability',
    title: 'Delivery web visible con foco en bloqueos, carga activa y salida.',
    description:
      'Este modulo resume el estado del delivery web sin exponer la cocina completa. Sirve para leer ejecucion, bloqueos y riesgo de salida.',
    summaryLabel: 'Blocked tasks',
    summaryValue: formatInteger(snapshot.summary.blockedTasks),
    summaryDetail: `${formatInteger(snapshot.summary.activeWorkItems)} items activos y ${formatInteger(
      snapshot.summary.queuedWorkItems
    )} en cola siguen visibles hoy.`,
    highlights: [
      { label: 'Projects', value: formatInteger(snapshot.scope.projectCount) },
      { label: 'Active work', value: formatInteger(snapshot.summary.activeWorkItems) },
      { label: 'OTD%', value: formatPercent(snapshot.summary.avgOnTimePct) }
    ],
    badges: buildBadges(snapshot.viewer)
  },
  metrics: [
    {
      id: 'web-blocked',
      chipLabel: 'Blockers',
      chipTone: snapshot.summary.blockedTasks >= 3 ? 'error' : snapshot.summary.blockedTasks > 0 ? 'warning' : 'success',
      title: 'Bloqueos activos',
      value: formatInteger(snapshot.summary.blockedTasks),
      detail: `${formatInteger(snapshot.summary.reviewPressureTasks)} items siguen con presion de revision.`
    },
    {
      id: 'web-output',
      chipLabel: 'Recent output',
      chipTone: snapshot.summary.completedLast30Days > 0 ? 'success' : 'info',
      title: 'Salida reciente',
      value: formatInteger(snapshot.summary.completedLast30Days),
      detail: `${formatInteger(snapshot.summary.createdLast30Days)} items entraron al flujo en 30 dias.`
    },
    {
      id: 'web-risk',
      chipLabel: 'Delivery health',
      chipTone: snapshot.summary.avgOnTimePct >= 75 ? 'success' : snapshot.summary.avgOnTimePct >= 60 ? 'warning' : 'error',
      title: 'On-time delivery',
      value: formatPercent(snapshot.summary.avgOnTimePct),
      detail: `${formatInteger(snapshot.summary.projectsAtRisk)} proyectos bajo observacion dentro del scope visible.`
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
  snapshot
}: BuilderArgs & { moduleId: string }): ModuleContent | null => {
  const builder = builders[moduleId]

  return builder ? builder({ snapshot }) : null
}
