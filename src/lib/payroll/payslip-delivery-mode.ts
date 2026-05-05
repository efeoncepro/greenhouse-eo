import 'server-only'

/**
 * TASK-759 — Feature flag para el lifecycle de envío del recibo de nómina.
 *
 * - `legacy_export`: comportamiento histórico. El email se envía
 *   en `payroll_period.exported`. Preserva 100% el comportamiento previo
 *   a TASK-759 V1.
 *
 * - `on_payment_paid`: el export solo genera PDFs en bucket. El email
 *   se envía cuando la `payment_order` se marca como pagada.
 *
 * - `both` (DEFAULT desde 2026-05-05 / TASK-753 hardening): ambos paths
 *   activos. Idempotency natural por `(entry_id, revision)` en
 *   `sendPayslipForEntry` (TASK-759 V2) garantiza que un mismo recibo se
 *   envía exactamente UNA vez, independiente de cuál trigger gane la carrera.
 *
 * **Por qué `both` es el default canónico**:
 *  - **Robusto**: cubre tanto "exportaste el período" como "marcaste paid" —
 *    ningún operador queda sin notificación dependiendo del orden de operaciones.
 *  - **Resiliente**: si un trigger falla (network blip, projection breaker
 *    abierto), el otro trigger es la safety net.
 *  - **Seguro**: idempotency-by-design en `sendPayslipForEntry` (chequeo
 *    `payslip_deliveries` por `(entry_id, delivery_kind)`) previene duplicados.
 *  - **Escalable**: cuando emerja un nuevo trigger (e.g. payment_revised,
 *    manual_resend), se agrega al enum y default sigue cubriendo.
 *
 * Para forzar un modo específico (rollback / debug), set
 * `GREENHOUSE_PAYSLIP_DELIVERY_MODE` en env.
 */
export type PayslipDeliveryMode = 'legacy_export' | 'on_payment_paid' | 'both'

const VALID_MODES: PayslipDeliveryMode[] = ['legacy_export', 'on_payment_paid', 'both']

const DEFAULT_MODE: PayslipDeliveryMode = 'both'

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
