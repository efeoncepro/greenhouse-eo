import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { OAuth2Client } from 'google-auth-library'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { query } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { getTenantAccessRecordByUserId, type TenantAccessRecord } from '@/lib/tenant/access'

import {
  buildBrokerSisterPlatformOAuthIdentityPayload,
  loadSisterPlatformOAuthClient,
  recordSisterPlatformOAuthAuditEvent,
  type OAuthRequestAuditMetadata,
  type SisterPlatformOAuthClient
} from './oauth-broker'

export const MCP_GATEWAY_OAUTH_CLIENT_ID = 'efeonce-mcp-gateway'
export const MCP_HIRING_OAUTH_CLIENT_ID = 'efeonce-mcp-hiring'
export const MCP_HIRING_REVIEW_OAUTH_CLIENT_ID = 'efeonce-mcp-hiring-review'
export const MCP_FUNDING_INPUT_SCOPE = 'efeonce.mcp.globe.credits.funding.ensure'
export const MCP_FUNDING_GREENHOUSE_SCOPE = 'globe.credits.funding.ensure'
export const MCP_HIRING_INPUT_SCOPE = 'efeonce.mcp.hiring.read'
export const MCP_TALENT_POOL_GREENHOUSE_SCOPE = 'hiring.talent_pool.read'
export const MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE = 'hiring.candidate.review.read'
export const RFC8693_TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange'
export const RFC8693_ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token'
export const MCP_EXCHANGED_TOKEN_TTL_SECONDS = 300

const TOKEN_PREFIX_LENGTH = 18
const MAX_TOKEN_LENGTH = 20_000

type GoogleWorkloadClaims = Readonly<{
  audience: string
  email: string
  emailVerified: boolean
  subject: string
}>

type EntraSubjectClaims = Readonly<{
  tenantId: string
  objectId: string
  authorizedParty: string
  scopes: readonly string[]
}>

type ExchangeConfiguration = Readonly<{
  audience: string
  serviceAccountEmails: readonly string[]
  entraTenantId: string
  entraAudience: string
  entraAuthorizedParty: string
  entraIssuer: string
  entraJwksUrl: string
}>

type McpTokenExchangeDependencies = Readonly<{
  verifyGoogleIdToken?: (token: string, audience: string) => Promise<GoogleWorkloadClaims>
  verifyEntraToken?: (token: string, config: ExchangeConfiguration) => Promise<EntraSubjectClaims>
  resolveUser?: (tenantId: string, objectId: string) => Promise<TenantAccessRecord | null>
  loadClient?: (clientId: string) => Promise<SisterPlatformOAuthClient | null>
  authorizeFunding?: (tenant: TenantAccessRecord) => boolean
  authorizeTalentPool?: (tenant: TenantAccessRecord) => boolean
  authorizeCandidateReview?: (tenant: TenantAccessRecord) => boolean
  issueToken?: (input: IssueTokenInput) => Promise<IssuedToken>
  now?: () => Date
}>

type IssueTokenInput = Readonly<{
  client: SisterPlatformOAuthClient
  tenant: TenantAccessRecord
  correlationId: string
  expiresAt: string
  workloadSubject: string
  entraTenantId: string
  entraObjectId: string
  requestedScope: string
  requireWorkspaceBinding: boolean
}>

type IssuedToken = Readonly<{
  accessTokenId: string
  accessToken: string
}>

export type McpTokenExchangeRequest = Readonly<{
  requestUrl: string
  workloadToken: string
  grantType: string
  clientId: string
  subjectToken: string
  subjectTokenType: string
  requestedTokenType?: string
  requestedScope: string
  auditMetadata: OAuthRequestAuditMetadata
}>

export type McpTokenExchangeResult = Readonly<{
  accessTokenId: string
  accessToken: string
  correlationId: string
  expiresIn: typeof MCP_EXCHANGED_TOKEN_TTL_SECONDS
  scope:
    | typeof MCP_FUNDING_GREENHOUSE_SCOPE
    | typeof MCP_TALENT_POOL_GREENHOUSE_SCOPE
    | typeof MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE
}>

