/**
 * TASK-1845 — `EditorialPlanV1` (browser-safe): resumen ejecutivo, capítulos por módulo,
 * hallazgos con evidencia, acciones con owner sólo si existe, límites y metodología.
 * Cada cifra en texto/gráfico/tabla referencia el MISMO hecho (`factIds`); la validación
 * rechaza discrepancias (arquitectura §6).
 */

import type { ChartSpecV1 } from './chart-spec'
import type { InsightModule } from './request'

export const EDITORIAL_PLAN_VERSION = 'editorial_plan_v1' as const

export const PLAN_AUTHORING_MODES = ['deterministic', 'ai_bounded'] as const
export type PlanAuthoringMode = (typeof PLAN_AUTHORING_MODES)[number]

export interface PlanClaimV1 {
  claimId: string
  text: string
  /** Hechos que sostienen la afirmación; una cifra sin factId es una discrepancia. */
  factIds: string[]
}

export interface PlanTableV1 {
  tableId: string
  title: string
  columns: string[]
  rows: Array<Array<string | null>>
}

export interface PlanChapterV1 {
  chapterId: string
  module: InsightModule
  title: string
  claims: PlanClaimV1[]
  charts: ChartSpecV1[]
  tables: PlanTableV1[]
  /** Ausencias/incomparabilidades visibles del capítulo (texto derivado de rejections). */
  limits: string[]
}

export interface PlanActionV1 {
  actionId: string
  text: string
  /** Owner sólo si existe de verdad; nunca inventado. */
  ownerRef: string | null
  factIds: string[]
}

export interface PlanReferenceV1 {
  referenceId: string
  label: string
  evidenceRef: string
}

export interface EditorialPlanV1 {
  planVersion: typeof EDITORIAL_PLAN_VERSION
  locale: string
  executiveSummary: PlanClaimV1[]
  chapters: PlanChapterV1[]
  actions: PlanActionV1[]
  limits: string[]
  methodology: string[]
  references: PlanReferenceV1[]
}

export interface PlanAuthoringProvenanceV1 {
  mode: PlanAuthoringMode
  modelId: string | null
  promptVersion: string | null
  usage: Record<string, unknown>
}
