import 'server-only'

/**
 * TASK-1845 — orquestador de evidencia: por cada módulo del encargo resuelve su adapter en
 * el registry y acumula hechos/fuentes/rechazos en UN snapshot. Un adapter que lanza no
 * tumba la edición: se registra como rechazo del módulo (degradación honesta) y la policy
 * de emisión decide después si `allow_partial` alcanza. El orquestador no conoce módulos.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import type { EvidenceSnapshotContentV1 } from '../contracts/evidence'
import type { InsightAudience, InsightModule } from '../contracts/request'
import type { ResolvedInsightWindows } from '../window'
import type { AdapterCollectInput } from './contract'
import { resolveInsightAdapter } from './registry'

export interface CollectEvidenceInput {
  organizationId: string
  audience: InsightAudience
  modules: InsightModule[]
  windows: ResolvedInsightWindows
  projectIds: string[]
  /** TASK-1888 — evidencia del contrato editorial v2; lo decide el caller desde el flag. */
  editorialV2?: boolean
}

export const collectInsightEvidence = async (input: CollectEvidenceInput): Promise<EvidenceSnapshotContentV1> => {
  const content: EvidenceSnapshotContentV1 = { facts: [], sources: [], rejections: [] }

  const adapterInput: AdapterCollectInput = {
    organizationId: input.organizationId,
    audience: input.audience,
    window: input.windows.current,
    comparison: input.windows.comparison,
    projectIds: input.projectIds,
    editorialV2: input.editorialV2 === true
  }

  for (const moduleKey of input.modules) {
    try {
      const adapter = await resolveInsightAdapter(moduleKey)
      const result = await adapter.collect(adapterInput)

      content.facts.push(...result.facts)
      content.sources.push(...result.sources)
      content.rejections.push(...result.rejections)
    } catch (error) {
      captureWithDomain(error, 'insights', { extra: { operation: 'collectInsightEvidence', module: moduleKey, organizationId: input.organizationId } })
      content.rejections.push({ module: moduleKey, metricId: null, reason: 'no_data', detail: `El adapter ${moduleKey} falló al recolectar; evidencia no disponible` })
    }
  }

  const seen = new Set<string>()

  for (const fact of content.facts) {
    if (seen.has(fact.factId)) throw new Error(`factId duplicado en el snapshot: ${fact.factId}`)
    seen.add(fact.factId)
  }

  return content
}
