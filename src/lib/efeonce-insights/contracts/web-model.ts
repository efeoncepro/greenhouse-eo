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

export const INSIGHT_WEB_MODEL_VERSION = '1.3' as const

/** Motivo por el que un hecho no tiene valor. Ausente ≠ cero: Think lo muestra como límite. */
export type InsightWebAbsentReason = 'no_data'

export interface InsightWebFactV1 {
  factId: string
  module: InsightModule
  /** 1.2 — métrica del hecho (`clicks`, `mention_rate.gemini`): el consumer elige su ícono; nunca se imprime. */
  metricId?: string
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
  /**
   * 1.2 — hecho del período anterior con que se compara (si lo hay). Un consumer lo usa para no mostrar la cifra
   * anterior como una tarjeta suelta junto a la actual (caso Berel: «#6,6» y «#5,8» con la misma etiqueta).
   */
  comparisonFactId?: string
  /** 1.3 — el período anterior listo para imprimir («período anterior: 21»); ausente sin comparable con valor. */
  priorLabel?: string
  absentReason: InsightWebAbsentReason | null
}

export interface InsightWebClaimV1 {
  claimId: string
  text: string
  factIds: string[]
  /** 1.2 — en afirmaciones de capítulo: hallazgo destacado o respaldo para la tabla. Ausente en planes previos. */
  role?: 'finding' | 'backing'
  /**
   * 1.2 — cifra protagonista de la frase: el CAMBIO frente al período anterior («-9,6 %», `kind: 'change'`) cuando la
   * frase lo dice; si no, el valor que la frase cita («83,8 %», `kind: 'level'`). Sin ella el consumer mostraba
   * 512.113 en grande junto a «Las impresiones bajaron…».
   */
  figure?: { display: string; direction: 'up' | 'down' | 'flat'; kind?: 'change' | 'level' }
  /**
   * 1.3 — módulo al que pertenece la frase (resumen y esenciales). Lo resuelve el API: el consumer filtra y agrupa por
   * este campo, nunca lo infiere de la primera cifra citada.
   */
  module?: InsightModule
  /** 1.3 — figura que respalda la frase (la de su cifra principal o la que dibuja su hecho). Ausente = sin figura. */
  evidence?: { chapterId: string; chartId: string }
}

export interface InsightWebTableV1 {
  tableId: string
  title: string
  columns: string[]
  rows: Array<Array<string | null>>
  /** 1.3 — bajada propia de la tabla, si el plan la trae. */
  lead?: string
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
  /** 1.3 — nota de lectura de la figura (p. ej. «cada métrica en su propia escala»), redactada por el API. */
  note?: string
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
  /**
   * 1.2 — marca de producto Efeonce que encabeza el capítulo (`presentation/product-marks.ts`: SEO → SV360, motores de
   * respuesta → AEO). Reemplaza la etiqueta del capítulo; el consumer dibuja el lockup oficial de esa clave.
   */
  productMark?: { key: string; label: string }
  /** 1.3 — nombre corto del capítulo para navegación y filtros («SEO», «Respuestas de IA»), del copy de Greenhouse. */
  label?: string
}

export interface InsightWebModelV1 {
  modelVersion: typeof INSIGHT_WEB_MODEL_VERSION
  locale: string
  executiveSummary: InsightWebClaimV1[]
  chapters: InsightWebChapterV1[]
  /** 1.3 — `module`: módulo de la acción (el de su primera cifra citada), resuelto por el API. */
  actions: Array<{ actionId: string; text: string; factIds: string[]; module?: InsightModule }>
  limits: string[]
  methodology: string[]
  references: Array<{ referenceId: string; label: string }>
  facts: Record<string, InsightWebFactV1>
  /** 1.1 — «Lo esencial del mes». */
  essentials?: InsightWebClaimV1[]
  /**
   * 1.3 — cuántas esenciales tiene cada módulo de la edición, incluido 0. Decide el API, no el consumer: un filtro por
   * módulo sin esenciales oculta el tablero porque el modelo lo dice, no porque la UI contó.
   */
  essentialsByModule?: Partial<Record<InsightModule, number>>
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
  /**
   * 1.2 — alcance de la portada: chips con etiqueta y glifo Trazo del catálogo AXIS (`scope-catalog.ts`), del encargo
   * o derivados de los módulos. El consumer resuelve el glifo a su archivo; nunca elige el ícono por su cuenta.
   */
  scopeChips?: Array<{ key: string; label: string; glyph: string; line: 'growth' | 'brand' | 'engine' | 'voice' | 'revenue' }>
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
