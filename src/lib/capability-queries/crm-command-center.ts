import 'server-only'

import { buildCapabilityModuleContent } from '@/lib/capabilities/module-content-builders'
import {
  buildCapabilityScope,
  buildBaseCapabilityCardData,
  buildProjectItemsForLens,
  buildQualityItems,
  buildToolItems
} from '@/lib/capability-queries/helpers'
import { getCapabilityModuleSnapshot } from '@/lib/capability-queries/shared'
import type { CapabilityQueryBuilder } from '@/lib/capability-queries/types'

export const getCrmCommandCenterQuery: CapabilityQueryBuilder = async viewer => {
  const snapshot = await getCapabilityModuleSnapshot(viewer)
  const content = buildCapabilityModuleContent({ moduleId: 'crm-command-center', snapshot })

  if (!content) {
    return null
  }

  const projects = buildProjectItemsForLens(snapshot, 'crm')
  const tools = buildToolItems(snapshot)
  const quality = buildQualityItems(snapshot)

  return {
    hero: content.hero,
    metrics: content.metrics,
    projects,
    tools,
    quality,
    cardData: buildBaseCapabilityCardData({
      metricCardId: 'crm-metrics',
      metrics: content.metrics,
      projectCardId: 'crm-projects',
      projects,
      toolingCardId: 'crm-tooling',
      tools
    }),
    scope: buildCapabilityScope(snapshot)
  }
}
