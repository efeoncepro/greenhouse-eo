import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export const extractNotionVerificationToken = (parsedPayload: unknown): string | null => {
  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return null
  }

  const token = (parsedPayload as { verification_token?: unknown }).verification_token

  return typeof token === 'string' && token.length > 0 ? token : null
}

export const validateNotionSignature = (
  rawBody: string,
  signature: string,
  secret: string
): boolean => {
  if (!signature || !secret) {
    return false
  }

  const prefix = 'sha256='
  const providedHex = signature.startsWith(prefix) ? signature.slice(prefix.length) : signature
  const computedHex = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const expected = Buffer.from(computedHex, 'utf8')
  const received = Buffer.from(providedHex, 'utf8')

  if (expected.length !== received.length) {
    return false
  }

  try {
    return timingSafeEqual(expected, received)
  } catch {
    return false
  }
}
