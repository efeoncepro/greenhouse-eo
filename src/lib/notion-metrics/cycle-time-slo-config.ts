/**
 * TASK-908 Slice 0 — Cycle Time SLO threshold canonical configuration.
 *
 * Per `docs/architecture/metrics/CT_SLO_PCT_V1.md`:
 *
 * - V1 usa threshold uniforme `14.2 días` (benchmark canonical "promedio
 *   agencia LATAM" — Engine doc § A.5.5).
 * - `getSLOThreshold(taskType?)` acepta `taskType` opcional para forward-compat
 *   V2 (calibración per tipo de pieza). V1 lo ignora — todos comparados vs 14.2.
 *
 * Constante operativa: el threshold es per industria (no per cliente individual,
 * sería competitive disadvantage para clientes con expectativas más estrictas).
 *
 * NOT server-only — safe en client + server (pure config + functions).
 */

/** Canonical V1 threshold (Engine doc § A.5.5, "promedio agencia LATAM"). */
export const CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS = 14.2

/**
 * Forward-compat V2: threshold per tipo de pieza. V1 NO usa (helper ignora
 * `taskType`). V2 activará cuando emerja calibración data-driven per tipo.
 * Documentado en CT_SLO_PCT_V1.md §2.3.
 *
 *   video largo → 21d
 *   sitio web / landing → 28d
 *   estático / banner → 7d
 *   GIF → 5d
 *
 * V1 mantiene el map vacío + getSLOThreshold returns DEFAULT.
 */
export const CYCLE_TIME_SLO_THRESHOLDS_PER_TASK_TYPE: Readonly<Record<string, number>> =
  Object.freeze({})

/**
 * Resolve canonical SLO threshold for a task type. V1 returns DEFAULT
 * uniformly — `taskType` ignored. V2 will look up the per-type map.
 *
 * Forward-compat signature: callers pass `taskType` proactively so V2 doesn't
 * require call-site changes when calibration activates.
 */
export const getSLOThreshold = (taskType?: string | null): number => {
  if (taskType) {
    const calibrated = CYCLE_TIME_SLO_THRESHOLDS_PER_TASK_TYPE[taskType]

    if (typeof calibrated === 'number') return calibrated
  }

  return CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS
}

/**
 * Predicate canonical: ¿la tarea está dentro del SLO de industria?
 *
 *   isWithinSLO(10) → true (10 ≤ 14.2)
 *   isWithinSLO(15) → false
 *   isWithinSLO(null) → false (no se puede evaluar)
 */
export const isWithinSLO = (
  cycleTimeDays: number | null | undefined,
  taskType?: string | null
): boolean => {
  if (cycleTimeDays === null || cycleTimeDays === undefined) return false

  return cycleTimeDays <= getSLOThreshold(taskType)
}

/** Canonical formula version (per CT_SLO_PCT_V1 §2.4). */
export const CT_SLO_PCT_FORMULA_VERSION = 'ct_slo_pct_v1.0' as const
