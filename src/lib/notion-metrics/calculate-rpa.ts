import 'server-only'

import {
  countCorrectionTransitions,
  type CorrectionTransitionsSourceMode
} from './count-correction-transitions'

/**
 * TASK-901 Slice 1 — calculateRpa canonical helper V1.
 *
 * **Implementación canonical literal de `docs/architecture/metrics/RPA_V1.md`
 * §4.1 Signature canonical V1**. Per-task compute helper que sirve como source
 * canonical de RpA (Rounds per Asset) consumido por:
 *
 *   - `calculateFtr` (TASK-909): FTR = (calculateRpa.value === 0)
 *   - Materializer agregado `metrics_by_member.rpa` (vía `v_tasks_enriched.rpa`)
 *   - Bonus payroll calculator `calculateRpaBonus` (TASK-758, `bonus-proration.ts`)
 *   - Person 360 + Pulse + ICO scorecards + CVR cliente narrative
 *
 * Replaces el anti-patrón legacy de leer Notion property `Correcciones` rollup
 * (bug class TASK-877 follow-up — 3,168 tareas Sky con `rpa=null` 10 meses por
 * bug del sync notion-bq-sync legacy + formula Notion editable por cualquier
 * operador sin git history, tests, observability).
 *
 * **Boundary canonical Notion ↔ Greenhouse** (ADR
 * `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`): Notion captura status
 * edits del operador; Greenhouse observa via webhook (TASK-912 futuro), persiste
 * transitions canonical en PG, computa RpA acá y eventualmente escribe el valor
 * de vuelta a Notion property `[GH] RpA` (writeback path Slices 2-5, NO en
 * Slice 1). NUNCA fallback a Notion `Correcciones` rollup en ningún path.
 *
 * **Null-not-zero contract canonical** (CLAUDE.md sección "Delivery Metrics
 * Ownership Boundary invariants"): cuando `countCorrectionTransitions` retorna
 * `sourceMode='unavailable'` (tarea pre-TASK-912 deployment, sin transitions
 * en table), `calculateRpa` retorna `value=null + dataStatus='unavailable'`.
 * NUNCA `value=0` — distingue "no data" de "0 correcciones reales". El bonus
 * downstream `calculateRpaBonus` ya maneja `rpaAvg===null → {amount:0,
 * qualifies:false}` (degradación honesta canonical RPA_V1 §13.1).
 *
 * Cross-ref: `docs/architecture/metrics/RPA_V1.md` (spec canonical V1).
 */

/**
 * Formula version canonical. Bump a `rpa_v2.0` cuando Frame.io integration
 * shippee y la policy V2 combine `correctionTransitionsCount` con
 * `clientReviewOpen` / `workflowReviewOpen` / `openFrameComments` bajo regla
 * canonical (RPA_V1 §3.2 forward-compat). NUNCA bump sin migration paralela
 * del materializer `metrics_by_*` + reliability signal
 * `notion.metrics.shadow_paridad_rpa` re-baselined.
 */
export const RPA_FORMULA_VERSION = 'rpa_v1.0' as const

export interface TaskInputsForRpa {
  readonly taskSourceId: string

  /** Filtro opcional: solo correciones con `transitioned_at >= windowStart`. */
  readonly windowStart?: Date | null

  /** Filtro opcional: solo correciones con `transitioned_at <= windowEnd`. */
  readonly windowEnd?: Date | null

  /**
   * V2 forward-compat (Frame.io integration futura). V1 ignora silenciosamente
   * estos campos — el caller puede pasarlos sin breaking change. Ver
   * RPA_V1.md §3.2 + §12 open question Frame.io.
   */
  readonly clientReviewOpen?: boolean | null
  readonly workflowReviewOpen?: boolean | null
  readonly openFrameComments?: number | null
}

export type RpaDataStatus = 'valid' | 'unavailable' | 'low_confidence' | 'suppressed'

/**
 * Source mode discrimination canonical:
 * - `canonical`: la tarea tiene AL MENOS una row en
 *   `greenhouse_delivery.task_status_transitions` (incluso si 0 correcciones).
 * - `unavailable`: la tarea NO tiene ninguna row en la table (pre-TASK-912
 *   deployment / sin history / backfill no ejecutado).
 */
