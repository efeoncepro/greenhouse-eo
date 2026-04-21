const PARTY_SELECTOR_FLAG_CODES = new Set([
  'GREENHOUSE_PARTY_SELECTOR_UNIFIED',
  'greenhouse_party_selector_unified',
  'party_selector_unified'
])

export const isUnifiedPartySelectorEnabled = (featureFlags?: string[] | null): boolean => {
  if (!Array.isArray(featureFlags) || featureFlags.length === 0) {
    return false
  }

  return featureFlags.some(flag => PARTY_SELECTOR_FLAG_CODES.has(flag))
}
