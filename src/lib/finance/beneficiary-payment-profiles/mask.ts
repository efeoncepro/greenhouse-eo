/**
 * Enmascarado canonico para account_number_full y vault_ref.
 * Patron espejo de src/lib/finance/payment-instruments/serializer.ts
 * pero stand-alone para evitar import cross-module circular.
 */
export const maskSensitiveValue = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()

  if (trimmed.length === 0) return null
  if (trimmed.length <= 4) return '••••'

  return `•••• ${trimmed.slice(-4)}`
}
