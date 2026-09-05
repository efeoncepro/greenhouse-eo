/** Separate KMS key and domain-separated AAD for the short-lived OIDC transaction. */
import { createCloudKmsTotpCipher } from '../persons/totp-cipher'
import type { LoginEnvelopePort } from './postgres-store'

export const createInternalLoginEnvelope = (environmentId: string): LoginEnvelopePort => {
  const cipher = () => {
    const keyName = process.env.AUTH_SERVER_INTERNAL_LOGIN_KMS_KEY?.trim()

    if (!keyName) throw new Error('internal_login_envelope_unavailable')

    return createCloudKmsTotpCipher({ keyName })
  }

  const aadEnvironment = `internal-login-v1:${environmentId}`

  return {
    encrypt: async (plaintext, transactionId) => {
      const result = await cipher().encrypt({
        plaintext: Buffer.from(plaintext, 'utf8'),
        environmentId: aadEnvironment,
        subject: transactionId
      })

      return Buffer.from(result.ciphertext).toString('base64')
    },
    decrypt: async (ciphertext, transactionId) => {
      const result = await cipher().decrypt({
        ciphertext: Buffer.from(ciphertext, 'base64'),
        environmentId: aadEnvironment,
        subject: transactionId
      })

      return Buffer.from(result).toString('utf8')
    }
  }
}
