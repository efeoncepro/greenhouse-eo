import 'server-only'

import {
  derivePlainTextFromRichHtml,
  sanitizeRichHtml
} from '@/lib/content/sanitization'
import { HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID } from '@/lib/content/sanitization/policies'

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

/**
 * Sanitizes product description HTML for outbound delivery to HubSpot.
 * Returns a safe HTML string with only the whitelisted tags/attributes.
 * Null/undefined input returns empty string.
 */
export const sanitizeProductDescriptionHtml = (html: string | null | undefined): string => {
  return sanitizeRichHtml(html, HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID)
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
  return derivePlainTextFromRichHtml(html, HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID)
}
