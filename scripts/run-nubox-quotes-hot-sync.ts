import process from 'node:process'
import Module from 'node:module'

// Bypass Next.js `server-only` guard for trusted local ops scripts.
const originalResolveFilename = (Module as any)._resolveFilename

;(Module as any)._resolveFilename = function (request: string, ...args: unknown[]) {
  if (request === 'server-only') return require.resolve('./lib/load-greenhouse-tool-env')

  return originalResolveFilename.call(this, request, ...args)
}

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const parsePeriods = () => {
  const periodsArg = process.argv.find(argument => argument.startsWith('--periods='))
  const periodArg = process.argv.find(argument => argument.startsWith('--period='))
  const value = periodsArg?.slice('--periods='.length) || periodArg?.slice('--period='.length)

  return value
    ? value.split(',').map(period => period.trim()).filter(Boolean)
    : undefined
}

const parseEnvFiles = () => {
  const explicitEnvFiles = process.argv
    .filter(argument => argument.startsWith('--env-file='))
    .map(argument => argument.slice('--env-file='.length).trim())
    .filter(Boolean)

  return explicitEnvFiles.length > 0 ? explicitEnvFiles : undefined
}

const main = async () => {
  loadGreenhouseToolEnv(parseEnvFiles())
  applyGreenhousePostgresProfile('runtime')

  const { syncNuboxQuotesHot } = await import('@/lib/nubox/sync-nubox-quotes-hot')
  const { closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    const result = await syncNuboxQuotesHot({ periods: parsePeriods() })

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
