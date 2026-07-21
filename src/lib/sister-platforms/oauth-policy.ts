import { z } from 'zod'

const CORE_OIDC_SCOPES = new Set(['openid', 'profile', 'email'])
const OAUTH_SCOPE_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/

const oauthScopeSchema = z.string().trim().min(1).max(128).regex(OAUTH_SCOPE_PATTERN)

export const sisterPlatformOAuthPolicyV1Schema = z
  .object({
    schemaVersion: z.literal('1'),
    audience: z
      .object({
        tenantTypes: z.array(z.enum(['efeonce_internal', 'client'])).min(1)
      })
      .strict(),
    requiredScopes: z.array(oauthScopeSchema).min(1),
    capabilityScopes: z.array(oauthScopeSchema).min(1),
    claims: z
      .object({
        includeGreenhouseRoles: z.boolean()
      })
      .strict(),
    revocation: z
      .object({
        mode: z.literal('userinfo_revalidation'),
        revalidateAfterSeconds: z.number().int().min(15).max(300),
        requireOnPrivilegedAction: z.literal(true)
      })
      .strict()
  })
  .strict()
  .superRefine((policy, context) => {
    const requiredScopes = new Set(policy.requiredScopes)

    for (const capabilityScope of policy.capabilityScopes) {
      if (CORE_OIDC_SCOPES.has(capabilityScope)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'capabilityScopes cannot contain core OIDC scopes',
          path: ['capabilityScopes']
        })
      }

      if (!requiredScopes.has(capabilityScope)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Every capability scope must also be required',
          path: ['capabilityScopes']
        })
      }
    }
  })

export type SisterPlatformOAuthPolicyV1 = z.infer<typeof sisterPlatformOAuthPolicyV1Schema>
export type SisterPlatformOAuthTenantType = SisterPlatformOAuthPolicyV1['audience']['tenantTypes'][number]

export type SisterPlatformOAuthEligibilityInput = Readonly<{
  active: boolean
  status: string
  tenantType: SisterPlatformOAuthTenantType
  requestedScopes: readonly string[]
}>

export type SisterPlatformOAuthEligibilityDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false
      errorCode: 'user_not_eligible' | 'audience_not_allowed' | 'required_scope_missing'
    }>

export class SisterPlatformOAuthPolicyError extends Error {
  readonly errorCode: 'client_policy_missing' | 'client_policy_invalid' | 'client_policy_scope_mismatch'

  constructor(errorCode: SisterPlatformOAuthPolicyError['errorCode']) {
    super(errorCode)
    this.name = 'SisterPlatformOAuthPolicyError'
    this.errorCode = errorCode
  }
}

export function parseSisterPlatformOAuthPolicy(value: unknown): SisterPlatformOAuthPolicyV1 {
  if (value === null || value === undefined) {
    throw new SisterPlatformOAuthPolicyError('client_policy_missing')
  }

  const result = sisterPlatformOAuthPolicyV1Schema.safeParse(value)

  if (!result.success) {
    throw new SisterPlatformOAuthPolicyError('client_policy_invalid')
  }

  return {
    ...result.data,
    audience: {
      tenantTypes: Array.from(new Set(result.data.audience.tenantTypes))
    },
    requiredScopes: Array.from(new Set(result.data.requiredScopes)),
    capabilityScopes: Array.from(new Set(result.data.capabilityScopes))
  }
}

export function assertSisterPlatformOAuthPolicyScopes(
  policy: SisterPlatformOAuthPolicyV1,
  allowedScopes: readonly string[]
): void {
  const allowed = new Set(allowedScopes)

  if (policy.requiredScopes.some(scope => !allowed.has(scope))) {
    throw new SisterPlatformOAuthPolicyError('client_policy_scope_mismatch')
  }
}

export function evaluateSisterPlatformOAuthEligibility(
  policy: SisterPlatformOAuthPolicyV1,
  input: SisterPlatformOAuthEligibilityInput
): SisterPlatformOAuthEligibilityDecision {
  if (!input.active || input.status !== 'active') {
    return { allowed: false, errorCode: 'user_not_eligible' }
  }

  if (!policy.audience.tenantTypes.includes(input.tenantType)) {
    return { allowed: false, errorCode: 'audience_not_allowed' }
  }

  const requested = new Set(input.requestedScopes)

  if (policy.requiredScopes.some(scope => !requested.has(scope))) {
    return { allowed: false, errorCode: 'required_scope_missing' }
  }

  return { allowed: true }
}

export function resolveSisterPlatformOAuthCapabilities(
  policy: SisterPlatformOAuthPolicyV1,
  requestedScopes: readonly string[]
): string[] {
  const requested = new Set(requestedScopes)

  return policy.capabilityScopes.filter(scope => requested.has(scope))
}
