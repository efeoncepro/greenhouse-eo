import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { resolveSecret } from '@/lib/webhooks/signing'

export const GITHUB_RELEASE_WEBHOOK_SECRET_ENV = 'GITHUB_RELEASE_WEBHOOK_SECRET'

export type GithubWebhookSignatureVerification =
  | { ok: true; expectedSignature: string }
  | { ok: false; reason: 'missing_signature' | 'invalid_format' | 'signature_mismatch' }

const GITHUB_SIGNATURE_PREFIX = 'sha256='

export const signGithubWebhookPayload = (secret: string, rawBody: string): string => {
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  return `${GITHUB_SIGNATURE_PREFIX}${digest}`
}

export const verifyGithubWebhookSignature = (params: {
  secret: string
  rawBody: string
  signatureHeader: string | null
}): GithubWebhookSignatureVerification => {
  const signatureHeader = params.signatureHeader?.trim()

  if (!signatureHeader) {
    return { ok: false, reason: 'missing_signature' }
  }

  if (!signatureHeader.startsWith(GITHUB_SIGNATURE_PREFIX)) {
    return { ok: false, reason: 'invalid_format' }
  }

  const expectedSignature = signGithubWebhookPayload(params.secret, params.rawBody)
  const received = Buffer.from(signatureHeader)
  const expected = Buffer.from(expectedSignature)

  if (received.length !== expected.length) {
    return { ok: false, reason: 'signature_mismatch' }
  }

  try {
    return timingSafeEqual(received, expected)
      ? { ok: true, expectedSignature }
      : { ok: false, reason: 'signature_mismatch' }
  } catch {
    return { ok: false, reason: 'signature_mismatch' }
  }
}

export const resolveGithubReleaseWebhookSecret = async (): Promise<string | null> => {
  return resolveSecret(GITHUB_RELEASE_WEBHOOK_SECRET_ENV)
}
