import 'server-only'

import type { SisterPlatformOAuthPolicyV1 } from './oauth-policy'
import { updateSisterPlatformOAuthGrantPolicy } from './oauth-broker'

export const GLOBE_OIDC_SCOPES = ['openid', 'profile', 'email'] as const

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

export type GlobeOAuthGrantMode = 'shell-only' | 'producer'

export const buildGlobeOAuthGrantContract = (mode: GlobeOAuthGrantMode) => {
  const capabilityScopes =
    mode === 'producer' ? [...GLOBE_PRODUCER_CAPABILITY_SCOPES] : [...GLOBE_SHELL_CAPABILITY_SCOPES]

  const allowedScopes = [...GLOBE_OIDC_SCOPES, ...capabilityScopes]

  const policy: SisterPlatformOAuthPolicyV1 = {
    schemaVersion: '1',
    audience: { tenantTypes: ['efeonce_internal'] },
    requiredScopes: ['openid', ...capabilityScopes],
    capabilityScopes,
    claims: { includeGreenhouseRoles: false },
    revocation: {
      mode: 'userinfo_revalidation',
      revalidateAfterSeconds: 60,
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
