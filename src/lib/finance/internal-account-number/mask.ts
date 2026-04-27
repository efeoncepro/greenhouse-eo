/**
 * Masking helpers for internal account numbers (TASK-700).
 *
 * Format v1 is designed so the last 4 characters of the rendered string
 * are ALWAYS the pure sequential digits. That makes the standard
 * `•••• {last4}` pattern work without category-aware branching — the
 * existing serializer at `src/lib/finance/payment-instruments/serializer.ts`
 * keeps doing `value.slice(-4)` and gets clean digits.
 *
 * This helper exists for callers that want a single source of truth for
 * masking internal numbers (Banco view, drawer headers, search results).
 */

const FOUR_DIGITS_REGEX = /[0-9]{4}$/

/**
 * Mask a formatted internal account number for read-only surfaces.
 * `'01-90-7-0001'` → `'•••• 0001'`.
 *
 * For inputs that don't end in 4 digits (e.g. legacy bank numbers with
 * non-numeric suffixes), falls back to `slice(-4)` to remain consistent
 * with the existing `maskIdentifier` behavior in the admin route.
 */
export const maskAccountNumber = (value: string | null | undefined): string => {
  if (!value) return '••••'

  const normalized = value.trim()

  if (!normalized) return '••••'

  const fourDigits = FOUR_DIGITS_REGEX.exec(normalized)

  if (fourDigits) {
    return `•••• ${fourDigits[0]}`
  }

  return `•••• ${normalized.slice(-4)}`
}
