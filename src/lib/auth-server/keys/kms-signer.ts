import 'server-only'

import { createHash } from 'node:crypto'

import { KeyManagementServiceClient } from '@google-cloud/kms'
import { calculateJwkThumbprint, compactVerify, exportJWK, importJWK, importSPKI } from 'jose'

/**
 * TASK-1828 — Firma ES256 con llave asimétrica en Cloud KMS (protección HSM).
 *
 * Invariantes (ADR EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1 §Hard rules):
 *   - La llave privada NUNCA sale de KMS: aquí sólo se pide `asymmetricSign` sobre el
 *     digest SHA-256 del signing input y se convierte la firma DER a formato JOSE (r||s).
 *   - La pública se obtiene de KMS (`getPublicKey`) y se expresa como JWK EC P-256 sin `d`.
 *   - `kid` = JWK thumbprint RFC 7638 de la pública (estable, derivable, sin secretos).
 *   - Toda firma emitida se verifica localmente con la pública antes de devolverse: un
 *     bug de conversión DER→JOSE o una versión KMS equivocada falla aquí, no en el gateway.
 *
 * El acceso a KMS se inyecta como `KmsSignerPort` para que los tests ejerciten la lógica
 * con una llave EC local sin tocar la red; el adapter real usa el SDK oficial con ADC del
 * service account `auth-server@efeonce-group` (sólo `roles/cloudkms.signerVerifier`).
 */

export const AUTH_SERVER_JWS_ALGORITHM = 'ES256' as const

export type EcPublicJwk = Readonly<{
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
}>

export type PublishedJwk = EcPublicJwk & Readonly<{ kid: string; alg: typeof AUTH_SERVER_JWS_ALGORITHM; use: 'sig' }>

export type KmsSignerPort = Readonly<{
  /** PEM (SPKI) de la pública de una versión concreta de la llave KMS. */
  getPublicKeyPem: (versionName: string) => Promise<string>
  /**
   * Firma ECDSA-P256-SHA256 en DER. Cloud KMS firma el digest SHA-256 ya calculado
   * (`input.sha256`); `input.signingInput` son los bytes originales, para adapters de
   * prueba que sólo saben firmar mensajes (Node no expone ECDSA prehashed).
   */
  signDigest: (versionName: string, input: Readonly<{ sha256: Buffer; signingInput: Buffer }>) => Promise<Buffer>
  /** Versiones ENABLED de la llave, nombres completos de recurso. */
  listEnabledVersions: (keyName: string) => Promise<readonly string[]>
}>

const KMS_KEY_ENV = 'AUTH_SERVER_KMS_KEY'

export const getAuthServerKmsKeyName = (): string => {
  const value = process.env[KMS_KEY_ENV]?.trim()

  if (!value) {
    throw new Error(`${KMS_KEY_ENV} is not configured`)
  }

  if (!/^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+$/.test(value)) {
    throw new Error(`${KMS_KEY_ENV} must be a full cryptoKey resource name`)
  }

  return value
}

/** `.../cryptoKeys/<key>/cryptoKeyVersions/<n>` → valida forma y pertenencia a la llave configurada. */
export const assertKmsVersionBelongsToKey = (versionName: string, keyName: string): void => {
  if (!versionName.startsWith(`${keyName}/cryptoKeyVersions/`) || !/\/cryptoKeyVersions\/\d+$/.test(versionName)) {
    throw new Error('KMS version does not belong to the configured auth-server key')
  }
}

// ─── CRC32C (Castagnoli) — integridad de digest/firma en el canal con KMS ─────────
// Cloud KMS sólo verifica el digest si el cliente envía `digestCrc32c`, y devuelve
// `signatureCrc32c` para que el cliente compruebe la firma recibida. Node trae CRC32
// (zlib) pero no CRC32C, así que se implementa la tabla estándar (polinomio 0x82F63B78).

