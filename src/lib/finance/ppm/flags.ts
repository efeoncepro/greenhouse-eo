// TASK-1189 — Feature flag de la posición mensual de PPM (línea PPM del F29).
// Default OFF + shadow, igual que TASK-725/1188. El materializador y los readers
// existen detrás de este flag; la cifra (y sobre todo la TASA PPM, hoy placeholder)
// se valida con el contador vs el F29 real ANTES de flipear a `true`.
// Patrón: src/lib/finance/retention/flags.ts.

/** Gate de exposición "live" de la posición de PPM. Default OFF → el endpoint
 *  marca `enabled:false` (shadow) para que ningún consumer trate la cifra como el
 *  F29 oficial hasta el flip post-validación contable (incluida la tasa real). */
export const isPpmPositionEnabled = (): boolean => process.env.PPM_POSITION_ENABLED === 'true'
