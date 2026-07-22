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

  const { buildGlobeOAuthGrantContract, updateGlobeOAuthGrantContract } = await import(
    '@/lib/sister-platforms/globe-oauth-grants'
  )

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
        redirectUrisPreserved: current.redirectUris,
        clientStatusPreserved: current.clientStatus,
        credentialRotated: false
      })
    )

    return
  }

  const result = await updateGlobeOAuthGrantContract(mode)

  console.log(
    JSON.stringify({
      apply: true,
      mode,
      clientId: result.client.clientId,
      previousAllowedScopes: result.previousAllowedScopes,
      allowedScopes: result.allowedScopes,
      changed: result.changed,
      redirectUrisPreserved: result.client.redirectUris,
      clientStatusPreserved: result.client.clientStatus,
      credentialRotated: false
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'globe_oauth_grant_update_failed')
  process.exitCode = 1
})
