import type { AuthServerOAuthConfig } from '../oauth/config'
import type { GrantsVersionPort } from '../oauth/grants'

import type { createInternalContextService } from './context'

/** Native contexts cannot fall back to the B2B resolver on denial, exception or disabled state. */
export const createNativeGrantsPort = (deps: {
  config: Pick<AuthServerOAuthConfig, 'issuer' | 'mcpAudience'>
  internal: ReturnType<typeof createInternalContextService>
  external: GrantsVersionPort
}): GrantsVersionPort => ({
  resolve: async input => {
    if (!input.authorizationContextId) return deps.external.resolve(input)

    const result = await deps.internal.resolve({
      id: input.authorizationContextId,
      version: 1,
      issuer: deps.config.issuer,
      environmentId: input.environmentId,
      subject: input.subject,
      clientId: input.clientId,
      audience: deps.config.mcpAudience
    })

    if (!result.allowed) return { bound: false, profileId: null, outcome: `internal_${result.reason}` }

    return { bound: true, profileId: result.context.profileId, grantsVersion: result.grantsVersion, memberships: 1 }
  }
})
