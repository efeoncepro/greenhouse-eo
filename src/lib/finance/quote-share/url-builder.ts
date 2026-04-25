import 'server-only'

/**
 * TASK-631 — URL builders for the shareable quote system.
 *
 * Two shapes:
 * - Canonical (long): /public/quote/[id]/[v]/[token]   ~120 chars
 * - Short (alias):    /q/[code]                        ~45 chars
 *
 * Both resolve to the same target page. Sales reps share the short URL,
 * the QR in the PDF embeds the long URL (no extra DB lookup at scan time).
 */

const getBaseUrl = (): string => {
  const raw =
    process.env.NEXTAUTH_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://greenhouse.efeoncepro.com'

  return raw.replace(/\/$/, '')
}

export const buildCanonicalQuoteUrl = (input: {
  quotationId: string
  versionNumber: number
  token: string
}): string => {
  const base = getBaseUrl()

  return `${base}/public/quote/${input.quotationId}/${input.versionNumber}/${input.token}`
}

export const buildShortQuoteUrl = (shortCode: string): string => {
  const base = getBaseUrl()

  return `${base}/q/${shortCode}`
}

/**
 * Truncated label for displaying in PDF QR caption / share UI.
 * Strips protocol + truncates the tail with ellipsis.
 */
export const buildShortQuoteUrlLabel = (shortCode: string): string => {
  const base = getBaseUrl().replace(/^https?:\/\//, '')

  return `${base}/q/${shortCode}`
}
