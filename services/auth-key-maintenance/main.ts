import { randomUUID } from 'node:crypto'

import { runKeyRotationTick } from '@/lib/auth-server/maintenance/key-rotation'
import { createIssuerPublicationPort, createRotationKmsPort } from '@/lib/auth-server/maintenance/key-rotation-kms'

const KEY_NAME = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'

const flag = (name: string, defaultValue: boolean): boolean => {
  const value = process.env[name]

  if (value === undefined || value === '') return defaultValue
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${name} must be true or false`)
}

const main = async () => {
  if (process.argv.length !== 2) throw new Error('Job arguments are not accepted')

  const enabled = flag('AUTH_KEY_MAINTENANCE_ENABLED', false)

  if (!enabled) {
    console.log(JSON.stringify({ component: 'auth-key-maintenance', status: 'disabled' }))

    return
  }

  const dryRun = flag('AUTH_KEY_MAINTENANCE_DRY_RUN', true)

  if (process.env.AUTH_SERVER_KMS_KEY !== KEY_NAME) {
    throw new Error('Job KMS key does not match the allowlisted Auth key')
  }

  const result = await runKeyRotationTick({
    enabled,
    dryRun,
    keyName: KEY_NAME,
    actor: 'job:auth-key-maintenance',
    executionId: process.env.CLOUD_RUN_EXECUTION || randomUUID(),
    kms: createRotationKmsPort(),
    publication: createIssuerPublicationPort()
  })

  console.log(JSON.stringify({ component: 'auth-key-maintenance', ...result, gitSha: process.env.GIT_SHA || null }))

  if (result.status === 'blocked' || result.status === 'baseline_required' || result.status === 'create_uncertain') {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(JSON.stringify({
    component: 'auth-key-maintenance', status: 'failed',
    errorCode: error instanceof Error ? error.name : 'unknown'
  }))
  process.exitCode = 1
})
