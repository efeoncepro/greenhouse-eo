/** Fixed, authenticated landing for direct login; it creates no OAuth authorization context. */
export const INTERNAL_LOGIN_SESSION_PATH = '/auth/session'

/** Returns only an issuer-local OAuth continuation or the exact session landing. */
export const internalLoginReturnTarget = (raw: string, issuer: string): string | null => {
  if (!raw || raw.length > 8192) return null

  try {
    const url = new URL(raw, issuer)

    if (url.origin !== new URL(issuer).origin || url.hash || url.username || url.password) return null
    if (raw === INTERNAL_LOGIN_SESSION_PATH) return INTERNAL_LOGIN_SESSION_PATH
    if (url.pathname !== '/oauth/authorize') return null

    return url.pathname + url.search
  } catch {
    return null
  }
}
