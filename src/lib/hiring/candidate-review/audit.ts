import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { CandidateReviewAccessAuditInput } from './contracts'

export const recordCandidateReviewAccess = async (input: CandidateReviewAccessAuditInput) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_hiring.candidate_review_access_audit (
       outcome,route_kind,reason_code,purpose,agent_host,actor_user_id,oauth_client_id,
       oauth_access_token_id,correlation_id,application_id,field_classes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[])`,
    [
      input.outcome,
      input.routeKind,
      input.reasonCode,
      input.purpose,
      input.agentHost,
      input.actorUserId,
      input.oauthClientId,
      input.oauthAccessTokenId,
      input.correlationId,
      input.applicationId ?? null,
      input.fieldClasses ?? []
    ]
  )
}
