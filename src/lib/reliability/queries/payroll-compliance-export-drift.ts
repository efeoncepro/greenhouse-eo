import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

const SIGNAL_ID = 'payroll.compliance_exports.artifact_drift'

export const getPayrollComplianceExportDriftSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ drift_count: string }>(
      `
        WITH latest_artifact AS (
          SELECT DISTINCT ON (period_id, export_kind)
            period_id,
            export_kind,
            generated_at,
            validation_status
          FROM greenhouse_payroll.compliance_export_artifacts
          ORDER BY period_id, export_kind, generated_at DESC
        ),
        latest_entry AS (
          SELECT period_id, MAX(updated_at) AS latest_entry_updated_at
          FROM greenhouse_payroll.payroll_entries
          WHERE is_active = TRUE
          GROUP BY period_id
        )
        SELECT COUNT(*)::text AS drift_count
        FROM latest_artifact a
        JOIN latest_entry e ON e.period_id = a.period_id
        WHERE a.validation_status <> 'passed'
           OR a.generated_at < e.latest_entry_updated_at
      `
    )

    const count = Number(rows[0]?.drift_count ?? 0)

    return {
      signalId: SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'greenhouse_payroll.compliance_export_artifacts',
      label: 'Drift de artefactos Previred/LRE',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Artefactos Previred/LRE generados no presentan drift contra las entries activas.'
          : `${count} artefacto${count === 1 ? '' : 's'} Previred/LRE con validacion fallida o entries mas nuevas que el export.`,
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Artifact registry',
          value: 'greenhouse_payroll.compliance_export_artifacts'
        },
        {
          kind: 'helper',
          label: 'Canonical generator',
          value: 'src/lib/payroll/compliance-exports'
        }
      ]
    }
  } catch (error) {
    return {
      signalId: SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'greenhouse_payroll.compliance_export_artifacts',
      label: 'Drift de artefactos Previred/LRE',
      severity: 'unknown',
      summary: 'No pudimos leer el registry de artefactos Previred/LRE.',
      observedAt: new Date().toISOString(),
      evidence: [
        {
          kind: 'sql',
          label: 'Artifact registry',
          value: error instanceof Error ? error.message : 'unknown error'
        }
      ]
    }
  }
}
