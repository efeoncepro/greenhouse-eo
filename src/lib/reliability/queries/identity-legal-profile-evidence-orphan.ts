import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-784 Slice 7 — Reliability signal:
 * Documents/addresses con evidence_asset_id apuntando a asset que ya no existe.
 *
 * Steady state esperado = 0. El FK ON DELETE SET NULL deberia dispararse en
 * casos canonicos, pero si por alguna razon (bug, race) un asset_id apunta a
 * fila inexistente sin que el SET NULL se aplique, esta query lo detecta.
 */

export const IDENTITY_LEGAL_PROFILE_EVIDENCE_ORPHAN_SIGNAL_ID =
  'identity.legal_profile.evidence_orphan'

const QUERY_SQL = `
  SELECT
    (
      SELECT COUNT(*)::int
      FROM greenhouse_core.person_identity_documents d
      WHERE d.evidence_asset_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_core.assets a WHERE a.asset_id = d.evidence_asset_id
        )
    ) +
    (
      SELECT COUNT(*)::int
      FROM greenhouse_core.person_addresses a
      WHERE a.evidence_asset_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_core.assets ax WHERE ax.asset_id = a.evidence_asset_id
        )
    ) AS n
`

export const getIdentityLegalProfileEvidenceOrphanSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number; [key: string]: unknown }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_LEGAL_PROFILE_EVIDENCE_ORPHAN_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getIdentityLegalProfileEvidenceOrphanSignal',
      label: 'Documentos/direcciones con evidence orfana',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin evidence_asset_id huerfanos.'
          : `${count} fila${count === 1 ? '' : 's'} con evidence_asset_id apuntando a asset inexistente. Verifica integridad FK.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'See identity-legal-profile-evidence-orphan.ts'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_legal_profile_evidence_orphan' }
    })

    return {
      signalId: IDENTITY_LEGAL_PROFILE_EVIDENCE_ORPHAN_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getIdentityLegalProfileEvidenceOrphanSignal',
      label: 'Documentos/direcciones con evidence orfana',
      severity: 'unknown',
      summary: 'No fue posible leer el signal.',
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
