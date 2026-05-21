/**
 * TASK-912 Slices 4-5 — Feature flags canonical de Cycle Time. Patrón
 * `process.env.X === 'true'` (sin drift, default OFF), mirror de
 * `src/lib/ico-engine/materialize-flags.ts`.
 *
 * **Default OFF es load-bearing**: garantiza que la VIEW de métricas
 * `v_tasks_enriched` se regenere con la fórmula LEGACY de `cycle_time_days`
 * (byte-idéntica) y que la métrica `cycle_time_slo_pct` NO se compute. Cero
 * cambio de comportamiento al merge. El flip canónico está gated por shadow
 * mode 7d verde + arch-architect 4-pillar (TASK-912 spec).
 */

/**
 * Cuando ON: `v_tasks_enriched.cycle_time_days` usa la fórmula canónica V1
 * (INICIO = primera transición a `En curso`, descuento de intervalos
 * `Bloqueado`/`En pausa`, leyendo `greenhouse_conformed.task_status_transitions`).
 * Cuando OFF (default): fórmula legacy (creación → completion/now).
 */
export const isCanonicalCycleTimeFormulaEnabled = (): boolean =>
  process.env.CT_DAYS_CANONICAL_FORMULA_ENABLED === 'true'

/**
 * Cuando ON: la métrica `cycle_time_slo_pct` se computa + persiste en
 * `metrics_by_*`. Cuando OFF (default): la métrica queda declarada pero inerte.
 */
export const isCtSloPctMetricEnabled = (): boolean =>
  process.env.CT_SLO_PCT_METRIC_ENABLED === 'true'
