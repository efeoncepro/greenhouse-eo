import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

export const PUBLIC_ASSESSMENT_SESSION_TOKEN_BYTES = 32
export const PUBLIC_ASSESSMENT_ACCESS_TOKEN_MIN_LENGTH = 32
export const PUBLIC_ASSESSMENT_TOKEN_MAX_LENGTH = 128

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/

export type PublicAssessmentSessionStatus = 'active' | 'revoked' | 'expired'

export interface PublicAssessmentSessionContext {
  publicSessionId: string
  assessmentId: string
  accessTokenVersionId: string
  status: PublicAssessmentSessionStatus
  expiresAt: string
}

export interface PublicAssessmentSessionExchangeResult {
  /** Response-only credential. It must never enter persistence, telemetry or errors. */
  sessionToken: string
  session: PublicAssessmentSessionContext
}

export const isValidPublicAssessmentAccessToken = (token: string): boolean =>
  token.length >= PUBLIC_ASSESSMENT_ACCESS_TOKEN_MIN_LENGTH
  && token.length <= PUBLIC_ASSESSMENT_TOKEN_MAX_LENGTH
  && OPAQUE_TOKEN_PATTERN.test(token)

export const isValidPublicAssessmentSessionToken = (token: string): boolean =>
  token.length >= 43
  && token.length <= PUBLIC_ASSESSMENT_TOKEN_MAX_LENGTH
  && OPAQUE_TOKEN_PATTERN.test(token)

/** Matches the existing assessment credential hash; raw access tokens never cross the store API. */
export const digestPublicAssessmentAccessToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

/** Domain-separated so a session digest cannot be confused with an assessment credential digest. */
export const digestPublicAssessmentSessionToken = (token: string): string =>
  createHash('sha256').update(`assessment-public-session:v1:${token}`).digest('hex')

export const issuePublicAssessmentSessionCredential = (): { token: string; digest: string } => {
  const token = randomBytes(PUBLIC_ASSESSMENT_SESSION_TOKEN_BYTES).toString('base64url')

  return { token, digest: digestPublicAssessmentSessionToken(token) }
}
