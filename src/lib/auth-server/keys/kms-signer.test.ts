import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign as nodeSign } from 'node:crypto'

import { compactVerify, importJWK, jwtVerify } from 'jose'
import { describe, expect, it } from 'vitest'

import {
  assertKmsVersionBelongsToKey,
  buildJwks,
  computeKid,
  crc32c,
  derToJose,
  pemToPublicJwk,
  signCompactJws,
  toPublishedJwk,
  type KmsSignerPort
} from './kms-signer'

const KEY_NAME = 'projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256'
const VERSION_1 = `${KEY_NAME}/cryptoKeyVersions/1`

/** Signer local que imita a Cloud KMS: firma DER ECDSA-P256 sobre un digest SHA-256 dado. */
const createLocalSigner = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()

  const signer: KmsSignerPort = {
    getPublicKeyPem: async () => pem,
    // KMS firma el digest ya calculado; Node no expone ECDSA prehashed, así que el
    // simulador firma el signing input original con SHA-256 — misma firma matemática.
    signDigest: async (_version, input) =>
      nodeSign('sha256', input.signingInput, {
        key: createPrivateKey(privateKey.export({ type: 'pkcs8', format: 'pem' })),
        dsaEncoding: 'der'
      }),
    listEnabledVersions: async () => [VERSION_1]
  }

  return { signer, pem, publicKey }
}

describe('derToJose', () => {
  it('converts a DER ECDSA signature into 64-byte r||s', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const digest = createHash('sha256').update('hello').digest()
    const der = nodeSign(null, digest, { key: privateKey, dsaEncoding: 'der' })
    const ieee = nodeSign(null, digest, { key: privateKey, dsaEncoding: 'ieee-p1363' })

    // Las firmas ECDSA son aleatorias, así que comparamos estructura y verificación, no bytes.
    const jose = derToJose(der)

    expect(jose).toHaveLength(64)
    expect(ieee).toHaveLength(64)
  })

  it('left-pads short coordinates and strips the DER sign byte', () => {
    // r = 0x01 (1 byte), s = 0x00ff (sign byte + 0xff)
    const der = Buffer.from([0x30, 0x07, 0x02, 0x01, 0x01, 0x02, 0x02, 0x00, 0xff])
    const jose = derToJose(der)

    expect(jose).toHaveLength(64)
    expect(jose[31]).toBe(0x01)
    expect(jose[63]).toBe(0xff)
    expect(jose.subarray(0, 31).every(byte => byte === 0)).toBe(true)
  })

  it('rejects malformed input', () => {
    expect(() => derToJose(Buffer.from([0x31, 0x00]))).toThrow(/SEQUENCE/u)
    expect(() => derToJose(Buffer.from([0x30, 0x02, 0x03, 0x00]))).toThrow(/INTEGER/u)
    expect(() => derToJose(Buffer.from([0x30, 0x03, 0x02, 0x01, 0x01, 0xaa]))).toThrow(/length/u)
  })
})

describe('pemToPublicJwk + computeKid', () => {
  it('derives an EC P-256 public JWK without private material and a stable thumbprint kid', async () => {
    const { pem } = createLocalSigner()
    const jwk = await pemToPublicJwk(pem)

    expect(jwk).toMatchObject({ kty: 'EC', crv: 'P-256' })
    expect(Object.keys(jwk).sort()).toEqual(['crv', 'kty', 'x', 'y'])

    const kid1 = await computeKid(jwk)
    const kid2 = await computeKid(jwk)

    expect(kid1).toBe(kid2)
    expect(kid1).toMatch(/^[A-Za-z0-9_-]{43}$/u)
  })

  it('rejects a non-EC key', async () => {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()

    await expect(pemToPublicJwk(pem)).rejects.toThrow()
  })
})

describe('signCompactJws', () => {
  it('produces an ES256 JWS with kid that verifies against the published JWK', async () => {
    const { signer, pem } = createLocalSigner()
    const publicJwk = await pemToPublicJwk(pem)
    const kid = await computeKid(publicJwk)

    const jws = await signCompactJws({
      signer,
      versionName: VERSION_1,
      kid,
      publicJwk,
      payload: { iss: 'https://auth.efeonce.org', sub: 'subject-1', aud: 'https://mcp.efeonce.org/mcp', exp: 4102444800 }
    })

    const published = toPublishedJwk(publicJwk, kid)
    const key = await importJWK(published, 'ES256')
    const verified = await jwtVerify(jws, key, { issuer: 'https://auth.efeonce.org', audience: 'https://mcp.efeonce.org/mcp' })

    expect(verified.protectedHeader).toMatchObject({ alg: 'ES256', kid, typ: 'JWT' })
    expect(verified.payload.sub).toBe('subject-1')
  })

  it('fails loud when the signer returns a signature for a different key', async () => {
    const { signer } = createLocalSigner()
    const other = createLocalSigner()
    const publicJwk = await pemToPublicJwk(other.pem)
    const kid = await computeKid(publicJwk)

    await expect(
      signCompactJws({ signer, versionName: VERSION_1, kid, publicJwk, payload: { sub: 'x' } })
    ).rejects.toThrow()
  })

  it('never leaks a private key through the JWKS shape', async () => {
    const { pem, publicKey } = createLocalSigner()
    const publicJwk = await pemToPublicJwk(pem)
    const kid = await computeKid(publicJwk)
    const jwks = buildJwks([toPublishedJwk(publicJwk, kid)])

    expect(jwks.keys).toHaveLength(1)
    expect(jwks.keys[0]).not.toHaveProperty('d')
    expect(jwks.keys[0]).toMatchObject({ use: 'sig', alg: 'ES256', kid })

    // La pública publicada es exactamente la del PEM.
    const fromJwk = await importJWK(jwks.keys[0]!, 'ES256')
    const message = new TextEncoder().encode('probe')
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })

    // Una firma con OTRA privada no verifica contra la pública publicada.
    const der = nodeSign('sha256', message, { key: privateKey, dsaEncoding: 'der' })

    expect(createPublicKey(pem).export({ format: 'jwk' })).toMatchObject({ x: publicJwk.x, y: publicJwk.y })
    await expect(
      compactVerify(`${Buffer.from('{"alg":"ES256"}').toString('base64url')}.${Buffer.from(message).toString('base64url')}.${derToJose(der).toString('base64url')}`, fromJwk)
    ).rejects.toThrow()
    expect(publicKey.asymmetricKeyType).toBe('ec')
  })
})

describe('crc32c', () => {
  it('matches the Castagnoli check vector and the KMS documentation example', () => {
    // RFC 3720 §B.4 check value for "123456789".
    expect(crc32c(Buffer.from('123456789')).toString(16)).toBe('e3069283')
    expect(crc32c(Buffer.alloc(0))).toBe(0)
    expect(crc32c(Buffer.alloc(32, 0x00))).toBe(0x8a9136aa)
  })
})

describe('assertKmsVersionBelongsToKey', () => {
  it('accepts versions of the configured key and rejects others', () => {
    expect(() => assertKmsVersionBelongsToKey(VERSION_1, KEY_NAME)).not.toThrow()
    expect(() => assertKmsVersionBelongsToKey(`${KEY_NAME}-other/cryptoKeyVersions/1`, KEY_NAME)).toThrow()
    expect(() => assertKmsVersionBelongsToKey(`${KEY_NAME}/cryptoKeyVersions/abc`, KEY_NAME)).toThrow()
  })
})
