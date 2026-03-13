import type { CapabilityViewerContext } from '@/types/capabilities'

import { getCapabilityRegistryModule, getResolvedCapabilityModule } from '@/lib/capabilities/resolve-capabilities'

export const verifyCapabilityModuleAccess = (moduleId: string, viewer: CapabilityViewerContext) =>
  Boolean(
    getResolvedCapabilityModule(moduleId, {
      businessLines: viewer.businessLines,
      serviceModules: viewer.serviceModules
    })
  )

export const getCapabilityModuleAccessState = (moduleId: string, viewer: CapabilityViewerContext) => ({
  moduleExists: Boolean(getCapabilityRegistryModule(moduleId)),
  hasAccess: verifyCapabilityModuleAccess(moduleId, viewer)
})
