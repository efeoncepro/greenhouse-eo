/** Governed compensation of a mistaken exit; preview by default, never grants itself permissions. */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

const runtimeRequire = createRequire(import.meta.url)

runtimeRequire('module').Module._cache[runtimeRequire.resolve('server-only')] = { id: 'server-only', exports: {} }

const main = async () => {
  const args = process.argv.slice(2)
  const index = args.indexOf('--plan-file')

  if (index < 0 || !args[index + 1] || args.some((arg, i) => i !== index + 1 && !['--plan-file', '--apply'].includes(arg))) throw new Error('Uso: --plan-file <ruta.json> [--apply]. Sin --apply solo verifica y previsualiza.')

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')
  const { restoreOffboardingLifecycleAfterReentry } = await import('@/lib/workforce/offboarding/lifecycle-recovery')
  const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    const plan = JSON.parse(readFileSync(args[index + 1], 'utf8'))
    const result = await restoreOffboardingLifecycleAfterReentry({ ...plan, apply: args.includes('--apply') })

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  // No raw database errors or connection information in operator output.
  console.error(JSON.stringify({ outcome: 'failed', code: error?.code ?? 'lifecycle_recovery_failed' }))
  process.exitCode = 1
})
