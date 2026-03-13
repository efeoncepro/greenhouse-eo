import 'server-only'

import { CAPABILITY_REGISTRY } from '@/config/capability-registry'
import { getDashboardOverview } from '@/lib/dashboard/get-dashboard-overview'
import { buildCapabilityModuleContent } from '@/lib/capabilities/module-content-builders'
import { getResolvedCapabilityModule } from '@/lib/capabilities/resolve-capabilities'
import type {
  CapabilityModuleData,
  CapabilityQualityItem,
  CapabilityToolItem,
  CapabilityViewerContext,
  ResolvedCapabilityModule
} from '@/types/capabilities'

const integerFormatter = new Intl.NumberFormat('es-CL')
const percentFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

const formatInteger = (value: number) => integerFormatter.format(value)
const formatPercent = (value: number | null) => `${percentFormatter.format(Math.max(0, value || 0))}%`

const buildQualityItems = (dashboardData: Awaited<ReturnType<typeof getDashboardOverview>>): CapabilityQualityItem[] =>
  dashboardData.qualitySignals.slice(-3).reverse().map(item => ({
    month: item.label,
    avgRpa: item.avgRpa !== null ? String(item.avgRpa) : '--',
    firstTimeRight:
      item.firstTimeRightPct !== null && item.firstTimeRightPct !== undefined ? formatPercent(item.firstTimeRightPct) : '--'
  }))

const buildToolItems = (dashboardData: Awaited<ReturnType<typeof getDashboardOverview>>): CapabilityToolItem[] =>
  [...dashboardData.tooling.technologyTools, ...dashboardData.tooling.aiTools].slice(0, 6).map(item => ({
    key: item.key,
    label: item.label,
    category: item.category,
    description: item.description,
    href: item.href
  }))

const getRegistryFallbackModule = (moduleId: string): ResolvedCapabilityModule | null => {
  const registryModule = CAPABILITY_REGISTRY.find(entry => entry.id === moduleId)

  return registryModule
    ? {
        ...registryModule,
        matchedBusinessLines: [],
        matchedServiceModules: []
      }
    : null
}

export const getCapabilityModuleData = async ({
  moduleId,
  tenant,
  allowRegistryFallback = false
}: {
  moduleId: string
  tenant: CapabilityViewerContext
  allowRegistryFallback?: boolean
}): Promise<CapabilityModuleData | null> => {
  const capabilityModule =
    getResolvedCapabilityModule(moduleId, {
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules
    }) || (allowRegistryFallback ? getRegistryFallbackModule(moduleId) : null)

  if (!capabilityModule) {
    return null
  }

  const dashboardData = await getDashboardOverview({
    clientId: tenant.clientId,
    projectIds: tenant.projectIds,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules
  })

  const content = buildCapabilityModuleContent({
    moduleId: capabilityModule.id,
    dashboardData,
    viewer: tenant
  })

  if (!content) {
    return null
  }

  const projects = dashboardData.projects.slice(0, 5).map(project => ({
    id: project.id,
    name: project.name,
    status: project.status,
    detail: `${formatPercent(project.onTimePct)} OTD · ${formatInteger(project.blockedTasks)} bloqueos · ${formatInteger(
      project.reviewPressureTasks
    )} en revision`,
    href: `/proyectos/${project.id}`
  }))

  return {
    module: capabilityModule,
    hero: content.hero,
    metrics: content.metrics,
    projects,
    tools: buildToolItems(dashboardData),
    quality: buildQualityItems(dashboardData),
    scope: {
      projectCount: dashboardData.scope.projectCount,
      businessLines: dashboardData.scope.businessLines,
      serviceModules: dashboardData.scope.serviceModules,
      lastActivityAt: dashboardData.scope.lastActivityAt,
      lastSyncedAt: dashboardData.scope.lastSyncedAt
    }
  }
}
