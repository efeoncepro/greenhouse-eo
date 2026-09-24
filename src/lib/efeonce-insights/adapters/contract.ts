/**
 * TASK-1845 — `ModuleReportAdapterV1`: puerto que cada módulo productor implementa para
 * congelar evidencia autorizada (arquitectura §5). Un adapter consume readers canónicos del
 * dominio dueño, nunca SQL elegido por un agente ni providers; declara hechos, cobertura,
 * frescura y razones de ausencia. Cero componentes visuales.
 */

import type { EvidenceGranularity, EvidenceRejectionV1, EvidenceSnapshotContentV1 } from '../contracts/evidence'
import type { InsightAudience, InsightModule } from '../contracts/request'
import type { ResolvedInsightWindow } from '../window'

export interface AdapterDescriptor {
  module: InsightModule
  version: string
  /** Granularidades/ventanas que el adapter puede servir con exactitud. */
  granularities: EvidenceGranularity[]
  /** Dimensiones/filtros aceptados (p.ej. `projectIds`). */
  dimensions: string[]
  /** Secciones sugeridas para el plan editorial. */
  suggestedSections: string[]
}

export interface AdapterCollectInput {
  organizationId: string
  audience: InsightAudience
  window: ResolvedInsightWindow
  comparison: ResolvedInsightWindow | null
  projectIds: string[]
}

export type AdapterCollectResult = EvidenceSnapshotContentV1

export interface ModuleReportAdapterV1 {
  describe(): AdapterDescriptor
  collect(input: AdapterCollectInput): Promise<AdapterCollectResult>
}

export const windowKey = (window: ResolvedInsightWindow): string => `${window.start}_${window.endExclusive}`

export const factId = (module: InsightModule, metricId: string, window: ResolvedInsightWindow, dimension?: string): string =>
  `${module}.${metricId}.${windowKey(window)}${dimension ? `.${dimension}` : ''}`

export const evidenceWindow = (window: ResolvedInsightWindow, granularity: EvidenceGranularity) => ({
  start: window.start,
  endExclusive: window.endExclusive,
  granularity,
  partial: window.partial
})

/** Marca los rechazos recolectados para la ventana de comparación: el planner los redacta como tales. */
export const asComparisonRejections = (rejections: readonly EvidenceRejectionV1[]): EvidenceRejectionV1[] =>
  rejections.map(rejection => ({ ...rejection, scope: 'comparison' as const }))
