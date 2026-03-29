import { createHmac, timingSafeEqual } from 'node:crypto'

import { resolveSecret as resolveManagedSecret } from '@/lib/secrets/secret-manager'

/**
 * Sign a payload with HMAC-SHA256.
 * Signature covers: timestamp + "." + body
 */
export const signPayload = (secret: string, timestamp: string, body: string): string => {
  const data = `${timestamp}.${body}`

  return createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Verify an HMAC-SHA256 signature using constant-time comparison.
 */
export const verifySignature = (secret: string, timestamp: string, body: string, signature: string): boolean => {
  const expected = signPayload(secret, timestamp, body)

  if (expected.length !== signature.length) return false

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

/**
 * Resolve a webhook secret from the canonical env var / Secret Manager contract.
 * Never stores actual secrets in DB rows — only references.
 */
export const resolveSecret = async (secretRef: string): Promise<string | null> => {
  const resolution = await resolveManagedSecret({
    envVarName: secretRef
  })

  return resolution.value
}
