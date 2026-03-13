import type { CapabilityModuleData, CapabilityViewerContext } from '@/types/capabilities'

export type CapabilityQueryBuilder = (
  viewer: CapabilityViewerContext
) => Promise<Omit<CapabilityModuleData, 'module'> | null>
