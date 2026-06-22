import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const DESIGN_HANDOFF_MISSING_EVIDENCE_SIGNAL_ID = 'design_system.handoff.missing_evidence'

const RUNTIME_EVIDENCE_TYPES = ['gvc_capture', 'runtime_route', 'manual_exception'] as const

type MissingEvidenceRow = {
  implemented_count: number
  missing_count: number
  oldest_implemented_at: string | null
}

const severityForCount = (count: number): ReliabilitySeverity => (count === 0 ? 'ok' : count > 5 ? 'error' : 'warning')

export const getDesignHandoffMissingEvidenceSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<MissingEvidenceRow>(
      `WITH implemented_entries AS (
         SELECT entry_id, updated_at
           FROM greenhouse_core.design_handoff_entries
          WHERE status = 'implemented'
       ),
       evidence_readiness AS (
         SELECT i.entry_id,
                i.updated_at,
                EXISTS (
                  SELECT 1
                    FROM greenhouse_core.design_handoff_entry_evidence ev
                   WHERE ev.entry_id = i.entry_id
                     AND ev.evidence_type = ANY($1::text[])
                ) AS has_runtime_evidence
           FROM implemented_entries i
       )
       SELECT COUNT(*)::int AS implemented_count,
              COUNT(*) FILTER (WHERE NOT has_runtime_evidence)::int AS missing_count,
              MIN(updated_at) FILTER (WHERE NOT has_runtime_evidence)::text AS oldest_implemented_at
         FROM evidence_readiness`,
      [RUNTIME_EVIDENCE_TYPES]
    )

    const implementedCount = rows[0]?.implemented_count ?? 0
    const missingCount = rows[0]?.missing_count ?? 0
    const oldestImplementedAt = rows[0]?.oldest_implemented_at ?? null

    return {
      signalId: DESIGN_HANDOFF_MISSING_EVIDENCE_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffMissingEvidenceSignal',
      label: 'Design handoff missing evidence',
      severity: severityForCount(missingCount),
      summary:
        missingCount === 0
          ? `${implementedCount} handoff${implementedCount === 1 ? '' : 's'} implementado${implementedCount === 1 ? '' : 's'} con evidencia runtime o excepcion gobernada.`
          : `${missingCount} de ${implementedCount} handoff${implementedCount === 1 ? '' : 's'} implementado${implementedCount === 1 ? '' : 's'} no tienen evidencia runtime/GVC ni excepcion gobernada.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'missing_count', value: String(missingCount) },
        { kind: 'metric', label: 'implemented_count', value: String(implementedCount) },
        { kind: 'metric', label: 'steady_state', value: '0' },
        { kind: 'metric', label: 'accepted_evidence_types', value: RUNTIME_EVIDENCE_TYPES.join(',') },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entry_evidence' },
        ...(oldestImplementedAt
          ? [{ kind: 'metric' as const, label: 'oldest_missing_evidence_at', value: oldestImplementedAt }]
          : [])
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'platform', {
      tags: { source: 'reliability_signal_design_handoff_missing_evidence' }
    })

    return {
      signalId: DESIGN_HANDOFF_MISSING_EVIDENCE_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffMissingEvidenceSignal',
      label: 'Design handoff missing evidence',
      severity: 'unknown',
      summary:
        'No fue posible leer el signal de evidencia de handoff. Verifica que la migracion V2 de TASK-1175 este aplicada.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'steady_state', value: '0' },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entry_evidence' }
      ]
    }
  }
}
