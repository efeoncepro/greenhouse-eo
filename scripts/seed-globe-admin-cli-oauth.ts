import { createRequire } from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = { exports: {} } as NodeJS.Module
}

const sameStrings = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index])

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    )

    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }

  return JSON.stringify(value)
}

async function main() {
  stubServerOnlyForScripts()
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const actorUserId = process.env.GLOBE_ADMIN_OAUTH_ACTOR_USER_ID?.trim() || 'system'
  const { upsertSisterPlatformConsumer } = await import('@/lib/sister-platforms/consumers')

  const { loadSisterPlatformOAuthClient, upsertSisterPlatformOAuthClient } = await import(
    '@/lib/sister-platforms/oauth-broker'
  )

  const {
    GLOBE_ADMIN_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    GLOBE_ADMIN_OAUTH_CLIENT_ID,
    GLOBE_ADMIN_OAUTH_CODE_TTL_SECONDS,
    GLOBE_ADMIN_OAUTH_REDIRECT_URI,
    buildGlobeAdminOAuthGrantContract
  } = await import('@/lib/sister-platforms/globe-admin-oauth-grants')

  const contract = buildGlobeAdminOAuthGrantContract()

  const consumer = await upsertSisterPlatformConsumer({
    sisterPlatformKey: GLOBE_ADMIN_OAUTH_CLIENT_ID,
    consumerName: 'Greenhouse Globe Admin CLI',
    consumerType: 'internal_service',
    credentialStatus: 'active',
    allowedGreenhouseScopeTypes: ['internal'],
    rateLimitPerMinute: 20,
    rateLimitPerHour: 120,
    notes: 'TASK-1616 public OAuth client anchor. Its generated consumer credential is never used or printed.',
    metadata: { source: 'scripts/seed-globe-admin-cli-oauth.ts', taskId: 'TASK-1616' },
    actorUserId
  })

  const existing = await loadSisterPlatformOAuthClient(GLOBE_ADMIN_OAUTH_CLIENT_ID)

  if (existing) {
    const exactConfiguration =
      existing.consumerId === consumer.consumer.consumerId &&
      existing.clientType === 'public' &&
      existing.requireHumanSession &&
      existing.requirePkce &&
      existing.clientStatus === 'active' &&
      sameStrings(existing.redirectUris, [GLOBE_ADMIN_OAUTH_REDIRECT_URI]) &&
      sameStrings(existing.allowedScopes, contract.allowedScopes) &&
      stableJson(existing.policy) === stableJson(contract.policy)

    if (!exactConfiguration) {
      throw new Error('globe_admin_oauth_client_configuration_drift')
    }

    process.stdout.write(
      `${JSON.stringify({ clientId: existing.clientId, status: existing.clientStatus, created: false, secretPrinted: false })}\n`
    )

    return
  }

  const client = await upsertSisterPlatformOAuthClient({
    sisterPlatformConsumerId: consumer.consumer.consumerId,
    clientId: GLOBE_ADMIN_OAUTH_CLIENT_ID,
    clientName: 'Greenhouse Globe Admin CLI',
    clientStatus: 'active',
    clientType: 'public',
    requireHumanSession: true,
    redirectUris: [GLOBE_ADMIN_OAUTH_REDIRECT_URI],
    allowedScopes: contract.allowedScopes,
    codeTtlSeconds: GLOBE_ADMIN_OAUTH_CODE_TTL_SECONDS,
    accessTokenTtlSeconds: GLOBE_ADMIN_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    requirePkce: true,
    issueIdentityInline: true,
    policy: contract.policy,
    metadata: { source: 'scripts/seed-globe-admin-cli-oauth.ts', taskId: 'TASK-1616' },
    actorUserId
  })

  process.stdout.write(
    `${JSON.stringify({ clientId: client.clientId, status: client.clientStatus, created: true, secretPrinted: false })}\n`
  )
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : 'globe_admin_oauth_seed_failed'}\n`)
  process.exitCode = 1
})
