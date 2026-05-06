import type {
  GreenhouseDashboardData,
  GreenhouseDashboardProjectRisk,
  GreenhouseKpiTone
} from '@/types/greenhouse-dashboard'
import type { ChipGroupItem } from '@/components/greenhouse'
import { formatDateTime } from '@/lib/format'

export type DashboardTheme = 'general' | 'creative' | 'crm' | 'web'

export type DashboardThemeCopy = {
  heroLabel: string
  heroTitle: string
  heroDescription: string
  throughputTitle: string
  throughputDescription: string
  statusMixTitle: string
  statusMixDescription: string
  effortMixTitle: string
  effortMixDescription: string
  projectsTitle: string
  projectsDescription: string
}

export type ModuleBadge = ChipGroupItem & {
  brand?: string
  surface: 'business-line' | 'service-module'
}

export type ModuleFocusCard = {
  key: string
  eyebrow: string
  title: string
  value: string
  detail: string
  tone: GreenhouseKpiTone
}

export const statusColorMap: Record<string, string> = {
  active: 'var(--mui-palette-primary-main)',
  review: 'var(--mui-palette-warning-main)',
  changes: 'var(--mui-palette-error-main)',
  blocked: 'var(--mui-palette-secondary-main)',
  queued: 'var(--mui-palette-info-main)',
  completed: 'var(--mui-palette-success-main)',
  closed: 'var(--mui-palette-text-disabled)',
  other: 'var(--mui-palette-grey-500)'
}

export const effortColorMap: Record<string, string> = {
  high: 'var(--mui-palette-error-main)',
  medium: 'var(--mui-palette-warning-main)',
  low: 'var(--mui-palette-success-main)',
  unknown: 'var(--mui-palette-info-main)'
}

const serviceModuleLabelMap: Record<string, string> = {
  agencia_creativa: 'Agencia creativa',
  consultoria_crm: 'Consultoria CRM',
  desarrollo_web: 'Desarrollo web',
  implementacion_onboarding: 'Onboarding CRM',
  licenciamiento_hubspot: 'Licenciamiento HubSpot'
}

const businessLineLabelMap: Record<string, string> = {
  crm_solutions: 'CRM Solutions',
  globe: 'Globe',
  reach: 'Reach',
  wave: 'Wave',
  efeonce_digital: 'Efeonce'
}

const crmServiceModules = new Set(['licenciamiento_hubspot', 'implementacion_onboarding', 'consultoria_crm'])

const formatModuleLabel = (value: string, dictionary: Record<string, string>) =>
  dictionary[value] || value.replace(/_/g, ' ')

const getFocusTone = (value: number, warningThreshold: number, errorThreshold: number): GreenhouseKpiTone => {
  if (value >= errorThreshold) {
    return 'error'
  }

  if (value >= warningThreshold) {
    return 'warning'
  }

  return 'success'
}

export const formatSyncedAt = (value: string | null) => {
  if (!value) {
    return 'sin sincronizacion registrada'
  }

  return formatDateTime(value, { fallback: value })
}

export const formatDelta = (value: number) => {
  if (value > 0) {
    return `+${value}`
  }

  return String(value)
}

export const hasMonthlyDeliverySignals = (data: GreenhouseDashboardData) => data.charts.monthlyDelivery.length > 0

export const hasAccountTeam = (data: GreenhouseDashboardData) => data.accountTeam.members.length > 0

export const hasTooling = (data: GreenhouseDashboardData) =>
  data.tooling.technologyTools.length > 0 || data.tooling.aiTools.length > 0

export const hasQualitySignals = (data: GreenhouseDashboardData) => data.qualitySignals.length > 0

export const getProjectTone = (project: GreenhouseDashboardProjectRisk) => {
  if (project.blockedTasks > 0 || project.reviewPressureTasks >= 6) {
    return 'error'
  }

  if ((project.onTimePct ?? 100) < 65 || project.reviewPressureTasks >= 3) {
    return 'warning'
  }

  return 'success'
}

export const resolveDashboardTheme = (data: GreenhouseDashboardData): DashboardTheme => {
  const businessLines = new Set(data.scope.businessLines)
  const serviceModules = new Set(data.scope.serviceModules)

  if (serviceModules.has('agencia_creativa') || businessLines.has('globe')) {
    return 'creative'
  }

  if (serviceModules.has('desarrollo_web') || businessLines.has('wave')) {
    return 'web'
  }

  if (Array.from(serviceModules).some(moduleCode => crmServiceModules.has(moduleCode)) || businessLines.has('crm_solutions')) {
    return 'crm'
  }

  return 'general'
}

