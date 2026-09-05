import type { OAuthStorePort } from '../oauth/store/port'

/** Ledger revocation is independent of context validity: contexts may be shared by several grants. */
export const isCurrentInternalAccessToken = async (
  input: { jti: string; environmentId: string; subject: string; clientId: string; authorizationContextId: string },
  store: Pick<OAuthStorePort, 'getAccessToken'>,
  now = new Date()
): Promise<boolean> => {
  const token = await store.getAccessToken(input.jti)

  return Boolean(
    token &&
      token.jti === input.jti &&
      token.environmentId === input.environmentId &&
      token.subject === input.subject &&
      token.clientId === input.clientId &&
      token.authorizationContextId === input.authorizationContextId &&
      token.revokedAt === null &&
      Number.isFinite(token.issuedAt.getTime()) &&
      token.issuedAt.getTime() <= now.getTime() &&
      Number.isFinite(token.expiresAt.getTime()) &&
      token.expiresAt.getTime() > now.getTime()
  )
}
