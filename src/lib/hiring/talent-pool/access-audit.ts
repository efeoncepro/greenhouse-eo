import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type TalentPoolAccessAuditOutcome = 'allowed' | 'denied'
export type TalentPoolAccessAuditRoute = 'search' | 'profile'
export type TalentPoolAccessAuditReason =
  | 'authorized'
  | 'runtime_capability_denied'
  | 'delegated_scope_denied'
  | 'delegated_context_invalid'

export const recordDelegatedTalentPoolAccess = async ({
  outcome,
  routeKind,
  reasonCode,
  purpose,
  agentHost,
  actorUserId,
  oauthClientId,
  oauthAccessTokenId,
  correlationId,
  talentProfileId
}: {
  outcome: TalentPoolAccessAuditOutcome
  routeKind: TalentPoolAccessAuditRoute
  reasonCode: TalentPoolAccessAuditReason
  purpose: 'talent_pool_candidate_review' | null
  agentHost: string | null
  actorUserId: string
  oauthClientId: string
  oauthAccessTokenId: string | null
  correlationId: string | null
  talentProfileId: string | null
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_hiring.talent_pool_access_audit
      (outcome,route_kind,reason_code,purpose,agent_host,actor_user_id,oauth_client_id,
       oauth_access_token_id,correlation_id,talent_profile_public_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      outcome,
      routeKind,
      reasonCode,
      purpose,
      agentHost,
      actorUserId,
      oauthClientId,
      oauthAccessTokenId,
      correlationId,
      talentProfileId
    ]
  )
}