export type RpaSourceMode = CorrectionTransitionsSourceMode

export interface RpaInputsUsed {
  /**
   * Snapshot del `taskSourceId` que produjo el result. Preservado para audit
   * forensic full reproducibility (ICO 5to pillar — Auditability).
   */
  readonly taskSourceId: string
  readonly correctionTransitionsCount: number
  readonly windowStart?: Date | null
  readonly windowEnd?: Date | null
}

export interface RpaResult {
  /**
   * Valor canonical de RpA para la tarea. `null` cuando
   * `sourceMode='unavailable'` — NUNCA `0` para distinguir "no data" de
   * "0 correcciones reales" (null-not-zero contract canonical CLAUDE.md
   * "Delivery Metrics Ownership Boundary invariants").
   */
  readonly value: number | null

  /**
   * - `valid`: tarea con transitions capturadas + value reproducible
   * - `unavailable`: tarea pre-TASK-912 OR `taskSourceId` vacío
   * - `low_confidence`: (V1.1 future, via `rpa-policy.ts`) sample size insuficiente
   * - `suppressed`: (V1.1 future) compute deliberadamente omitido
   *
   * V1 Slice 1 SOLO emite `valid` o `unavailable`. Classify a `low_confidence`
   * / `suppressed` queda diferido al integrar `classifyRpaMetric` (TASK-215
   * preserved) en V1.1 cuando emerja caso real per-task.
   */
  readonly dataStatus: RpaDataStatus

  readonly sourceMode: RpaSourceMode

  readonly inputsUsed: RpaInputsUsed

  readonly formulaVersion: typeof RPA_FORMULA_VERSION
}

/**
 * Helper canonical per-task RpA compute. Delega 100% la lógica de "contar
 * correciones" a `countCorrectionTransitions` (single source of truth canonical
 * TASK-908 V1.0 Foundation shipped 2026-05-18). NO contiene SQL ni lectura
 * Notion — es un mapper puro del result del foundation helper al shape canonical
 * `RpaResult`.
 *
 * Idempotente (pure read). Re-invocaciones con mismos inputs retornan mismo
 * result (modulo cambios concurrentes en `task_status_transitions`, que sería
 * comportamiento esperado de un freshness read).
 *
 * Edge cases canonical:
 * - `taskSourceId` vacío/null/whitespace → delegated a foundation helper, que
 *   retorna `sourceMode='unavailable'`. `calculateRpa` mapea a `value=null`.
 * - Tarea pre-TASK-912 sin rows en table → `unavailable` honest.
 * - Tarea con 0 correciones canonical → `value=0, dataStatus='valid'`,
 *   `sourceMode='canonical'`. Distinto de unavailable.
 * - Window invertida (`windowStart > windowEnd`) → delegated a foundation
 *   helper, retorna `count=0` (no throw). `calculateRpa` propaga `value=0`
 *   con `dataStatus='valid'` cuando la tarea tiene rows en table.
 * - V2 fields (`clientReviewOpen` / `workflowReviewOpen` / `openFrameComments`)
 *   ignorados silenciosamente — forward-compat sin breaking change.
 */
export const calculateRpa = async (inputs: TaskInputsForRpa): Promise<RpaResult> => {
  const { taskSourceId, windowStart, windowEnd } = inputs

  const transitions = await countCorrectionTransitions({
    taskSourceId,
    windowStart,
    windowEnd
  })

  if (transitions.sourceMode === 'unavailable') {
    return {
      value: null,
      dataStatus: 'unavailable',
      sourceMode: 'unavailable',
      inputsUsed: {
        taskSourceId,
        correctionTransitionsCount: 0,
        windowStart,
        windowEnd
      },
      formulaVersion: RPA_FORMULA_VERSION
    }
  }

  return {
    value: transitions.count,
    dataStatus: 'valid',
    sourceMode: 'canonical',
    inputsUsed: {
      taskSourceId,
      correctionTransitionsCount: transitions.count,
      windowStart,
      windowEnd
    },
    formulaVersion: RPA_FORMULA_VERSION
  }
}
