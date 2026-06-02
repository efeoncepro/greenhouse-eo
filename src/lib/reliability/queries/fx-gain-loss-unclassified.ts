import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-990 Slice 7 — Reliability signal: realized FX gain/loss that exists
 * economically but was NOT classified into the canonical FX lane.
 *
 * A non-CLP-settled payment (income or expense) MUST quantify its realized FX
 * delta (rate-at-settlement vs booked rate) in `fx_gain_loss_clp`, which flows
 * `income_payments`/`expense_payments` → `account_balances.fx_gain_loss_realized_clp`
 * → VIEW `fx_pnl_breakdown.realized_clp` (TASK-699). A non-CLP active payment with
 * `fx_gain_loss_clp IS NULL` means the FX delta exists but was never classified —
 * it would otherwise be buried in operating P&L (risk matrix: "FX loss buried in
 * operating P&L"). This is the defense-in-depth detector that the payment-ledger
 * native-rate computation (Slice 7) and the legacy USD path keep it at 0.
 *
 * Only ACTIVE payments count (supersede chains excluded — TASK-702/703b/708b).
 *
 * **Kind**: `data_quality`. **Severidad**: `error` cuando count > 0. Steady = 0.
 */
export const FX_GAIN_LOSS_UNCLASSIFIED_SIGNAL_ID = 'finance.fx_gain_loss.unclassified'

export const getFxGainLossUnclassifiedSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ income_n: number; expense_n: number }>(
      `SELECT
         (SELECT COUNT(*)::int
            FROM greenhouse_finance.income_payments
           WHERE currency IS NOT NULL AND currency <> 'CLP'
             AND fx_gain_loss_clp IS NULL
             AND superseded_by_payment_id IS NULL
             AND superseded_by_otb_id IS NULL
             AND superseded_at IS NULL) AS income_n,
         (SELECT COUNT(*)::int
            FROM greenhouse_finance.expense_payments
           WHERE currency IS NOT NULL AND currency <> 'CLP'
             AND fx_gain_loss_clp IS NULL
             AND superseded_by_payment_id IS NULL
             AND superseded_by_otb_id IS NULL
             AND superseded_at IS NULL) AS expense_n`
    )

    const incomeCount = Number(rows[0]?.income_n ?? 0)
    const expenseCount = Number(rows[0]?.expense_n ?? 0)
    const count = incomeCount + expenseCount

    return {
      signalId: FX_GAIN_LOSS_UNCLASSIFIED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getFxGainLossUnclassifiedSignal',
      label: 'FX gain/loss sin clasificar',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todo pago no-CLP activo tiene su resultado cambiario (fx_gain_loss_clp) cuantificado.'
          : `${count} pago${count === 1 ? '' : 's'} no-CLP activo${count === 1 ? '' : 's'} (income ${incomeCount} / expense ${expenseCount}) sin fx_gain_loss_clp: el resultado cambiario existe pero no quedó clasificado en el lane FX (fx_pnl_breakdown).`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "COUNT(*) over income_payments + expense_payments WHERE currency<>'CLP' AND fx_gain_loss_clp IS NULL AND NOT superseded"
        },
        { kind: 'metric', label: 'income', value: String(incomeCount) },
        { kind: 'metric', label: 'expense', value: String(expenseCount) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-990-mxn-multi-currency-finance-core.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_fx_gain_loss_unclassified' }
    })

    return {
      signalId: FX_GAIN_LOSS_UNCLASSIFIED_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'data_quality',
      source: 'getFxGainLossUnclassifiedSignal',
      label: 'FX gain/loss sin clasificar',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}
