import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const PAYROLL_CONTRACT_TAXONOMY_FALLBACK_RESOLUTION_LEGACY_SIGNAL_ID =
  'payroll.contract_taxonomy.fallback_resolution_legacy'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_payroll.payroll_entries
  WHERE contract_type_snapshot IS NULL
    AND pay_regime = 'international'
    AND payroll_via = 'internal'
`

export const getPayrollContractTaxonomyFallbackResolutionLegacySignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<{ n: number }>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId: PAYROLL_CONTRACT_TAXONOMY_FALLBACK_RESOLUTION_LEGACY_SIGNAL_ID,
        moduleKey: 'payroll',
        kind: 'drift',
        source: 'getPayrollContractTaxonomyFallbackResolutionLegacySignal',
        label: 'Fallback legacy international_internal receipts',
        severity: count === 0 ? 'ok' : 'warning',
        summary:
          count === 0
            ? 'Sin entries internacionales internas que dependan del fallback legacy del recibo.'
            : `${count} entr${count === 1 ? 'y' : 'ies'} sin contract_type_snapshot caen al fallback international_internal. No cambia cálculo; revisar backfill/audit si crece.`,
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'fallback_legacy_entries',
            value: String(count)
          },
          {
            kind: 'sql',
            label: 'Legacy fallback shape',
            value: 'payroll_entries.contract_type_snapshot IS NULL AND pay_regime=international AND payroll_via=internal'
          }
        ]
      }
    } catch (err) {
      captureWithDomain(err, 'payroll', {
        extra: {
          source: 'reliability.payroll_contract_taxonomy_fallback_resolution_legacy.query_failed'
        }
      })

      return {
        signalId: PAYROLL_CONTRACT_TAXONOMY_FALLBACK_RESOLUTION_LEGACY_SIGNAL_ID,
        moduleKey: 'payroll',
        kind: 'drift',
        source: 'getPayrollContractTaxonomyFallbackResolutionLegacySignal',
        label: 'Fallback legacy international_internal receipts',
        severity: 'unknown',
        summary: 'No se pudo consultar el fallback legacy de taxonomía contractual payroll.',
        observedAt,
        evidence: []
      }
    }
  }
