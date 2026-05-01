// TASK-745 — Pure compliance check (TS mirror of DB trigger).
// Client-safe (no DB / no server-only deps). Used both by API routes (defensive
// preview before DB hit) and by the UI dialog for live feedback.

import {
  CHILE_DEPENDENT_LEGAL_REASONS,
  type AdjustmentReasonCode
} from './reason-codes'
import type { AdjustmentKind } from '@/types/payroll-adjustments'

export interface ChileComplianceCheckInput {
  payRegime: 'chile' | 'international'
  contractTypeSnapshot: string | null
  kind: AdjustmentKind
  payload: Record<string, unknown>
  reasonCode: AdjustmentReasonCode
}

/**
 * Espejo en TS del trigger SQL `assert_chile_dependent_adjustment_compliance`.
 *
 * Devuelve null si OK, o un mensaje user-facing si bloqueado.
 */
export function checkChileDependentCompliance(
  input: ChileComplianceCheckInput
): string | null {
  if (input.payRegime !== 'chile') return null

  if (
    input.contractTypeSnapshot !== 'indefinido' &&
    input.contractTypeSnapshot !== 'plazo_fijo'
  ) {
    return null
  }

  const isExclude = input.kind === 'exclude'

  const factor =
    input.kind === 'gross_factor'
      ? Number((input.payload as { factor?: number }).factor)
      : NaN

  const isZeroFactor = input.kind === 'gross_factor' && factor === 0

  if (isExclude || isZeroFactor) {
    if (!CHILE_DEPENDENT_LEGAL_REASONS.has(input.reasonCode)) {
      return `Para excluir o llevar a 0% a un colaborador Chile dependiente debes elegir un motivo legal documentado: licencia sin goce, ausencia injustificada o finiquito en curso.`
    }
  }

  return null
}