const CRC32C_TABLE = (() => {
  const table = new Uint32Array(256)

  for (let n = 0; n < 256; n += 1) {
    let c = n

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0x82f63b78 ^ (c >>> 1) : c >>> 1
    }

    table[n] = c >>> 0
  }

  return table
})()

export const crc32c = (data: Buffer): number => {
  let crc = 0xffffffff

  for (const byte of data) {
    crc = CRC32C_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

let cachedClient: KeyManagementServiceClient | null = null

const getKmsClient = (): KeyManagementServiceClient => {
  if (!cachedClient) {
    cachedClient = new KeyManagementServiceClient()
  }

  return cachedClient
}

/** Adapter real sobre el SDK de Cloud KMS. */
export const createCloudKmsSigner = (): KmsSignerPort => ({
  getPublicKeyPem: async versionName => {
    const [publicKey] = await getKmsClient().getPublicKey({ name: versionName })

    if (!publicKey.pem) {
      throw new Error('KMS returned an empty public key')
    }

    if (publicKey.algorithm && publicKey.algorithm !== 'EC_SIGN_P256_SHA256') {
      throw new Error(`Unexpected KMS key algorithm: ${String(publicKey.algorithm)}`)
    }

    return publicKey.pem
  },
  signDigest: async (versionName, input) => {
    const digestCrc32c = crc32c(input.sha256)

    const [response] = await getKmsClient().asymmetricSign({
      name: versionName,
      digest: { sha256: input.sha256 },
      digestCrc32c: { value: digestCrc32c }
    })

    const signature = response.signature

    if (!signature || signature.length === 0) {
      throw new Error('KMS returned an empty signature')
    }

    // Integridad del canal (guía oficial de KMS): la versión que firmó es la pedida, KMS
    // verificó nuestro CRC del digest y el CRC de la firma coincide con lo recibido.
    if (response.name && response.name !== versionName) {
      throw new Error('KMS signed with an unexpected key version')
    }

    if (response.verifiedDigestCrc32c !== true) {
      throw new Error('KMS did not verify the digest integrity checksum')
    }

    const signatureBuffer = Buffer.from(signature)
    const expectedSignatureCrc = response.signatureCrc32c?.value

    if (expectedSignatureCrc === undefined || expectedSignatureCrc === null) {
      throw new Error('KMS response is missing the signature checksum')
    }

    if (crc32c(signatureBuffer) !== Number(expectedSignatureCrc)) {
      throw new Error('KMS signature failed the integrity checksum')
    }

    return signatureBuffer
  },
  listEnabledVersions: async keyName => {
    const [versions] = await getKmsClient().listCryptoKeyVersions({ parent: keyName, filter: 'state=ENABLED' })

    return versions.map(version => version.name).filter((name): name is string => typeof name === 'string')
  }
})

// ─── Pure helpers (tested without network) ──────────────────────────────────

const base64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64').replace(/=+$/u, '').replace(/\+/gu, '-').replace(/\//gu, '_')

const EC_P256_COORDINATE_BYTES = 32

const readDerInteger = (der: Buffer, offset: number): { value: Buffer; next: number } => {
  if (der[offset] !== 0x02) {
    throw new Error('Invalid DER signature: expected INTEGER')
  }

  const length = der[offset + 1]

  if (length === undefined || length > 0x7f) {
    throw new Error('Invalid DER signature: unsupported INTEGER length')
  }

  const start = offset + 2
  const end = start + length

  if (end > der.length) {
    throw new Error('Invalid DER signature: truncated INTEGER')
  }

  return { value: der.subarray(start, end), next: end }
}

const leftPadCoordinate = (value: Buffer): Buffer => {
  // DER INTEGER es big-endian con signo: puede traer un 0x00 de relleno o ser más corto.
  let trimmed = value

  while (trimmed.length > EC_P256_COORDINATE_BYTES && trimmed[0] === 0x00) {
    trimmed = trimmed.subarray(1)
  }

  if (trimmed.length > EC_P256_COORDINATE_BYTES) {
    throw new Error('Invalid DER signature: coordinate exceeds 32 bytes')
  }

  const padded = Buffer.alloc(EC_P256_COORDINATE_BYTES)

  trimmed.copy(padded, EC_P256_COORDINATE_BYTES - trimmed.length)

  return padded
}

/** Convierte una firma ECDSA DER (SEQUENCE { r INTEGER, s INTEGER }) al formato JOSE r||s de 64 bytes. */
export const derToJose = (der: Buffer): Buffer => {
  if (der[0] !== 0x30) {
    throw new Error('Invalid DER signature: expected SEQUENCE')
  }

  const sequenceLength = der[1]

  if (sequenceLength === undefined || sequenceLength > 0x7f || sequenceLength + 2 !== der.length) {
    throw new Error('Invalid DER signature: bad SEQUENCE length')
  }

  const r = readDerInteger(der, 2)
  const s = readDerInteger(der, r.next)

  if (s.next !== der.length) {
    throw new Error('Invalid DER signature: trailing bytes')
  }

  return Buffer.concat([leftPadCoordinate(r.value), leftPadCoordinate(s.value)])
}

/** PEM SPKI → JWK pública EC P-256 (sin `d`). */
export const pemToPublicJwk = async (pem: string): Promise<EcPublicJwk> => {
  const key = await importSPKI(pem, AUTH_SERVER_JWS_ALGORITHM, { extractable: true })
  const jwk = await exportJWK(key)

  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.x || !jwk.y) {
    throw new Error('KMS public key is not an EC P-256 key')
  }

  if ('d' in jwk) {
    throw new Error('Refusing to handle a private JWK')
  }

  return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }
}

