/**
 * TASK-1845 — ledger de hechos (`EvidenceFactV1`) y snapshot de evidencia (browser-safe).
 *
 * Cada hecho declara valor/null, unidad, población, fuente, método/version, cobertura,
 * frescura y referencia de evidencia. "Ausente" es distinto de cero: una ausencia se
 * declara como `EvidenceRejectionV1`, nunca como `0` ni como el dato actual disfrazado
 * de histórico (arquitectura Insights §5).
 */

import type { InsightModule } from './request'

export const EVIDENCE_FACT_VERSION = 'evidence_fact_v1' as const

export const EVIDENCE_UNITS = [
  'count',
  'percent',
  'ratio',
  'position',
  'score',
  'days',
  'visits_estimated',
  'usd',
  'clp'
] as const
export type EvidenceUnit = (typeof EVIDENCE_UNITS)[number]

export const EVIDENCE_GRANULARITIES = ['day', 'week', 'month', 'period'] as const
export type EvidenceGranularity = (typeof EVIDENCE_GRANULARITIES)[number]

export const EVIDENCE_COVERAGE_KINDS = ['complete', 'partial', 'sparse', 'none'] as const
export type EvidenceCoverageKind = (typeof EVIDENCE_COVERAGE_KINDS)[number]

export const EVIDENCE_OBSERVATION_KINDS = ['observed', 'estimated'] as const
export type EvidenceObservationKind = (typeof EVIDENCE_OBSERVATION_KINDS)[number]

/** Razones canónicas de ausencia/incomparabilidad; el adapter las declara, el plan las muestra. */
export const EVIDENCE_REJECTION_REASONS = [
  'unsupported_window',
  'method_mismatch',
  'insufficient_data',
  'suppressed',
  'review_required',
  'module_disabled',
  'not_connected',
  'target_ambiguous',
  'no_data'
] as const
export type EvidenceRejectionReason = (typeof EVIDENCE_REJECTION_REASONS)[number]

export interface EvidenceWindowV1 {
  /** Fecha civil `YYYY-MM-DD` (inclusive) en la zona del encargo. */
  start: string
  /** Fecha civil `YYYY-MM-DD` (exclusiva). */
  endExclusive: string
  granularity: EvidenceGranularity
  /** `true` cuando el período aún no cerró en la fuente (etiquetado parcial, nunca oculto). */
  partial: boolean
}

export interface EvidenceMethodV1 {
  name: string
  version: string
}

export interface EvidenceCoverageV1 {
  kind: EvidenceCoverageKind
  /** 0..1 cuando la fuente lo informa; null cuando no es medible. */
  ratio: number | null
  /** Tamaño de la población/muestra que sostiene el hecho (tareas, keywords, observaciones). */
  populationSize: number | null
}

export interface EvidenceFreshnessV1 {
  /** Corte real de la fuente (ISO 8601 o `YYYY-MM-DD`); null sólo si la fuente no lo declara. */
  asOf: string | null
}

export interface EvidenceFactV1 {
  factVersion: typeof EVIDENCE_FACT_VERSION
  /** Estable dentro del snapshot: `<module>.<metricId>.<windowKey>[.<dimension>]`. */
  factId: string
  module: InsightModule
  metricId: string
  label: string
  value: number | null
  unit: EvidenceUnit
  numerator: number | null
  denominator: number | null
  population: string
  source: string
  method: EvidenceMethodV1
  coverage: EvidenceCoverageV1
  freshness: EvidenceFreshnessV1
  observation: EvidenceObservationKind
  window: EvidenceWindowV1
  /** Referencia opaca al origen (runId, seoTargetId, spaceId+period…), sin contenido sensible. */
  evidenceRef: string
  /** factId del hecho comparable (misma metodología/grano) cuando existe. */
  comparisonFactId: string | null
  dimension?: Record<string, string>
}

export interface EvidenceRejectionV1 {
  module: InsightModule
  metricId: string | null
  reason: EvidenceRejectionReason
  detail: string
  /** Ventana/grano alternativos que SÍ podría servir el reader, si existen. */
  alternative?: { granularity: EvidenceGranularity; note: string } | null
}

export interface EvidenceSourceV1 {
  module: InsightModule
  adapterVersion: string
  reader: string
  asOf: string | null
  method: EvidenceMethodV1
  coverage: EvidenceCoverageV1
  servedWindow: EvidenceWindowV1 | null
}

/** Contenido lógico del snapshot antes/después de sellarlo (columnas *_json). */
export interface EvidenceSnapshotContentV1 {
  facts: EvidenceFactV1[]
  sources: EvidenceSourceV1[]
  rejections: EvidenceRejectionV1[]
}
