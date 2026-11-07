/** TASK-1833 supervised recovery; binds an exact KMS version or a repaired JWKS. */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

import { assertKmsVersionBelongsToKey, getAuthServerKmsKeyName } from '@/lib/auth-server/keys'
import { prepareSigningKeyVersion } from '@/lib/auth-server/keys/signing-keys-store'
import { createIssuerPublicationPort, createRotationKmsPort } from '@/lib/auth-server/maintenance/key-rotation-kms'
import {
  getRotationOperation,
  reconcileBlockedPublication,
  reconcileUncertainCreation
} from '@/lib/auth-server/maintenance/key-rotation-store'

const KEY_NAME = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'
const args = process.argv.slice(2)
const mode = args[0]

if (args.length !== 6 || (mode !== '--created' && mode !== '--publication') ||
    args[2] !== (mode === '--created' ? '--version' : '--kid') || args[4] !== '--evidence') {
  throw new Error('Usage: --created <operation-uuid> --version <exact-kms-version> --evidence <audit.md> or --publication <operation-uuid> --kid <kid> --evidence <audit.md>')
}

const operationId = args[1]!
const value = args[3]!
const evidenceRef = args[5]!

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operationId) ||
    !/^docs\/audits\/auth-server\/[a-zA-Z0-9._/-]{8,180}\.md$/.test(evidenceRef) ||
    evidenceRef.includes('..') || !existsSync(resolve(process.cwd(), evidenceRef))) {
  throw new Error('Recovery requires an operation UUID and an existing Auth audit markdown file')
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  if (getAuthServerKmsKeyName() !== KEY_NAME) throw new Error('Unexpected Auth KMS key')

  const operation = await getRotationOperation(operationId, KEY_NAME)

  if (!operation) throw new Error('Rotation operation not found')
  const kms = createRotationKmsPort()
  const actor = process.env.AUTH_SERVER_ROTATION_ACTOR || 'cli:operator'
  const executionId = `cli:${Date.now()}`

  if (mode === '--created') {
    assertKmsVersionBelongsToKey(value, KEY_NAME)
    const state = await kms.getVersionState(value)

    if (state !== 'ENABLED' && state !== 'PENDING') {
      throw new Error('Recovered KMS version is not usable or pending generation')
    }

    if (state === 'ENABLED') await prepareSigningKeyVersion(kms.signer, value, KEY_NAME)

    const recovered = await reconcileUncertainCreation({
      operationId, keyName: KEY_NAME, versionName: value, evidenceRef, actor, executionId
    })

    console.log(`rotation_reconciled operation=${recovered.id} phase=${recovered.phase}`)

    return
  }

  if (operation.phase !== 'blocked' || !operation.kmsVersion || operation.candidateKid !== value) {
    throw new Error('Operation is not a blocked publication for this candidate')
  }

  const prepared = await prepareSigningKeyVersion(kms.signer, operation.kmsVersion, KEY_NAME)

  if (prepared.kid !== value) throw new Error('KMS public key does not match candidate')
  await createIssuerPublicationPort().verify(value, operation.predecessorKid)

  const recovered = await reconcileBlockedPublication({
    operationId, keyName: KEY_NAME, candidateKid: value, evidenceRef, actor, executionId
  })

  console.log(`rotation_reconciled operation=${recovered.id} phase=${recovered.phase}`)
}

main().catch(error => {
  console.error('reconcile-key-rotation failed:', error instanceof Error ? error.message : 'unknown')
  process.exitCode = 1
})
