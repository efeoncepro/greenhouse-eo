import 'server-only'

import { Buffer } from 'node:buffer'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { getNextAuthSecret } from '@/lib/auth-secrets'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { can } from '@/lib/entitlements/runtime'
import {
  CANDIDATE_REVIEW_PURPOSES,
  candidateReviewFlags,
  getCandidateReviewPacket,
  listCandidateReviewApplications,
  recordCandidateReviewAccess,
  type CandidateReviewAccessAuditInput,
  type CandidateReviewPurpose
} from '@/lib/hiring/candidate-review'
import { HiringNotFoundError, HiringValidationError } from '@/lib/hiring/errors'

const HOST_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/
const REVIEW_CURSOR_VERSION = 'candidate-review-list-v1'
const REVIEW_CURSOR_MAX_AGE_MS = 15 * 60 * 1000

type ReviewCursorPayload = {
  v: typeof REVIEW_CURSOR_VERSION
  offset: number
  expiresAt: number
  bindingHash: string
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex')

const encodeReviewCursor = (offset: number, binding: string) => {
  const payload: ReviewCursorPayload = {
    v: REVIEW_CURSOR_VERSION,
    offset,
    expiresAt: Date.now() + REVIEW_CURSOR_MAX_AGE_MS,
    bindingHash: digest(binding)
  }

  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getNextAuthSecret()).update(body).digest('base64url')

  return `${body}.${signature}`
}

