import 'server-only'

import { buildCapabilityModuleContent } from '@/lib/capabilities/module-content-builders'
import { getCreativeHubTasks } from '@/lib/capability-queries/creative-hub-runtime'
import {
  buildCapabilityScope,
  buildCreativeBrandMetricsCardData,
  buildCreativeCscMetricsCardData,
  buildCreativeHubCardData,
  buildCreativePipelineCardData,
  buildCreativeRevenueCardData,
  buildCreativeRpaTrendCardData,
  buildCreativeStuckCardData,
  buildProjectItemsForLens,
  buildQualityItems,
  buildToolItems
} from '@/lib/capability-queries/helpers'
import { getCapabilityModuleSnapshot } from '@/lib/capability-queries/shared'
import type { CapabilityQueryBuilder } from '@/lib/capability-queries/types'

export const getCreativeHubQuery: CapabilityQueryBuilder = async viewer => {
  const [snapshot, tasks] = await Promise.all([getCapabilityModuleSnapshot(viewer), getCreativeHubTasks(viewer)])
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
      'creative-revenue-kpis': buildCreativeRevenueCardData(snapshot, tasks),
      'brand-header':          { type: 'section-header', subtitle: 'Gobernanza y proteccion de marca sobre el flujo creativo', icon: 'tabler-shield-check' },
      'creative-brand-kpis':   buildCreativeBrandMetricsCardData(tasks),
      'creative-rpa-trend':    buildCreativeRpaTrendCardData(tasks),
      'pipeline-header':       { type: 'section-header', subtitle: 'El pipeline completo de tu produccion creativa', icon: 'tabler-git-branch' },
      'csc-pipeline':          buildCreativePipelineCardData(tasks),
      'csc-metrics':           buildCreativeCscMetricsCardData(tasks),
      'stuck-assets':          buildCreativeStuckCardData(tasks)
    },
    scope: buildCapabilityScope(snapshot)
  }
}
