import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  derivePlainTextFromRichHtml,
  sanitizeRichHtml
} from '@/lib/content/sanitization'
import {
  HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID,
  getRichHtmlSanitizationPolicy
} from '@/lib/content/sanitization/policies'

describe('rich HTML sanitization policies', () => {
  it('loads the HubSpot product description policy by id', () => {
    const policy = getRichHtmlSanitizationPolicy(HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID)

    expect(policy.id).toBe(HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID)
    expect(policy.version).toBe(1)
    expect(policy.sanitizeOptions.allowedTags).toContain('p')
  })

  it('throws for unknown policy ids', () => {
    expect(() => getRichHtmlSanitizationPolicy('missing')).toThrow(
      'Unknown rich HTML sanitization policy: missing'
    )
  })
})

describe('sanitizeRichHtml', () => {
  it('keeps allowlisted tags and safe href values', () => {
    const result = sanitizeRichHtml(
      '<p>Hello <strong>world</strong> <a href="https://example.com">go</a></p>',
      HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID
    )

    expect(result).toContain('<p>Hello <strong>world</strong> <a href="https://example.com">go</a></p>')
  })

  it('strips script tags and javascript href payloads', () => {
    const result = sanitizeRichHtml(
      '<p>Safe</p><script>alert(1)</script><a href="javascript:alert(2)">bad</a>',
      HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID
    )

    expect(result).toContain('<p>Safe</p>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert(1)')
    expect(result).not.toContain('javascript:')
  })
})

describe('derivePlainTextFromRichHtml', () => {
  it('derives plain text from sanitized HTML', () => {
    const result = derivePlainTextFromRichHtml(
      '<p>Line 1</p><p>Line 2 <strong>bold</strong></p>',
      HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID
    )

    expect(result).toBe('Line 1Line 2 bold')
  })
})