export const buildThemeCopy = (theme: DashboardTheme): DashboardThemeCopy => {
  switch (theme) {
    case 'creative':
      return {
        heroLabel: 'Creative operations',
        heroTitle: 'Throughput, review pressure y salud del portfolio en una sola lectura.',
        heroDescription: 'El hero resume la señal principal del space; el detalle operativo queda distribuido en cards de apoyo.',
        throughputTitle: 'Cadencia de piezas y salidas',
        throughputDescription: 'Mide cuanto trabajo creativo entra al flujo y cuanto ya logra salir con cierre real.',
        statusMixTitle: 'Mix del flujo creativo',
        statusMixDescription: 'Distribucion del trabajo visible entre produccion, revision, cambios del cliente y cierre.',
        effortMixTitle: 'Carga creativa por esfuerzo',
        effortMixDescription: 'Sirve para leer presion del equipo y mezcla de demanda mientras capacidad contractual sigue pendiente.',
        projectsTitle: 'Cuentas y proyectos bajo atencion',
        projectsDescription: 'El ranking prioriza los frentes con mas riesgo creativo, friccion de revision y bloqueos visibles.'
      }
    case 'crm':
      return {
        heroLabel: 'CRM operations',
        heroTitle: 'Activacion, backlog visible y estabilidad operativa en una sola vista.',
        heroDescription: 'El hero muestra la señal principal del servicio y deja el detalle CRM en cards accionables y comparables.',
        throughputTitle: 'Momentum de activacion y cierre',
        throughputDescription: 'Compara el backlog que entra a la operacion CRM contra lo que ya se logra cerrar y estabilizar.',
        statusMixTitle: 'Mix de operacion CRM',
        statusMixDescription: 'Ayuda a ver cuanto trabajo esta en ejecucion, revision o atrapado en cambios del cliente.',
        effortMixTitle: 'Carga operativa del portfolio CRM',
        effortMixDescription: 'No es capacidad contratada aun, pero si una lectura util de saturacion y demanda del servicio.',
        projectsTitle: 'Implementaciones y cuentas bajo observacion',
        projectsDescription: 'El ranking cruza salud on-time, cola visible, cambios del cliente y revision abierta.'
      }
    case 'web':
      return {
        heroLabel: 'Web delivery',
        heroTitle: 'Cadencia, bloqueos y carga activa del delivery en una sola vista.',
        heroDescription: 'El hero deja la historia corta arriba del fold y mueve la lectura de release, quality y capacity a cards dedicadas.',
        throughputTitle: 'Cadencia de ejecucion y salida',
        throughputDescription: 'Mide si la operacion logra sostener un ritmo sano entre entrada de trabajo y cierre del backlog.',
        statusMixTitle: 'Mix de delivery web',
        statusMixDescription: 'Distribucion del trabajo entre ejecucion, bloqueo, cambios del cliente y cierre.',
        effortMixTitle: 'Carga tecnica por esfuerzo',
        effortMixDescription: 'Ayuda a leer presion de ejecucion mientras la capa formal de team y capacity sigue pendiente.',
        projectsTitle: 'Builds y frentes bajo atencion',
        projectsDescription: 'El ranking prioriza los proyectos con mas bloqueo, riesgo on-time y presion operativa.'
      }
    default:
      return {
        heroLabel: 'Executive dashboard',
        heroTitle: 'La operacion del cliente se entiende rapido, sin recorrer cada card.',
        heroDescription: 'El hero concentra la lectura ejecutiva y deja la evidencia operativa distribuida en bloques mas faciles de escanear.',
        throughputTitle: 'Momentum de entrega',
        throughputDescription: 'Compara el flujo de trabajo que entra contra el trabajo que ya esta saliendo al mercado.',
        statusMixTitle: 'Mix operativo actual',
        statusMixDescription: 'Distribucion del trabajo visible entre cola, ejecucion, revision, cambios y cierre.',
        effortMixTitle: 'Carga por esfuerzo',
        effortMixDescription: 'No es capacidad contractual todavia, pero si una buena lectura de presion y mezcla de demanda.',
        projectsTitle: 'Proyectos bajo atencion',
        projectsDescription:
          'El ranking combina salud on-time, carga activa, bloqueos y friccion de revision para priorizar lectura ejecutiva.'
      }
  }
}

export const buildModuleBadges = (data: GreenhouseDashboardData): ModuleBadge[] => {
  const businessLineBadges = data.scope.businessLines.map(moduleCode => ({
    key: `business-line-${moduleCode}`,
    label: formatModuleLabel(moduleCode, businessLineLabelMap),
    brand: moduleCode,
    color: 'info' as const,
    variant: 'outlined' as const,
    surface: 'business-line' as const
  }))

  const serviceModuleBadges = data.scope.serviceModules.map(moduleCode => ({
    key: `service-module-${moduleCode}`,
    label: formatModuleLabel(moduleCode, serviceModuleLabelMap),
    color: 'primary' as const,
    variant: 'tonal' as const,
    surface: 'service-module' as const
  }))

  return [...businessLineBadges, ...serviceModuleBadges]
}

