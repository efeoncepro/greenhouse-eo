import { createRequire } from 'node:module'

import type { CreateSisterPlatformBindingInput, SisterPlatformBindingStatus } from '@/lib/sister-platforms/types'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = { exports: {} } as NodeJS.Module
}

const readRequiredEnv = (key: string) => {
  const value = process.env[key]?.trim()

  if (!value || /[\r\n]/.test(value)) throw new Error(`${key}_missing_or_invalid`)

  return value
}

const readStatus = (key: string, fallback: SisterPlatformBindingStatus) => {
  const value = process.env[key]?.trim() || fallback

  if (value !== 'draft' && value !== 'active' && value !== 'suspended' && value !== 'deprecated') {
    throw new Error(`${key}_invalid`)
  }

  return value
}

const upsertInternalBinding = async (input: CreateSisterPlatformBindingInput) => {
  const { createSisterPlatformBinding, listSisterPlatformBindings, updateSisterPlatformBinding } = await import(
    '@/lib/sister-platforms/bindings'
  )

  const existing = (
    await listSisterPlatformBindings({ sisterPlatformKey: 'globe', limit: 200 })
  ).find(
    binding =>
      binding.externalScopeType === input.externalScopeType &&
      binding.externalScopeId === input.externalScopeId &&
      binding.bindingRole === 'primary'
  )

  if (!existing) return createSisterPlatformBinding({ input })

  return updateSisterPlatformBinding({
    bindingId: existing.bindingId,
    input: {
      externalScopeParentId: null,
      externalDisplayName: input.externalDisplayName ?? null,
      greenhouseScopeType: 'internal',
      organizationId: null,
      clientId: null,
      spaceId: null,
      bindingStatus: input.bindingStatus,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      lastVerifiedAt: input.lastVerifiedAt ?? null
    }
  })
}

async function main() {
  stubServerOnlyForScripts()
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const oauthClientSecret = readRequiredEnv('GLOBE_OAUTH_CLIENT_SECRET')
  const redirectUri = readRequiredEnv('GLOBE_OAUTH_REDIRECT_URI')
  const actorUserId = process.env.GLOBE_ACTOR_USER_ID?.trim() || 'system'
  const clientStatus = readStatus('GLOBE_OAUTH_CLIENT_STATUS', 'draft')
  const bindingStatus = readStatus('GLOBE_BINDING_STATUS', 'draft')
  const { upsertSisterPlatformConsumer } = await import('@/lib/sister-platforms/consumers')

  const consumer = await upsertSisterPlatformConsumer({
    sisterPlatformKey: 'globe',
    consumerName: 'Efeonce Globe Internal Studio',
    consumerType: 'sister_platform',
    credentialStatus: 'active',
    token: oauthClientSecret,
    rotateToken: true,
    allowedGreenhouseScopeTypes: ['internal'],
    rateLimitPerMinute: 60,
    rateLimitPerHour: 600,
    notes: 'TASK-1454 internal-only OAuth consumer. No external clients.',
    metadata: {
      source: 'scripts/seed-globe-internal-pilot.ts',
      audience: 'efeonce_internal',
      taskId: 'TASK-1454'
    },
    actorUserId
  })

  const binding = await upsertInternalBinding({
    sisterPlatformKey: 'globe',
    externalScopeType: 'workspace',
    externalScopeId: 'efeonce-internal',
    externalDisplayName: 'Efeonce Internal',
    greenhouseScopeType: 'internal',
    organizationId: null,
    clientId: null,
    spaceId: null,
    bindingRole: 'primary',
    bindingStatus,
    notes: 'TASK-1454 internal smoke binding.',
    metadata: { taskId: 'TASK-1454', audience: 'efeonce_internal' },
    lastVerifiedAt: new Date().toISOString()
  })

  const { upsertSisterPlatformOAuthClient } = await import('@/lib/sister-platforms/oauth-broker')

  const {
    GLOBE_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    GLOBE_OAUTH_CODE_TTL_SECONDS,
    buildGlobeOAuthGrantContract
  } = await import('@/lib/sister-platforms/globe-oauth-grants')

  const grantContract = buildGlobeOAuthGrantContract('producer')

  const oauthClient = await upsertSisterPlatformOAuthClient({
    sisterPlatformConsumerId: consumer.consumer.consumerId,
    clientId: 'globe',
    clientName: 'Efeonce Globe Internal Studio',
    clientStatus,
    redirectUris: [redirectUri],
    allowedScopes: grantContract.allowedScopes,
    codeTtlSeconds: GLOBE_OAUTH_CODE_TTL_SECONDS,
    accessTokenTtlSeconds: GLOBE_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    requirePkce: true,
    issueIdentityInline: true,
    policy: grantContract.policy,
    metadata: { source: 'scripts/seed-globe-internal-pilot.ts', taskId: 'TASK-1454' },
    actorUserId
  })

  console.log(
    JSON.stringify({
      consumerPublicId: consumer.consumer.publicId,
      consumerStatus: consumer.consumer.credentialStatus,
      bindingPublicId: binding.publicId,
      bindingStatus: binding.bindingStatus,
      oauthClientId: oauthClient.clientId,
      oauthClientStatus: oauthClient.clientStatus,
      audience: oauthClient.policy.audience.tenantTypes,
      claimsIncludeGreenhouseRoles: oauthClient.policy.claims.includeGreenhouseRoles,
      secretPrinted: false
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'globe_seed_failed')
  process.exitCode = 1
})
