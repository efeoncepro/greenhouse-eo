/**
 * Autenticador WebAuthn de software para tests (TASK-1830 Slice 2).
 *
 * Existe para que las ceremonias se ejerciten DE VERDAD: firma con una clave P-256 real y arma el
 * `attestationObject` y el `authenticatorData` con la misma forma que manda un navegador. Sin esto,
 * un test de passkeys sólo comprobaría que llamamos a la librería — y el invariante que más importa
 * (un contador que retrocede invalida la credencial) exige una aserción firmada de verdad.
 *
 * Sólo para tests: nunca se importa desde runtime.
 */

import { createHash, createSign, generateKeyPairSync, type KeyObject } from 'node:crypto'

import { isoCBOR } from '@simplewebauthn/server/helpers'

const base64url = (value: Uint8Array): string => Buffer.from(value).toString('base64url')

/** Flags del `authenticatorData` (WebAuthn §6.1): UP=0x01, UV=0x04, BE=0x08, BS=0x10, AT=0x40. */
const FLAG_UP = 0x01
const FLAG_UV = 0x04
const FLAG_BE = 0x08
const FLAG_BS = 0x10
const FLAG_AT = 0x40

const AAGUID = new Uint8Array(16).fill(0)

const uint32 = (value: number): Uint8Array => {
  const buffer = new Uint8Array(4)

  new DataView(buffer.buffer).setUint32(0, value, false)

  return buffer
}

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0

  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }

  return out
}

/** Clave pública COSE ES256 (kty 2, alg -7, crv 1, x/y de 32 bytes). */
const buildCosePublicKey = (publicKey: KeyObject): Uint8Array => {
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string }

  return new Uint8Array(
    isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, new Uint8Array(Buffer.from(jwk.x, 'base64url'))],
        [-3, new Uint8Array(Buffer.from(jwk.y, 'base64url'))]
      ])
    )
  )
}

export type SoftwareAuthenticatorOptions = {
  rpId: string
  origin: string
  /** El autenticador verificó a la persona (biometría / PIN). Decide el flag `uv` REAL. */
  userVerified?: boolean
}

export class SoftwareAuthenticator {
  readonly credentialId: Uint8Array
  private readonly privateKey: KeyObject
  private readonly publicKey: KeyObject
  private counter = 0

  constructor(private readonly options: SoftwareAuthenticatorOptions) {
    const keyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })

    this.privateKey = keyPair.privateKey
    this.publicKey = keyPair.publicKey
    this.credentialId = new Uint8Array(createHash('sha256').update(keyPair.publicKey.export({ format: 'jwk' }).x ?? '').digest().subarray(0, 16))
  }

  get credentialIdB64(): string {
    return base64url(this.credentialId)
  }

  /** Fuerza el contador a un valor dado; así se puede simular un clon que retrocede. */
  setCounter(value: number): void {
    this.counter = value
  }

  private clientDataJSON(type: 'webauthn.create' | 'webauthn.get', challenge: string): Uint8Array {
    return new Uint8Array(
      Buffer.from(JSON.stringify({ type, challenge, origin: this.options.origin, crossOrigin: false }))
    )
  }

  private flags(includeAttestedData: boolean): number {
    let flags = FLAG_UP | FLAG_BE | FLAG_BS

    if (this.options.userVerified) flags |= FLAG_UV
    if (includeAttestedData) flags |= FLAG_AT

    return flags
  }

  private authenticatorData(includeAttestedData: boolean): Uint8Array {
    const rpIdHash = new Uint8Array(createHash('sha256').update(this.options.rpId).digest())
    const head = concat(rpIdHash, new Uint8Array([this.flags(includeAttestedData)]), uint32(this.counter))

    if (!includeAttestedData) return head

    const credentialIdLength = new Uint8Array(2)

    new DataView(credentialIdLength.buffer).setUint16(0, this.credentialId.length, false)

    return concat(head, AAGUID, credentialIdLength, this.credentialId, buildCosePublicKey(this.publicKey))
  }

  /** Respuesta de registro con `attestationType: 'none'` (la que pide el emisor). */
  register(challenge: string) {
    const authData = this.authenticatorData(true)

    // El `CBORType` de la librería no describe un mapa heterogéneo; el cast es del ARMADO del
    // objeto de atestación, no de su verificación — esa la hace la librería sobre bytes reales.
    const attestationObject = new Uint8Array(
      isoCBOR.encode(
        new Map<string, unknown>([
          ['fmt', 'none'],
          ['attStmt', new Map()],
          ['authData', authData]
        ]) as Parameters<typeof isoCBOR.encode>[0]
      )
    )

    return {
      id: this.credentialIdB64,
      rawId: this.credentialIdB64,
      type: 'public-key' as const,
      clientExtensionResults: {},
      response: {
        clientDataJSON: base64url(this.clientDataJSON('webauthn.create', challenge)),
        attestationObject: base64url(attestationObject),
        transports: ['internal' as const]
      }
    }
  }

  /** Aserción firmada. `incrementCounter: false` simula un autenticador que no lo mueve. */
  authenticate(challenge: string, { incrementCounter = true }: { incrementCounter?: boolean } = {}) {
    if (incrementCounter) this.counter += 1

    const authData = this.authenticatorData(false)
    const clientDataJSON = this.clientDataJSON('webauthn.get', challenge)
    const clientDataHash = new Uint8Array(createHash('sha256').update(clientDataJSON).digest())
    const signature = createSign('SHA256').update(Buffer.from(concat(authData, clientDataHash))).sign(this.privateKey)

    return {
      id: this.credentialIdB64,
      rawId: this.credentialIdB64,
      type: 'public-key' as const,
      clientExtensionResults: {},
      response: {
        clientDataJSON: base64url(clientDataJSON),
        authenticatorData: base64url(authData),
        signature: base64url(new Uint8Array(signature)),
        userHandle: null
      }
    }
  }
}
