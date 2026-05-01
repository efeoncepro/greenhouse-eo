// TASK-745 — Payroll Adjustments domain types.
// Spec: docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md (Adjustments).

import type { AdjustmentReasonCode } from '@/lib/payroll/adjustments/reason-codes'

export type AdjustmentKind =
  | 'exclude'
  | 'gross_factor'
  | 'gross_factor_per_component'
  | 'fixed_deduction'
  | 'manual_override'

export type AdjustmentStatus = 'pending_approval' | 'active' | 'reverted' | 'superseded'

export type AdjustmentSourceKind =
  | 'manual'
  | 'recurring_schedule'
  | 'finance_event'
  | 'reliquidation_clone'

// Discriminated union por kind.
export type AdjustmentPayload =
  | { kind: 'exclude' }
  | { kind: 'gross_factor'; factor: number }
  | {
      kind: 'gross_factor_per_component'
      // map columna lógica → factor (e.g. { base: 0.5, bonusOtd: 1, bonusRpa: 1 })
      components: Record<string, number>
    }
  | { kind: 'fixed_deduction'; amount: number }
  | { kind: 'manual_override'; netClp: number }

export interface PayrollAdjustment {
  adjustmentId: string
  payrollEntryId: string
  memberId: string
  periodId: string
  kind: AdjustmentKind
  payload: Record<string, unknown>
  sourceKind: AdjustmentSourceKind
  sourceRef: string | null
  reasonCode: AdjustmentReasonCode
  reasonNote: string
  status: AdjustmentStatus
  requestedBy: string
  requestedAt: string
  approvedBy: string | null
  approvedAt: string | null
  revertedBy: string | null
  revertedAt: string | null
  revertedReason: string | null
  supersededBy: string | null
  effectiveAt: string
  version: number
  createdAt: string
  updatedAt: string
}

// Result of computing net for an entry given its active adjustments.
export interface PayrollEntryNetComputation {
  excluded: boolean
  naturalGrossClp: number       // bruto natural (sin factor)
  effectiveGrossClp: number     // bruto despues de aplicar factor
  factorApplied: number         // 1 si no hay factor, sino el factor efectivo
  siiRetentionClp: number
  chileDeductionsClp: number    // sum AFP + health + unemployment + tax para chile dependiente
  fixedDeductionClp: number     // sum de fixed_deduction
  netBeforeOverride: number
  netClp: number                // neto final (post override si aplica)
  overrideApplied: boolean
  appliedAdjustmentIds: string[]
}
