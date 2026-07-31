import { parseIdempotencyKey } from '@/lib/api-platform/core/idempotency'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import {
  confirmGlobeCreditFunding,
  GlobeCreditFundingBrokerError,
  proposeGlobeCreditFunding
} from '@/lib/globe/credit-administration-broker'
import { GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import type { EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import {
  auditBlockedAgentFundingConfirmation,
  isAgentFundingProvenance,
  parseConfirmBody,
  parseFundingBody
} from '@/app/api/admin/globe/credit-funding/shared'

const PROPOSE_ENTITLEMENT = 'platform.globe_credit_funding.propose'
const CONFIRM_ENTITLEMENT = 'platform.globe_credit_funding.confirm'
const PROPOSE_SCOPE = 'globe.credits.funding.propose'
const CONFIRM_SCOPE = 'globe.credits.funding.confirm'

const assertBearerFundingAccess = (
  context: AppPlatformRequestContext,
  entitlement: EntitlementCapabilityKey,
  oauthScope: string
) => {
  // Funding is an OAuth-only surface. First-party app JWTs can represent credentials-authenticated
  // E2E/admin personas, so accepting them here would bypass the delegated human-session invariant.
  if (context.authSource !== 'sister_platform_oauth') {
    throw new ApiPlatformError('A sister-platform OAuth bearer token is required for Globe credit funding.', {
      statusCode: context.authSource === 'cookie_session' ? 401 : 403,
      errorCode: context.authSource === 'cookie_session' ? 'missing_token' : 'forbidden'
    })
  }

  if (!context.oauthCapabilities.includes(oauthScope)) {
    throw new ApiPlatformError('The OAuth token does not grant this funding operation.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }

  if (!can(buildTenantEntitlementSubject(context.tenant), entitlement, 'execute', 'all')) {
    throw new ApiPlatformError('You do not have access to this Globe credit funding operation.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }
}

const requireFundingIdempotencyKey = (request: Request) => {
  const key = parseIdempotencyKey(request)

  if (!key) {
    throw new ApiPlatformError('Idempotency-Key is required for Globe credit funding.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return key
}

const mapFundingError = (error: unknown): never => {
  if (error instanceof GlobeCreditFundingBrokerError) {
    if (error.code === 'proposal_not_found') {
      throw new ApiPlatformError('The Globe credit funding proposal was not found.', {
        statusCode: 404,
        errorCode: 'not_found'
      })
    }

    if (error.code === 'confirmer_is_proposer') {
      throw new ApiPlatformError('A different human must confirm the funding proposal.', {
        statusCode: 403,
        errorCode: 'forbidden'
      })
    }

    if (error.code === 'globe_unavailable') {
      throw new ApiPlatformError('Globe is temporarily unavailable.', {
        statusCode: 503,
        errorCode: 'internal_error'
      })
    }

    throw new ApiPlatformError('Globe rejected the credit funding operation.', {
      statusCode: 400,
      errorCode: 'bad_request',
      details: { reason: error.code }
    })
  }

  if (error instanceof GreenhouseGlobeConfigurationError) {
    throw new ApiPlatformError('Globe credit funding is not configured in this runtime.', {
      statusCode: 503,
      errorCode: 'internal_error'
    })
  }

  throw error
}

export const proposeAppGlobeCreditFunding = async ({
  context,
  request,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  body: unknown
}) => {
  assertBearerFundingAccess(context, PROPOSE_ENTITLEMENT, PROPOSE_SCOPE)
  const idempotencyKey = requireFundingIdempotencyKey(request)
  const parsed = parseFundingBody(body)

  if (!parsed) {
    throw new ApiPlatformError('Invalid Globe credit funding proposal.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  try {
    const proposal = await proposeGlobeCreditFunding({
      globeWorkspaceId: parsed.globeWorkspaceId,
      poolId: parsed.poolId,
      grantCredits: parsed.grantCredits,
      ...(parsed.monthlyCap === undefined ? {} : { monthlyCap: parsed.monthlyCap }),
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      actor: { userId: context.tenant.userId, entitlement: PROPOSE_ENTITLEMENT },
      idempotencyKey
    })

    return { proposal }
  } catch (error) {
    return mapFundingError(error)
  }
}

export const confirmAppGlobeCreditFunding = async ({
  context,
  request,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  body: unknown
}) => {
  assertBearerFundingAccess(context, CONFIRM_ENTITLEMENT, CONFIRM_SCOPE)

  if (isAgentFundingProvenance({ authMode: context.tenant.authMode })) {
    auditBlockedAgentFundingConfirmation({
      userId: context.tenant.userId,
      authMode: context.tenant.authMode
    })

    throw new ApiPlatformError('Agent sessions may propose funding but cannot confirm it.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }

  const idempotencyKey = requireFundingIdempotencyKey(request)
  const parsed = parseConfirmBody(body)

  if (!parsed) {
    throw new ApiPlatformError('Invalid Globe credit funding confirmation.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  try {
    const outcome = await confirmGlobeCreditFunding({
      globeWorkspaceId: parsed.globeWorkspaceId,
      proposalId: parsed.proposalId,
      fingerprint: parsed.fingerprint,
      actor: { userId: context.tenant.userId, entitlement: CONFIRM_ENTITLEMENT },
      idempotencyKey
    })

    return { outcome }
  } catch (error) {
    return mapFundingError(error)
  }
}
