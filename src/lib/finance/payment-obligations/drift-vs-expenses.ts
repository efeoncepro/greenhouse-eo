import 'server-only'

import { query } from '@/lib/db'

export interface PaymentObligationsDriftReport {
  periodId: string
  obligationCount: number
  expenseCount: number
  obligationsTotalClp: number | null
  expensesTotalClp: number | null
  obligationOnlyKeys: Array<{ obligationKind: string; beneficiaryId: string; amount: number; currency: string }>
  expenseOnlyKeys: Array<{ memberId: string | null; expenseType: string; amount: number; currency: string }>
  driftCount: number
  notes: string[]
}

interface ObligationCountRow extends Record<string, unknown> {
  obligation_kind: string
  beneficiary_id: string
  amount: number | string
  currency: string
}

interface ExpenseCountRow extends Record<string, unknown> {
  member_id: string | null
  expense_type: string
  total_amount: number | string
  currency: string
}

/**
 * Compara payment_obligations vs expenses para un periodo dado y reporta
 * inconsistencias (obligation generada sin expense correspondiente o
 * viceversa). Usado por health checks + dashboard reliability.
 */
export async function getPaymentObligationsDrift(
  periodId: string
): Promise<PaymentObligationsDriftReport> {
  const obligationsRows = await query<ObligationCountRow>(
    `SELECT obligation_kind, beneficiary_id, amount, currency
       FROM greenhouse_finance.payment_obligations
      WHERE period_id = $1
        AND status NOT IN ('superseded', 'cancelled')`,
    [periodId]
  )

  const expensesRows = await query<ExpenseCountRow>(
    `SELECT member_id, expense_type, total_amount, currency
       FROM greenhouse_finance.expenses
      WHERE payroll_period_id = $1
        AND source_type = 'payroll_generated'
        AND COALESCE(is_annulled, FALSE) = FALSE`,
    [periodId]
  )

  const toNumber = (v: unknown): number => {
    if (typeof v === 'number') return v

    if (typeof v === 'string') {
      const n = Number(v)

      return Number.isFinite(n) ? n : 0
    }

    return 0
  }

  // Sumar totales en CLP equivalente (V1: usa raw amount + multiplica USD por 1
  // — en V2 se puede traer fx_rates real). La metrica primaria es el COUNT,
  // los totales son indicativos.
  const obligationsTotalRaw = obligationsRows.reduce((sum, r) => sum + toNumber(r.amount), 0)
  const expensesTotalRaw = expensesRows.reduce((sum, r) => sum + toNumber(r.total_amount), 0)

  const notes: string[] = []
  let driftCount = 0

  // Match canonico V1: comparamos solo cuentas para detectar gaps de cobertura.
  // En V2 se puede agregar match per-(beneficiary, kind) → expense (member, expense_type).
  if (obligationsRows.length === 0 && expensesRows.length > 0) {
    notes.push(
      `Periodo ${periodId} tiene ${expensesRows.length} expenses pero 0 obligations: gap de materializacion`
    )
    driftCount += expensesRows.length
  } else if (obligationsRows.length > 0 && expensesRows.length === 0) {
    notes.push(
      `Periodo ${periodId} tiene ${obligationsRows.length} obligations pero 0 expenses: bridge expense aun no corrio`
    )
    driftCount += obligationsRows.length
  } else if (obligationsRows.length !== expensesRows.length) {
    notes.push(
      `Periodo ${periodId}: ${obligationsRows.length} obligations vs ${expensesRows.length} expenses — diferencia ${Math.abs(obligationsRows.length - expensesRows.length)}`
    )
    driftCount += Math.abs(obligationsRows.length - expensesRows.length)
  }

  return {
    periodId,
    obligationCount: obligationsRows.length,
    expenseCount: expensesRows.length,
    obligationsTotalClp: obligationsTotalRaw,
    expensesTotalClp: expensesTotalRaw,
    obligationOnlyKeys: obligationsRows.map(r => ({
      obligationKind: r.obligation_kind,
      beneficiaryId: r.beneficiary_id,
      amount: toNumber(r.amount),
      currency: r.currency
    })),
    expenseOnlyKeys: expensesRows.map(r => ({
      memberId: r.member_id,
      expenseType: r.expense_type,
      amount: toNumber(r.total_amount),
      currency: r.currency
    })),
    driftCount,
    notes
  }
}
