import 'server-only'

import { calculateRpaV2, type RpaV2Result } from './calculate-rpa-v2'

/**
 * TASK-909 Slice 1 — calculateFtr canonical helper V1.
 *
 * Implementa literal `docs/architecture/metrics/FTR_V1.md` §4.1 Signature
 * canonical V1: **delegación pura** a `calculateRpaV2` (TASK-901 Slice 1
 * SHIPPED, estrangulador RpA V2). FTR NO contiene lógica propia — solo mapea
 * `RpA → pass/fail` y propaga el `dataStatus`.
 *
 * **Definición canonical** (FTR_V1.md §1): FTR (First-Time Right) mide si una
 * tarea completada fue entregada bien a la primera, sin que el cliente pidiera
 * correcciones. Es la lectura **binaria** (pass/fail) que complementa RpA
 * (cuantitativa).
 *
 *   - `FTR = pass` → tarea aprobada sin correcciones del cliente (RpA = 0)
 *   - `FTR = fail` → tarea recibió ≥1 ronda de correcciones del cliente (RpA ≥ 1)
 *   - `FTR = null` (dataStatus `unavailable`) → sin data de transiciones canonical
 *
 * **Delegación pura canonical** (FTR_V1.md §2.1): cualquier cambio en cómo se
 * cuentan correcciones vive en `calculateRpaV2` (→ `countCorrectionTransitions`,
 * TASK-908 Foundation) y FTR se beneficia automático. El motor compuesto de 5
 * señales que describe Engine doc § A.5.3 (4 de las 5 dependen de Frame.io que
 * no existe) NO vive acá — cuando Frame.io shippee, se extiende `calculateRpaV2`
 * y FTR se beneficia sin breaking change (FTR_V1.md §3.2 forward-compat).
 *
 * **Versionado desacoplado** (FTR_V1.md §2.3): `ftr_v1.0` delega a `rpa_v2.0` —
 * NO es mismatch. Cada métrica versiona su propia transformación (mapping
 * pass/fail). Para trazabilidad full, `rpaSnapshot.formulaVersion` registra qué
 * versión de RpA produjo el input. FTR sube a `ftr_v2.0` solo si cambia su
 * propio mapping (e.g. lógica combinatoria Frame.io propia más allá de delegar).
 *
 * **Convención post-completion only** (FTR_V1.md §4 nota): el caller debe
 * pre-validar `task.completed === true` y `task.status NOT IN
 * EXCLUDED_FROM_METRICS_STATUSES` antes de invocar. `calculateFtr` retorna el
 * pass/fail calculado; el caller decide si es semánticamente evaluable.
 *
 * **Boundary canonical Notion ↔ Greenhouse** (ADR
 * `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`): Notion captura status
 * edits; Greenhouse computa FTR vía delegación → `calculateRpaV2` →
 * `countCorrectionTransitions` → lee `task_status_transitions`. NUNCA fallback
 * a leer una propiedad Notion `FTR` ni `Correcciones` rollup (bug class
 * TASK-877 follow-up). El writeback a `[GH] FTR` es TASK-903 futura, NO V1.
 *
 * Cross-refs:
 * - `docs/architecture/metrics/FTR_V1.md` (spec canonical — single source of truth)
 * - `docs/architecture/metrics/RPA_V1.md` (FTR delega a RpA)
 * - `src/lib/notion-metrics/calculate-rpa-v2.ts` (`calculateRpaV2` — TASK-901)
 * - ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
 */

/**
 * Formula version canonical V1 (mapping pass/fail). Trackea la propia lógica
 * de transformación de FTR, desacoplada de la versión interna de RpA
 * (`rpa_v2.0`). Ver FTR_V1.md §2.3.
 */
export const FTR_FORMULA_VERSION = 'ftr_v1.0' as const

export interface TaskInputsForFtr {
  readonly taskSourceId: string

  /** Filtro opcional: propaga a `calculateRpaV2` (solo correciones >= windowStart). */
  readonly windowStart?: Date | null

  /** Filtro opcional: propaga a `calculateRpaV2` (solo correciones <= windowEnd). */
  readonly windowEnd?: Date | null

  /**
   * Forward-compat Frame.io (V2). Se propagan a `calculateRpaV2`, que hoy los
   * ignora silenciosamente — el caller puede pasarlos sin breaking change.
   * Cuando la integración Frame.io shippee, `calculateRpaV2` activa la policy
   * combinatoria → FTR resultará más estricto naturalmente. Ver FTR_V1.md §3.2.
   */
  readonly clientReviewOpen?: boolean | null
  readonly workflowReviewOpen?: boolean | null
  readonly openFrameComments?: number | null

