import 'server-only'

import {
  countCorrectionTransitions,
  type CorrectionTransitionsSourceMode
} from './count-correction-transitions'

/**
 * TASK-901 Slice 1 — calculateRpaV2 canonical helper V2 (strangler migration carril paralelo).
 *
 * **Naming canonical V2 obligatorio** per ADR
 * `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (Accepted 2026-05-17, Delta
 * post-Bomba-1 + Delta 2026-05-18 PoC validation). V1 actual = Notion formula
 * `RpA` + sync legacy + `metrics_by_member.rpa_avg` + bonus path productivo
 * **NO se toca durante toda la migración** (5-7 meses, Fases A-E del ADR).
 * V2 corre en paralelo invisible (Fase A-B) → visible Notion via writeback
 * (Fase C) → bonus cutover gated por flag (Fase D) → cleanup V1 opcional 90+
 * días post Fase D stable + HR/Finance sign-off escrito (Fase E).
 *
 * Implementa literal `docs/architecture/metrics/RPA_V1.md` §4.1 Signature
 * canonical V1 (la spec describe el motor; el ADR Strangler canoniza el naming
 * V2 para coexistencia con V1 legacy).
 *
 * **Garantía operativa canonical** (ADR §0 TL;DR): cutover bonus = una sola
 * línea de código gated por `BONUS_USE_RPA_V2` flag + reversible <5 min via
 * env var flip + redeploy ops-worker. Path bonus payroll productivo NUNCA
 * queda en estado intermedio inconsistente.
 *
 * Per-task RpA compute helper que sirve como source canonical V2 de RpA
 * (Rounds per Asset) consumido por:
 *
 *   - `calculateFtrV2` (TASK-909 V2 equivalent): FTR V2 = (calculateRpaV2.value === 0)
 *   - Materializer agregado nuevo `metrics_by_member.rpa_avg_v2` (NUNCA modificar
 *     `rpa_avg` legacy V1 — coexistencia garantizada per ADR §3.1)
 *   - Bonus payroll calculator V2 cutover post-flip `BONUS_USE_RPA_V2=true`
 *     (TASK-758 zone, Fase D del ADR — flag gated)
 *   - Person 360 + Pulse + ICO scorecards + CVR cliente narrative (post Fase C
 *     writeback flip + UI surfaces consumen `rpa_avg_v2`)
 *
 * Replaces el anti-patrón legacy de leer Notion property `Correcciones` rollup
 * (bug class TASK-877 follow-up — 3,168 tareas Sky con `rpa=null` 10 meses por
 * bug del sync notion-bq-sync legacy + formula Notion editable por cualquier
 * operador sin git history, tests, observability).
 *
 * **Boundary canonical Notion ↔ Greenhouse** (ADR
 * `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`): Notion captura status
 * edits del operador; Greenhouse observa via webhook (TASK-912 futuro), persiste
 * transitions canonical en PG, computa RpA V2 acá y eventualmente escribe el
 * valor de vuelta a Notion property `[GH] RpA v2` (writeback path Fase C, NO
 * en Slice 1). NUNCA fallback a Notion `Correcciones` rollup en ningún path.
 *
 * **Null-not-zero contract canonical** (CLAUDE.md sección "Delivery Metrics
 * Ownership Boundary invariants"): cuando `countCorrectionTransitions` retorna
 * `sourceMode='unavailable'` (tarea pre-TASK-912 deployment, sin transitions
 * en table), `calculateRpaV2` retorna `value=null + dataStatus='unavailable'`.
 * NUNCA `value=0` — distingue "no data" de "0 correcciones reales". El bonus
 * downstream `calculateRpaBonus` ya maneja `rpaAvg===null → {amount:0,
 * qualifies:false}` (degradación honesta canonical RPA_V1 §13.1).
 *
 * Cross-refs:
 * - ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (autoridad canonical naming)
 * - `docs/architecture/metrics/RPA_V1.md` (spec del motor)
 * - TASK-908 Foundation `countCorrectionTransitions` (single source of truth)
 */

/**
 * Formula version canonical V2 (strangler carril paralelo).
 *
 * V1 actual (`rpa_v1.0`) sigue intacto en Notion formula + sync legacy +
 * `metrics_by_member.rpa_avg`. V2 (`rpa_v2.0`) corre paralelo desde Fase A
 * hasta cutover bonus + cleanup V1 opcional (90+ días post Fase D, mínimo).
 *
 * Bump a `rpa_v3.0` cuando Frame.io integration shippee y la policy V3 combine
 * `correctionTransitionsCount` con `clientReviewOpen` / `workflowReviewOpen` /
 * `openFrameComments` bajo regla canonical (RPA_V1 §3.2 forward-compat).
 * NUNCA bump sin migration paralela del materializer `metrics_by_*` +
 * reliability signal `notion.metrics.shadow_paridad_rpa_v2` re-baselined.
 */
