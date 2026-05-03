// TASK-745 — Controlled vocabulary for adjustment reasons.
// Spec: docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md (Adjustments section)

export const ADJUSTMENT_REASON_CODES = [
  'low_performance',
  'no_activity',
  'paid_externally',
  'advance_payback',
  'loan_payback',
  'leave_unpaid',
  'unauthorized_absence',
  'termination_pending',
  'agreed_discount',
  'correction_prior_period',
  'other'
] as const

export type AdjustmentReasonCode = (typeof ADJUSTMENT_REASON_CODES)[number]

// Reasons that satisfy compliance Chile dependiente when excluding or zeroing.
export const CHILE_DEPENDENT_LEGAL_REASONS: ReadonlySet<AdjustmentReasonCode> = new Set([
  'leave_unpaid',
  'unauthorized_absence',
  'termination_pending'
])

// Display labels (es-CL).
export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReasonCode, string> = {
  low_performance: 'Bajo rendimiento',
  no_activity: 'Sin actividad este periodo',
  paid_externally: 'Pagado por otra via',
  advance_payback: 'Devolucion de anticipo',
  loan_payback: 'Cuota de prestamo',
  leave_unpaid: 'Licencia sin goce',
  unauthorized_absence: 'Ausencia injustificada',
  termination_pending: 'Finiquito en curso',
  agreed_discount: 'Descuento pactado',
  correction_prior_period: 'Correccion de periodo anterior',
  other: 'Otro'
}

export const isAdjustmentReasonCode = (value: unknown): value is AdjustmentReasonCode =>
  typeof value === 'string' && (ADJUSTMENT_REASON_CODES as readonly string[]).includes(value)

export const isLegalReasonForChileDependent = (code: AdjustmentReasonCode): boolean =>
  CHILE_DEPENDENT_LEGAL_REASONS.has(code)
