/**
 * TASK-1848 — `InsightWebModelV1` (browser-safe): la proyección client-facing de una edición
 * EMITIDA que sirve el reader público por token y que `efeonce-think` renderiza sin re-derivar
 * nada (TASK-1875). Contiene lo que el cliente ya puede leer del plan congelado y del snapshot
 * sellado: capítulos, afirmaciones, gráficos con su tabla resuelta, límites, metodología y
 * referencias, con cada cifra YA formateada por locale (`display`).
 *
 * Nunca trae: modo de autoría, modelo, prompts, historial, ids de actor, `evidenceRef` (referencia
 * interna al origen), numerador/denominador ni rejections crudas. Cambiar su forma es un bump de
 * `modelVersion` con compatibilidad hacia atrás, igual que el `ReportArtifactModel` del Grader.
 */

import type { ChartSpecV1 } from './chart-spec'
import type { EvidenceObservationKind, EvidenceUnit } from './evidence'
import type { InsightModule, InsightOutput } from './request'

export const INSIGHT_WEB_MODEL_VERSION = '1.0' as const

/** Motivo por el que un hecho no tiene valor. Ausente ≠ cero: Think lo muestra como límite. */
export type InsightWebAbsentReason = 'no_data'

export interface InsightWebFactV1 {
  factId: string
  module: InsightModule
  label: string
  /** Valor numérico para dibujar; null = ausente (nunca 0 disfrazado). */
  value: number | null
  unit: EvidenceUnit
  /** Cifra formateada por locale: lo ÚNICO que el hub imprime como texto. */
  display: string
  observation: EvidenceObservationKind
  /** Fuente legible (nombre del reader dueño), sin referencia interna. */
  source: string
  asOf: string | null
  absentReason: InsightWebAbsentReason | null
}

export interface InsightWebClaimV1 {
  claimId: string
  text: string
  factIds: string[]
}

export interface InsightWebTableV1 {
  tableId: string
  title: string
  columns: string[]
  rows: Array<Array<string | null>>
}

/** El ChartSpecV1 congelado + su equivalente tabular RESUELTO a cifras formateadas. */
export interface InsightWebChartV1 {
  spec: ChartSpecV1
  table: { columns: string[]; rows: Array<Array<string | null>> }
}

export interface InsightWebChapterV1 {
  chapterId: string
  module: InsightModule
  title: string
  claims: InsightWebClaimV1[]
  charts: InsightWebChartV1[]
  tables: InsightWebTableV1[]
  limits: string[]
}

export interface InsightWebModelV1 {
  modelVersion: typeof INSIGHT_WEB_MODEL_VERSION
  locale: string
  executiveSummary: InsightWebClaimV1[]
  chapters: InsightWebChapterV1[]
  actions: Array<{ actionId: string; text: string; factIds: string[] }>
  limits: string[]
  methodology: string[]
  references: Array<{ referenceId: string; label: string }>
  facts: Record<string, InsightWebFactV1>
}

export interface InsightSharedHeaderV1 {
  organizationName: string
  reportCode: string
  reportTitle: string
  editionVersion: number
  /** Período en texto del locale (p. ej. "1 al 31 de agosto de 2026"). */
  periodLabel: string
  periodStart: string
  periodEndExclusive: string
  timeZone: string
  issuedAt: string
  asOfMax: string | null
}

export type InsightSharedDownloadStatus = 'available' | 'unavailable'

export interface InsightSharedDownloadV1 {
  output: InsightOutput
  status: InsightSharedDownloadStatus
  /** Ruta relativa al API de Greenhouse; Think la resuelve server-side. Sólo si `available`. */
  href?: string
}

/** Respuesta 200 de `GET /api/public/insights/shared/{token}`. */
export interface InsightSharedEditionResponseV1 {
  modelVersion: typeof INSIGHT_WEB_MODEL_VERSION
  header: InsightSharedHeaderV1
  model: InsightWebModelV1
  downloads: InsightSharedDownloadV1[]
  /** Expiración del enlace; Think puede avisar "este enlace vence el …". */
  expiresAt: string
}
