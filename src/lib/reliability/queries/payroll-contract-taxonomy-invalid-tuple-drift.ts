import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const PAYROLL_CONTRACT_TAXONOMY_INVALID_TUPLE_DRIFT_SIGNAL_ID =
  'payroll.contract_taxonomy.invalid_tuple_drift'

const QUERY_SQL = `
  WITH member_invalid AS (
    SELECT COUNT(*)::int AS n
    FROM greenhouse_core.members
    WHERE NOT (
      (
        contract_type IN ('indefinido', 'plazo_fijo', 'honorarios')
        AND pay_regime = 'chile'
        AND payroll_via = 'internal'
      )
      OR (
        contract_type IN ('contractor', 'eor')
        AND pay_regime = 'international'
        AND payroll_via = 'deel'
      )
      OR (
        contract_type = 'international_internal'
        AND pay_regime = 'international'
        AND payroll_via = 'internal'
      )
    )
  ),
  compensation_invalid AS (
    SELECT COUNT(*)::int AS n
    FROM greenhouse_payroll.compensation_versions cv
    JOIN greenhouse_core.members m ON m.member_id = cv.member_id
    WHERE NOT (
      (
        cv.contract_type IN ('indefinido', 'plazo_fijo', 'honorarios')
        AND cv.pay_regime = 'chile'
        AND m.payroll_via = 'internal'
      )
      OR (
        cv.contract_type IN ('contractor', 'eor')
        AND cv.pay_regime = 'international'
        AND m.payroll_via = 'deel'
      )
      OR (
        cv.contract_type = 'international_internal'
        AND cv.pay_regime = 'international'
        AND m.payroll_via = 'internal'
      )
    )
  ),
  entry_invalid AS (
    SELECT COUNT(*)::int AS n
    FROM greenhouse_payroll.payroll_entries
    WHERE contract_type_snapshot IS NOT NULL
      AND NOT (
        (
          contract_type_snapshot IN ('indefinido', 'plazo_fijo', 'honorarios')
          AND pay_regime = 'chile'
          AND payroll_via = 'internal'
        )
        OR (
          contract_type_snapshot IN ('contractor', 'eor')
          AND pay_regime = 'international'
          AND payroll_via = 'deel'
        )
        OR (
          contract_type_snapshot = 'international_internal'
          AND pay_regime = 'international'
          AND payroll_via = 'internal'
        )
      )
  )
  SELECT
    (SELECT n FROM member_invalid) AS member_invalid_count,
    (SELECT n FROM compensation_invalid) AS compensation_invalid_count,
    (SELECT n FROM entry_invalid) AS entry_invalid_count
`

export const getPayrollContractTaxonomyInvalidTupleDriftSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{
        member_invalid_count: number
        compensation_invalid_count: number
        entry_invalid_count: number
      }>(QUERY_SQL)

      const row = rows[0]
      const memberInvalidCount = Number(row?.member_invalid_count ?? 0)
      const compensationInvalidCount = Number(row?.compensation_invalid_count ?? 0)
      const entryInvalidCount = Number(row?.entry_invalid_count ?? 0)
      const total = memberInvalidCount + compensationInvalidCount + entryInvalidCount

      return {
        signalId: PAYROLL_CONTRACT_TAXONOMY_INVALID_TUPLE_DRIFT_SIGNAL_ID,
        moduleKey: 'payroll',
        kind: 'drift',
        source: 'getPayrollContractTaxonomyInvalidTupleDriftSignal',
        label: 'Drift contract_type / pay_regime / payroll_via',
        severity: total === 0 ? 'ok' : 'warning',
        summary:
          total === 0
            ? 'Tuplas contractuales payroll alineadas con la taxonomía canónica.'
            : `${total} tupla${total === 1 ? '' : 's'} contractual${total === 1 ? '' : 'es'} fuera de la taxonomía canónica. No se muta data automáticamente; usar dry-run/remediation auditado.`,
        observedAt,
        evidence: [
          { kind: 'metric', label: 'members_invalid', value: String(memberInvalidCount) },
          { kind: 'metric', label: 'compensation_versions_invalid', value: String(compensationInvalidCount) },
          { kind: 'metric', label: 'payroll_entries_invalid', value: String(entryInvalidCount) },
          {
            kind: 'sql',
            label: 'Canonical tuple source',
            value: 'src/lib/reliability/queries/payroll-contract-taxonomy-invalid-tuple-drift.ts'
          }
        ]
      }
    } catch (err) {
      captureWithDomain(err, 'payroll', {
        extra: {
          source: 'reliability.payroll_contract_taxonomy_invalid_tuple_drift.query_failed'
        }
      })

      return {
        signalId: PAYROLL_CONTRACT_TAXONOMY_INVALID_TUPLE_DRIFT_SIGNAL_ID,
        moduleKey: 'payroll',
        kind: 'drift',
        source: 'getPayrollContractTaxonomyInvalidTupleDriftSignal',
        label: 'Drift contract_type / pay_regime / payroll_via',
        severity: 'unknown',
        summary: 'No se pudo consultar drift de taxonomía contractual payroll.',
        observedAt,
        evidence: []
      }
    }
  }
