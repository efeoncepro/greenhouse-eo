import 'server-only'

/**
 * TASK-759 — Feature flag para el lifecycle de envío del recibo de nómina.
 *
 * - `legacy_export` (default): comportamiento histórico. El email se envía
 *   en `payroll_period.exported`. Preserva 100% el comportamiento de hoy.
 *
 * - `on_payment_paid`: nuevo. El export solo genera PDFs en bucket. El email
 *   se envía cuando la `payment_order` se marca como pagada.
 *
 * - `both`: transición. Ambos paths fire; idempotency natural por
 *   `(entry_id, revision)` previene duplicados.
 *
 * El default conservador `'legacy_export'` garantiza que merge-ar TASK-759
 * NO cambia comportamiento productivo hasta que un operador explícitamente
 * cambie la env var.
 */
export type PayslipDeliveryMode = 'legacy_export' | 'on_payment_paid' | 'both'

const VALID_MODES: PayslipDeliveryMode[] = ['legacy_export', 'on_payment_paid', 'both']

const DEFAULT_MODE: PayslipDeliveryMode = 'legacy_export'

export const getPaymentDeliveryMode = (): PayslipDeliveryMode => {
  const raw = process.env.GREENHOUSE_PAYSLIP_DELIVERY_MODE?.trim().toLowerCase()

  if (raw && (VALID_MODES as string[]).includes(raw)) {
    return raw as PayslipDeliveryMode
  }

  return DEFAULT_MODE
}

/**
 * Helper para projections legacy: ¿debe `payroll_period.exported` enviar emails?
 * - legacy_export → SI (comportamiento de hoy)
 * - on_payment_paid → NO (export solo genera PDF, email al pagar)
 * - both → SI (idempotency previene duplicados con on_payment_paid)
 */
export const shouldSendOnExport = (): boolean => {
  const mode = getPaymentDeliveryMode()

  return mode === 'legacy_export' || mode === 'both'
}

/**
 * Helper para projection nueva: ¿debe `finance.payment_order.paid` disparar envío?
 */
export const shouldSendOnPayment = (): boolean => {
  const mode = getPaymentDeliveryMode()

  return mode === 'on_payment_paid' || mode === 'both'
}
