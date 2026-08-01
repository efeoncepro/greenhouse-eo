import { randomUUID } from 'node:crypto'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import {
  GlobeCreditFundingAuthorityError,
  GlobeCreditFundingOneShotAuthorityStore
} from '@/lib/globe/credit-funding-one-shot-authority'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveFundingActorAuthMode } from '@/app/api/admin/globe/credit-funding/shared'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const POST = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (
      !tenant ||
      !can(buildTenantEntitlementSubject(tenant), 'platform.globe_credit_funding.authority.issue', 'execute', 'all')
    ) {
      return canonicalErrorResponse('forbidden')
    }

    const authMode = resolveFundingActorAuthMode({
      provider: session.user.provider,
      authMode: session.user.authMode || tenant.authMode
    })

    if (authMode === 'agent' || authMode === 'unknown') return canonicalErrorResponse('forbidden')
    const operationKey = request.headers.get('idempotency-key')?.trim()

    if (!operationKey || operationKey.length > 255 || !/^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,254}$/.test(operationKey)) {
      return canonicalErrorResponse('globe_funding_invalid_request')
    }

    const body = await request.json().catch(() => undefined)
    const input = parseIssueBody(body)

    if (!input) return canonicalErrorResponse('globe_funding_invalid_request')
    const hasExplicitExecutor = input.executorUserId !== undefined || input.executorAuthMode !== undefined

    if (hasExplicitExecutor && (!input.executorUserId || !input.executorAuthMode)) {
      return canonicalErrorResponse('globe_funding_invalid_request')
    }

    const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)

    if (!hasGlobeOAuthWorkspaceBinding(bindings, input.globeWorkspaceId)) return canonicalErrorResponse('forbidden')
    const correlationId = randomUUID()

    const authority = await new GlobeCreditFundingOneShotAuthorityStore().issue({
      ...input,
      operationKey,
      issuerUserId: tenant.userId,
      issuerEntitlement: 'platform.globe_credit_funding.authority.issue',
      issuerAuthMode: authMode,
      issuerAuthProvider: session.user.provider,
      issuerAuthCorrelationId: correlationId,
      executorUserId: input.executorUserId ?? tenant.userId,
      executorChannel: input.executorChannel,
      executorAuthMode: input.executorAuthMode ?? authMode
    })

    return Response.json({ authority }, { status: 201 })
  } catch (error) {
    if (error instanceof GlobeCreditFundingAuthorityError) {
      return canonicalErrorResponse(error.code === 'invalid_request' ? 'globe_funding_invalid_request' : 'forbidden')
    }

    captureWithDomain(error, 'platform', { extra: { operation: 'globe_credit_funding.authority.issue' } })

    return canonicalErrorResponse('internal_error')
  }
}

function parseIssueBody(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const value = raw as Record<string, unknown>

  const text = (key: string) =>
    typeof value[key] === 'string' &&
    (value[key] as string).trim().length > 0 &&
    (value[key] as string).trim().length <= 512
      ? (value[key] as string).trim()
      : undefined

  const integer = (key: string) =>
    Number.isSafeInteger(value[key]) && (value[key] as number) > 0 ? (value[key] as number) : undefined

  const globeWorkspaceId = text('globeWorkspaceId')
  const periodKey = text('periodKey')
  const periodStart = text('periodStart')
  const periodEnd = text('periodEnd')
  const executorUserId = text('executorUserId')
  const executorChannel = text('executorChannel')
  const executorAuthMode = text('executorAuthMode')
  const executorClientId = text('executorClientId')
  const evidenceRef = text('evidenceRef')
  const targetAvailableCredits = integer('targetAvailableCredits')
  const maxGrantCredits = integer('maxGrantCredits')
  const maxResultingCapCredits = integer('maxResultingCapCredits')
  const ttlSeconds = value.ttlSeconds === undefined ? undefined : integer('ttlSeconds')

  if (
    !executorChannel ||
    !['oauth', 'browser', 'mcp'].includes(executorChannel) ||
    executorAuthMode &&
    !['agent', 'credentials', 'both', 'microsoft_sso', 'google_sso'].includes(executorAuthMode)
  ) {
    return undefined
  }

  if (
    (executorChannel === 'mcp' &&
      (executorClientId !== 'efeonce-mcp-gateway' || !executorUserId || executorAuthMode !== 'agent')) ||
    (executorChannel === 'browser' && executorClientId !== 'greenhouse-portal') ||
    (executorChannel === 'oauth' && executorClientId === 'efeonce-mcp-gateway')
  ) {
    return undefined
  }

  if (
    !globeWorkspaceId ||
    !periodKey ||
    !periodStart ||
    !periodEnd ||
    !executorClientId ||
    !evidenceRef ||
    !targetAvailableCredits ||
    !maxGrantCredits ||
    !maxResultingCapCredits ||
    (value.ttlSeconds !== undefined && !ttlSeconds)
  )
    return undefined

  return {
    globeWorkspaceId,
    periodKey,
    periodStart,
    periodEnd,
    executorUserId,
    executorChannel: executorChannel as 'oauth' | 'browser' | 'mcp',
    executorClientId,
    evidenceRef,
    targetAvailableCredits,
    maxGrantCredits,
    maxResultingCapCredits,
    ...(executorUserId ? { executorUserId } : {}),
    ...(executorAuthMode ? { executorAuthMode } : {}),
    ...(ttlSeconds ? { ttlSeconds } : {})
  }
}
