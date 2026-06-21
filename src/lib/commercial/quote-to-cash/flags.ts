// TASK-1206 — Quote-to-Cash canonical close feature flags. ALL default OFF.
// Expand-and-contract: el command + signals shippean detrás de estos flags; el cutover
// del path visible y la estrategia contract_only solo se activan cuando el operador los
// prende según la secuencia de rollout. Con todos OFF, el comportamiento es bit-for-bit
// el legacy (convert-to-invoice → materializeInvoiceFromApprovedQuotation).

/**
 * Gate de la convergencia de rutas (Slice 3): cuando ON, `/api/finance/quotes/[id]/convert-to-invoice`
 * delega en el comando canónico `closeQuoteToCash`. Default OFF → ruta legacy
 * (`materializeInvoiceFromApprovedQuotation`) intacta hasta el staging smoke.
 */
export const isQ2cCanonicalCloseEnabled = (): boolean =>
  process.env.COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED === 'true'

/**
 * Gate de la estrategia `contract_only` del cierre Q2C: deja la operación SUSPENDIDA (deal sin
 * AR todavía). Default OFF → la estrategia se rechaza con error gobernado. NUNCA es un cierre
 * terminal; requiere `reason` + audit `status='suspended'` + SLA + signal de breach.
 */
export const isQ2cContractOnlyEnabled = (): boolean =>
  process.env.COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED === 'true'

/**
 * SLA (días) para resolver una operación `contract_only` suspendida hacia un cierre real con
 * income. Una operación suspendida más allá del SLA dispara el signal
 * `commercial.quote_to_cash.contract_only_sla_breach` (revenue leakage observable).
 */
export const CONTRACT_ONLY_SLA_DAYS = 14
