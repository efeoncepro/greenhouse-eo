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

/**
 * TASK-1888 — cifra principal de una figura: el número grande de la página y su bajada. `value` es EXACTAMENTE
 * `formatFactValue` del hecho (el validador lo reconstruye); la bajada es texto y pasa la misma regla de cifras.
 */
export interface PlanKeyFigureV1 {
  factId: string
  value: string
  caption: PlanClaimV1
}

/**
 * TASK-1888 — lectura por figura («Lo que significa / Próximo paso»). Se asocia a su gráfico por `chartId`. Toda
 * frase es una `PlanClaimV1`: una cifra sin su hecho es una discrepancia, igual que en el resto del plan.
 */
export interface PlanFigureReadingV1 {
  chartId: string
  keyFigure?: PlanKeyFigureV1
  /** Conclusión de la página (título afirmativo sobre el gráfico). El planner v2 la emite siempre. */
  conclusion?: PlanClaimV1
  /**
   * «Lo que significa». Opcional: sólo existe cuando dice algo que la conclusión no dice (varios spaces o series). Una
   * lectura que repite la conclusión no es lectura; sin ella el panel no aparece y queda para la redacción IA o humana.
   */
  meaning?: PlanClaimV1
  /** Null cuando la evidencia no sostiene un paso concreto: nunca se inventa uno. */
  nextStep: PlanClaimV1 | null
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
  /** TASK-1888 — entrada de capítulo (la frase que abre la sección). */
  opening?: PlanClaimV1
  /** TASK-1888 — lectura de cada figura del capítulo, a lo más una por `chartId`. */
  readings?: PlanFigureReadingV1[]
}

export interface PlanActionV1 {
  actionId: string
  text: string
  /** Owner sólo si existe de verdad; nunca inventado. */
  ownerRef: string | null
  factIds: string[]
  /** TASK-1888 — impacto y esfuerzo 1 (bajo) a 3 (alto); ausentes = no estimados (nunca un nivel inventado). */
  impact?: 1 | 2 | 3
  effort?: 1 | 2 | 3
  /** TASK-1888 — semanas del plan de 4: «N» o «N-M», 1 ≤ N ≤ M ≤ 4. */
  weeks?: string
}

export interface PlanReferenceV1 {
  referenceId: string
  label: string
  evidenceRef: string
}

/** TASK-1888 — máximo de hechos en «Lo esencial del mes». */
export const PLAN_ESSENTIALS_MAX = 5

/**
 * TASK-1888 — topes de largo de los campos v2, iguales al molde MÁS ESTRECHO entre el informe A4 y el deck (TASK-1889,
 * 2026-09-25). Son espacio físico: un texto que no cabe no se recorta, el render lo rechaza. El planner los respeta, el
 * validador los exige y la autoría IA conserva el texto determinista del claim que se pase.
 */
export const PLAN_TEXT_LIMITS = {
  conclusion: 90,
  keyFigureValue: 9,
  keyFigureCaption: 96,
  meaning: 160,
  nextStep: 160,
  summaryThesis: 120,
  summaryLead: 200,
  decision: 140,
  essential: 170,
  /** Título de la tabla de respaldo (presupuesto del informe A4; el deck no dibuja tablas). */
  tableTitle: 80
} as const

/** @deprecated alias de `PLAN_TEXT_LIMITS.conclusion` (acuerdo con TASK-1889). */
export const PLAN_CONCLUSION_MAX_CHARS = PLAN_TEXT_LIMITS.conclusion

export const INSIGHT_COVER_THEMES = ['dark', 'light'] as const
export type InsightCoverTheme = (typeof INSIGHT_COVER_THEMES)[number]

/** De dónde salió la portada: el encargo, la preferencia de la organización o la regla `auto`. */
export const INSIGHT_COVER_SOURCES = ['request', 'organization', 'auto'] as const
export type InsightCoverSource = (typeof INSIGHT_COVER_SOURCES)[number]

/**
 * TASK-1888 — portada RESUELTA y sellada con el plan al generarlo. Re-renderizar la edición da la misma portada; el
 * render nunca la decide con datos vivos. `logoAssetId` es el logo de la organización al momento de generar (la
 * variante apta para fondo oscuro si la portada es navy); null = la portada va sin logo del cliente.
 */
export interface PlanCoverV1 {
  theme: InsightCoverTheme
  source: InsightCoverSource
  logoAssetId: string | null
  logoVariant: 'on_dark' | 'default' | null
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
  /**
   * TASK-1888 — campos del contrato editorial v2, TODOS opcionales: un plan v1 sellado no los trae y sigue validando
   * y componiendo igual. Su presencia es la señal para el mapper; `planVersion` no cambia.
   */
  /** «Lo esencial del mes»: hasta `PLAN_ESSENTIALS_MAX` hechos del resumen. */
  essentials?: PlanClaimV1[]
  /** «Qué mide este informe»: una línea por módulo, desde `GH_INSIGHTS.scopeLines` (nunca redactada por el LLM). */
  scopeLines?: string[]
  /** «Para decidir en la reunión». */
  decision?: PlanClaimV1
  /** «Cómo lo mediremos» y «Qué necesitamos de ustedes» del plan de acción. */
  measurement?: PlanClaimV1
  ask?: PlanClaimV1
  cover?: PlanCoverV1
}

export interface PlanAuthoringProvenanceV1 {
  mode: PlanAuthoringMode
  modelId: string | null
  promptVersion: string | null
  usage: Record<string, unknown>
}
