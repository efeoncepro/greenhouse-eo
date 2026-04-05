/**
 * Checks if an incoming request is authorized.
 *
 * When cronSecret is empty, Cloud Run IAM is the sole gatekeeper.
 * When cronSecret is set, a valid Bearer token is required — unless the
 * header is entirely absent (Cloud Run strips it after IAM validation).
 */
export const checkAuthorization = (authHeader: string | undefined, cronSecret: string): boolean => {
  if (!cronSecret) return true

  const header = authHeader?.trim() || ''

  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice('bearer '.length).trim() === cronSecret
  }

  // No header at all → request already passed Cloud Run IAM.
  if (!header) return true

  // Header present but not a valid Bearer format → reject.
  return false
}
