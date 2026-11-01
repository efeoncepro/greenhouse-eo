import 'server-only'

import { KeyManagementServiceClient, protos } from '@google-cloud/kms'

import { assertKmsVersionBelongsToKey, createCloudKmsSigner } from '@/lib/auth-server/keys/kms-signer'

import type { RotationKmsPort, RotationPublicationPort } from './key-rotation'

const ISSUER = 'https://auth.efeonce.org'
const KMS_STATES = protos.google.cloud.kms.v1.CryptoKeyVersion.CryptoKeyVersionState

/** The generated KMS client can return the protobuf enum as a number. */
export const classifyKmsVersionState = (state: number | string | null | undefined):
  'ENABLED' | 'PENDING' | 'DISABLED' | 'OTHER' => {
  if (state === KMS_STATES.ENABLED || state === 'ENABLED') return 'ENABLED'
  if (state === KMS_STATES.PENDING_GENERATION || state === 'PENDING_GENERATION' ||
      state === KMS_STATES.PENDING_IMPORT || state === 'PENDING_IMPORT') return 'PENDING'
  if (state === KMS_STATES.DISABLED || state === 'DISABLED') return 'DISABLED'

  return 'OTHER'
}

export const createRotationKmsPort = (client = new KeyManagementServiceClient()): RotationKmsPort => ({
  signer: createCloudKmsSigner(),
  createVersion: async keyName => {
    // KMS assigns the version ID. No automatic retry is safe after a lost response.
    const [version] = await client.createCryptoKeyVersion({ parent: keyName }, { retry: null, timeout: 60_000 })

    if (!version.name) throw new Error('KMS create returned no version name; reconcile before retry')
    assertKmsVersionBelongsToKey(version.name, keyName)

    return version.name
  },
  getVersionState: async versionName => {
    const [version] = await client.getCryptoKeyVersion({ name: versionName })

    return classifyKmsVersionState(version.state)
  }
})

export const createIssuerPublicationPort = (fetcher: typeof fetch = fetch): RotationPublicationPort => ({
  verify: async (candidateKid, predecessorKid) => {
    const options = { redirect: 'error' as const, signal: AbortSignal.timeout(10_000) }

    const [ready, jwksResponse] = await Promise.all([
      fetcher(`${ISSUER}/readyz`, options),
      fetcher(`${ISSUER}/.well-known/jwks.json`, options)
    ])

    if (ready.status !== 200 || jwksResponse.status !== 200) {
      throw new Error('Issuer readyz or JWKS unavailable after key activation')
    }

    const body: unknown = await jwksResponse.json()

    if (!body || typeof body !== 'object' || !('keys' in body) || !Array.isArray(body.keys)) {
      throw new Error('Issuer JWKS has an invalid shape')
    }

    const kids = body.keys.map((key: unknown) =>
      key && typeof key === 'object' && 'kid' in key && typeof key.kid === 'string' ? key.kid : null
    )

    if (kids.filter(kid => kid === candidateKid).length !== 1 ||
        kids.filter(kid => kid === predecessorKid).length !== 1) {
      throw new Error('Issuer JWKS did not publish exactly the candidate and predecessor kids')
    }
  }
})