  /**
   * Campo FTR-level reservado V2; `calculateRpaV2` aún NO lo acepta como input,
   * por lo que NO se propaga en V1. Ver FTR_V1.md §3.2 + §12.
   */
  readonly handoffArtifactPresent?: boolean | null
}

export interface FtrResult {
  readonly value: 'pass' | 'fail' | 'not_applicable' | null

  /**
   * Hereda los estados computables de RpA V2. `low_confidence` se propaga para
   * no perder la señal cuando RpA lo emite (`RpaV2Result.dataStatus` tiene 4
   * valores: valid | unavailable | low_confidence | suppressed). FTR colapsa
   * `unavailable`/`suppressed` → `unavailable`; preserva `low_confidence`.
   */
  readonly dataStatus: 'valid' | 'unavailable' | 'low_confidence'

  readonly sourceMode: 'canonical' | 'unavailable'

  /**
   * Snapshot del `RpaV2Result` que produjo el veredicto. Preservado para audit
   * forensic / debugging downstream (ICO 5to pillar — Auditability).
   */
  readonly rpaSnapshot: RpaV2Result

  readonly formulaVersion: typeof FTR_FORMULA_VERSION
}

/**
 * Helper canonical V1 per-task FTR compute. Delega 100% a `calculateRpaV2`:
 * `FTR = (RpA.value === 0) ? 'pass' : 'fail'`. NO consulta
 * `task_status_transitions` directamente ni lee Notion — es un mapper puro del
 * result de RpA al shape canonical `FtrResult`.
 *
 * Idempotente (pure read vía delegación). Re-invocaciones con mismos inputs
 * retornan mismo result (modulo cambios concurrentes en la tabla de
 * transitions, comportamiento esperado de un freshness read).
 *
 * Edge cases canonical (FTR_V1.md §4.2 + §6.2):
 * - RpA `value=null` / `dataStatus='unavailable'` (tarea pre-TASK-912 sin
 *   transitions) → FTR `value=null`, `dataStatus='unavailable'`. NUNCA se
 *   infiere desde Notion `Correcciones` legacy.
 * - RpA `dataStatus='suppressed'` con value no-nulo → FTR `value=null`,
 *   `dataStatus='unavailable'` (no se computa veredicto sobre data suprimida).
 * - RpA `dataStatus='low_confidence'` con value no-nulo → FTR computa pass/fail
 *   pero propaga `low_confidence` (NO se colapsa silenciosamente a `valid`).
 * - V2 fields (`clientReviewOpen` / `workflowReviewOpen` / `openFrameComments`)
 *   propagados a `calculateRpaV2` (que hoy los ignora — forward-compat).
 *   `handoffArtifactPresent` NO se propaga (RpA V2 aún no lo acepta).
 */
export const calculateFtr = async (inputs: TaskInputsForFtr): Promise<FtrResult> => {
  const rpa = await calculateRpaV2({
    taskSourceId: inputs.taskSourceId,
    windowStart: inputs.windowStart,
    windowEnd: inputs.windowEnd,
    clientReviewOpen: inputs.clientReviewOpen,
    workflowReviewOpen: inputs.workflowReviewOpen,
    openFrameComments: inputs.openFrameComments
  })

  // No computable: sin data canonical (`unavailable`), valor nulo, o
  // explícitamente suprimida (`suppressed`) → FTR `null` + `unavailable`.
  if (rpa.value === null || rpa.dataStatus === 'unavailable' || rpa.dataStatus === 'suppressed') {
    return {
      value: null,
      dataStatus: 'unavailable',
      sourceMode: rpa.sourceMode,
      rpaSnapshot: rpa,
      formulaVersion: FTR_FORMULA_VERSION
    }
  }

  // value no-nulo + dataStatus `valid` o `low_confidence` → computa pass/fail.
  // El caveat low_confidence se propaga (NO se colapsa silenciosamente a valid).
  return {
    value: rpa.value === 0 ? 'pass' : 'fail',
    dataStatus: rpa.dataStatus === 'low_confidence' ? 'low_confidence' : 'valid',
    sourceMode: 'canonical',
    rpaSnapshot: rpa,
    formulaVersion: FTR_FORMULA_VERSION
  }
}
