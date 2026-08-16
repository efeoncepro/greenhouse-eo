import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { can } from '@/lib/entitlements/runtime'
import {
  inviteTalentToOpening,
  proposeTalentInvitation,
  requestTalentPoolFutureConsent,
  talentPoolFlags,
  updateTalentAvailability,
  withdrawTalentPoolConsent
} from '@/lib/hiring/talent-pool'
import { isHiringError } from '@/lib/hiring/errors'

type CommandBody = Record<string, unknown>

const string = (body: CommandBody, key: string) => (typeof body[key] === 'string' ? body[key].trim() : '')

const idempotencyKey = (request: Request, body: CommandBody) =>
  request.headers.get('idempotency-key')?.trim() || string(body, 'idempotencyKey')

const assertInternalCapability = (
  context: AppPlatformRequestContext,
  capability: 'hiring.talent_pool.manage' | 'hiring.talent_pool.invite',
  action: 'update' | 'execute'
) => {
  if (context.tenant.tenantType !== 'efeonce_internal' || !can(context.tenant, capability, action, 'tenant')) {
    throw new ApiPlatformError('Talent Pool command is not allowed.', { statusCode: 403, errorCode: 'forbidden' })
  }
}

const run = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    if (isHiringError(error)) {
      throw new ApiPlatformError(error.message, {
        statusCode: error.statusCode,
        errorCode: error.statusCode === 404 ? 'not_found' : error.statusCode === 403 ? 'forbidden' : 'bad_request'
      })
    }

    throw error
  }
}

export const updateAppTalentAvailability = async ({
  context,
  request,
  talentProfileId,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  talentProfileId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'hiring.talent_pool.manage', 'update')

  return run(() =>
    updateTalentAvailability({
      talentProfileId,
      availability: string(body, 'availability'),
      idempotencyKey: idempotencyKey(request, body),
      actorUserId: context.tenant.userId,
      correlationId: context.oauthCorrelationId ?? context.requestId
    })
  )
}

export const requestAppTalentFutureConsent = async ({
  context,
  request,
  talentProfileId,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  talentProfileId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'hiring.talent_pool.manage', 'update')

  if (!talentPoolFlags().selfService) {
    throw new ApiPlatformError('Talent Pool self-service is not enabled.', {
      statusCode: 503,
      errorCode: 'service_unavailable'
    })
  }

  return run(() =>
    requestTalentPoolFutureConsent({
      talentProfileId,
      source: 'internal_operator',
      evidenceRef: string(body, 'evidenceRef') || null,
      idempotencyKey: idempotencyKey(request, body),
      correlationId: context.oauthCorrelationId ?? context.requestId
    })
  )
}

export const withdrawAppTalentFutureConsent = async ({
  context,
  request,
  talentProfileId,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  talentProfileId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'hiring.talent_pool.manage', 'update')

  return run(() =>
    withdrawTalentPoolConsent({
      talentProfileId,
      purpose: 'future_opportunities',
      source: 'internal_operator',
      actorType: 'operator',
      actorUserId: context.tenant.userId,
      idempotencyKey: idempotencyKey(request, body),
      correlationId: context.oauthCorrelationId ?? context.requestId
    })
  )
}

export const proposeAppTalentInvitation = async ({
  context,
  request,
  talentProfileId,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  talentProfileId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'hiring.talent_pool.invite', 'execute')

  if (!talentPoolFlags().invite) {
    throw new ApiPlatformError('Talent Pool invitations are not enabled.', {
      statusCode: 503,
      errorCode: 'service_unavailable'
    })
  }

  return run(() =>
    proposeTalentInvitation({
      talentProfileId,
      openingId: string(body, 'openingId'),
      requestedBy: context.tenant.userId,
      idempotencyKey: idempotencyKey(request, body),
      correlationId: context.oauthCorrelationId ?? context.requestId
    })
  )
}

export const confirmAppTalentInvitation = async ({
  context,
  request,
  talentProfileId,
  body
}: {
  context: AppPlatformRequestContext
  request: Request
  talentProfileId: string
  body: CommandBody
}) => {
  assertInternalCapability(context, 'hiring.talent_pool.invite', 'execute')

  if (!talentPoolFlags().invite) {
    throw new ApiPlatformError('Talent Pool invitations are not enabled.', {
      statusCode: 503,
      errorCode: 'service_unavailable'
    })
  }

  return run(() =>
    inviteTalentToOpening({
      talentProfileId,
      openingId: string(body, 'openingId'),
      proposalRef: string(body, 'proposalRef'),
      requestedBy: context.tenant.userId,
      confirmedBy: context.tenant.userId,
      idempotencyKey: idempotencyKey(request, body),
      correlationId: context.oauthCorrelationId ?? context.requestId
    })
  )
}
