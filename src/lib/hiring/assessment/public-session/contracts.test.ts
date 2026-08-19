import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  digestPublicAssessmentAccessToken,
  digestPublicAssessmentSessionToken,
  isValidPublicAssessmentAccessToken,
  isValidPublicAssessmentSessionToken,
  issuePublicAssessmentSessionCredential,
} from './contracts'

describe('public assessment session contracts', () => {
  it('accepts only bounded base64url-shaped credentials', () => {
    expect(isValidPublicAssessmentAccessToken('a'.repeat(32))).toBe(true)
    expect(isValidPublicAssessmentAccessToken('short')).toBe(false)
    expect(isValidPublicAssessmentAccessToken(`${'a'.repeat(31)}!`)).toBe(false)
    expect(isValidPublicAssessmentSessionToken('a'.repeat(43))).toBe(true)
    expect(isValidPublicAssessmentSessionToken('a'.repeat(42))).toBe(false)
  })

  it('domain-separates session digests from access-token digests', () => {
    const token = 'a'.repeat(43)

    expect(digestPublicAssessmentAccessToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(digestPublicAssessmentSessionToken(token)).toMatch(/^[a-f0-9]{64}$/)
    expect(digestPublicAssessmentSessionToken(token)).not.toBe(digestPublicAssessmentAccessToken(token))
  })

  it('issues a 256-bit opaque credential and exposes only its digest companion', () => {
    const credential = issuePublicAssessmentSessionCredential()

    expect(credential.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(credential.digest).toBe(digestPublicAssessmentSessionToken(credential.token))
    expect(credential.digest).not.toContain(credential.token)
  })
})
