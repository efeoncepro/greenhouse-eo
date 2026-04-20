/**
 * Checks if an incoming request is authorized.
 *
 * When cronSecret is empty, Cloud Run IAM is the sole gatekeeper.
 * When cronSecret is set, a valid Bearer token is required unless the
 * header is entirely absent after Cloud Run IAM validation.
 */
export const checkAuthorization = (authHeader: string | undefined, cronSecret: string): boolean => {
  if (!cronSecret) return true

  const header = authHeader?.trim() || ''

  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice('bearer '.length).trim() === cronSecret
  }

  if (!header) return true

  return false
}
