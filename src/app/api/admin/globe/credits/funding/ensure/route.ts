import { randomUUID } from 'node:crypto'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { GlobeCreditFundingBrokerError } from '@/lib/globe/credit-administration-broker'
import { GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import {
  GlobeCreditFundingAuthorityError,
  GlobeCreditFundingOneShotAuthorityStore
} from '@/lib/globe/credit-funding-one-shot-authority'
import { executeOneShotGlobeCreditFunding } from '@/lib/globe/credit-funding-one-shot-executor'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  hasGlobeOAuthWorkspaceBinding,
  resolveGlobeOAuthWorkspaceBindings
} from '@/lib/sister-platforms/oauth-workspace-bindings'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  brokerErrorResponse,
  globeConfigurationErrorResponse,
  resolveFundingActorAuthMode
} from '@/app/api/admin/globe/credit-funding/shared'

export const dynamic = 'force-dynamic'

const BROWSER_CLIENT_ID = 'greenhouse-portal'
const HUMAN_AUTH_MODES = new Set(['credentials', 'both', 'microsoft_sso', 'google_sso'])

const BODY_KEYS = new Set([
  'globeWorkspaceId',
  'periodKey',
  'periodStart',
  'periodEnd',
  'targetAvailableCredits',
  'maxGrantCredits',
  'maxResultingCapCredits',
  'evidenceRef',
  'ttlSeconds'
])

export const POST = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')
    const tenant = await getTenantContext()

    if (!tenant) return canonicalErrorResponse('forbidden')
    const subject = buildTenantEntitlementSubject(tenant)

    if (
      !can(subject, 'platform.globe_credit_funding.authority.issue', 'execute', 'all') ||
      !can(subject, 'platform.globe_credit_funding.ensure', 'execute', 'all')
    ) {
      return canonicalErrorResponse('forbidden')
    }

    const authMode = resolveFundingActorAuthMode({
      provider: session.user.provider,
      authMode: session.user.authMode || tenant.authMode
    })

    if (!session.user.provider?.trim() || !HUMAN_AUTH_MODES.has(authMode)) {
      return canonicalErrorResponse('forbidden')
    }

    const operationKey = parseOperationKey(request)
    const body = parseEnsureBody(await request.json().catch(() => undefined))

    if (!operationKey || !body) return canonicalErrorResponse('globe_funding_invalid_request')
    const bindings = await resolveGlobeOAuthWorkspaceBindings(tenant)

    if (!hasGlobeOAuthWorkspaceBinding(bindings, body.globeWorkspaceId)) {
      return canonicalErrorResponse('forbidden')
    }

    const correlationId = randomUUID()
    const store = new GlobeCreditFundingOneShotAuthorityStore()

    const authority = await store.issue({
      ...body,
      operationKey,
      issuerUserId: tenant.userId,
      issuerEntitlement: 'platform.globe_credit_funding.authority.issue',
      issuerAuthMode: authMode,
      issuerAuthProvider: session.user.provider,
      issuerAuthCorrelationId: correlationId,
      executorUserId: tenant.userId,
      executorChannel: 'browser',
      executorClientId: BROWSER_CLIENT_ID,
      executorAuthMode: authMode
    })

    const funding = await executeOneShotGlobeCreditFunding(
      {
        authorityId: authority.authorityId,
        executorUserId: tenant.userId,
        executorChannel: 'browser',
        executorClientId: BROWSER_CLIENT_ID,
        authEvidenceRef: authority.issuerAuthEvidenceRef,
        actorAuthMode: authMode,
        correlationId,
        allowedGlobeWorkspaceIds: bindings.map(binding => binding.workspaceId)
      },
      { store }
    )

    return Response.json(
      {
        authority: {
          authorityId: authority.authorityId,
          expiresAt: authority.expiresAt,
          instructionFingerprint: authority.instructionFingerprint
        },
        funding
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof GlobeCreditFundingAuthorityError) {
      if (error.code === 'invalid_request' || error.code === 'authority_fingerprint_mismatch') {
        return canonicalErrorResponse('globe_funding_invalid_request')
      }

      if (
        error.code === 'issuer_not_allowed' ||
        error.code === 'authority_not_active' ||
        error.code === 'authority_binding_mismatch'
      ) {
        return canonicalErrorResponse('forbidden')
      }

      if (error.code === 'execution_busy') return canonicalErrorResponse('globe_funding_already_recorded')
    }

    if (error instanceof GlobeCreditFundingBrokerError) return brokerErrorResponse(error)

    if (error instanceof GreenhouseGlobeConfigurationError) {
      return globeConfigurationErrorResponse(error, 'ensure')
    }

    captureWithDomain(error, 'platform', { extra: { operation: 'globe_credit_funding.ensure.browser' } })

    return canonicalErrorResponse('internal_error')
  }
}

function parseOperationKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim()

  return value && value.length <= 255 && /^[A-Za-z0-9][A-Za-z0-9._:@/-]{2,254}$/.test(value) ? value : undefined
}

function parseEnsureBody(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const value = raw as Record<string, unknown>

  if (Object.keys(value).some(key => !BODY_KEYS.has(key))) return undefined

  const text = (key: string) => {
    const item = value[key]

    return typeof item === 'string' && item.trim().length > 0 && item.trim().length <= 512
      ? item.trim()
      : undefined
  }

  const integer = (key: string) =>
    Number.isSafeInteger(value[key]) && (value[key] as number) > 0 ? (value[key] as number) : undefined

  const globeWorkspaceId = text('globeWorkspaceId')
  const periodKey = text('periodKey')
  const periodStart = text('periodStart')
  const periodEnd = text('periodEnd')
  const evidenceRef = text('evidenceRef')
  const targetAvailableCredits = integer('targetAvailableCredits')
  const maxGrantCredits = integer('maxGrantCredits')
  const maxResultingCapCredits = integer('maxResultingCapCredits')
  const ttlSeconds = value.ttlSeconds === undefined ? undefined : integer('ttlSeconds')

  if (
    !globeWorkspaceId ||
    !periodKey ||
    !periodStart ||
    !periodEnd ||
    !evidenceRef ||
    !targetAvailableCredits ||
    !maxGrantCredits ||
    !maxResultingCapCredits ||
    (value.ttlSeconds !== undefined && !ttlSeconds)
  ) {
    return undefined
  }

  return {
    globeWorkspaceId,
    periodKey,
    periodStart,
    periodEnd,
    evidenceRef,
    targetAvailableCredits,
    maxGrantCredits,
    maxResultingCapCredits,
    ...(ttlSeconds ? { ttlSeconds } : {})
  }
}
