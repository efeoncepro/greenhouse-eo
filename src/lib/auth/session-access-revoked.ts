import type { AuthAttemptReasonCode } from './attempt-tracker'

export type SessionAccessRevocationReason = Extract<
  AuthAttemptReasonCode,
  'tenant_not_found' | 'account_disabled' | 'account_status_invalid'
>

/**
 * TASK-2096 (H2) — an access-claims refresh found the principal gone or no longer active.
 *
 * Thrown from the NextAuth `jwt` callback on purpose: NextAuth 4 clears the session cookie and
 * `getServerSession` resolves `null` when that callback throws. Emptying the claims instead is
 * NOT safe, because the `session` callback falls back to a default primary role when roles are
 * missing.
 */
export class SessionAccessRevokedError extends Error {
  readonly reason: SessionAccessRevocationReason

  constructor(reason: SessionAccessRevocationReason) {
    super(`session_access_revoked:${reason}`)
    this.name = 'SessionAccessRevokedError'
    this.reason = reason
  }
}

type PrincipalState = { active?: boolean | null; status?: string | null } | null | undefined

/** Single predicate for "this principal may hold an authorizing session right now". */
export const resolveSessionPrincipalRevocation = (
  principal: PrincipalState
): SessionAccessRevocationReason | null => {
  if (!principal) return 'tenant_not_found'
  if (principal.active !== true) return 'account_disabled'
  if (principal.status !== 'active') return 'account_status_invalid'

  return null
}
