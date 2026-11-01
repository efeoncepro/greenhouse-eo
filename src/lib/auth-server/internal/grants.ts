import type { AuthServerOAuthConfig } from '../oauth/config'
import type { GrantsVersionPort } from '../oauth/grants'
import { isKnownAudience } from '../oauth/resources'

import type { createInternalContextService } from './context'

/** Native contexts cannot fall back to the B2B resolver on denial, exception or disabled state. */
export const createNativeGrantsPort = (deps: {
  config: Pick<AuthServerOAuthConfig, 'issuer' | 'mcpAudience' | 'roomsAudience'>
  internal: ReturnType<typeof createInternalContextService>
  external: GrantsVersionPort
  resolveMultiOrganization?: GrantsVersionPort['resolve']
}): GrantsVersionPort => ({
  resolve: async input => {
    // TASK-2095: the Rooms audience is internal-only; the B2B resolver never vouches for it.
    if (!input.authorizationContextId) {
      return input.audience && input.audience !== deps.config.mcpAudience
        ? { bound: false, profileId: null, outcome: 'rooms_requires_internal' }
        : deps.external.resolve(input)
    }

    const audience = input.audience ?? deps.config.mcpAudience

    if (!isKnownAudience(deps.config, audience)) return { bound: false, profileId: null, outcome: 'internal_audience_unknown' }

    const result = await deps.internal.resolveStored({
      id: input.authorizationContextId,
      issuer: deps.config.issuer,
      environmentId: input.environmentId,
      subject: input.subject,
      clientId: input.clientId,
      audience
    })

    if (!result.allowed) return { bound: false, profileId: null, outcome: `internal_${result.reason}` }

    if (result.context.version === 2) {
      return deps.resolveMultiOrganization?.(input) ?? { bound: false, profileId: null, outcome: 'internal_v2_unavailable' }
    }

    return { bound: true, profileId: result.context.profileId, grantsVersion: result.grantsVersion, memberships: 1 }
  }
})
