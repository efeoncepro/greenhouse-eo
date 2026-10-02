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
 *
 * 1.1 (TASK-1875, 2026-09-28) — ADITIVO: proyecta los campos editoriales v2 de TASK-1888 (lo esencial, la decisión,
 * cómo lo mediremos, qué necesitamos, qué mide el informe, la apertura y la lectura por figura), las tasas de paso del
 * embudo calculadas por la MISMA geometría de los PDF (`funnelGeometry`), y el logo del cliente por proxy. Todo
 * opcional: un plan v1 sellado se proyecta igual que antes y un consumer 1.0 ignora lo nuevo.
 *
 * 1.2 (TASK-1957, 2026-10-02) — ADITIVO y correctivo: `source` vuelve a cumplir su contrato (fuente LEGIBLE, del
 * vocabulario común con el PDF; hasta 1.1 viajaba la tabla lectora interna) y se suman `unitLabel`/`asOfLabel` en los
 * hechos y `unitLabel` en las figuras, para que ningún consumer imprima un código (`count`) ni una fecha ISO.
 */

import type { InsightChannelId } from './channels'
import type { ChartSpecV1 } from './chart-spec'
import type { EvidenceObservationKind, EvidenceUnit } from './evidence'
import type { InsightModule, InsightOutput } from './request'

export const INSIGHT_WEB_MODEL_VERSION = '1.2' as const

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
  /** Fuente legible para el lector (vocabulario común con el PDF). Nunca la tabla ni el reader interno. */
  source: string
  /** 1.2 — unidad legible («Cantidad», «Porcentaje»); vacía si la unidad no tiene nombre de cara al lector. */
  unitLabel: string
  asOf: string | null
  /** 1.2 — corte legible por locale («20 sept 2026»); null sin fecha. `asOf` queda como dato estructurado. */
  asOfLabel: string | null
  /**
   * 1.2 — canal que el hecho representa (motor de respuesta, buscador), con el vocabulario estable de
   * `contracts/channels.ts`. Ausente = no es un canal. El consumer lo traduce a su isotipo (Think: `EngineMark`).
   */
  channelId?: InsightChannelId
  absentReason: InsightWebAbsentReason | null
}

export interface InsightWebClaimV1 {
  claimId: string
  text: string
  factIds: string[]
  /** 1.2 — en afirmaciones de capítulo: hallazgo destacado o respaldo para la tabla. Ausente en planes previos. */
  role?: 'finding' | 'backing'
}

export interface InsightWebTableV1 {
  tableId: string
  title: string
  columns: string[]
  rows: Array<Array<string | null>>
}

/** 1.1 — cifras derivadas por la geometría compartida con los PDF (nunca por el render). */
export interface InsightWebChartDerivedV1 {
  /** Embudo: tasa de paso desde la etapa anterior, formateada; null en la primera etapa. */
  funnelStepRates?: Array<{ stageId: string; display: string | null }>
}

/** El ChartSpecV1 congelado + su equivalente tabular RESUELTO a cifras formateadas. */
export interface InsightWebChartV1 {
  spec: ChartSpecV1
  table: { columns: string[]; rows: Array<Array<string | null>> }
  /** 1.1 */
  derived?: InsightWebChartDerivedV1
  /** 1.2 — unidad legible de la figura (la de `spec.unit` traducida). */
  unitLabel?: string
}

/** 1.1 — lectura de una figura (TASK-1888): cifra principal, conclusión, lo que significa y el próximo paso. */
export interface InsightWebReadingV1 {
  chartId: string
  keyFigure?: { factId: string; value: string; caption: InsightWebClaimV1 }
  conclusion?: InsightWebClaimV1
  meaning?: InsightWebClaimV1
  nextStep: InsightWebClaimV1 | null
}

export interface InsightWebChapterV1 {
  chapterId: string
  module: InsightModule
  title: string
  claims: InsightWebClaimV1[]
  charts: InsightWebChartV1[]
  tables: InsightWebTableV1[]
  limits: string[]
  /** 1.1 — la frase que abre el capítulo. */
  opening?: InsightWebClaimV1
  /** 1.1 — una lectura por figura, a lo más una por `chartId`. */
  readings?: InsightWebReadingV1[]
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
  /** 1.1 — «Lo esencial del mes». */
  essentials?: InsightWebClaimV1[]
  /** 1.1 — «Para decidir en la reunión». */
  decision?: InsightWebClaimV1
  /** 1.1 — «Cómo lo mediremos». */
  measurement?: InsightWebClaimV1
  /** 1.1 — «Qué necesitamos de ustedes». */
  ask?: InsightWebClaimV1
  /** 1.1 — «Qué mide este informe»: una línea por módulo. */
  scopeLines?: string[]
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
  /**
   * 1.1 — logo del cliente sellado en la portada del plan, servido por proxy con el mismo gate del token (ruta relativa
   * al API de Greenhouse; Think la resuelve server-side). `variant` dice sobre qué fondo se diseñó.
   */
  clientLogo?: { href: string; variant: 'on_dark' | 'default' }
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
