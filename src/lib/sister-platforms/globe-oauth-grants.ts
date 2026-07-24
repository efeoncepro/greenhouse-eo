import 'server-only'

import type { SisterPlatformOAuthPolicyV1 } from './oauth-policy'
import { updateSisterPlatformOAuthGrantPolicy, updateSisterPlatformOAuthTokenTtls } from './oauth-broker'

export const GLOBE_OIDC_SCOPES = ['openid', 'profile', 'email'] as const
export const GLOBE_OAUTH_CODE_TTL_SECONDS = 5 * 60
export const GLOBE_OAUTH_ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60
export const GLOBE_OAUTH_REVALIDATE_AFTER_SECONDS = 5 * 60

export const GLOBE_SHELL_CAPABILITY_SCOPES = ['globe.studio.access'] as const

/**
 * Exact internal Producer grant. This is the non-operator creative role: it can create,
 * organize, review and share its workspace's outputs, but cannot purge assets, administer
 * commercial credit, reveal provider-house classification or promote models.
 *
 * Deliberately excluded:
 * - `globe.producer.route.reveal_house` (operator-only classification)
 * - `globe.lab.evaluation.run` (evaluation harness, not Producer)
 * - every MCP capability/surface
 */
export const GLOBE_PRODUCER_CAPABILITY_SCOPES = [
  'globe.studio.access',
  'globe.producer.catalog.read',
  'globe.lab.experiment.run',
  'globe.producer.assets.operate',
  'globe.producer.library.read',
  'globe.producer.library.manage',
  'globe.producer.library.export',
  'globe.producer.review.read',
  'globe.producer.review.decide',
  'globe.producer.comment.manage',
  'globe.producer.share.manage',
  'globe.voice.preset.manage',
  'globe.lab.recipe.author',
  'globe.credits.read',
  'globe.credits.estimate',
  // Internal creative operators may review evidence and propose an exact model
  // version. Promotion remains outside the Producer grant and is completed by
  // Globe's independent control-plane checker.
  'globe.model-readiness.review',
  'globe.model-readiness.propose'
] as const

/**
 * ADR-010 (TASK-1535) — TRANSITIONAL allowed-only scopes. Step 1 of the zero-downtime rollout that
 * adds `globe.model-rights.attest`/`.read` to the human Producer grant. These are added to
 * `allowedScopes` ONLY (never `capabilityScopes`/`requiredScopes` yet), so:
 *   - the broker does NOT require them → a client that doesn't request them still logs in;
 *   - the broker DOES allow them → the Globe client can start requesting them (step 2) without a
 *     `disallowed_scope` rejection, before they are moved into capability+required (step 3).
 * The broker enforces `capabilityScopes ⊆ requiredScopes`, so a scope cannot be granted-but-optional;
 * this buffer is how attest is introduced across the two repos (which hardcode scopes) without an outage.
 * Once step 3 moves them into `GLOBE_PRODUCER_CAPABILITY_SCOPES`, this list goes back to empty.
 */
export const GLOBE_PRODUCER_TRANSITIONAL_ALLOWED_SCOPES = [
  'globe.model-rights.attest',
  'globe.model-rights.read'
] as const

export type GlobeOAuthGrantMode = 'shell-only' | 'producer'

export const buildGlobeOAuthGrantContract = (mode: GlobeOAuthGrantMode) => {
  const capabilityScopes =
    mode === 'producer' ? [...GLOBE_PRODUCER_CAPABILITY_SCOPES] : [...GLOBE_SHELL_CAPABILITY_SCOPES]

  // Producer mode also ALLOWS (but does not require/grant) the transitional scopes.
  const transitionalAllowed = mode === 'producer' ? [...GLOBE_PRODUCER_TRANSITIONAL_ALLOWED_SCOPES] : []
  const allowedScopes = [...GLOBE_OIDC_SCOPES, ...capabilityScopes, ...transitionalAllowed]

  const policy: SisterPlatformOAuthPolicyV1 = {
    schemaVersion: '1',
    audience: { tenantTypes: ['efeonce_internal'] },
    requiredScopes: ['openid', ...capabilityScopes],
    capabilityScopes,
    claims: { includeGreenhouseRoles: false },
    revocation: {
      mode: 'userinfo_revalidation',
      revalidateAfterSeconds: GLOBE_OAUTH_REVALIDATE_AFTER_SECONDS,
      requireOnPrivilegedAction: true
    }
  }

  return { allowedScopes, policy }
}

export const updateGlobeOAuthGrantContract = async (mode: GlobeOAuthGrantMode) => {
  const contract = buildGlobeOAuthGrantContract(mode)

  return updateSisterPlatformOAuthGrantPolicy({
    clientId: 'globe',
    ...contract
  })
}

export const updateGlobeOAuthSessionContract = async () =>
  updateSisterPlatformOAuthTokenTtls({
    clientId: 'globe',
    codeTtlSeconds: GLOBE_OAUTH_CODE_TTL_SECONDS,
    accessTokenTtlSeconds: GLOBE_OAUTH_ACCESS_TOKEN_TTL_SECONDS
  })
