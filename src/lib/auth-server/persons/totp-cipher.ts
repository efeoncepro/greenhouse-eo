/**
 * Cifrado en reposo del secreto TOTP (TASK-1830 Slice 3).
 *
 * El secreto TOTP es SIMÉTRICO: el servidor tiene que poder leerlo para verificar un código, así
 * que no puede hashearse como los demás bearers del emisor — hay que poder descifrarlo. Va cifrado
 * con Cloud KMS (`auth-server-totp-envelope`, HSM, `ENCRYPT_DECRYPT`, rotación 90 d), una llave
 * distinta de la de firma: `auth-server-es256` es EC y no puede cifrar.
 *
 * **AAD `<environment>|<subject>`**: un ciphertext copiado a la fila de otra persona NO descifra.
 * Es cobertura del invariante en la capa de datos, no en la aplicación. Verificado contra KMS real.
 *
 * Se cifra el secreto directamente en vez de envolver una DEK intermedia: son 20 bytes y ambas
 * formas cuestan exactamente una llamada a KMS por verificación. La indirección no compraría nada.
 *
 * Modo de falla honesto: si KMS no responde, el step-up FALLA CERRADO. No se puede consentir un
 * scope de escritura, las lecturas siguen. Nunca se degrada a "aceptar sin verificar".
 */

import { createHash } from 'node:crypto'

import type { KeyManagementServiceClient } from '@google-cloud/kms'

import type { AuthServerPersonAuthConfig } from './config'

export interface TotpSecretCipherPort {
  encrypt(input: { plaintext: Uint8Array; environmentId: string; subject: string }): Promise<{
    ciphertext: Uint8Array<ArrayBuffer>
    keyName: string
  }>
  decrypt(input: { ciphertext: Uint8Array; environmentId: string; subject: string }): Promise<Uint8Array>
}

/** El AAD ata el ciphertext a la persona: moverlo de fila lo vuelve indescifrable. */
export const buildTotpAad = (environmentId: string, subject: string): Uint8Array =>
  new TextEncoder().encode(`${environmentId}|${subject}`)

export class TotpCipherUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('TOTP envelope unavailable')
    this.name = 'TotpCipherUnavailableError'
    this.cause = cause
  }
}

export const isTotpCipherUnavailableError = (value: unknown): value is TotpCipherUnavailableError =>
  value instanceof TotpCipherUnavailableError ||
  (typeof value === 'object' && value !== null && (value as { name?: string }).name === 'TotpCipherUnavailableError')

/**
 * Nombre completo de la llave. Se lee del entorno para que staging y producción puedan apuntar a
 * llaves distintas sin tocar código; el SoT de la variable es `services/auth-server/deploy.sh`.
 */
export const getTotpEnvelopeKeyName = (env: NodeJS.ProcessEnv = process.env): string => {
  const configured = env.AUTH_SERVER_TOTP_KMS_KEY?.trim()

  if (!configured) {
    throw new Error('AUTH_SERVER_TOTP_KMS_KEY is required to encrypt TOTP secrets at rest')
  }

  return configured
}

/**
 * Adapter de Cloud KMS. Se instancia perezosamente: el servicio arranca aunque el flag de personas
 * esté apagado y nadie vaya a cifrar nada.
 */
export const createCloudKmsTotpCipher = (options: { keyName?: string } = {}): TotpSecretCipherPort => {
  let client: KeyManagementServiceClient | null = null

  const getClient = async () => {
    if (!client) {
      const { KeyManagementServiceClient } = await import('@google-cloud/kms')

      client = new KeyManagementServiceClient()
    }

    return client
  }

  const resolveKeyName = () => options.keyName ?? getTotpEnvelopeKeyName()

  return {
    encrypt: async ({ plaintext, environmentId, subject }) => {
      const keyName = resolveKeyName()

      try {
        const [response] = await (await getClient()).encrypt({
          name: keyName,
          plaintext: Buffer.from(plaintext),
          additionalAuthenticatedData: Buffer.from(buildTotpAad(environmentId, subject))
        })

        if (!response.ciphertext) throw new Error('KMS returned no ciphertext')

        return { ciphertext: new Uint8Array(Buffer.from(response.ciphertext as Uint8Array)), keyName }
      } catch (error) {
        throw new TotpCipherUnavailableError(error)
      }
    },
    decrypt: async ({ ciphertext, environmentId, subject }) => {
      try {
        const [response] = await (await getClient()).decrypt({
          name: resolveKeyName(),
          ciphertext: Buffer.from(ciphertext),
          additionalAuthenticatedData: Buffer.from(buildTotpAad(environmentId, subject))
        })

        if (!response.plaintext) throw new Error('KMS returned no plaintext')

        return new Uint8Array(Buffer.from(response.plaintext as Uint8Array))
      } catch (error) {
        // Incluye el caso "AAD equivocada": una fila movida es indescifrable, no un error distinto.
        throw new TotpCipherUnavailableError(error)
      }
    }
  }
}

/**
 * Cifrador local para tests. NO es criptografía y por eso nunca sale de los tests: existe para que
 * el flujo se ejercite sin KMS conservando la propiedad que importa — un ciphertext ligado a otra
 * persona FALLA al descifrar, igual que un AEAD real con la AAD equivocada.
 *
 * El prefijo con el hash de la AAD es justamente eso: sin él, un XOR simple devolvería basura en
 * silencio y el test de "moverlo de fila no sirve" pasaría por la razón equivocada.
 */
export const createInMemoryTotpCipher = (): TotpSecretCipherPort => {
  const mask = (environmentId: string, subject: string) =>
    new Uint8Array(createHash('sha256').update(`${environmentId}|${subject}`).digest())

  const xor = (data: Uint8Array, key: Uint8Array) => data.map((byte, index) => byte ^ key[index % key.length])

  const TAG_BYTES = 8

  return {
    encrypt: async ({ plaintext, environmentId, subject }) => {
      const key = mask(environmentId, subject)
      const body = xor(plaintext, key)
      const ciphertext = new Uint8Array(new ArrayBuffer(TAG_BYTES + body.length))

      ciphertext.set(key.subarray(0, TAG_BYTES), 0)
      ciphertext.set(body, TAG_BYTES)

      return { ciphertext, keyName: 'in-memory-test-cipher' }
    },
    decrypt: async ({ ciphertext, environmentId, subject }) => {
      const key = mask(environmentId, subject)
      const tag = ciphertext.subarray(0, TAG_BYTES)

      for (let index = 0; index < TAG_BYTES; index += 1) {
        if (tag[index] !== key[index]) throw new TotpCipherUnavailableError('aad mismatch')
      }

      return xor(ciphertext.subarray(TAG_BYTES), key)
    }
  }
}

export type TotpCipherConfig = Pick<AuthServerPersonAuthConfig, 'personAuthEnabled'>
