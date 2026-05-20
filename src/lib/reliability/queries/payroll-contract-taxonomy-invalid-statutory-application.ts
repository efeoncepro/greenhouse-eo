import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const PAYROLL_CONTRACT_TAXONOMY_INVALID_STATUTORY_APPLICATION_SIGNAL_ID =
  'payroll.contract_taxonomy.invalid_statutory_application'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_payroll.payroll_entries
  WHERE contract_type_snapshot = 'international_internal'
    AND (
      COALESCE(chile_total_deductions, 0) <> 0
      OR COALESCE(sii_retention_amount, 0) <> 0
    )
`

export const getPayrollContractTaxonomyInvalidStatutoryApplicationSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: PAYROLL_CONTRACT_TAXONOMY_INVALID_STATUTORY_APPLICATION_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getPayrollContractTaxonomyInvalidStatutoryApplicationSignal',
        label: 'Statutory deductions on international internal',
        severity: count === 0 ? 'ok' : 'error',
        summary:
          count === 0
            ? 'Sin entries international_internal con descuentos Chile o retención SII.'
            : `${count} entr${count === 1 ? 'y' : 'ies'} international_internal tienen descuentos Chile o retención SII. Bloquear cierre/revisión antes de exportar.`,
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'invalid_statutory_entries',
            value: String(count)
          },
          {
            kind: 'sql',
            label: 'Invalid statutory shape',
            value: 'payroll_entries.contract_type_snapshot=international_internal with chile_total_deductions or sii_retention_amount'
          }
        ]
      }
    } catch (err) {
      captureWithDomain(err, 'payroll', {
        extra: {
          source: 'reliability.payroll_contract_taxonomy_invalid_statutory_application.query_failed'
        }
      })

      return {
        signalId: PAYROLL_CONTRACT_TAXONOMY_INVALID_STATUTORY_APPLICATION_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'drift',
        source: 'getPayrollContractTaxonomyInvalidStatutoryApplicationSignal',
        label: 'Statutory deductions on international internal',
        severity: 'unknown',
        summary: 'No se pudo consultar aplicación estatutaria inválida para international_internal.',
        observedAt,
        evidence: []
      }
    }
  }
