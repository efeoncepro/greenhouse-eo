import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-978 Slice 2 — SLA signal for the contractor payment commitment.
 *
 * Efeonce commits to pay contractors within the first 5 business days after the
 * month close (TASK-978 derives `contractor_payables.due_date` = operational
 * month close + 5 business days). This signal measures whether that commitment is
 * being met: contractor payables COMMITTED to Finance (`ready_for_finance` /
 * `obligation_created` / `payment_order_created`), NOT yet `paid`/`cancelled`,
 * whose `due_date` is in the past.
 *
 * It is **observability, not a gate** — it never blocks the payable. It measures
 * the net-payment commitment to the contractor; it is NOT the SII withholding
 * remittance deadline (F29, day 12/20 of the next month), which is a distinct
 * obligation to a different beneficiary (TASK-977 invariant). Blocked/pending
 * payables are covered by the readiness/blocker signals, not this one.
 *
 * **Kind**: `lag`. **moduleKey**: `finance`. **Severity**: count=0 → ok;
 * count>0 & max overdue ≤ 10 days → warning; max overdue > 10 days → error;
 * query falla → unknown. Steady state = 0.
 *
 * Arithmetic: `CURRENT_DATE - due_date` is integer days (both DATE) — NO
 * `EXTRACT(EPOCH FROM (date - date))` (SQL Signal Reader Schema Validation Gate,
 * TASK-893).
 */
export const CONTRACTOR_PAYABLE_PAYMENT_SLA_OVERDUE_SIGNAL_ID =
  'finance.contractor_payable.payment_sla_overdue'

const ERROR_THRESHOLD_DAYS = 10

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COALESCE(MAX(CURRENT_DATE - cp.due_date), 0)::int AS max_overdue_days
  FROM greenhouse_hr.contractor_payables cp
  WHERE cp.status IN ('ready_for_finance', 'obligation_created', 'payment_order_created')
    AND cp.due_date IS NOT NULL
    AND cp.due_date < CURRENT_DATE
`

type SlaRow = {
  n: number
  max_overdue_days: number
}

export const getContractorPayablePaymentSlaOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<SlaRow>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const maxOverdueDays = Number(rows[0]?.max_overdue_days ?? 0)

    const severity: 'ok' | 'warning' | 'error' =
      count === 0 ? 'ok' : maxOverdueDays > ERROR_THRESHOLD_DAYS ? 'error' : 'warning'

    const summary =
      count === 0
        ? 'Todos los pagos a contractors comprometidos están dentro del plazo (cierre + 5 días hábiles).'
        : `${count} pago${count === 1 ? '' : 's'} a contractor comprometido${count === 1 ? '' : 's'} vencido${count === 1 ? '' : 's'} contra el compromiso de 5 días hábiles (máx ${maxOverdueDays} día${maxOverdueDays === 1 ? '' : 's'} de atraso).`

    return {
      signalId: CONTRACTOR_PAYABLE_PAYMENT_SLA_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getContractorPayablePaymentSlaOverdueSignal',
      label: 'SLA de pago a contractors (compromiso 5 días hábiles)',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_hr.contractor_payables WHERE status IN (ready_for_finance,obligation_created,payment_order_created) AND due_date IS NOT NULL AND due_date < CURRENT_DATE"
        },
        {
          kind: 'metric',
          label: 'overdue_count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'max_overdue_days',
          value: String(maxOverdueDays)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-978-contractor-payment-due-date-sla.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_contractor_payable_payment_sla_overdue' }
    })

    return {
      signalId: CONTRACTOR_PAYABLE_PAYMENT_SLA_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getContractorPayablePaymentSlaOverdueSignal',
      label: 'SLA de pago a contractors (compromiso 5 días hábiles)',
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
