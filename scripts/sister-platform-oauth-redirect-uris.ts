/**
 * Adjust the redirect-URI allowlist of a sister-platform OAuth client (TASK-1507).
 *
 * All logic lives in `updateSisterPlatformOAuthRedirectUris`; this file is only an entry point, so
 * an API route, an MCP tool or Nexa can drive the same change through the same primitive later.
 *
 * The seed scripts (`seed-globe-internal-pilot.ts`, `seed-kortex-sister-platform-pilot.ts`) are for
 * provisioning a client from scratch: they restate the whole row and rotate the consumer token.
 * Use this one to move an allowlist on a live client — it touches redirect URIs and nothing else.
 *
 *   pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback
 *   pnpm sister-platform:redirect --client globe --remove https://old.example/auth/callback --apply
 *
 * Reads without `--apply` (dry run prints the resulting allowlist and writes nothing).
 */
import { createRequire } from 'node:module'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = { exports: {} } as NodeJS.Module
}

const readFlagValues = (argv: string[], flag: string) => {
  const values: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== flag) continue

    const value = argv[index + 1]

    if (!value || value.startsWith('--')) throw new Error(`${flag}_requires_a_value`)

    values.push(value)
    index += 1
  }

  return values
}

async function main() {
  stubServerOnlyForScripts()
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const argv = process.argv.slice(2)
  const clientIds = readFlagValues(argv, '--client')
  const add = readFlagValues(argv, '--add')
  const remove = readFlagValues(argv, '--remove')
  const apply = argv.includes('--apply')

  if (clientIds.length !== 1) throw new Error('exactly_one_client_required')
  if (add.length === 0 && remove.length === 0) throw new Error('add_or_remove_required')

  const clientId = clientIds[0] as string

  const { loadSisterPlatformOAuthClient, updateSisterPlatformOAuthRedirectUris } = await import(
    '@/lib/sister-platforms/oauth-broker'
  )

  if (!apply) {
    const current = await loadSisterPlatformOAuthClient(clientId)

    if (!current) throw new Error('oauth_client_not_found')

    const missing = remove.filter(uri => !current.redirectUris.includes(uri))

    if (missing.length > 0) throw new Error('redirect_uri_to_remove_not_allowlisted')

    // Mirrors the primitive's merge so the dry run shows the real outcome, but the authoritative
    // validation still happens server-side inside the transaction on --apply.
    const projected = [
      ...current.redirectUris.filter(uri => !remove.includes(uri)),
      ...add.filter(uri => !current.redirectUris.includes(uri))
    ]

    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          clientId: current.clientId,
          clientStatus: current.clientStatus,
          currentRedirectUris: current.redirectUris,
          projectedRedirectUris: projected,
          applied: false
        },
        null,
        2
      )
    )

    return
  }

  const result = await updateSisterPlatformOAuthRedirectUris({
    clientId,
    add,
    remove,
    actorUserId: process.env.SISTER_PLATFORM_ACTOR_USER_ID?.trim() || 'system'
  })

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        clientId: result.client.clientId,
        clientStatus: result.client.clientStatus,
        previousRedirectUris: result.previousRedirectUris,
        redirectUris: result.redirectUris,
        changed: result.changed
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'sister_platform_redirect_update_failed')
  process.exitCode = 1
})
