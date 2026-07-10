import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { CANDIDATE_DOCUMENT_RETENTION_MONTHS, listOverdueCandidateRetentions } from '@/lib/hiring/documents/retention'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1362 — Documentos de candidatos no contratados que ya deberían borrarse.
 *
 * Ley 21.719: los datos no se conservan más allá de la finalidad que justificó
 * recolectarlos. Cerrado el proceso, guardar el CV de quien no fue contratado ya
 * no tiene finalidad.
 *
 * Steady = 0. `consent_withdrawn` escala a error: la persona revocó la base de
 * licitud y el borrado no admite ventana. El `retention_window_elapsed` es
 * warning: es deuda acumulable, pero deuda al fin.
 *
 * Este signal EXPONE la obligación; no la resuelve. El borrado es un comando
 * gobernado con humano en el loop (follow-up, owner People Ops).
 */
export const HIRING_CANDIDATE_RETENTION_OVERDUE_SIGNAL_ID = 'hiring.candidate_document.retention_overdue'

const resolveSummary = ({
  candidates,
  documents,
  consentWithdrawn,
}: {
  candidates: number
  documents: number
  consentWithdrawn: number
}) => {
  if (candidates === 0) {
    return `Sin documentos de candidatos fuera de la ventana de retención (${CANDIDATE_DOCUMENT_RETENTION_MONTHS} meses).`
  }

  const noun = candidates === 1 ? 'candidato no contratado' : 'candidatos no contratados'

  const detail =
    consentWithdrawn > 0
      ? ` ${consentWithdrawn} de ellos retiró su consentimiento: el borrado no admite ventana.`
      : ''

  return `${candidates} ${noun} con ${documents} documento(s) que ya deberían haberse borrado.${detail}`
}

export const getHiringCandidateRetentionOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const label = 'Documentos de candidatos fuera de retención'

  try {
    const overdue = await listOverdueCandidateRetentions()

    const candidates = overdue.length
    const documents = overdue.reduce((total, entry) => total + entry.documentCount, 0)
    const consentWithdrawn = overdue.filter(entry => entry.reason === 'consent_withdrawn').length

    const severity = consentWithdrawn > 0 ? 'error' : candidates > 0 ? 'warning' : 'ok'

    return {
      signalId: HIRING_CANDIDATE_RETENTION_OVERDUE_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'data_quality',
      source: 'getHiringCandidateRetentionOverdueSignal',
      label,
      severity,
      summary: resolveSummary({ candidates, documents, consentWithdrawn }),
      observedAt: new Date().toISOString(),
      evidence: [
        { kind: 'metric', label: 'candidatos', value: String(candidates) },
        { kind: 'metric', label: 'documentos', value: String(documents) },
        { kind: 'metric', label: 'consentimiento_retirado', value: String(consentWithdrawn) },
        { kind: 'metric', label: 'ventana_meses', value: String(CANDIDATE_DOCUMENT_RETENTION_MONTHS) },
        { kind: 'doc', label: 'Spec', value: 'docs/tasks/in-progress/TASK-1362-candidate-document-capture.md' },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_candidate_retention_overdue' } })

    return {
      signalId: HIRING_CANDIDATE_RETENTION_OVERDUE_SIGNAL_ID,
      moduleKey: 'documents',
      kind: 'data_quality',
      source: 'getHiringCandidateRetentionOverdueSignal',
      label,
      severity: 'unknown',
      summary: 'No se pudo evaluar la retención de documentos de candidatos (query falló).',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
