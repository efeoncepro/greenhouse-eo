import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-929 Slice 3 — Reliability signal: unresolved finance ledger drift items.
 *
 * Steady-state visibility surface for the drift types this task owns, in the
 * Reliability Control Plane (subsystem rollup `Finance Data Quality` via
 * moduleKey='finance'). Complements — does NOT replace — the daily cron
 * `ops-finance-ledger-health` which alerts Sentry on signature change. This
 * signal is the always-on dashboard metric.
 *
 * Counts the two in-scope drift types that did NOT already have a dedicated
 * reliability signal:
 *   1. Settlement reconciliation drift — `income_settlement_reconciliation`
 *      WHERE has_drift (TASK-571 VIEW, corrected by TASK-929 Slice 1 to exclude
 *      superseded payments). This is what JAVASCRIPT-NEXTJS-4Q was driven by.
 *   2. Unanchored paid expenses — expenses paid with NO accounting anchor
 *      (no payroll/tool/supplier/tax/loan/linked-income), candidates for the
 *      suspense-account review queue.
 *
 * Phantom payments + cohort D + CLP drift already have their own signals
 * (task708d, finance.{expense,income}_payments.clp_drift), so they are excluded
 * here to avoid double-counting in the dashboard.
 *
 * Steady state expected: settlement = 0 (integrity). Unanchored may be > 0
 * transiently (data-completeness, not a balance error).
 *
 * **Kind**: `drift`. **Severidad tiered** (honest, lente contable):
 *   - settlement drift > 0  → `error` (la ecuación amount_paid = pagos +
 *     factoring + withholding NO cuadra: integridad de ledger real).
 *   - solo unanchored > 0    → `warning` (gastos pagados sin FK-anchor pero CON
 *     economic_category — clasificados para P&L; es completitud de datos, no un
 *     desbalance. Van a la cola de revisión / suspense account).
 *   - ambos 0                → `ok`.
 *
 * Pattern reference: TASK-766 `expense-payments-clp-drift.ts`,
 * TASK-774 `account-balances-fx-drift.ts`.
 */
export const LEDGER_UNRESOLVED_DRIFT_ITEMS_SIGNAL_ID =
  'finance.ledger.unresolved_drift_items'

const QUERY_SQL = `
  SELECT
    (
      SELECT COUNT(*)
      FROM greenhouse_finance.income_settlement_reconciliation
      WHERE has_drift = TRUE
    )::int AS settlement_drift,
    (
      SELECT COUNT(*)
      FROM greenhouse_finance.expenses e
      WHERE e.payment_status = 'paid'
        AND e.payroll_entry_id IS NULL
        AND e.tool_catalog_id IS NULL
        AND e.supplier_id IS NULL
        AND e.tax_type IS NULL
        AND e.loan_account_id IS NULL
        AND e.linked_income_id IS NULL
    )::int AS unanchored_expenses
`

export const getLedgerUnresolvedDriftItemsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ settlement_drift: number; unanchored_expenses: number }>(QUERY_SQL)
    const settlement = Number(rows[0]?.settlement_drift ?? 0)
    const unanchored = Number(rows[0]?.unanchored_expenses ?? 0)
    const total = settlement + unanchored

    // Tiered severity: settlement drift is a balance-integrity error; unanchored
    // paid expenses (with economic_category) are a data-completeness warning.
    const severity: ReliabilitySignal['severity'] =
      settlement > 0 ? 'error' : unanchored > 0 ? 'warning' : 'ok'

    return {
      signalId: LEDGER_UNRESOLVED_DRIFT_ITEMS_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getLedgerUnresolvedDriftItemsSignal',
      label: 'Drift de ledger sin resolver',
      severity,
      summary:
        total === 0
          ? 'Sin drift de settlement ni gastos pagados sin anchor.'
          : `${total} item${total === 1 ? '' : 's'} de drift sin resolver (settlement=${settlement}, gastos sin anchor=${unanchored}). Ver inventory + cola de revisión (TASK-929).`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'settlement_drift', value: String(settlement) },
        { kind: 'metric', label: 'unanchored_expenses', value: String(unanchored) },
        {
          kind: 'sql',
          label: 'Query',
          value: 'income_settlement_reconciliation WHERE has_drift + expenses paid sin anchor'
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-929-finance-ledger-drift-remediation-control.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_ledger_unresolved_drift_items' }
    })

    return {
      signalId: LEDGER_UNRESOLVED_DRIFT_ITEMS_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getLedgerUnresolvedDriftItemsSignal',
      label: 'Drift de ledger sin resolver',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
