import 'server-only'

import { getCaseById } from '../store'
import { ClientLifecycleValidationError } from '../types'

import { AUTO_DERIVABLE_ITEM_CODES, type OnboardingEvidence } from './evidence-types'
import { resolveEvidenceScope, resolveItemEvidence } from './resolvers'

/**
 * TASK-1017 — Composer canónico de la evidencia de onboarding para UN caso.
 *
 * Resuelve el scope (org + client + space) UNA vez y corre los 6 resolvers en
 * paralelo (cada uno settle-wrapped → degradación honesta). Read-only. Batched
 * por caso (NO se compone en el read del timeline/inbox: eso sería N+1 sobre BQ
 * en una lista — OQ1 resuelta on-demand, mirror de TASK-1009).
 */
export const resolveOnboardingEvidence = async (caseId: string): Promise<OnboardingEvidence> => {
  const trimmed = caseId?.trim()

  if (!trimmed) {
    throw new ClientLifecycleValidationError('case_id_required', 'Falta el identificador del caso.', 400)
  }

  const caseRow = await getCaseById(trimmed)

  if (!caseRow) {
    throw new ClientLifecycleValidationError('case_not_found', 'El caso no existe.', 404)
  }

  const scope = await resolveEvidenceScope(trimmed, caseRow.organizationId, caseRow.clientId)

  const items = await Promise.all(
    AUTO_DERIVABLE_ITEM_CODES.map(itemCode => resolveItemEvidence(itemCode, scope))
  )

  return { caseId: trimmed, items, checkedAt: new Date().toISOString() }
}
