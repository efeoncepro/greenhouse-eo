import 'server-only'

import { autoProposeEvaluationDossier } from '@/lib/hiring/dossier-ai/auto-propose'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * Keeps the operator-only dossier proposal current when the assessment becomes
 * effective. The CV projection owns the complementary trigger when the clean,
 * redacted CV becomes ready first. Both paths converge on the same input digest,
 * so replay never creates a duplicate provider call or confirms a proposal.
 */
export const hiringEvaluationDossierAutoProposeProjection: ProjectionDefinition = {
  name: 'hiring_evaluation_dossier_auto_propose',
  description:
    'TASK-1718/TASK-1735 — hiring.assessment.scored → propose an internal evaluation dossier from the current redacted CV and effective assessment; never confirms or materializes a note.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringAssessmentScored],
  extractScope: payload => {
    const applicationId = typeof payload.applicationId === 'string' ? payload.applicationId.trim() : ''

    return applicationId ? { entityType: 'hiring_application', entityId: applicationId } : null
  },
  refresh: async scope => {
    const dossier = await autoProposeEvaluationDossier(scope.entityId)

    return `evaluation_dossier ${dossier.outcome}: ${scope.entityId}`
  },
  maxRetries: 2
}
