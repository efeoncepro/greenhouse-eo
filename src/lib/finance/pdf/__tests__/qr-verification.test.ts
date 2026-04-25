import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildShortVerificationLabel,
  buildVerificationUrl,
  computePdfContentHash,
  computeVerificationToken,
  generateVerificationQrDataUrl
} from '../qr-verification'

const originalSecret = process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalNextAuthUrl = process.env.NEXTAUTH_URL

describe('qr-verification', () => {
  beforeEach(() => {
    process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET = 'test-secret-1234567890abcdef-32chars-long'
    process.env.NEXT_PUBLIC_APP_URL = 'https://greenhouse.efeoncepro.com'
    delete process.env.NEXTAUTH_URL
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET
    else process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET = originalSecret

    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl

    if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = originalNextAuthUrl
  })

  describe('computeVerificationToken', () => {
    it('returns a deterministic 32-char hex token for the same input', () => {
      const token1 = computeVerificationToken({ quotationId: 'q1', versionNumber: 1, pdfHash: 'abc' })
      const token2 = computeVerificationToken({ quotationId: 'q1', versionNumber: 1, pdfHash: 'abc' })

      expect(token1).toBe(token2)
      expect(token1).toMatch(/^[a-f0-9]{32}$/)
    })

    it('returns different tokens for different inputs', () => {
      const tokenA = computeVerificationToken({ quotationId: 'q1', versionNumber: 1, pdfHash: 'abc' })
      const tokenB = computeVerificationToken({ quotationId: 'q1', versionNumber: 2, pdfHash: 'abc' })
      const tokenC = computeVerificationToken({ quotationId: 'q1', versionNumber: 1, pdfHash: 'xyz' })

      expect(tokenA).not.toBe(tokenB)
      expect(tokenA).not.toBe(tokenC)
    })

    it('returns null when secret is not configured', () => {
      delete process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET

      const token = computeVerificationToken({ quotationId: 'q1', versionNumber: 1 })

      expect(token).toBeNull()
    })

    it('returns null when secret is too short (<32 chars)', () => {
      process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET = 'short'

      const token = computeVerificationToken({ quotationId: 'q1', versionNumber: 1 })

      expect(token).toBeNull()
    })
  })

  describe('buildVerificationUrl', () => {
    it('returns full public URL with token when secret is set', () => {
      const url = buildVerificationUrl({ quotationId: 'q-abc', versionNumber: 3 })

      expect(url).toMatch(/^https:\/\/greenhouse\.efeoncepro\.com\/public\/quote\/q-abc\/3\/[a-f0-9]{32}$/)
    })

    it('returns null when secret is missing', () => {
      delete process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET

      const url = buildVerificationUrl({ quotationId: 'q1', versionNumber: 1 })

      expect(url).toBeNull()
    })

    it('strips trailing slash from base URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/'

      const url = buildVerificationUrl({ quotationId: 'q1', versionNumber: 1 })

      expect(url).toMatch(/^https:\/\/example\.com\/public\//)
      expect(url).not.toMatch(/example\.com\/\/public/)
    })
  })

  describe('buildShortVerificationLabel', () => {
    it('formats with truncated quotation id and protocol stripped', () => {
      const label = buildShortVerificationLabel({ quotationId: 'q-abcdefgh1234', versionNumber: 2 })

      expect(label).toBe('greenhouse.efeoncepro.com/public/quote/q-abcdef…/v2')
    })
  })

  describe('computePdfContentHash', () => {
    it('produces a 16-char hex hash', () => {
      const hash = computePdfContentHash({
        quotationId: 'q1',
        versionNumber: 1,
        total: 1000,
        currency: 'USD',
        lineCount: 3
      })

      expect(hash).toMatch(/^[a-f0-9]{16}$/)
    })

    it('changes when any input changes', () => {
      const base = { quotationId: 'q1', versionNumber: 1, total: 1000, currency: 'USD', lineCount: 3 }
      const a = computePdfContentHash(base)
      const b = computePdfContentHash({ ...base, total: 2000 })
      const c = computePdfContentHash({ ...base, lineCount: 4 })

      expect(a).not.toBe(b)
      expect(a).not.toBe(c)
    })
  })

  describe('generateVerificationQrDataUrl', () => {
    it('returns a base64 PNG data URL when secret is set', async () => {
      const dataUrl = await generateVerificationQrDataUrl({ quotationId: 'q1', versionNumber: 1, pdfHash: 'abc' })

      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
      expect(dataUrl!.length).toBeGreaterThan(200)
    })

    it('returns null when secret is missing', async () => {
      delete process.env.GREENHOUSE_QUOTE_VERIFICATION_SECRET

      const dataUrl = await generateVerificationQrDataUrl({ quotationId: 'q1', versionNumber: 1 })

      expect(dataUrl).toBeNull()
    })
  })
})
