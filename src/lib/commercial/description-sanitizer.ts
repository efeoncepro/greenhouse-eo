import 'server-only'

import DOMPurify from 'isomorphic-dompurify'

// ─────────────────────────────────────────────────────────────
// TASK-603 — HTML sanitizer for HubSpot product descriptions.
//
// HubSpot accepts a rich-text description via `hs_rich_text_description`.
// Greenhouse operators can paste HTML (from Notion, a CMS, etc.) into the
// admin UI. Before it reaches HubSpot we sanitize with a strict whitelist
// to prevent XSS vectors — HubSpot's CRM renders the HTML in deal/product
// detail views and in outbound quote documents, so sanitization cannot be
// delegated to the consumer.
//
// Whitelist (per TASK-587 / TASK-603 spec):
//   <p>, <strong>, <em>, <ul>, <ol>, <li>, <a href>, <br>
//
// Anything else is stripped. Inline style, data-*, on*-handlers, script,
// iframe, img, form, etc. are removed.
//
// `description` (plain text) is derived from the sanitized rich HTML by
// stripping all tags and collapsing whitespace — keeps the two HubSpot
// fields consistent without requiring operator to write plain twice.
// ─────────────────────────────────────────────────────────────

const ALLOWED_TAGS = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'] as const

const ALLOWED_ATTR = ['href'] as const

/**
 * Sanitizes product description HTML for outbound delivery to HubSpot.
 * Returns a safe HTML string with only the whitelisted tags/attributes.
 * Null/undefined input returns empty string.
 */
export const sanitizeProductDescriptionHtml = (html: string | null | undefined): string => {
  if (html === null || html === undefined) return ''
  const trimmed = String(html).trim()

  if (!trimmed) return ''

  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],

    // Additional hardening: reject <a href="javascript:..."> and data: URIs
    // by forbidding the URI schemes that HubSpot's renderer would otherwise
    // trust.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true
  })
}

/**
 * Derives plain-text from rich HTML by stripping all tags and collapsing
 * whitespace. HubSpot stores this as `description` alongside the rich HTML
 * for rendering contexts that do not support formatting (email, simple CRM
 * cards).
 *
 * Null/undefined/empty input returns empty string.
 */
export const derivePlainDescription = (html: string | null | undefined): string => {
  if (html === null || html === undefined) return ''
  const trimmed = String(html).trim()

  if (!trimmed) return ''

  // Strip ALL tags (not just unsafe ones) — for plain derivation we want text.
  const stripped = DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

  // DOMPurify leaves raw text; collapse whitespace runs (including
  // newlines inserted by block-level tags) into single spaces.
  return stripped.replace(/\s+/g, ' ').trim()
}
