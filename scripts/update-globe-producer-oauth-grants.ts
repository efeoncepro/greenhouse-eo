import { createRequire } from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)
const serverOnlyPath = require.resolve('server-only')

require.cache[serverOnlyPath] = { exports: {} } as NodeJS.Module

const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')
const mode = args.has('--rollback') ? 'shell-only' : 'producer'

if ([...args].some(arg => !['--apply', '--rollback'].includes(arg))) {
  throw new Error('usage: update-globe-producer-oauth-grants.ts [--apply] [--rollback]')
}

async function main() {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const { loadSisterPlatformOAuthClient } = await import('@/lib/sister-platforms/oauth-broker')

  const {
    GLOBE_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    GLOBE_OAUTH_CODE_TTL_SECONDS,
    GLOBE_OAUTH_REVALIDATE_AFTER_SECONDS,
    buildGlobeOAuthGrantContract,
    updateGlobeOAuthGrantContract,
    updateGlobeOAuthSessionContract
  } = await import('@/lib/sister-platforms/globe-oauth-grants')

  const current = await loadSisterPlatformOAuthClient('globe')

  if (!current) throw new Error('globe_oauth_client_not_found')

  const target = buildGlobeOAuthGrantContract(mode)

  if (!apply) {
    console.log(
      JSON.stringify({
        apply: false,
        mode,
        clientId: current.clientId,
        currentAllowedScopes: current.allowedScopes,
        targetAllowedScopes: target.allowedScopes,
        currentCodeTtlSeconds: current.codeTtlSeconds,
        targetCodeTtlSeconds: GLOBE_OAUTH_CODE_TTL_SECONDS,
        currentAccessTokenTtlSeconds: current.accessTokenTtlSeconds,
        targetAccessTokenTtlSeconds: GLOBE_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
        currentRevalidateAfterSeconds: current.policy.revocation.revalidateAfterSeconds,
        targetRevalidateAfterSeconds: GLOBE_OAUTH_REVALIDATE_AFTER_SECONDS,
        redirectUrisPreserved: current.redirectUris,
        clientStatusPreserved: current.clientStatus,
        credentialRotated: false
      })
    )

    return
  }

  const sessionResult = await updateGlobeOAuthSessionContract()
  const grantResult = await updateGlobeOAuthGrantContract(mode)

  console.log(
    JSON.stringify({
      apply: true,
      mode,
      clientId: grantResult.client.clientId,
      previousAllowedScopes: grantResult.previousAllowedScopes,
      allowedScopes: grantResult.allowedScopes,
      grantChanged: grantResult.changed,
      previousCodeTtlSeconds: sessionResult.previousCodeTtlSeconds,
      codeTtlSeconds: sessionResult.codeTtlSeconds,
      previousAccessTokenTtlSeconds: sessionResult.previousAccessTokenTtlSeconds,
      accessTokenTtlSeconds: sessionResult.accessTokenTtlSeconds,
      sessionChanged: sessionResult.changed,
      revalidateAfterSeconds: grantResult.policy.revocation.revalidateAfterSeconds,
      redirectUrisPreserved: grantResult.client.redirectUris,
      clientStatusPreserved: grantResult.client.clientStatus,
      credentialRotated: false
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'globe_oauth_grant_update_failed')
  process.exitCode = 1
})
