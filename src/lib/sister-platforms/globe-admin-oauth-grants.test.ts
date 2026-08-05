import { describe, expect, it } from 'vitest'

import { parseSisterPlatformOAuthPolicy } from './oauth-policy'
import {
  GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES,
  buildGlobeAdminOAuthGrantContract
} from './globe-admin-oauth-grants'

describe('Globe Admin OAuth grant contract', () => {
  it('keeps the complete bounded CLI capability set valid and required', () => {
    const contract = buildGlobeAdminOAuthGrantContract()
    const policy = parseSisterPlatformOAuthPolicy(contract.policy)

    expect(policy.capabilityScopes).toEqual([...GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES])
    expect(policy.requiredScopes).toEqual(['openid', ...GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES])

    for (const scope of GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES) {
      expect(contract.allowedScopes).toContain(scope)
    }
  })
})
