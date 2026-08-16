import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { can } from '@/lib/entitlements/runtime'
import {
  getTalentPoolProfile,
  recordDelegatedTalentPoolAccess,
  searchTalentPool,
  talentPoolFlags,
  type TalentPoolAccessAuditReason,
  type TalentPoolAccessAuditRoute
} from '@/lib/hiring/talent-pool'

const MCP_TALENT_POOL_PURPOSE = 'talent_pool_candidate_review'
const MCP_HOST_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/

const assertRead = async ({
  context,
  request,
  routeKind,
  talentProfileId = null
}: {
  context: AppPlatformRequestContext
  request: Request
  routeKind: TalentPoolAccessAuditRoute
  talentProfileId?: string | null
}) => {
  const requestedPurpose = request.headers.get('x-greenhouse-purpose')?.trim()
  const requestedAgentHost = request.headers.get('x-greenhouse-agent-host')?.trim().toLowerCase()
  const purpose = requestedPurpose === MCP_TALENT_POOL_PURPOSE ? MCP_TALENT_POOL_PURPOSE : null
  const agentHost = requestedAgentHost && MCP_HOST_PATTERN.test(requestedAgentHost) ? requestedAgentHost : null
  const delegated = context.authSource === 'sister_platform_oauth'

  const record = async (outcome: 'allowed' | 'denied', reasonCode: TalentPoolAccessAuditReason) => {
    if (!delegated) return

    await recordDelegatedTalentPoolAccess({
      outcome,
      routeKind,
      reasonCode,
      purpose,
      agentHost,
      actorUserId: context.tenant.userId,
      oauthClientId: context.oauthClientId ?? 'unknown-delegated-client',
      oauthAccessTokenId: context.oauthAccessTokenId ?? null,
      correlationId: context.oauthCorrelationId ?? context.requestId,
      talentProfileId
    })
  }

  if (!can(context.tenant, 'hiring.talent_pool.read', 'read', 'tenant')) {
    await record('denied', 'runtime_capability_denied')
    throw new ApiPlatformError('Talent Pool access is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }

  const flags = talentPoolFlags()

  if (!delegated) {
    if (!flags.search) {
      throw new ApiPlatformError('The Talent Pool reader is not enabled.', {
        statusCode: 503,
        errorCode: 'service_unavailable'
      })
    }

    return
  }

  if (!context.oauthCapabilities.includes('hiring.talent_pool.read')) {
    await record('denied', 'delegated_scope_denied')
    throw new ApiPlatformError('Delegated Talent Pool access is not allowed.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }

  if (!purpose || !agentHost) {
    await record('denied', 'delegated_context_invalid')
    throw new ApiPlatformError('A valid delegated purpose and agent host are required.', {
      statusCode: 400,
      errorCode: 'invalid_delegated_context'
    })
  }

  if (!flags.search || !flags.mcp) {
    throw new ApiPlatformError('The delegated Talent Pool reader is not enabled.', {
      statusCode: 503,
      errorCode: 'service_unavailable'
    })
  }

  await record('allowed', 'authorized')
}

export const searchAppTalentPool = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}) => {
  await assertRead({ context, request, routeKind: 'search' })
  const query = new URL(request.url).searchParams
  const limit = Number(query.get('limit'))

  return searchTalentPool({
    query: query.get('query') ?? undefined,
    capabilityKeys: query.getAll('capability'),
    seniority: query.get('seniority') ?? undefined,
    languageCode: query.get('language') ?? undefined,
    countryCode: query.get('country') ?? undefined,
    availability: query.get('availability') ?? undefined,
    cursor: query.get('cursor') ?? undefined,
    cursorBinding: `${context.tenant.userId}:${context.oauthClientId ?? context.authSource}`,
    limit: Number.isFinite(limit) ? limit : undefined
  })
}

export const getAppTalentPoolProfile = async ({
  context,
  request,
  talentProfileId
}: {
  context: AppPlatformRequestContext
  request: Request
  talentProfileId: string
}) => {
  await assertRead({ context, request, routeKind: 'profile', talentProfileId })

  return getTalentPoolProfile(talentProfileId)
}