/** `kid` estable = thumbprint RFC 7638 (SHA-256) de la pública. */
export const computeKid = (jwk: EcPublicJwk): Promise<string> =>
  calculateJwkThumbprint({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, 'sha256')

export const toPublishedJwk = (jwk: EcPublicJwk, kid: string): PublishedJwk => ({
  kty: jwk.kty,
  crv: jwk.crv,
  x: jwk.x,
  y: jwk.y,
  kid,
  alg: AUTH_SERVER_JWS_ALGORITHM,
  use: 'sig'
})

export const buildJwks = (keys: readonly PublishedJwk[]): { keys: PublishedJwk[] } => ({ keys: [...keys] })

export type SignCompactJwsInput = Readonly<{
  signer: KmsSignerPort
  versionName: string
  kid: string
  publicJwk: EcPublicJwk
  payload: Record<string, unknown>
  typ?: string
}>

/**
 * Firma un JWS compacto ES256 con la versión KMS indicada y lo verifica con la pública
 * antes de devolverlo. El header lleva `kid` para que el gateway seleccione la llave del JWKS.
 */
export const signCompactJws = async ({
  signer,
  versionName,
  kid,
  publicJwk,
  payload,
  typ = 'JWT'
}: SignCompactJwsInput): Promise<string> => {
  const header = { alg: AUTH_SERVER_JWS_ALGORITHM, kid, typ }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signingInputBytes = Buffer.from(signingInput, 'utf8')
  const digest = createHash('sha256').update(signingInputBytes).digest()
  const derSignature = await signer.signDigest(versionName, { sha256: digest, signingInput: signingInputBytes })
  const joseSignature = derToJose(derSignature)
  const jws = `${signingInput}.${base64url(joseSignature)}`

  // Verificación local obligatoria: la firma debe corresponder a la pública registrada.
  const publicKey = await importJWK({ ...publicJwk, alg: AUTH_SERVER_JWS_ALGORITHM }, AUTH_SERVER_JWS_ALGORITHM)

  await compactVerify(jws, publicKey, { algorithms: [AUTH_SERVER_JWS_ALGORITHM] })

  return jws
}
