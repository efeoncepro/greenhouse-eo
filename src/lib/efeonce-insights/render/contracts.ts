import 'server-only'

/**
 * TASK-1846 — contratos del render durable de Insights.
 *
 * La unidad RECLAMABLE es el output, no el run: el worker ejecuta un artefacto por ejecución de
 * Cloud Run Job, y la acceptance exige que fallar `report_pdf` conserve `deck_pdf` y que el retry
 * no repita los exitosos.
 *
 * Lease y fencing llegan en el Slice 2 y entran JUNTOS (el lease habilita el reclamo, y el reclamo
 * abre la ventana de doble finalización que hoy no existe). Ver `## Design Decision` de la task.
 */

import type { InsightAudience, InsightOutput } from '../contracts/request'

/**
 * Outputs que el motor puede producir HOY. Sólo `deck_pdf`: el catálogo A4 del informe vertical y
 * el modelo web llegan con TASK-1847/1848. Un encargo con un output fuera de esta lista se rechaza
 * fail-closed (`render_rejected`), nunca se encola "para después".
 */
/**
 * Catálogo que el worker tiene empaquetado. Es un STRING a propósito: importar el catálogo como
 * valor desde un command arrastra sus 19 MB de fuentes y assets al bundle de Vercel (la función
 * `insights/catalog` llegó a 434 MB y rompió el build de staging el 2026-09-16). El catálogo se
 * resuelve donde vive: en el worker.
 */
export const INSIGHT_RENDER_CATALOG_NAME = 'deck-axis'

/**
 * Catálogo por salida. Antes era UNA constante para todas, que es lo que impedía una segunda
 * salida: el deck horizontal y el informe vertical no comparten molde, presupuestos ni vocabulario.
 * Sigue siendo un STRING por la misma razón de siempre — importar el catálogo como valor arrastra
 * sus fuentes y assets al bundle de Vercel.
 */
export const INSIGHT_RENDER_CATALOG_BY_OUTPUT = {
  deck_pdf: 'deck-axis',
  report_pdf: 'insights-report'
} as const satisfies Partial<Record<InsightOutput, string>>

export const INSIGHT_RENDERABLE_OUTPUTS = [
  'deck_pdf',
  'report_pdf'
] as const satisfies readonly InsightOutput[]

/** Estado del run agregado. `partial_failed` existe porque un output puede caer sin arrastrar al resto. */
export const INSIGHT_RENDER_RUN_STATES = [
  'pending',
  'running',
  'completed',
  'partial_failed',
  'failed',
  'cancelled'
] as const

export type InsightRenderRunState = (typeof INSIGHT_RENDER_RUN_STATES)[number]

export const INSIGHT_OUTPUT_STATES = [
  'queued',
  'running',
  'completed',
  'failed',
  'dead_letter',
  'cancelled'
] as const

export type InsightOutputState = (typeof INSIGHT_OUTPUT_STATES)[number]

/**
 * Códigos de fallo canónicos. Espejan la taxonomía probada de Proposal salvo `audience_violation`
 * y `cancelled`, que son propios de este dominio. NO se inventan códigos nuevos en los consumers:
 * el CHECK de la tabla los enumera y un valor fuera de lista revienta el INSERT.
 */
export const INSIGHT_RENDER_FAILURE_CODES = [
  'audience_violation',
  'semantic_rejected',
  'size_rejected',
  'geometry_rejected',
  'font_fallback_detected',
  'missing_asset',
  'blank_slide',
  'manifest_drift',
  'render_error',
  'timeout',
  'dispatch_error',
  'cancelled'
] as const

export type InsightRenderFailureCode = (typeof INSIGHT_RENDER_FAILURE_CODES)[number]

/** Fallos que NO se reintentan: reintentar produce exactamente el mismo rechazo. */
export const INSIGHT_NON_RETRYABLE_FAILURES: ReadonlySet<InsightRenderFailureCode> = new Set([
  'audience_violation',
  'semantic_rejected',
  'manifest_drift',
  'cancelled'
])

export interface InsightRenderRunRecord {
  renderRunId: string
  organizationId: string
  editionId: string
  audience: InsightAudience
  requestedOutputs: InsightOutput[]
  state: InsightRenderRunState
  requestedByKind: 'member' | 'client_user' | 'system' | 'cli'
  requestedByUserId: string | null
  requestedByMemberId: string | null
  startedAt: Date | null
  finishedAt: Date | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface InsightOutputRecord {
  insightOutputId: string
  renderRunId: string
  organizationId: string
  editionId: string
  output: InsightOutput
  audience: InsightAudience
  catalogName: string
  manifestHash: string
  constraints: Record<string, unknown>
  deadline: Date | null
  state: InsightOutputState
  failureCode: InsightRenderFailureCode | null
  failureDetail: string | null
  attempts: number
  maxAttempts: number
  startedAt: Date | null
  finishedAt: Date | null
  executionName: string | null
  outputAssetId: string | null
  outputReport: Record<string, unknown> | null
  /** Slice 2 — vencimiento del claim. NULL en filas legadas: ese es el estado "colgado para siempre". */
  leaseExpiresAt: Date | null
  /** Slice 2 — monotónico por fila. Finalizar exige presentar el token vigente. */
  fenceToken: number
  createdAt: Date
  updatedAt: Date
}

/** Error de fencing: quien finaliza ya no es el dueño del claim. No es un fallo del render. */
export class InsightRenderFenceLostError extends Error {
  readonly insightOutputId: string
  readonly presentedFence: number

  constructor(insightOutputId: string, presentedFence: number) {
    super(
      `El output ${insightOutputId} fue reclamado por otra ejecución (fence ${presentedFence} ya no es el vigente): ` +
        'esta finalización se descarta sin efecto.'
    )
    this.name = 'InsightRenderFenceLostError'
    this.insightOutputId = insightOutputId
    this.presentedFence = presentedFence
  }
}

/**
 * Transiciones permitidas del output. Se declaran acá y el CHECK + los guards del store las
 * enforcen; nunca se transiciona con un UPDATE suelto desde un consumer.
 */
export const INSIGHT_OUTPUT_TRANSITIONS: Readonly<Record<InsightOutputState, readonly InsightOutputState[]>> = {
  queued: ['running', 'cancelled', 'failed', 'dead_letter'],
  running: ['completed', 'failed', 'dead_letter'],
  completed: [],
  failed: ['queued', 'dead_letter', 'cancelled'],
  dead_letter: [],
  cancelled: []
}

export const isInsightOutputTransitionAllowed = (
  from: InsightOutputState,
  to: InsightOutputState
): boolean => INSIGHT_OUTPUT_TRANSITIONS[from].includes(to)