type ExchangeScopeContract = Readonly<{
  inputScope: string
  greenhouseScope: McpTokenExchangeResult['scope']
  clientId: string
  resourceFamily: 'globe' | 'hiring'
  requireWorkspaceBinding: boolean
}>

export class McpTokenExchangeError extends Error {
  constructor(
    readonly code:
      | 'exchange_disabled'
      | 'configuration_missing'
      | 'invalid_request'
      | 'invalid_client'
      | 'invalid_grant'
      | 'scope_not_allowed'
      | 'identity_not_bound'
      | 'user_not_eligible',
    readonly statusCode = 400
  ) {
    super(code)
    this.name = 'McpTokenExchangeError'
  }
}

export async function exchangeMcpGatewayToken(
  input: McpTokenExchangeRequest,
  dependencies: McpTokenExchangeDependencies = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<McpTokenExchangeResult> {
  const config = readConfiguration(env)
  const scopeContract = resolveScopeContract(input.requestedScope)

  assertRequest(input, config, scopeContract)

  const workload = await (dependencies.verifyGoogleIdToken ?? verifyGoogleIdToken)(
    boundedToken(input.workloadToken),
    config.audience
  ).catch(() => {
    throw new McpTokenExchangeError('invalid_client', 401)
  })

  if (
    workload.audience !== config.audience ||
    !workload.emailVerified ||
    !config.serviceAccountEmails.includes(workload.email.toLowerCase()) ||
    !workload.subject
  ) {
    throw new McpTokenExchangeError('invalid_client', 401)
  }

  const entra = await (dependencies.verifyEntraToken ?? verifyEntraSubjectToken)(
    boundedToken(input.subjectToken),
    config
  ).catch(() => {
    throw new McpTokenExchangeError('invalid_grant', 400)
  })

  if (
    entra.tenantId !== config.entraTenantId ||
    entra.authorizedParty !== config.entraAuthorizedParty ||
    !entra.objectId ||
    !entra.scopes.includes(scopeContract.inputScope)
  ) {
    throw new McpTokenExchangeError('invalid_grant', 400)
  }

  const client = await (dependencies.loadClient ?? loadSisterPlatformOAuthClient)(scopeContract.clientId)

  assertFederatedClient(client, scopeContract, env)

  const tenant = await (dependencies.resolveUser ?? resolveExactEntraUser)(entra.tenantId, entra.objectId)

  if (!tenant) throw new McpTokenExchangeError('identity_not_bound', 403)

  if (!tenant.active || tenant.status !== 'active' || tenant.tenantType !== 'efeonce_internal') {
    throw new McpTokenExchangeError('user_not_eligible', 403)
  }

  const authorized =
    scopeContract.resourceFamily === 'globe'
      ? (dependencies.authorizeFunding ?? authorizeFunding)(tenant)
      : scopeContract.greenhouseScope === MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE
        ? (dependencies.authorizeCandidateReview ?? authorizeCandidateReview)(tenant)
        : (dependencies.authorizeTalentPool ?? authorizeTalentPool)(tenant)

  if (!authorized) {
    throw new McpTokenExchangeError('user_not_eligible', 403)
  }

  const now = dependencies.now?.() ?? new Date()
  const expiresAt = new Date(now.getTime() + MCP_EXCHANGED_TOKEN_TTL_SECONDS * 1000).toISOString()

  const issued = await (dependencies.issueToken ?? issueOpaqueToken)({
    client: client!,
    tenant,
    correlationId: input.auditMetadata.correlationId,
    expiresAt,
    workloadSubject: workload.subject,
    entraTenantId: entra.tenantId,
    entraObjectId: entra.objectId,
    requestedScope: scopeContract.greenhouseScope,
    requireWorkspaceBinding: scopeContract.requireWorkspaceBinding
  })

  await recordSisterPlatformOAuthAuditEvent({
    client,
    accessTokenId: issued.accessTokenId,
    userId: tenant.userId,
    identityProfileId: tenant.identityProfileId,
    eventType: 'token_success',
    outcome: 'success',
    requestedScopes: [scopeContract.greenhouseScope],
    responseStatus: 200,
    correlationId: input.auditMetadata.correlationId,
    auditMetadata: input.auditMetadata,
    metadata: {
      grantType: 'rfc8693_internal',
      authMode: 'agent',
      expiresAt
    }
  }).catch(() => undefined)

  return {
    accessTokenId: issued.accessTokenId,
    accessToken: issued.accessToken,
    correlationId: input.auditMetadata.correlationId,
    expiresIn: MCP_EXCHANGED_TOKEN_TTL_SECONDS,
    scope: scopeContract.greenhouseScope
  }
}

function resolveScopeContract(requestedScope: string): ExchangeScopeContract {
  if (requestedScope === MCP_FUNDING_GREENHOUSE_SCOPE) {
    return {
      inputScope: MCP_FUNDING_INPUT_SCOPE,
      greenhouseScope: MCP_FUNDING_GREENHOUSE_SCOPE,
      clientId: MCP_GATEWAY_OAUTH_CLIENT_ID,
      resourceFamily: 'globe',
      requireWorkspaceBinding: true
    }
  }

  if (requestedScope === MCP_TALENT_POOL_GREENHOUSE_SCOPE) {
    return {
      inputScope: MCP_HIRING_INPUT_SCOPE,
      greenhouseScope: MCP_TALENT_POOL_GREENHOUSE_SCOPE,
      clientId: MCP_HIRING_OAUTH_CLIENT_ID,
      resourceFamily: 'hiring',
      requireWorkspaceBinding: false
    }
  }

  if (requestedScope === MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE) {
    return {
      inputScope: MCP_HIRING_INPUT_SCOPE,
      greenhouseScope: MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE,
      clientId: MCP_HIRING_REVIEW_OAUTH_CLIENT_ID,
      resourceFamily: 'hiring',
      requireWorkspaceBinding: false
    }
  }

  throw new McpTokenExchangeError('scope_not_allowed', 403)
}

function readConfiguration(env: NodeJS.ProcessEnv): ExchangeConfiguration {
  if (!['true', '1', 'yes'].includes(env.GREENHOUSE_MCP_TOKEN_EXCHANGE_ENABLED?.trim().toLowerCase() ?? '')) {
    throw new McpTokenExchangeError('exchange_disabled', 404)
  }

  const audience = env.GREENHOUSE_MCP_TOKEN_EXCHANGE_AUDIENCE?.trim() ?? ''

  const serviceAccountEmails = list(env.GREENHOUSE_MCP_GATEWAY_SERVICE_ACCOUNT_EMAILS).map(value => value.toLowerCase())

  const entraTenantId = env.GREENHOUSE_MCP_ENTRA_TENANT_ID?.trim().toLowerCase() ?? ''
  const entraAudience = env.GREENHOUSE_MCP_ENTRA_AUDIENCE?.trim() ?? ''
  const entraAuthorizedParty = env.GREENHOUSE_MCP_ENTRA_AZP?.trim() ?? ''

  if (
    !audience ||
    !isExactHttpsUrl(audience) ||
    serviceAccountEmails.length === 0 ||
    !entraTenantId ||
    !entraAudience ||
    !entraAuthorizedParty
  ) {
    throw new McpTokenExchangeError('configuration_missing', 503)
  }

  return {
    audience,
    serviceAccountEmails,
    entraTenantId,
    entraAudience,
    entraAuthorizedParty,
    entraIssuer: `https://login.microsoftonline.com/${entraTenantId}/v2.0`,
    entraJwksUrl: `https://login.microsoftonline.com/${entraTenantId}/discovery/v2.0/keys`
  }
}

function assertRequest(
  input: McpTokenExchangeRequest,
  config: ExchangeConfiguration,
  scopeContract: ExchangeScopeContract
) {
  if (
    input.requestUrl !== config.audience ||
    input.grantType !== RFC8693_TOKEN_EXCHANGE_GRANT ||
    input.clientId !== scopeContract.clientId ||
    input.subjectTokenType !== RFC8693_ACCESS_TOKEN_TYPE ||
    (input.requestedTokenType !== undefined && input.requestedTokenType !== RFC8693_ACCESS_TOKEN_TYPE)
  ) {
    throw new McpTokenExchangeError('invalid_request')
  }
}

function assertFederatedClient(
  client: SisterPlatformOAuthClient | null,
  scopeContract: ExchangeScopeContract,
  env: NodeJS.ProcessEnv
): asserts client {
  const allowedConsumers = list(env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS).map(value =>
    value.toLowerCase()
  )

  if (
    !client ||
    allowedConsumers.length === 0 ||
    !allowedConsumers.includes(scopeContract.clientId) ||
    client.clientId !== scopeContract.clientId ||
    client.clientStatus !== 'active' ||
    client.consumerStatus !== 'active' ||
    (client.consumerExpiresAt !== null && Date.parse(client.consumerExpiresAt) <= Date.now()) ||
    client.clientType !== 'confidential' ||
    client.sisterPlatformKey !== 'mcp' ||
    client.allowedScopes.length !== 1 ||
    client.allowedScopes[0] !== scopeContract.greenhouseScope ||
    client.policy.requiredScopes.length !== 1 ||
    client.policy.requiredScopes[0] !== scopeContract.greenhouseScope ||
    client.policy.capabilityScopes.length !== 1 ||
    client.policy.capabilityScopes[0] !== scopeContract.greenhouseScope ||
    client.policy.audience.tenantTypes.length !== 1 ||
    client.policy.audience.tenantTypes[0] !== 'efeonce_internal' ||
    (scopeContract.requireWorkspaceBinding
      ? client.metadata?.workspaceBindingProvider !== 'globe'
      : client.metadata?.resourceFamily !== 'hiring')
  ) {
    throw new McpTokenExchangeError('invalid_client', 401)
  }
}

async function verifyGoogleIdToken(token: string, audience: string): Promise<GoogleWorkloadClaims> {
  const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience })
  const payload = ticket.getPayload()

  if (!payload) throw new Error('google_payload_missing')

  return {
    audience: typeof payload.aud === 'string' ? payload.aud : '',
    email: payload.email?.trim().toLowerCase() ?? '',
    emailVerified: payload.email_verified === true,
    subject: payload.sub?.trim() ?? ''
  }
}

