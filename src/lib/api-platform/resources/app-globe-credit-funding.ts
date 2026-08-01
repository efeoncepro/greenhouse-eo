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
import { GlobeSdkError, GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import { GlobeCreditCapacityStatusError, readGlobeCreditCapacityStatus } from '@/lib/globe/credit-capacity-status'
import {
  getGlobeCreditFundingOperation,
  GlobeCreditFundingOperationError,
  isGlobeCreditFundingOperationState,
  listGlobeCreditFundingOperations,
  reconcileGlobeCreditFundingOperation
} from '@/lib/globe/credit-funding-operations'
import { executeOneShotGlobeCreditFunding } from '@/lib/globe/credit-funding-one-shot-executor'
import { GlobeCreditFundingAuthorityError } from '@/lib/globe/credit-funding-one-shot-authority'
import { parseConfirmBody, parseFundingBody } from '@/lib/globe/credit-funding-request'
import type { EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import { hasGlobeOAuthWorkspaceBinding } from '@/lib/sister-platforms/oauth-workspace-bindings'

const PROPOSE_ENTITLEMENT = 'platform.globe_credit_funding.propose'
const CONFIRM_ENTITLEMENT = 'platform.globe_credit_funding.confirm'
const PROPOSE_SCOPE = 'globe.credits.funding.propose'
const CONFIRM_SCOPE = 'globe.credits.funding.confirm'
const READ_ENTITLEMENT = 'platform.globe_credit_funding.read'
const RECONCILE_ENTITLEMENT = 'platform.globe_credit_funding.reconcile'
const READ_SCOPE = 'globe.credits.funding.read'
const RECONCILE_SCOPE = 'globe.credits.funding.reconcile'
const ENSURE_ENTITLEMENT = 'platform.globe_credit_funding.ensure'
const ENSURE_SCOPE = 'globe.credits.funding.ensure'

const assertBearerFundingAccess = (
  context: AppPlatformRequestContext,
  entitlement: EntitlementCapabilityKey,
  oauthScope: string,
  action: 'read' | 'execute' = 'execute'
) => {
  // Funding is an OAuth-only surface. First-party app JWTs no aportan el client/token/correlation
  // OAuth que la autoridad one-shot exige como evidencia durable.
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

  if (!can(buildTenantEntitlementSubject(context.tenant), entitlement, action, 'all')) {
    throw new ApiPlatformError('You do not have access to this Globe credit funding operation.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }
}

const requiredText = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) {
    throw new ApiPlatformError('Invalid Globe credit funding request.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return value.trim()
}

const optionalText = (value: unknown) =>
  value === undefined || value === null || value === '' ? undefined : requiredText(value)

const positiveInteger = (value: unknown, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = typeof value === 'string' && value.trim() ? Number(value) : value

  if (!Number.isSafeInteger(parsed) || (parsed as number) <= 0 || (parsed as number) > maximum) {
    throw new ApiPlatformError('Invalid Globe credit funding request.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  return parsed as number
}

const parseCapacityInput = (value: Record<string, unknown>) => ({
  globeWorkspaceId: requiredText(value.globeWorkspaceId),
  requestedCredits: positiveInteger(value.requestedCredits),
  ...(optionalText(value.projectId) ? { projectId: optionalText(value.projectId) } : {}),
  ...(optionalText(value.capabilityScope) ? { capabilityScope: optionalText(value.capabilityScope) } : {})
})

const mapRecoveryError = (error: unknown): never => {
  if (error instanceof GlobeSdkError && error.status === 404) {
    throw new ApiPlatformError('The Globe credit funding operation was not found.', {
      statusCode: 404,
      errorCode: 'not_found'
    })
  }

  if (error instanceof GlobeSdkError && error.status !== undefined && error.status >= 400 && error.status < 500) {
    throw new ApiPlatformError('Globe rejected the credit funding request.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  if (
    error instanceof GlobeSdkError ||
    error instanceof GreenhouseGlobeConfigurationError ||
    error instanceof GlobeCreditCapacityStatusError ||
    error instanceof GlobeCreditFundingOperationError
  ) {
    throw new ApiPlatformError('Globe credit funding recovery is temporarily unavailable.', {
      statusCode: 503,
      errorCode: 'internal_error'
    })
  }

  throw error
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

const assertOAuthWorkspaceBinding = (context: AppPlatformRequestContext, globeWorkspaceId: string) => {
  if (!hasGlobeOAuthWorkspaceBinding(context.oauthWorkspaceBindings, globeWorkspaceId)) {
    throw new ApiPlatformError('The OAuth session is not bound to this Globe workspace.', {
      statusCode: 403,
      errorCode: 'binding_not_active'
    })
  }
}

const mapFundingError = (error: unknown): never => {
  if (error instanceof GlobeCreditFundingAuthorityError) {
    const denied = ['issuer_not_allowed', 'authority_not_active', 'authority_binding_mismatch'].includes(error.code)

    throw new ApiPlatformError(
      denied
        ? 'The one-shot Globe funding authority is not active for this OAuth actor.'
        : 'The one-shot Globe funding authority request is invalid.',
      {
        statusCode: error.code === 'authority_not_found' ? 404 : denied ? 403 : 409,
        errorCode: error.code === 'authority_not_found' ? 'not_found' : denied ? 'forbidden' : 'bad_request'
      }
    )
  }

  if (error instanceof GlobeCreditFundingBrokerError) {
    if (error.code === 'proposal_not_found') {
      throw new ApiPlatformError('The Globe credit funding proposal was not found.', {
        statusCode: 404,
        errorCode: 'not_found'
      })
    }

    if (error.code === 'confirmer_is_proposer') {
      throw new ApiPlatformError('A different authorized actor must confirm the funding proposal.', {
        statusCode: 403,
        errorCode: 'forbidden'
      })
    }

    if (error.code === 'agent_confirmation_forbidden') {
      throw new ApiPlatformError('Workspace policy does not delegate funding confirmation to agents.', {
        statusCode: 403,
        errorCode: 'forbidden'
      })
    }

    if (error.code === 'agent_one_shot_authority_required') {
      throw new ApiPlatformError('An active one-shot CEO authority is required for agent funding.', {
        statusCode: 403,
        errorCode: 'forbidden'
      })
    }

    if (error.code === 'agent_funding_limit_exceeded') {
      throw new ApiPlatformError('The funding request exceeds the workspace agent delegation limit.', {
        statusCode: 422,
        errorCode: 'bad_request'
      })
    }

    if (error.code === 'fingerprint_mismatch') {
      throw new ApiPlatformError('The funding fingerprint does not match the proposed plan.', {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    if (error.code === 'actor_auth_mode_not_allowed') {
      throw new ApiPlatformError('The authenticated session mode cannot authorize Globe funding.', {
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

export const ensureAppGlobeCreditFunding = async ({
  context,
  body
}: {
  context: AppPlatformRequestContext
  body: unknown
}) => {
  assertBearerFundingAccess(context, ENSURE_ENTITLEMENT, ENSURE_SCOPE)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiPlatformError('Invalid one-shot Globe credit funding request.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const authorityId = requiredText((body as Record<string, unknown>).authorityId)

  if (
    !context.oauthClientId ||
    !context.oauthAccessTokenId ||
    !context.oauthSessionAuthMode ||
    !['agent', 'credentials', 'both', 'microsoft_sso', 'google_sso'].includes(context.oauthSessionAuthMode)
  ) {
    throw new ApiPlatformError('An authenticated OAuth session is required.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }

  try {
    return {
      funding: await executeOneShotGlobeCreditFunding({
        authorityId,
        executorUserId: context.tenant.userId,
        executorOauthClientId: context.oauthClientId,
        oauthAccessTokenId: context.oauthAccessTokenId,
        actorAuthMode: context.oauthSessionAuthMode,
        correlationId: context.oauthCorrelationId || context.requestId,
        allowedGlobeWorkspaceIds: context.oauthWorkspaceBindings.map(binding => binding.workspaceId)
      })
    }
  } catch (error) {
    return mapFundingError(error)
  }
}

export const getAppGlobeCreditCapacityStatus = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}) => {
  assertBearerFundingAccess(context, READ_ENTITLEMENT, READ_SCOPE, 'read')
  const search = new URL(request.url).searchParams

  const input = parseCapacityInput({
    globeWorkspaceId: search.get('globeWorkspaceId'),
    requestedCredits: search.get('requestedCredits'),
    projectId: search.get('projectId'),
    capabilityScope: search.get('capabilityScope')
  })

  assertOAuthWorkspaceBinding(context, input.globeWorkspaceId)

  try {
    return { status: await readGlobeCreditCapacityStatus(input) }
  } catch (error) {
    return mapRecoveryError(error)
  }
}

export const previewAppGlobeCreditFunding = async ({
  context,
  body
}: {
  context: AppPlatformRequestContext
  body: unknown
}) => {
  assertBearerFundingAccess(context, READ_ENTITLEMENT, READ_SCOPE, 'read')

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiPlatformError('Invalid Globe credit funding preview.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const input = parseCapacityInput(body as Record<string, unknown>)

  assertOAuthWorkspaceBinding(context, input.globeWorkspaceId)

  try {
    return { preview: await readGlobeCreditCapacityStatus(input) }
  } catch (error) {
    return mapRecoveryError(error)
  }
}

export const listAppGlobeCreditFundingOperations = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}) => {
  assertBearerFundingAccess(context, READ_ENTITLEMENT, READ_SCOPE, 'read')
  const search = new URL(request.url).searchParams
  const globeWorkspaceId = requiredText(search.get('globeWorkspaceId'))
  const rawLimit = search.get('limit')
  const state = optionalText(search.get('state'))

  if (state && !isGlobeCreditFundingOperationState(state)) {
    throw new ApiPlatformError('Invalid Globe credit funding operation state.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  assertOAuthWorkspaceBinding(context, globeWorkspaceId)

  try {
    return {
      operations: await listGlobeCreditFundingOperations({
        globeWorkspaceId,
        ...(rawLimit === null ? {} : { limit: positiveInteger(rawLimit, 100) }),
        ...(state ? { state } : {}),
        ...(optionalText(search.get('cursor')) ? { cursor: optionalText(search.get('cursor')) } : {})
      })
    }
  } catch (error) {
    return mapRecoveryError(error)
  }
}

export const getAppGlobeCreditFundingOperation = async ({
  context,
  request,
  operationId
}: {
  context: AppPlatformRequestContext
  request: Request
  operationId: string
}) => {
  assertBearerFundingAccess(context, READ_ENTITLEMENT, READ_SCOPE, 'read')
  const globeWorkspaceId = requiredText(new URL(request.url).searchParams.get('globeWorkspaceId'))

  assertOAuthWorkspaceBinding(context, globeWorkspaceId)

  try {
    return {
      operation: await getGlobeCreditFundingOperation({
        globeWorkspaceId,
        operationId: requiredText(operationId)
      })
    }
  } catch (error) {
    return mapRecoveryError(error)
  }
}

export const reconcileAppGlobeCreditFundingOperation = async ({
  context,
  request,
  operationId,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  operationId: string
  body: unknown
}) => {
  assertBearerFundingAccess(context, RECONCILE_ENTITLEMENT, RECONCILE_SCOPE)
  const idempotencyKey = requireFundingIdempotencyKey(request)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiPlatformError('Invalid Globe credit funding reconciliation.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const globeWorkspaceId = requiredText((body as Record<string, unknown>).globeWorkspaceId)

  assertOAuthWorkspaceBinding(context, globeWorkspaceId)

  try {
    return {
      operation: await reconcileGlobeCreditFundingOperation({
        globeWorkspaceId,
        operationId: requiredText(operationId),
        idempotencyKey
      })
    }
  } catch (error) {
    return mapRecoveryError(error)
  }
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

  assertOAuthWorkspaceBinding(context, parsed.globeWorkspaceId)

  try {
    const proposal = await proposeGlobeCreditFunding({
      globeWorkspaceId: parsed.globeWorkspaceId,
      poolId: parsed.poolId,
      grantCredits: parsed.grantCredits,
      ...(parsed.monthlyCap === undefined ? {} : { monthlyCap: parsed.monthlyCap }),
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      actor: {
        userId: context.tenant.userId,
        entitlement: PROPOSE_ENTITLEMENT,
        authMode: context.oauthSessionAuthMode || 'unknown'
      },
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

  const idempotencyKey = requireFundingIdempotencyKey(request)
  const parsed = parseConfirmBody(body)

  if (!parsed) {
    throw new ApiPlatformError('Invalid Globe credit funding confirmation.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  assertOAuthWorkspaceBinding(context, parsed.globeWorkspaceId)

  try {
    const outcome = await confirmGlobeCreditFunding({
      globeWorkspaceId: parsed.globeWorkspaceId,
      proposalId: parsed.proposalId,
      fingerprint: parsed.fingerprint,
      actor: {
        userId: context.tenant.userId,
        entitlement: CONFIRM_ENTITLEMENT,
        authMode: context.oauthSessionAuthMode || 'unknown'
      },
      idempotencyKey
    })

    return { outcome }
  } catch (error) {
    return mapFundingError(error)
  }
}
