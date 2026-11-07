/**
 * TASK-1828 — Rotación de la llave de firma del auth server (operador, ADC propia).
 *
 * Uso (el runtime del servicio NO puede crear versiones KMS; esto corre con la
 * identidad del operador o de un job con permisos de administración de la llave):
 *
 *   pnpm auth-server:rotate-key                  # command durable (baseline/90d requeridos)
 *   pnpm auth-server:rotate-key --status         # lista llaves registradas y sus estados
 *   pnpm auth-server:rotate-key --register <versionName> [--no-activate]
 *   pnpm auth-server:rotate-key --retire <kid> [--force]
 *
 * Requiere `AUTH_SERVER_KMS_KEY` y conexión a PG (proxy local `pnpm pg:connect`).
 * Nunca imprime material privado: sólo `kid`, versión KMS y estado.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { parseRotationArgs } from './rotate-signing-key-args'

import {
  createCloudKmsSigner,
  getAuthServerKmsKeyName,
  listSigningKeys,
  registerSigningKeyVersion,
  retireSigningKey
} from '@/lib/auth-server/keys'
import { runKeyRotationTick } from '@/lib/auth-server/maintenance/key-rotation'
import { createIssuerPublicationPort, createRotationKmsPort } from '@/lib/auth-server/maintenance/key-rotation-kms'

const actor = process.env.AUTH_SERVER_ROTATION_ACTOR?.trim() || `cli:${process.env.USER ?? 'unknown'}`

const printKeys = async () => {
  const keys = await listSigningKeys()

  if (keys.length === 0) {
    console.log('No signing keys registered.')

    return
  }

  for (const key of keys) {
    console.log(
      `${key.state.padEnd(8)} kid=${key.kid} version=${key.kmsKeyVersion.split('/').slice(-1)[0]} activated=${key.activatedAt.toISOString()}` +
        (key.retiringAt ? ` retiring=${key.retiringAt.toISOString()}` : '') +
        (key.retiredAt ? ` retired=${key.retiredAt.toISOString()}` : '')
    )
  }
}

const main = async () => {
  const action = parseRotationArgs(process.argv.slice(2))

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  if (action.kind === 'status') {
    await printKeys()

    return
  }

  if (action.kind === 'retire') {
    const retired = await retireSigningKey({ kid: action.kid, actor, force: action.force })

    console.log(`retired kid=${retired.kid} at ${retired.retiredAt?.toISOString()}`)
    console.log('After JWKS/cache verification, disable the retired KMS version to prevent further signing →')
    console.log('A disabled KMS version remains billable; disabling it does not stop version charges.')
    console.log(`  gcloud kms keys versions disable ${retired.kmsKeyVersion.split('/').slice(-1)[0]} --key auth-server-es256 --keyring auth-server --location us-east4 --project efeonce-group`)

    return
  }

  if (action.kind === 'create') {
    const keyName = getAuthServerKmsKeyName()

    const result = await runKeyRotationTick({
      enabled: true, dryRun: false, keyName, actor,
      executionId: `cli:${Date.now()}`,
      kms: createRotationKmsPort(), publication: createIssuerPublicationPort()
    })

    console.log(`rotation status=${result.status}${result.operationId ? ` operation=${result.operationId}` : ''}`)

    if (result.status !== 'verified' && result.status !== 'not_due') {
      throw new Error(`Rotation did not complete: ${result.status}`)
    }

    return
  }

  const keyName = getAuthServerKmsKeyName()
  const signer = createCloudKmsSigner()
  const versionName = action.versionName

  const result = await registerSigningKeyVersion({
    signer,
    versionName,
    actor,
    activate: action.activate,
    keyName
  })

  console.log(
    `${result.alreadyRegistered ? 'already registered' : 'registered'} kid=${result.key.kid} state=${result.key.state}` +
      (result.previousActiveKid ? ` previousActive=${result.previousActiveKid} (now retiring)` : '')
  )
  console.log('JWKS will publish both keys; retire the previous one after ≥ 1 h with --retire <kid>.')
  await printKeys()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('rotate-signing-key failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
