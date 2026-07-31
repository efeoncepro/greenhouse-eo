import type { SisterPlatformOAuthPolicyV1 } from './oauth-policy'

export const GLOBE_ADMIN_OAUTH_CLIENT_ID = 'greenhouse-admin-cli'
export const GLOBE_ADMIN_OAUTH_REDIRECT_URI = 'http://127.0.0.1/oauth/callback'
export const GLOBE_ADMIN_OAUTH_CODE_TTL_SECONDS = 5 * 60
export const GLOBE_ADMIN_OAUTH_ACCESS_TOKEN_TTL_SECONDS = 5 * 60

export const GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES = [
  'globe.credits.funding.propose',
  'globe.credits.funding.confirm'
] as const

export const buildGlobeAdminOAuthGrantContract = () => {
  const allowedScopes = ['openid', 'profile', 'email', ...GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES]

  const policy: SisterPlatformOAuthPolicyV1 = {
    schemaVersion: '1',
    audience: { tenantTypes: ['efeonce_internal'] },
    requiredScopes: ['openid', ...GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES],
    capabilityScopes: [...GLOBE_ADMIN_OAUTH_CAPABILITY_SCOPES],
    claims: { includeGreenhouseRoles: false },
    revocation: {
      mode: 'userinfo_revalidation',
      revalidateAfterSeconds: 60,
      requireOnPrivilegedAction: true
    }
  }

  return { allowedScopes, policy }
}