export const RPA_FORMULA_VERSION = 'rpa_v2.0' as const

export interface TaskInputsForRpaV2 {
  readonly taskSourceId: string

  /** Filtro opcional: solo correciones con `transitioned_at >= windowStart`. */
  readonly windowStart?: Date | null

  /** Filtro opcional: solo correciones con `transitioned_at <= windowEnd`. */
  readonly windowEnd?: Date | null

  /**
   * V3 forward-compat (Frame.io integration futura). V2 ignora silenciosamente
   * estos campos — el caller puede pasarlos sin breaking change. Ver
   * RPA_V1.md §3.2 + §12 open question Frame.io.
   */
  readonly clientReviewOpen?: boolean | null
  readonly workflowReviewOpen?: boolean | null
  readonly openFrameComments?: number | null
}

export type RpaV2DataStatus = 'valid' | 'unavailable' | 'low_confidence' | 'suppressed'

/**
 * Source mode discrimination canonical:
 * - `canonical`: la tarea tiene AL MENOS una row en
 *   `greenhouse_delivery.task_status_transitions` (incluso si 0 correcciones).
 * - `unavailable`: la tarea NO tiene ninguna row en la table (pre-TASK-912
 *   deployment / sin history / backfill no ejecutado).
 */
export type RpaV2SourceMode = CorrectionTransitionsSourceMode

export interface RpaV2InputsUsed {
  /**
   * Snapshot del `taskSourceId` que produjo el result. Preservado para audit
   * forensic full reproducibility (ICO 5to pillar — Auditability).
   */
  readonly taskSourceId: string
  readonly correctionTransitionsCount: number
  readonly windowStart?: Date | null
  readonly windowEnd?: Date | null
}

export interface RpaV2Result {
  /**
   * Valor canonical de RpA V2 para la tarea. `null` cuando
   * `sourceMode='unavailable'` — NUNCA `0` para distinguir "no data" de
   * "0 correcciones reales" (null-not-zero contract canonical CLAUDE.md
   * "Delivery Metrics Ownership Boundary invariants").
   */
  readonly value: number | null

  /**
   * - `valid`: tarea con transitions capturadas + value reproducible
   * - `unavailable`: tarea pre-TASK-912 OR `taskSourceId` vacío
   * - `low_confidence`: (V2.1 future, via `rpa-policy.ts`) sample size insuficiente
   * - `suppressed`: (V2.1 future) compute deliberadamente omitido
   *
   * V2 Slice 1 SOLO emite `valid` o `unavailable`. Classify a `low_confidence`
   * / `suppressed` queda diferido al integrar `classifyRpaMetric` (TASK-215
   * preserved) en V2.1 cuando emerja caso real per-task.
   */
  readonly dataStatus: RpaV2DataStatus

  readonly sourceMode: RpaV2SourceMode

  readonly inputsUsed: RpaV2InputsUsed

  readonly formulaVersion: typeof RPA_FORMULA_VERSION
}

/**
 * Helper canonical V2 per-task RpA compute. Delega 100% la lógica de "contar
 * correciones" a `countCorrectionTransitions` (single source of truth canonical
 * TASK-908 V1.0 Foundation shipped 2026-05-18). NO contiene SQL ni lectura
 * Notion — es un mapper puro del result del foundation helper al shape canonical
 * `RpaV2Result`.
 *
 * **Coexistencia con V1 legacy garantizada** (ADR Strangler §3.1): este helper
 * NO toca el path V1 productivo (Notion formula + sync + `rpa_avg` + bonus).
 * V1 sigue corriendo intacto hasta cutover bonus (Fase D) + cleanup opcional
 * (Fase E).
 *
 * Idempotente (pure read). Re-invocaciones con mismos inputs retornan mismo
 * result (modulo cambios concurrentes en `task_status_transitions`, que sería
 * comportamiento esperado de un freshness read).
 *
 * Edge cases canonical:
 * - `taskSourceId` vacío/null/whitespace → delegated a foundation helper, que
 *   retorna `sourceMode='unavailable'`. `calculateRpaV2` mapea a `value=null`.
 * - Tarea pre-TASK-912 sin rows en table → `unavailable` honest.
 * - Tarea con 0 correciones canonical → `value=0, dataStatus='valid'`,
 *   `sourceMode='canonical'`. Distinto de unavailable.
 * - Window invertida (`windowStart > windowEnd`) → delegated a foundation
 *   helper, retorna `count=0` (no throw). `calculateRpaV2` propaga `value=0`
 *   con `dataStatus='valid'` cuando la tarea tiene rows en table.
 * - V3 fields (`clientReviewOpen` / `workflowReviewOpen` / `openFrameComments`)
 *   ignorados silenciosamente — forward-compat sin breaking change.
 */
export const calculateRpaV2 = async (inputs: TaskInputsForRpaV2): Promise<RpaV2Result> => {
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
