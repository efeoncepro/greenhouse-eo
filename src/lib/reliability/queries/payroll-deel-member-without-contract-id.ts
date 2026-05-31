import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-958 Slice 3 — Deel member without contract ID signal.
 *
 * Cuenta members activos pagados vía Deel (`payroll_via='deel'`, contract_type
 * `contractor`/`eor`) que NO tienen `deel_contract_id` poblado. Un contractor por
 * Deel debe tener su referencia de contrato Deel; su ausencia es un gap de
 * data-quality (la referencia aparece en el recibo "Contrato Deel: <id>" y es la
 * trazabilidad al contrato real). El valor real se completa operacionalmente desde
 * el dashboard/API de Deel — esta señal lo hace visible hasta entonces.
 *
 * **Kind**: `data_quality`. Steady state esperado: 0 (todo Deel member tiene su
 * contract id; el backfill operacional lo resuelve).
 * **Subsystem rollup**: `Payroll Data Quality` (moduleKey=payroll).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (gap de referencia Deel pendiente de backfill)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getPayrollContractorDoubleRailOverlapSignal` (TASK-957).
 * Spec: `docs/tasks/in-progress/TASK-958-compensation-version-tuple-drift-remediation.md`.
 */
export const PAYROLL_DEEL_MEMBER_WITHOUT_CONTRACT_ID_SIGNAL_ID = 'payroll.deel_member_without_contract_id'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.members
  WHERE active = TRUE
    AND payroll_via = 'deel'
    AND contract_type IN ('contractor', 'eor')
    AND (deel_contract_id IS NULL OR deel_contract_id = '')
`

type DeelGapQueryRow = {
  n: number
}

export const getPayrollDeelMemberWithoutContractIdSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DeelGapQueryRow>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

    const summary =
      count === 0
        ? 'Todos los contractors Deel activos tienen su deel_contract_id poblado.'
        : `${count} contractor${count === 1 ? '' : 's'} Deel activo${count === 1 ? '' : 's'} sin deel_contract_id (backfill operacional pendiente desde Deel).`

    return {
      signalId: PAYROLL_DEEL_MEMBER_WITHOUT_CONTRACT_ID_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'data_quality',
      source: 'getPayrollDeelMemberWithoutContractIdSignal',
      label: 'Contractor Deel sin contract ID',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: "members WHERE active AND payroll_via='deel' AND contract_type IN (contractor,eor) AND deel_contract_id IS NULL/''"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-958-compensation-version-tuple-drift-remediation.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      tags: { source: 'reliability_signal_payroll_deel_member_without_contract_id' }
    })

    return {
      signalId: PAYROLL_DEEL_MEMBER_WITHOUT_CONTRACT_ID_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'data_quality',
      source: 'getPayrollDeelMemberWithoutContractIdSignal',
      label: 'Contractor Deel sin contract ID',
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
