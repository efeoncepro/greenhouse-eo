// TASK-748 — Payment Obligations domain types.
// Spec: docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md (Obligations).

export const PAYMENT_OBLIGATION_KINDS = [
  'employee_net_pay',
  'employer_social_security',
  'employee_withheld_component',
  'provider_payroll',
  'processor_fee',
  'fx_component',
  'manual'
] as const

export type PaymentObligationKind = (typeof PAYMENT_OBLIGATION_KINDS)[number]

export const PAYMENT_OBLIGATION_STATUSES = [
  'generated',
  'scheduled',
  'partially_paid',
  'paid',
  'reconciled',
  'closed',
  'cancelled',
  'superseded'
] as const

export type PaymentObligationStatus = (typeof PAYMENT_OBLIGATION_STATUSES)[number]

export const PAYMENT_OBLIGATION_ORDER_CREATABLE_STATUSES = [
  'generated',
  'partially_paid'
] as const satisfies readonly PaymentObligationStatus[]

export const canCreatePaymentOrderFromObligationStatus = (
  status: PaymentObligationStatus
): boolean => PAYMENT_OBLIGATION_ORDER_CREATABLE_STATUSES.includes(
  status as (typeof PAYMENT_OBLIGATION_ORDER_CREATABLE_STATUSES)[number]
)

export const PAYMENT_OBLIGATION_SOURCE_KINDS = [
  'payroll',
  'supplier_invoice',
  'tax_obligation',
  'manual',
  'reliquidation_delta'
] as const

export type PaymentObligationSourceKind = (typeof PAYMENT_OBLIGATION_SOURCE_KINDS)[number]

export const PAYMENT_OBLIGATION_BENEFICIARY_TYPES = [
  'member',
  'supplier',
  'tax_authority',
  'processor',
  'other'
] as const

export type PaymentObligationBeneficiaryType =
  (typeof PAYMENT_OBLIGATION_BENEFICIARY_TYPES)[number]

export type PaymentObligationCurrency = 'CLP' | 'USD'

export interface PaymentObligation {
  obligationId: string
  spaceId: string | null
  sourceKind: PaymentObligationSourceKind
  sourceRef: string
  periodId: string | null
  beneficiaryType: PaymentObligationBeneficiaryType
  beneficiaryId: string
  beneficiaryName: string | null
  beneficiaryAvatarUrl: string | null
  obligationKind: PaymentObligationKind
  amount: number
  currency: PaymentObligationCurrency
  status: PaymentObligationStatus
  dueDate: string | null
  metadataJson: Record<string, unknown>
  supersededBy: string | null
  cancelledReason: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentObligationDriftRow {
  periodId: string
  obligationCount: number
  expenseCount: number
  obligationsTotalClp: number | null
  expensesTotalClp: number | null
  driftCount: number
  notes: string[]
}
