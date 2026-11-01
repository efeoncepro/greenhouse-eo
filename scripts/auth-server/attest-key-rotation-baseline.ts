/**
 * TASK-1833 one-time baseline after the previous signing key has been retired.
 * This does not rotate or disable KMS. It records an operator evidence anchor
 * so the scheduled command can wait a full 90 days before its first create.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

import { createCloudKmsSigner, getAuthServerKmsKeyName, listSigningKeys } from '@/lib/auth-server/keys'
import { prepareSigningKeyVersion } from '@/lib/auth-server/keys/signing-keys-store'
import { attestExistingRotationBaseline } from '@/lib/auth-server/maintenance/key-rotation-store'

const KEY_NAME = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'

const args = process.argv.slice(2)

if (args.length !== 4 || args[0] !== '--predecessor' || args[2] !== '--evidence') {
  throw new Error('Usage: --predecessor <retired-kid> --evidence docs/audits/auth-server/<file>.md')
}

const predecessorKid = args[1]!
const evidenceRef = args[3]!

if (!/^docs\/audits\/auth-server\/[a-zA-Z0-9._/-]{8,180}\.md$/.test(evidenceRef) ||
    evidenceRef.includes('..') || !existsSync(resolve(process.cwd(), evidenceRef))) {
  throw new Error('Baseline evidence must be an existing repository Auth audit markdown file')
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  if (getAuthServerKmsKeyName() !== KEY_NAME) throw new Error('Unexpected Auth KMS key')

  const keys = await listSigningKeys()
  const active = keys.find(key => key.state === 'active')
  const previous = keys.find(key => key.kid === predecessorKid)

  if (!active || previous?.state !== 'retired' || previous.kid === active.kid) {
    throw new Error('A current active key and distinct retired predecessor are required')
  }

  const prepared = await prepareSigningKeyVersion(createCloudKmsSigner(), active.kmsKeyVersion, KEY_NAME)

  if (prepared.kid !== active.kid) throw new Error('Active key registry does not match KMS public key')

  const [ready, jwks] = await Promise.all([
    fetch('https://auth.efeonce.org/readyz', { redirect: 'error', signal: AbortSignal.timeout(10_000) }),
    fetch('https://auth.efeonce.org/.well-known/jwks.json', {
      redirect: 'error', signal: AbortSignal.timeout(10_000)
    })
  ])

  if (ready.status !== 200 || jwks.status !== 200) throw new Error('Issuer readback failed')
  const body: unknown = await jwks.json()
  const published = body && typeof body === 'object' && 'keys' in body && Array.isArray(body.keys) ? body.keys : []

  if (published.filter((key: unknown) => key && typeof key === 'object' && 'kid' in key && key.kid === active.kid).length !== 1 ||
      published.some((key: unknown) => key && typeof key === 'object' && 'kid' in key && key.kid === predecessorKid)) {
    throw new Error('Issuer JWKS does not match active/retired registry')
  }

  const result = await attestExistingRotationBaseline({
    keyName: KEY_NAME, predecessorKid, activeKid: active.kid, evidenceRef,
    actor: process.env.AUTH_SERVER_ROTATION_ACTOR || 'cli:operator',
    executionId: `cli:${Date.now()}`
  })

  console.log(`baseline_attested operation=${result.id} active_kid=${active.kid}`)
}

main().catch(error => {
  console.error('attest-key-rotation-baseline failed:', error instanceof Error ? error.message : 'unknown')
  process.exitCode = 1
})
