// TASK-745 — Apply active adjustments to a freshly built PayrollEntry draft.
// Returns a new PayrollEntry with overrides applied (immutable transformation).

import type { PayrollEntry } from '@/types/payroll'

import { getAdjustmentsByEntry } from './apply-adjustment'
import { computePayrollEntryNet, type PayrollEntryComputeSnapshot } from './compute-net'

const buildSnapshot = (
  entry: PayrollEntry,
  recomputeChileDeductionsClp?: (effectiveGrossClp: number) => number
): PayrollEntryComputeSnapshot => ({
  payRegime: entry.payRegime as 'chile' | 'international',
  contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
  currency: entry.currency,
  naturalGrossClp: entry.grossTotal,
  components: {
    base: entry.adjustedBaseSalary ?? entry.baseSalary,
    remoteAllowance: entry.adjustedRemoteAllowance ?? entry.remoteAllowance,
    bonusOtd: entry.bonusOtdAmount,
    bonusRpa: entry.bonusRpaAmount,
    fixedBonus: entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount
  },
  siiRetentionRate: entry.siiRetentionRate ?? null,
  recomputeChileDeductionsClp
})

/**
 * Reads active adjustments for `entry.entryId`, applies `computePayrollEntryNet`,
 * and returns a new entry with grossTotal/netTotal/siiRetentionAmount/chileTotalDeductions
 * adjusted accordingly. If no adjustments exist, returns the original entry untouched.
 *
 * For Chile dependent contracts that need recomputed previsional deductions (AFP/health/
 * unemployment/tax over an effective gross less than natural), the caller must inject
 * `recomputeChileDeductionsClp`. If omitted, this fn proportionally scales the original
 * `chileTotalDeductions` by the factor (linear approximation, sufficient for V1).
 */
export async function applyAdjustmentsToEntry(entry: PayrollEntry): Promise<PayrollEntry> {
  const adjustments = await getAdjustmentsByEntry(entry.entryId, { activeOnly: true })

  if (adjustments.length === 0) return entry

  // Linear scale of chileTotalDeductions when factor < 1 (V1 approximation).
  // For V2 we can inject calculatePayrollTotals() via the caller for exact recompute.
  const linearScale = (gross: number, naturalGross: number): number => {
    if (naturalGross <= 0) return 0
    const baseDeductions = entry.chileTotalDeductions ?? 0

    return baseDeductions * (gross / naturalGross)
  }

  const snapshot = buildSnapshot(entry, gross => linearScale(gross, entry.grossTotal))
  const computation = computePayrollEntryNet(snapshot, adjustments)

  return {
    ...entry,
    grossTotal: computation.effectiveGrossClp,
    siiRetentionAmount: computation.siiRetentionClp || entry.siiRetentionAmount,
    chileTotalDeductions: computation.chileDeductionsClp || entry.chileTotalDeductions,
    netTotalCalculated: computation.netBeforeOverride,
    netTotal: computation.netClp,
    netTotalOverride: computation.overrideApplied ? computation.netClp : entry.netTotalOverride,
    manualOverride: computation.overrideApplied ? true : entry.manualOverride
  }
}
