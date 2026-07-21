const TIMEZONE_MAX_LENGTH = 64
const IANA_TIMEZONE_SHAPE = /^(?:UTC|[A-Za-z][A-Za-z0-9._+-]*(?:\/[A-Za-z0-9._+-]+)+)$/

/**
 * Validates through the runtime's IANA database and returns its canonical name.
 * No offset strings or arbitrary locale input cross the provider boundary.
 */
export const canonicalizeMeetingTimezone = (value: string | null | undefined): string | null => {
  const candidate = value?.trim()

  if (!candidate || candidate.length > TIMEZONE_MAX_LENGTH || !IANA_TIMEZONE_SHAPE.test(candidate)) return null

  try {
    const canonical = new Intl.DateTimeFormat('en-US', { timeZone: candidate }).resolvedOptions().timeZone

    return canonical.length <= TIMEZONE_MAX_LENGTH && IANA_TIMEZONE_SHAPE.test(canonical) ? canonical : null
  } catch {
    return null
  }
}

export const resolveMeetingTimezone = (
  requested: string | null | undefined,
  fallback: string,
): string => canonicalizeMeetingTimezone(requested) ?? canonicalizeMeetingTimezone(fallback) ?? 'UTC'

export const isSupportedMeetingTimezone = (value: string): boolean => canonicalizeMeetingTimezone(value) !== null