export const buildModuleFocusCards = (data: GreenhouseDashboardData, theme: DashboardTheme): ModuleFocusCard[] => {
  const cards: ModuleFocusCard[] = []

  for (const moduleCode of data.scope.serviceModules) {
    if (moduleCode === 'agencia_creativa') {
      cards.push({
        key: moduleCode,
        eyebrow: 'Creative delivery',
        title: 'Revision y salida de piezas',
        value: String(data.summary.reviewPressureTasks),
        detail: `${data.summary.openFrameComments} comentarios abiertos y ${data.summary.completedLast30Days} entregadas en 30 dias.`,
        tone: getFocusTone(data.summary.reviewPressureTasks, 4, 8)
      })
    }

    if (moduleCode === 'desarrollo_web') {
      cards.push({
        key: moduleCode,
        eyebrow: 'Web execution',
        title: 'Bloqueos y carga activa',
        value: String(data.summary.blockedTasks),
        detail: `${data.summary.activeWorkItems} items activos y ${data.summary.queuedWorkItems} en cola para entrar al flujo.`,
        tone: getFocusTone(data.summary.blockedTasks, 1, 3)
      })
    }

    if (moduleCode === 'implementacion_onboarding') {
      cards.push({
        key: moduleCode,
        eyebrow: 'Onboarding',
        title: 'Avance del backlog visible',
        value: `${data.summary.completionRate}%`,
        detail: `${data.summary.queuedWorkItems} items listos para entrar y ${data.summary.projectsAtRisk} proyectos bajo observacion.`,
        tone: data.summary.completionRate >= 65 ? 'success' : data.summary.completionRate >= 45 ? 'warning' : 'error'
      })
    }

    if (moduleCode === 'consultoria_crm') {
      cards.push({
        key: moduleCode,
        eyebrow: 'Consultoria CRM',
        title: 'Cambios del cliente y friccion',
        value: String(data.summary.clientChangeTasks),
        detail: `${data.summary.reviewPressureTasks} items con revision abierta y ${data.summary.avgOnTimePct}% on-time del portfolio.`,
        tone: getFocusTone(data.summary.clientChangeTasks, 2, 5)
      })
    }

    if (moduleCode === 'licenciamiento_hubspot') {
      cards.push({
        key: moduleCode,
        eyebrow: 'HubSpot licensing',
        title: 'Portfolio activo con contexto comercial',
        value: String(data.scope.projectCount),
        detail: `${data.summary.healthyProjects} proyectos saludables y ${data.summary.projectsAtRisk} en observacion hoy.`,
        tone: data.summary.projectsAtRisk > 0 ? 'warning' : 'success'
      })
    }
  }

  if (cards.length > 0) {
    return cards.slice(0, 3)
  }

  if (theme === 'creative') {
    return [
      {
        key: 'creative-fallback',
        eyebrow: 'Creative delivery',
        title: 'Revision abierta del portfolio',
        value: String(data.summary.reviewPressureTasks),
        detail: `${data.summary.openFrameComments} comentarios abiertos sobre ${data.scope.projectCount} proyectos visibles.`,
        tone: getFocusTone(data.summary.reviewPressureTasks, 4, 8)
      }
    ]
  }

  if (theme === 'crm') {
    return [
      {
        key: 'crm-fallback',
        eyebrow: 'CRM operations',
        title: 'Estabilidad del portfolio',
        value: `${data.summary.avgOnTimePct}%`,
        detail: `${data.summary.completedLast30Days} entregas recientes y ${data.summary.clientChangeTasks} cambios de cliente.`,
        tone: data.summary.avgOnTimePct >= 75 ? 'success' : data.summary.avgOnTimePct >= 60 ? 'warning' : 'error'
      }
    ]
  }

  if (theme === 'web') {
    return [
      {
        key: 'web-fallback',
        eyebrow: 'Web delivery',
        title: 'Carga activa del delivery',
        value: String(data.summary.activeWorkItems),
        detail: `${data.summary.blockedTasks} bloqueadas y ${data.summary.queuedWorkItems} pendientes de entrar.`,
        tone: getFocusTone(data.summary.blockedTasks, 1, 3)
      }
    ]
  }

  return [
    {
      key: 'general-fallback',
      eyebrow: 'Portfolio health',
      title: 'Trabajo visible en el portal',
      value: String(data.summary.activeWorkItems),
      detail: `${data.summary.reviewPressureTasks} items con revision abierta y ${data.summary.projectsAtRisk} proyectos bajo observacion.`,
      tone: data.summary.projectsAtRisk > 0 ? 'warning' : 'success'
    }
  ]
}
