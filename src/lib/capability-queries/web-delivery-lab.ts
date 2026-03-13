import 'server-only'

import { buildCapabilityModuleContent } from '@/lib/capabilities/module-content-builders'
import {
  buildCapabilityScope,
  buildProjectItemsForLens,
  buildQualityItems,
  buildToolItems
} from '@/lib/capability-queries/helpers'
import { getCapabilityModuleSnapshot } from '@/lib/capability-queries/shared'
import type { CapabilityQueryBuilder } from '@/lib/capability-queries/types'

export const getWebDeliveryLabQuery: CapabilityQueryBuilder = async viewer => {
  const snapshot = await getCapabilityModuleSnapshot(viewer)
  const content = buildCapabilityModuleContent({ moduleId: 'web-delivery-lab', snapshot })

  if (!content) {
    return null
  }

  return {
    hero: content.hero,
    metrics: content.metrics,
    projects: buildProjectItemsForLens(snapshot, 'web'),
    tools: buildToolItems(snapshot),
    quality: buildQualityItems(snapshot),
    scope: buildCapabilityScope(snapshot)
  }
}