const decodeReviewCursor = (cursor: string | null, binding: string) => {
  if (!cursor) return 0

  try {
    if (cursor.length > 2048) throw new Error('cursor_length')
    const [body, signature, extra] = cursor.split('.')

    if (!body || !signature || extra) throw new Error('cursor_shape')
    const expected = createHmac('sha256', getNextAuthSecret()).update(body).digest()
    const supplied = Buffer.from(signature, 'base64url')

    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new Error('cursor_signature')
    }

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<ReviewCursorPayload>

    if (
      parsed.v !== REVIEW_CURSOR_VERSION ||
      !Number.isInteger(parsed.offset) ||
      (parsed.offset ?? -1) < 0 ||
      (parsed.offset ?? 10_001) > 10_000 ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Date.now() ||
      parsed.expiresAt > Date.now() + REVIEW_CURSOR_MAX_AGE_MS ||
      parsed.bindingHash !== digest(binding)
    ) {
      throw new Error('cursor_binding')
    }

    return parsed.offset as number
  } catch {
    throw new ApiPlatformError('The candidate review cursor is invalid or expired.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }
}

const delegatedContext = ({
  context,
  request,
  routeKind,
  applicationId = null
}: {
  context: AppPlatformRequestContext
  request: Request
  routeKind: CandidateReviewAccessAuditInput['routeKind']
  applicationId?: string | null
}) => {
  const rawPurpose = request.headers.get('x-greenhouse-purpose')?.trim()

  const purpose = CANDIDATE_REVIEW_PURPOSES.includes(rawPurpose as CandidateReviewPurpose)
    ? (rawPurpose as CandidateReviewPurpose)
    : null

  const rawHost = request.headers.get('x-greenhouse-agent-host')?.trim().toLowerCase()
  const agentHost = rawHost && HOST_PATTERN.test(rawHost) ? rawHost : null

  const base: Omit<CandidateReviewAccessAuditInput, 'outcome' | 'reasonCode'> = {
    routeKind,
    purpose,
    agentHost,
    actorUserId: context.tenant.userId,
    oauthClientId: context.oauthClientId ?? 'unknown-delegated-client',
    oauthAccessTokenId: context.oauthAccessTokenId ?? null,
    correlationId: context.oauthCorrelationId ?? context.requestId,
    applicationId,
    fieldClasses: ['application', 'candidate_display_name', 'assessment_summary', 'portfolio_links', 'cv_text_redacted']
  }

  return { purpose, agentHost, base }
}

const authorize = async (input: Parameters<typeof delegatedContext>[0]) => {
  const delegated = delegatedContext(input)

  const deny = async (reasonCode: CandidateReviewAccessAuditInput['reasonCode'], statusCode: number, message: string) => {
    await recordCandidateReviewAccess({ ...delegated.base, outcome: 'denied', reasonCode }).catch(() => undefined)
    throw new ApiPlatformError(message, {
      statusCode,
      errorCode: statusCode === 503 ? 'service_unavailable' : statusCode === 400 ? 'invalid_delegated_context' : 'forbidden'
    })
  }

  if (input.context.authSource !== 'sister_platform_oauth') {
    throw new ApiPlatformError('Candidate review is available only through delegated OAuth.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }

  if (
    !can(input.context.tenant, 'hiring.application.read', 'read', 'tenant') ||
    !can(input.context.tenant, 'hiring.candidate.review.read', 'read', 'tenant')
  ) {
    await deny('runtime_capability_denied', 403, 'Candidate review access is not allowed.')
  }

  if (!input.context.oauthCapabilities.includes('hiring.candidate.review.read')) {
    await deny('delegated_scope_denied', 403, 'Delegated candidate review scope is not allowed.')
  }

  if (!delegated.purpose || !delegated.agentHost) {
    await deny('delegated_context_invalid', 400, 'A valid purpose and agent host are required.')
  }

  if (!candidateReviewFlags().reader) {
    await deny('reader_disabled', 503, 'The candidate review reader is not enabled.')
  }

  return delegated as typeof delegated & { purpose: CandidateReviewPurpose; agentHost: string }
}

const mapReaderError = async (
  error: unknown,
  audit: Omit<CandidateReviewAccessAuditInput, 'outcome' | 'reasonCode'>
): Promise<never> => {
  if (error instanceof ApiPlatformError) {
    await recordCandidateReviewAccess({
      ...audit,
      outcome: 'denied',
      reasonCode: 'delegated_context_invalid'
    }).catch(() => undefined)
    throw error
  }

  if (error instanceof HiringNotFoundError) {
    await recordCandidateReviewAccess({ ...audit, outcome: 'denied', reasonCode: 'resource_not_found' }).catch(
      () => undefined
    )
    throw new ApiPlatformError('Candidate review resource not found.', { statusCode: 404, errorCode: 'not_found' })
  }

  if (error instanceof HiringValidationError && error.code === 'candidate_review_stale') {
    await recordCandidateReviewAccess({ ...audit, outcome: 'denied', reasonCode: 'stale_content' }).catch(() => undefined)
    throw new ApiPlatformError(error.message, { statusCode: 409, errorCode: 'bad_request' })
  }

  if (error instanceof HiringValidationError) {
    throw new ApiPlatformError(error.message, { statusCode: error.statusCode, errorCode: 'bad_request' })
  }

  throw error
}

export const listAppCandidateReviewApplications = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}) => {
  const authorized = await authorize({ context, request, routeKind: 'application_list' })
  const query = new URL(request.url).searchParams
  const openingId = query.get('openingId')?.trim()

  if (!openingId) throw new ApiPlatformError('openingId is required.', { statusCode: 400, errorCode: 'bad_request' })
  const stage = query.get('stage')?.trim() || undefined
  const requestedLimit = query.get('limit') == null ? 25 : Number(query.get('limit'))

  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
    throw new ApiPlatformError('limit must be an integer between 1 and 50.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const cursorBinding = JSON.stringify({
    actor: authorized.base.actorUserId,
    client: authorized.base.oauthClientId,
    purpose: authorized.purpose,
    host: authorized.agentHost,
    openingId,
    stage: stage ?? null
  })

  try {
    const offset = decodeReviewCursor(query.get('cursor'), cursorBinding)

    const page = await listCandidateReviewApplications({
      openingId,
      stage,
      limit: requestedLimit,
      offset
    })

    const data = {
      items: page.items,
      nextCursor: page.nextOffset == null ? null : encodeReviewCursor(page.nextOffset, cursorBinding)
    }

    await recordCandidateReviewAccess({ ...authorized.base, outcome: 'allowed', reasonCode: 'authorized' })

    return data
  } catch (error) {
    return mapReaderError(error, authorized.base)
  }
}

export const getAppCandidateReviewPacket = async ({
  context,
  request,
  applicationId
}: {
  context: AppPlatformRequestContext
  request: Request
  applicationId: string
}) => {
  const authorized = await authorize({ context, request, routeKind: 'review_packet', applicationId })
  const query = new URL(request.url).searchParams

  try {
    const data = await getCandidateReviewPacket({
      applicationId,
      purpose: authorized.purpose,
      chunkIndex: Number(query.get('chunkIndex')) || 0,
      expectedContentHash: query.get('expectedContentHash') ?? undefined
    })

    await recordCandidateReviewAccess({ ...authorized.base, outcome: 'allowed', reasonCode: 'authorized' })

    return data
  } catch (error) {
    return mapReaderError(error, authorized.base)
  }
}
