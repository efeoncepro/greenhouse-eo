import 'server-only'

import {
  invalidateCandidateReviewProjection,
  materializeCandidateReviewProjection
} from '@/lib/hiring/candidate-review/projection'
import { autoProposeEvaluationDossier } from '@/lib/hiring/dossier-ai/auto-propose'

import type { ProjectionDefinition } from '../projection-registry'

export const hiringCandidateReviewProjection: ProjectionDefinition = {
  name: 'hiring_candidate_review_projection',
  description:
    'TASK-1718 — clean application CV asset → minimized/redacted application-scoped review projection',
  domain: 'notifications',
  triggerEvents: ['asset.attached', 'asset.quarantined', 'asset.deleted'],
  extractScope: payload => {
    const assetId = typeof payload.assetId === 'string' ? payload.assetId.trim() : ''

    return assetId ? { entityType: 'candidate_cv_asset', entityId: assetId } : null
  },
  refresh: async (scope, payload) => {
    if (payload.ownerAggregateType === 'hiring_application_cv') {
      const result = await materializeCandidateReviewProjection(scope.entityId)

      if (result.outcome === 'ready' && result.applicationId) {
        const dossier = await autoProposeEvaluationDossier(result.applicationId)

        return `candidate_review_projection ${result.outcome}; dossier ${dossier.outcome}: ${scope.entityId}`
      }

      return `candidate_review_projection ${result.outcome}: ${scope.entityId}`
    }

    await invalidateCandidateReviewProjection(scope.entityId)

    return `candidate_review_projection invalidated: ${scope.entityId}`
  },
  maxRetries: 2
}
