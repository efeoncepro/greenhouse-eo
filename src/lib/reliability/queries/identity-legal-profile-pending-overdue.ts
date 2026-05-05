import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-784 Slice 7 — Reliability signal:
 * person_identity_documents pendientes de revision por mas de 7 dias.
 *
 * Steady state esperado = 0. Cuenta filas con verification_status='pending_review'
 * y declared_at < NOW() - INTERVAL '7 days' para alertar a HR que un colaborador
 * declaro algo y nadie lo verifico.
 */

export const IDENTITY_LEGAL_PROFILE_PENDING_OVERDUE_SIGNAL_ID =
  'identity.legal_profile.pending_review_overdue'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.person_identity_documents
  WHERE verification_status = 'pending_review'
    AND declared_at < NOW() - INTERVAL '7 days'
`

export const getIdentityLegalProfilePendingOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number; [key: string]: unknown }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_LEGAL_PROFILE_PENDING_OVERDUE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityLegalProfilePendingOverdueSignal',
      label: 'Documentos de identidad pendientes > 7 dias',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin documentos pendientes de revision con > 7 dias de antiguedad.'
          : `${count} documento${count === 1 ? '' : 's'} de identidad pendiente${count === 1 ? '' : 's'} de revision por > 7 dias. HR debe completar verificacion.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "SELECT COUNT(*) FROM greenhouse_core.person_identity_documents WHERE verification_status = 'pending_review' AND declared_at < NOW() - INTERVAL '7 days'"
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_legal_profile_pending_overdue' }
    })

    return {
      signalId: IDENTITY_LEGAL_PROFILE_PENDING_OVERDUE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityLegalProfilePendingOverdueSignal',
      label: 'Documentos de identidad pendientes > 7 dias',
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
