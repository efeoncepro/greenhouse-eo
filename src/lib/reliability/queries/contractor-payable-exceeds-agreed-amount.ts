import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-968 Slice 4 — Contractor payable exceeds agreed amount signal.
 *
 * Cuenta contractor payables bloqueados por el guardrail de monto acordado
 * (`readiness_json -> blockers` contiene code `payment_exceeds_agreed_amount`) que
 * AÚN NO tienen override gobernado (`agreed_amount_override_reason IS NULL`) y no son
 * terminales. Son payables cuyo bruto supera el monto fijado por HR y esperan, o bien
 * una corrección del bruto, o una excepción autorizada por Finance (admin-only).
 *
 * **Kind**: `drift`. Steady state esperado: 0 (un bruto que excede lo acordado se
 * resuelve corrigiendo el payable o autorizando el override).
 * **Subsystem rollup**: `Finance Data Quality` (moduleKey=finance), junto a los demás
 * signals de payables contractor (ready_without_obligation, bridge_dead_letter).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (payables que exceden lo acordado, esperando override/corrección)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getContractorPayableReadyWithoutObligationSignal` (TASK-793).
 * Spec: docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md
 */
export const CONTRACTOR_PAYABLE_EXCEEDS_AGREED_AMOUNT_SIGNAL_ID =
  'finance.contractor_payable.exceeds_agreed_amount'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_payables
  WHERE status NOT IN ('paid', 'cancelled')
    AND agreed_amount_override_reason IS NULL
    AND readiness_json -> 'blockers' @> '[{"code":"payment_exceeds_agreed_amount"}]'::jsonb
`

type ExceedsQueryRow = {
  n: number
}

export const getContractorPayableExceedsAgreedAmountSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<ExceedsQueryRow>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Sin payables contractor que excedan el monto acordado.'
          : `${count} payable${count === 1 ? '' : 's'} contractor exceden el monto acordado sin override (corregir bruto o autorizar excepción).`

      return {
        signalId: CONTRACTOR_PAYABLE_EXCEEDS_AGREED_AMOUNT_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getContractorPayableExceedsAgreedAmountSignal',
        label: 'Payable contractor excede el monto acordado',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_payables WHERE status NOT IN ('paid','cancelled') AND agreed_amount_override_reason IS NULL AND readiness_json->'blockers' @> '[{\"code\":\"payment_exceeds_agreed_amount\"}]'"
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value:
              'docs/tasks/in-progress/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'reliability_signal_contractor_payable_exceeds_agreed_amount' }
      })

      return {
        signalId: CONTRACTOR_PAYABLE_EXCEEDS_AGREED_AMOUNT_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getContractorPayableExceedsAgreedAmountSignal',
        label: 'Payable contractor excede el monto acordado',
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
