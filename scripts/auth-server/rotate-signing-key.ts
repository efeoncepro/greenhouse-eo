/**
 * TASK-1828 — Rotación de la llave de firma del auth server (operador, ADC propia).
 *
 * Uso (el runtime del servicio NO puede crear versiones KMS; esto corre con la
 * identidad del operador o de un job con permisos de administración de la llave):
 *
 *   pnpm auth-server:rotate-key                  # crea versión KMS, registra y ACTIVA; la anterior → retiring
 *   pnpm auth-server:rotate-key --status         # lista llaves registradas y sus estados
 *   pnpm auth-server:rotate-key --register <versionName> [--no-activate]
 *   pnpm auth-server:rotate-key --retire <kid> [--force]
 *
 * Requiere `AUTH_SERVER_KMS_KEY` y conexión a PG (proxy local `pnpm pg:connect`).
 * Nunca imprime material privado: sólo `kid`, versión KMS y estado.
 */

import { KeyManagementServiceClient } from '@google-cloud/kms'

import {
  createCloudKmsSigner,
  getAuthServerKmsKeyName,
  listSigningKeys,
  registerSigningKeyVersion,
  retireSigningKey
} from '@/lib/auth-server/keys'

const args = process.argv.slice(2)
const hasFlag = (flag: string) => args.includes(flag)

const valueOf = (flag: string): string | undefined => {
  const index = args.indexOf(flag)

  return index >= 0 ? args[index + 1] : undefined
}

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
  const keyName = getAuthServerKmsKeyName()
  const signer = createCloudKmsSigner()

  if (hasFlag('--status')) {
    await printKeys()

    return
  }

  const retireKid = valueOf('--retire')

  if (retireKid) {
    const retired = await retireSigningKey({ kid: retireKid, actor, force: hasFlag('--force') })

    console.log(`retired kid=${retired.kid} at ${retired.retiredAt?.toISOString()}`)
    console.log('Next: disable the KMS version to stop billing it →')
    console.log(`  gcloud kms keys versions disable ${retired.kmsKeyVersion.split('/').slice(-1)[0]} --key auth-server-es256 --keyring auth-server --location us-east4 --project efeonce-group`)

    return
  }

  let versionName = valueOf('--register')

  if (!versionName) {
    const client = new KeyManagementServiceClient()
    const [version] = await client.createCryptoKeyVersion({ parent: keyName })

    if (!version.name) {
      throw new Error('KMS did not return the new version name')
    }

    versionName = version.name
    console.log(`created KMS version ${versionName.split('/').slice(-1)[0]} (state=${String(version.state)})`)

    // Una versión HSM puede tardar unos segundos en pasar de PENDING_GENERATION a ENABLED.
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const [current] = await client.getCryptoKeyVersion({ name: versionName })

      if (current.state === 'ENABLED') break
      await new Promise(resolve => setTimeout(resolve, 2_000))
    }
  }

  const result = await registerSigningKeyVersion({
    signer,
    versionName,
    actor,
    activate: !hasFlag('--no-activate'),
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
