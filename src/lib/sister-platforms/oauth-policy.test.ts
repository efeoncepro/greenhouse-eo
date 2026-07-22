import { describe, expect, it } from 'vitest'

import {
  assertSisterPlatformOAuthPolicyScopes,
  evaluateSisterPlatformOAuthEligibility,
  parseSisterPlatformOAuthPolicy,
  resolveSisterPlatformOAuthCapabilities,
  SisterPlatformOAuthPolicyError
} from './oauth-policy'

const globeCapabilities = [
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
  'globe.credits.estimate'
] as const

const globePolicyInput = {
  schemaVersion: '1',
  audience: { tenantTypes: ['efeonce_internal'] },
  requiredScopes: ['openid', ...globeCapabilities],
  capabilityScopes: [...globeCapabilities],
  claims: { includeGreenhouseRoles: false },
  revocation: {
    mode: 'userinfo_revalidation',
    revalidateAfterSeconds: 60,
    requireOnPrivilegedAction: true
  }
} as const

describe('sister platform OAuth policy', () => {
  it('accepts an internal Globe user with the required capability scope', () => {
    const policy = parseSisterPlatformOAuthPolicy(globePolicyInput)

    expect(
      evaluateSisterPlatformOAuthEligibility(policy, {
        active: true,
        status: 'active',
        tenantType: 'efeonce_internal',
        requestedScopes: ['openid', 'profile', 'email', ...globeCapabilities]
      })
    ).toEqual({ allowed: true })
    expect(resolveSisterPlatformOAuthCapabilities(policy, ['openid', ...globeCapabilities])).toEqual(globeCapabilities)
  })

  it('denies a client tenant even when the caller requests the Globe scope', () => {
    const policy = parseSisterPlatformOAuthPolicy(globePolicyInput)

    expect(
      evaluateSisterPlatformOAuthEligibility(policy, {
        active: true,
        status: 'active',
        tenantType: 'client',
        requestedScopes: ['openid', ...globeCapabilities]
      })
    ).toEqual({ allowed: false, errorCode: 'audience_not_allowed' })
  })

  it('denies an internal user when the client-required capability is absent', () => {
    const policy = parseSisterPlatformOAuthPolicy(globePolicyInput)

    expect(
      evaluateSisterPlatformOAuthEligibility(policy, {
        active: true,
        status: 'active',
        tenantType: 'efeonce_internal',
        requestedScopes: ['openid', 'profile', 'email']
      })
    ).toEqual({ allowed: false, errorCode: 'required_scope_missing' })
  })

  it('fails closed when the policy is missing or malformed', () => {
    expect(() => parseSisterPlatformOAuthPolicy(null)).toThrowError(
      expect.objectContaining({ errorCode: 'client_policy_missing' })
    )
    expect(() =>
      parseSisterPlatformOAuthPolicy({
        ...globePolicyInput,
        audience: { tenantTypes: ['efeonce_internal', 'external'] }
      })
    ).toThrowError(SisterPlatformOAuthPolicyError)
  })

  it('rejects policy scopes that are not registered on the OAuth client', () => {
    const policy = parseSisterPlatformOAuthPolicy(globePolicyInput)

    expect(() => assertSisterPlatformOAuthPolicyScopes(policy, ['openid', 'profile', 'email'])).toThrowError(
      expect.objectContaining({ errorCode: 'client_policy_scope_mismatch' })
    )
  })

  it('keeps legacy role exposure as a registered policy choice instead of product branching', () => {
    const policy = parseSisterPlatformOAuthPolicy({
      ...globePolicyInput,
      requiredScopes: ['openid', 'kortex.operator_console.access'],
      capabilityScopes: ['kortex.operator_console.access'],
      claims: { includeGreenhouseRoles: true }
    })

    expect(policy.claims.includeGreenhouseRoles).toBe(true)
    expect(policy.capabilityScopes).toEqual(['kortex.operator_console.access'])
  })
})
