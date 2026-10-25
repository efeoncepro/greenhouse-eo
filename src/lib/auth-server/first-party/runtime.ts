import type { AuthServerOAuthConfig } from '../oauth/config'
import type { AuthServerPersonAuthConfig } from '../persons/config'
import type { AccessTokenSigner } from '../oauth/tokens'
import type { OAuthStorePort } from '../oauth/store/port'
import { createFirstPartyIdentityPort } from './identity'
import { PostgresFirstPartyStore } from './postgres-store'
import { createFirstPartyHandler, resolveFirstPartyLoginContext } from './protocol'

export const createFirstPartyRuntime = (input: {
  oauth: AuthServerOAuthConfig; persons: AuthServerPersonAuthConfig; signer: AccessTokenSigner; auditStore: OAuthStorePort
}) => {
  const deps = {
    config: { issuer: input.oauth.issuer, environmentId: input.oauth.environmentId,
      enabled: input.oauth.firstPartyEnabled === true && input.oauth.oauthEnabled && input.persons.personAuthEnabled },
    store: new PostgresFirstPartyStore(),
    identity: createFirstPartyIdentityPort({ environmentId: input.oauth.environmentId, sessionCookieName: input.persons.sessionCookieName }),
    signer: input.signer, auditStore: input.auditStore
  }

  return { handler: createFirstPartyHandler(deps), loginContext: (returnTo: string | null) => resolveFirstPartyLoginContext(returnTo, deps) }
}
