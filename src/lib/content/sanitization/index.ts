import 'server-only'

import sanitizeHtml from 'sanitize-html'

import {
  getRichHtmlSanitizationPolicy,
  type RichHtmlSanitizationPolicy
} from './policies'

const normalizeRichHtmlInput = (html: string | null | undefined): string => {
  if (html === null || html === undefined) return ''

  return String(html).trim()
}

const resolvePolicy = (
  policy: RichHtmlSanitizationPolicy | string
): RichHtmlSanitizationPolicy =>
  typeof policy === 'string' ? getRichHtmlSanitizationPolicy(policy) : policy

export const sanitizeRichHtml = (
  html: string | null | undefined,
  policy: RichHtmlSanitizationPolicy | string
): string => {
  const normalized = normalizeRichHtmlInput(html)

  if (!normalized) return ''

  return sanitizeHtml(normalized, resolvePolicy(policy).sanitizeOptions)
}

export const derivePlainTextFromRichHtml = (
  html: string | null | undefined,
  policy: RichHtmlSanitizationPolicy | string
): string => {
  const sanitized = sanitizeRichHtml(html, policy)

  if (!sanitized) return ''

  const plain = sanitizeHtml(sanitized, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  })

  return plain.replace(/\s+/g, ' ').trim()
}
