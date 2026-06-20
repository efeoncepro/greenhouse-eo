// TASK-1188 — Feature flag de la posición mensual de RETENCIONES (línea
// retenciones del F29). Default OFF + shadow, igual que el cutover de TASK-725.
// El materializador y los readers existen detrás de este flag; la cifra se valida
// con el contador vs el F29 real ANTES de flipear a `true` (rollout gate).
// Patrón: src/lib/finance/multi-currency/flags.ts.

/** Gate de exposición "live" de la posición de retenciones. Default OFF → el
 *  endpoint marca `enabled:false` (shadow) para que ningún consumer trate la
 *  cifra como el F29 oficial hasta el flip post-validación contable. */
export const isRetentionPositionEnabled = (): boolean => process.env.RETENTION_POSITION_ENABLED === 'true'
