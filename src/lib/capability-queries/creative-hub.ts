import 'server-only'

import { buildCapabilityModuleContent } from '@/lib/capabilities/module-content-builders'
import {
  buildCapabilityScope,
  buildCreativeCscMetricsCardData,
  buildCreativeHubCardData,
  buildCreativePipelineCardData,
  buildCreativeRevenueCardData,
  buildCreativeStuckCardData,
  buildProjectItemsForLens,
  buildQualityItems,
  buildToolItems
} from '@/lib/capability-queries/helpers'
import { getCapabilityModuleSnapshot } from '@/lib/capability-queries/shared'
import type { CapabilityQueryBuilder } from '@/lib/capability-queries/types'

export const getCreativeHubQuery: CapabilityQueryBuilder = async viewer => {
  const snapshot = await getCapabilityModuleSnapshot(viewer)
  const content = buildCapabilityModuleContent({ moduleId: 'creative-hub', snapshot })

  if (!content) {
    return null
  }

  const projects = buildProjectItemsForLens(snapshot, 'creative')
  const tools = buildToolItems(snapshot)
  const quality = buildQualityItems(snapshot)

  return {
    hero: content.hero,
    metrics: content.metrics,
    projects,
    tools,
    quality,
    cardData: {
      ...buildCreativeHubCardData({ snapshot, metrics: content.metrics, projects, quality }),
      'revenue-header':        { type: 'section-header', subtitle: 'El impacto de tu produccion creativa en el negocio', icon: 'tabler-trending-up' },
      'creative-revenue-kpis': buildCreativeRevenueCardData(snapshot),
      'pipeline-header':       { type: 'section-header', subtitle: 'El pipeline completo de tu produccion creativa', icon: 'tabler-git-branch' },
      'csc-pipeline':          buildCreativePipelineCardData(snapshot),
      'csc-metrics':           buildCreativeCscMetricsCardData(snapshot),
      'stuck-assets':          buildCreativeStuckCardData(snapshot)
    },
    scope: buildCapabilityScope(snapshot)
  }
}
