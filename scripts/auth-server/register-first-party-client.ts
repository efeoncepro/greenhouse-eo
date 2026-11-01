/** TASK-1834: governed registration; credentials go only to an exclusive 0600 output file. */
import { open, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

import { parseFirstPartyRegistration } from '../../src/lib/auth-server/first-party/admin-input'
import { registerFirstPartyClient } from '../../src/lib/auth-server/first-party/registry'
import { isOAuthProtocolError } from '../../src/lib/auth-server/oauth/errors'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

const usage = 'Usage: --client-id efeonce-rp-... --product rooms|synthetic-rp --redirect <exact-uri> [--redirect ...] --secret-out <new-file> [--local-development] [--session-max-age <seconds>]'

async function run() {
  const argv = process.argv.slice(2).filter(arg => arg !== '--')

  if (argv.includes('--help')) { console.log(usage);

return }

  const body: Record<string, unknown> = { redirectUris: [] as string[] }
  let secretOutput: string | undefined

  for (let index = 0; index < argv.length; index++) {
    const key = argv[index]

    if (key === '--local-development') { body.allowLocalDevelopment = true; continue }
    const value = argv[++index]

    if (!value || value.startsWith('--')) throw new Error('invalid_arguments')

    switch (key) {
      case '--client-id': body.clientId = value; break
      case '--product': body.product = value; break
      case '--redirect': (body.redirectUris as string[]).push(value); break
      case '--session-max-age': body.sessionMaxAgeSeconds = Number(value); break
      case '--secret-out': secretOutput = resolve(value); break
      default: throw new Error('invalid_arguments')
    }
  }

  if (!secretOutput) throw new Error('secret_output_required')
  const input = parseFirstPartyRegistration(body, `cli:${process.env.USER ?? 'operator'}`)
  // Reserve the destination before any registration. Never overwrite an existing credential.
  const output = await open(secretOutput, 'wx', 0o600)
  let stored = false

  try {
    loadGreenhouseToolEnv()
    applyGreenhousePostgresProfile('ops')
    const { PostgresFirstPartyStore } = await import('../../src/lib/auth-server/first-party/postgres-store')
    const result = await registerFirstPartyClient(input, { store: new PostgresFirstPartyStore() })

    if (result.clientSecret) {
      await output.writeFile(result.clientSecret, 'utf8')
      await output.sync()
      stored = true
    }

    console.log(JSON.stringify({ created: result.created, clientId: result.client.clientId, product: result.client.product, secretWritten: stored }))
  } finally {
    await output.close()
    if (!stored) await unlink(secretOutput)
  }
}

run().then(() => process.exit(0)).catch(error => {
  // Do not print upstream/database exceptions or serialized registration inputs.
  console.error(isOAuthProtocolError(error) ? `${error.code}: ${error.reason ?? 'registration_rejected'}` : 'Registration failed; verify arguments, output file and database access.')
  process.exit(1)
})
