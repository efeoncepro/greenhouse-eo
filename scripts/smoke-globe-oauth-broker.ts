import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)
const serverOnlyPath = require.resolve('server-only')

require.cache[serverOnlyPath] = { exports: {} } as NodeJS.Module

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')
process.env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED = 'true'
process.env.GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS = 'globe,kortex'

const requireEnv = (key: string) => {
  const value = process.env[key]?.trim()

  if (!value || /[\r\n]/.test(value)) throw new Error(`${key}_missing_or_invalid`)

  return value
}

const clientSecret = requireEnv('GLOBE_OAUTH_CLIENT_SECRET')
const redirectUri = requireEnv('GLOBE_OAUTH_REDIRECT_URI')

async function main() {
  const broker = await import('@/lib/sister-platforms/oauth-broker')
  const { getTenantAccessRecordForAgent } = await import('@/lib/tenant/access')
  const tenant = await getTenantAccessRecordForAgent('agent@greenhouse.efeonce.org')

  if (!tenant || tenant.tenantType !== 'efeonce_internal') throw new Error('globe_internal_actor_missing')

  const auditMetadata = () => ({ correlationId: `task-1454-${randomUUID()}`, ipHash: null, userAgentHash: null })
  const createVerifier = () => randomBytes(48).toString('base64url')
  const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

  const issueAndConsume = async () => {
  const verifier = createVerifier()
  const metadata = auditMetadata()
  const requestUrl = new URL('https://greenhouse.internal/api/auth/sister-platforms/authorize')

  requestUrl.searchParams.set('client_id', 'globe')
  requestUrl.searchParams.set('redirect_uri', redirectUri)
  requestUrl.searchParams.set('response_type', 'code')
  requestUrl.searchParams.set('scope', 'openid profile email globe.studio.access')
  requestUrl.searchParams.set('state', randomBytes(24).toString('base64url'))
  requestUrl.searchParams.set('nonce', randomBytes(24).toString('base64url'))
  requestUrl.searchParams.set('code_challenge', challenge(verifier))
  requestUrl.searchParams.set('code_challenge_method', 'S256')

  const validated = await broker.validateSisterPlatformAuthorizeRequest(requestUrl)

  const issued = await broker.issueSisterPlatformAuthorizationCode({
    authorizeRequest: validated,
    tenant,
    auditMetadata: metadata
  })

  const consumed = await broker.consumeSisterPlatformAuthorizationCode({
    clientId: 'globe',
    clientSecret,
    code: issued.code,
    redirectUri,
    codeVerifier: verifier,
    auditMetadata: metadata
  })

  return { issued, consumed, verifier, metadata }
  }

  let restoredActive = false

  try {
  const first = await issueAndConsume()

  const initialUserinfo = await broker.resolveSisterPlatformOAuthUserinfo({
    accessToken: first.consumed.accessToken,
    auditMetadata: first.metadata
  })

  let replayDenied = false

  try {
    await broker.consumeSisterPlatformAuthorizationCode({
      clientId: 'globe',
      clientSecret,
      code: first.issued.code,
      redirectUri,
      codeVerifier: first.verifier,
      auditMetadata: first.metadata
    })
  } catch (error) {
    replayDenied = error instanceof broker.SisterPlatformOAuthError && error.errorCode === 'code_replay'
  }

  const explicitRevocation = await broker.revokeSisterPlatformOAuthAccessTokens({
    clientId: 'globe',
    userId: tenant.userId,
    actorUserId: tenant.userId,
    reason: 'TASK-1454 explicit revocation smoke',
    correlationId: first.metadata.correlationId
  })

  let explicitlyRevokedDenied = false

  try {
    await broker.resolveSisterPlatformOAuthUserinfo({
      accessToken: first.consumed.accessToken,
      auditMetadata: first.metadata
    })
  } catch (error) {
    explicitlyRevokedDenied = error instanceof broker.SisterPlatformOAuthError && error.errorCode === 'invalid_token'
  }

  const second = await issueAndConsume()

  await broker.setSisterPlatformOAuthClientStatus({
    clientId: 'globe',
    status: 'suspended',
    actorUserId: tenant.userId,
    reason: 'TASK-1454 suspension smoke',
    correlationId: second.metadata.correlationId
  })

  let suspendedTokenDenied = false

  try {
    await broker.resolveSisterPlatformOAuthUserinfo({
      accessToken: second.consumed.accessToken,
      auditMetadata: second.metadata
    })
  } catch (error) {
    suspendedTokenDenied =
      error instanceof broker.SisterPlatformOAuthError &&
      (error.errorCode === 'client_not_active' || error.errorCode === 'invalid_token')
  }

  await broker.setSisterPlatformOAuthClientStatus({
    clientId: 'globe',
    status: 'active',
    actorUserId: tenant.userId,
    reason: 'TASK-1454 smoke complete',
    correlationId: second.metadata.correlationId
  })
  restoredActive = true

  console.log(
    JSON.stringify({
      internalIdentityAllowed:
        initialUserinfo.identity.organization.tenantType === 'efeonce_internal' &&
        initialUserinfo.identity.capabilities.includes('globe.studio.access') &&
        initialUserinfo.identity.roles.length === 0,
      replayDenied,
      explicitlyRevokedCount: explicitRevocation.revokedCount,
      explicitlyRevokedDenied,
      suspendedTokenDenied,
      clientRestoredActive: restoredActive,
      secretPrinted: false
    })
  )
  } finally {
    if (!restoredActive) {
      await broker
        .setSisterPlatformOAuthClientStatus({
          clientId: 'globe',
          status: 'active',
          actorUserId: tenant.userId,
          reason: 'TASK-1454 smoke safety restore'
        })
        .catch(() => undefined)
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'globe_oauth_smoke_failed')
  process.exitCode = 1
})