async function verifyEntraSubjectToken(token: string, config: ExchangeConfiguration): Promise<EntraSubjectClaims> {
  const jwks = createRemoteJWKSet(new URL(config.entraJwksUrl), { timeoutDuration: 8_000 })

  const result = await jwtVerify(token, jwks, {
    issuer: config.entraIssuer,
    audience: config.entraAudience,
    algorithms: ['RS256'],
    clockTolerance: 5
  })

  const claims = result.payload as JWTPayload & {
    tid?: string
    oid?: string
    azp?: string
    scp?: string
  }

  return {
    tenantId: claims.tid?.trim().toLowerCase() ?? '',
    objectId: claims.oid?.trim().toLowerCase() ?? '',
    authorizedParty: claims.azp?.trim() ?? '',
    scopes:
      claims.scp
        ?.split(/\s+/)
        .map(value => value.trim())
        .filter(Boolean) ?? []
  }
}

async function resolveExactEntraUser(tenantId: string, objectId: string): Promise<TenantAccessRecord | null> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id
       FROM greenhouse_core.client_users
      WHERE lower(microsoft_tenant_id) = lower($1)
        AND lower(microsoft_oid) = lower($2)
        AND active = TRUE
        AND status = 'active'
      LIMIT 2`,
    [tenantId, objectId]
  )

  if (rows.length !== 1) return null

  return getTenantAccessRecordByUserId(rows[0]!.user_id)
}

async function issueOpaqueToken(input: IssueTokenInput): Promise<IssuedToken> {
  // Resolve the identity projection before minting. A binding failure must never leave a usable orphan token.
  const identity = await buildBrokerSisterPlatformOAuthIdentityPayload({
    tenant: input.tenant,
    client: input.client,
    requestedScopes: [input.requestedScope],
    expiresAt: input.expiresAt,
    authMode: 'agent'
  })

  if (input.requireWorkspaceBinding && !identity.workspaceBindings?.length) {
    throw new McpTokenExchangeError('identity_not_bound', 403)
  }

  const accessToken = `gh_mcp_${randomBytes(48).toString('base64url')}`
  const tokenHash = createHash('sha256').update(accessToken).digest('hex')
  const accessTokenId = `spoauth-token-${randomUUID()}`

  await query(
    `INSERT INTO greenhouse_core.sister_platform_oauth_access_tokens (
       sister_platform_oauth_access_token_id,
       sister_platform_oauth_client_id,
       sister_platform_consumer_id,
       sister_platform_authorization_code_id,
       user_id,
       identity_profile_id,
       token_prefix,
       token_hash,
       scopes,
       correlation_id,
       expires_at,
       metadata_json
     ) VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8::text[],$9,$10,$11::jsonb)`,
    [
      accessTokenId,
      input.client.oauthClientId,
      input.client.consumerId,
      input.tenant.userId,
      input.tenant.identityProfileId,
      tokenHash.slice(0, TOKEN_PREFIX_LENGTH),
      tokenHash,
      [input.requestedScope],
      input.correlationId,
      input.expiresAt,
      JSON.stringify({
        source: 'rfc8693_internal_mcp_exchange',
        sessionAuthMode: 'agent',
        workloadSubjectHash: digest(input.workloadSubject),
        entraBindingHash: digest(`${input.entraTenantId}:${input.entraObjectId}`)
      })
    ]
  )

  return { accessTokenId, accessToken }
}

function authorizeFunding(tenant: TenantAccessRecord) {
  return can(
    {
      userId: tenant.userId,
      tenantType: tenant.tenantType,
      roleCodes: tenant.roleCodes,
      primaryRoleCode: tenant.primaryRoleCode,
      routeGroups: tenant.routeGroups,
      authorizedViews: tenant.authorizedViews,
      projectScopes: tenant.projectScopes,
      campaignScopes: tenant.campaignScopes,
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules,
      portalHomePath: tenant.portalHomePath,
      ...(tenant.memberId ? { memberId: tenant.memberId } : {})
    },
    'platform.globe_credit_funding.ensure',
    'execute',
    'all'
  )
}

function authorizeTalentPool(tenant: TenantAccessRecord) {
  return can(
    {
      userId: tenant.userId,
      tenantType: tenant.tenantType,
      roleCodes: tenant.roleCodes,
      primaryRoleCode: tenant.primaryRoleCode,
      routeGroups: tenant.routeGroups,
      authorizedViews: tenant.authorizedViews,
      projectScopes: tenant.projectScopes,
      campaignScopes: tenant.campaignScopes,
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules,
      portalHomePath: tenant.portalHomePath,
      ...(tenant.memberId ? { memberId: tenant.memberId } : {})
    },
    'hiring.talent_pool.read',
    'read',
    'tenant'
  )
}

function authorizeCandidateReview(tenant: TenantAccessRecord) {
  return can(
    {
      userId: tenant.userId,
      tenantType: tenant.tenantType,
      roleCodes: tenant.roleCodes,
      primaryRoleCode: tenant.primaryRoleCode,
      routeGroups: tenant.routeGroups,
      authorizedViews: tenant.authorizedViews,
      projectScopes: tenant.projectScopes,
      campaignScopes: tenant.campaignScopes,
      businessLines: tenant.businessLines,
      serviceModules: tenant.serviceModules,
      portalHomePath: tenant.portalHomePath,
      ...(tenant.memberId ? { memberId: tenant.memberId } : {})
    },
    MCP_CANDIDATE_REVIEW_GREENHOUSE_SCOPE,
    'read',
    'tenant'
  )
}

function boundedToken(value: string) {
  const token = value.trim()

  if (!token || token.length > MAX_TOKEN_LENGTH) throw new McpTokenExchangeError('invalid_request')

  return token
}

function list(value: string | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
    )
  )
}

function isExactHttpsUrl(value: string) {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search
  } catch {
    return false
  }
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}
