import { createHmac, timingSafeEqual } from 'node:crypto'

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
 * Resolve a secret from an environment variable name.
 * Never stores actual secrets in DB rows — only references.
 */
export const resolveSecret = (secretRef: string): string | null => {
  const value = process.env[secretRef]?.trim() || null

  return value || null
}
