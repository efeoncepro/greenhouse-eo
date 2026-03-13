import 'server-only'

import { getModuleQueryBuilder } from '@/lib/capability-queries'
import { getCapabilityRegistryModule, getResolvedCapabilityModule } from '@/lib/capabilities/resolve-capabilities'
import type { CapabilityModuleData, CapabilityViewerContext, ResolvedCapabilityModule } from '@/types/capabilities'

const getRegistryFallbackModule = (moduleId: string): ResolvedCapabilityModule | null => {
  const registryModule = getCapabilityRegistryModule(moduleId)

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

  const queryBuilder = getModuleQueryBuilder(capabilityModule.id)

  if (!queryBuilder) {
    return null
  }

  const payload = await queryBuilder(tenant)

  if (!payload) {
    return null
  }

  return {
    module: capabilityModule,
    ...payload
  }
}
