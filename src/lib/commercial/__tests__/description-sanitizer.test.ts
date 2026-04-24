import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  derivePlainDescription,
  sanitizeProductDescriptionHtml
} from '../description-sanitizer'

describe('sanitizeProductDescriptionHtml', () => {
  it('preserves whitelist tags (p, strong, em, ul, ol, li, a[href], br)', () => {
    const html =
      '<p>Hello <strong>world</strong> <em>italic</em></p>' +
      '<ul><li>Bullet</li></ul>' +
      '<ol><li>Number</li></ol>' +
      '<p>Link: <a href="https://example.com">ex</a></p>' +
      '<p>Line<br>break</p>'

    const result = sanitizeProductDescriptionHtml(html)

    expect(result).toContain('<p>Hello <strong>world</strong> <em>italic</em></p>')
    expect(result).toContain('<ul><li>Bullet</li></ul>')
    expect(result).toContain('<ol><li>Number</li></ol>')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('<br>')
  })

  it('strips <script> tags completely', () => {
    const html = '<p>Safe</p><script>alert("xss")</script>'

    const result = sanitizeProductDescriptionHtml(html)

    expect(result).toContain('<p>Safe</p>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
  })

  it('strips onclick and other event handlers', () => {
    const html = '<p onclick="steal()">Click</p><a onmouseover="bad()" href="/x">L</a>'

    const result = sanitizeProductDescriptionHtml(html)

    expect(result).not.toContain('onclick')
    expect(result).not.toContain('onmouseover')
    expect(result).toContain('<p>Click</p>')
  })

  it('strips <img> tags (not in whitelist; image_urls is a separate outbound field)', () => {
    const html = '<p>Text</p><img src="x" onerror="alert(1)">'

    const result = sanitizeProductDescriptionHtml(html)

    expect(result).not.toContain('<img')
    expect(result).toContain('<p>Text</p>')
  })

  it('strips <iframe> tags', () => {
    const html = '<p>Hi</p><iframe src="https://evil.com"></iframe>'

    const result = sanitizeProductDescriptionHtml(html)

    expect(result).not.toContain('<iframe')
  })

  it('rejects javascript: URIs in href', () => {
    const html = '<a href="javascript:alert(1)">click</a>'

    const result = sanitizeProductDescriptionHtml(html)

    expect(result).not.toContain('javascript:')
  })

  it('returns empty string for null input', () => {
    expect(sanitizeProductDescriptionHtml(null)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(sanitizeProductDescriptionHtml(undefined)).toBe('')
  })

  it('returns empty string for empty / whitespace-only input', () => {
    expect(sanitizeProductDescriptionHtml('')).toBe('')
    expect(sanitizeProductDescriptionHtml('   \n\t   ')).toBe('')
  })
})

describe('derivePlainDescription', () => {
  it('strips all tags and returns plain text', () => {
    expect(derivePlainDescription('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('collapses whitespace runs including newlines', () => {
    expect(derivePlainDescription('<p>Line 1</p>\n\n<p>Line 2</p>')).toBe('Line 1 Line 2')
  })

  it('strips nested tags (text content concatenated without structural whitespace)', () => {
    // DOMPurify does not add whitespace between removed tags; callers that
    // need readable separators should use the rich HTML or format their
    // source with explicit whitespace.
    expect(derivePlainDescription('<ul><li>A</li><li>B <strong>bold</strong></li></ul>')).toBe(
      'AB bold'
    )
  })

  it('strips <script> content entirely (not just the tag)', () => {
    // DOMPurify with KEEP_CONTENT default removes script content since
    // script is not in ALLOWED_TAGS and its inner content is unsafe.
    const result = derivePlainDescription('<p>Safe</p><script>alert("evil")</script>')

    expect(result).toBe('Safe')
  })

  it('handles unicode and emoji', () => {
    expect(derivePlainDescription('<p>Hola 👋 México</p>')).toBe('Hola 👋 México')
  })

  it('returns empty for null/undefined/whitespace', () => {
    expect(derivePlainDescription(null)).toBe('')
    expect(derivePlainDescription(undefined)).toBe('')
    expect(derivePlainDescription('   ')).toBe('')
  })
})
