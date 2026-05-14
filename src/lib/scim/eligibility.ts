import 'server-only'

/**
 * TASK-872 Slice 1 — SCIM Internal Collaborator Eligibility Policy (4 layers).
 *
 * Pure function — no I/O, no Date.now() in body. Caller pre-fetches active
 * overrides (effective_to IS NULL AND (expires_at IS NULL OR expires_at > now())).
 *
 * Evaluation order (hard rule: deny gana sobre allow):
 *
 *   1. Override deny match → outcome=reject, reason='admin_blocklist'
 *   2. Override allow match → eligible=true, reason='admin_allowlist'
 *   3. L1 hard reject (#EXT# en UPN o domain ∉ allowedDomains) → reject
 *   4. L2 funcional regex → client_user_only
 *   5. L3 name shape insuficiente → client_user_only
 *   6. Default → eligible=true, reason='human_collaborator'
 *
 * Spec: docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md
 * Validated by arch-architect 2026-05-13 (Fix 3-5 + 4-pillar Score).
 */

/** Hardcoded V1.0. Extensible vía L4 admin allowlist override en runtime. */
export const FUNCTIONAL_ACCOUNT_PATTERNS: readonly RegExp[] = Object.freeze([
  /^(noreply|no-reply|donotreply)/i,
  /^(support|info|hello|contact)/i,
  /^(marketing|comms|press)/i,
  /^(admin|root|administrator|postmaster|webmaster)/i,
  /^(hr|finance|billing|accounting|legal)/i,
  /^(abuse|security|incident|soc)/i,
  /^(scim-sync|service-account|sa-)/i,
  /^(bot-|automation-)/i
])

/** Active override row pre-fetched por el caller. */
export interface ScimEligibilityOverride {
  readonly overrideId: string
  readonly matchType: 'email' | 'azure_oid' | 'upn'
  readonly matchValue: string // ya normalizado al insertar (lowercase email/upn, lowercase UUID)
  readonly effect: 'allow' | 'deny'
}

export interface EligibilityInput {
  readonly upn: string
  readonly email: string
  readonly externalId: string // Entra objectId UUID
  readonly displayName: string | null
  readonly givenName: string | null
  readonly familyName: string | null
  readonly allowedDomains: readonly string[] // from scim_tenant_mappings.allowed_email_domains
  readonly overrides: readonly ScimEligibilityOverride[] // ACTIVE only
}

export type EligibilityVerdict =
  | { readonly eligible: true; readonly reason: 'human_collaborator' }
  | { readonly eligible: true; readonly reason: 'admin_allowlist'; readonly overrideId: string }
  | { readonly eligible: false; readonly outcome: 'reject'; readonly reason: 'external_guest' }
  | { readonly eligible: false; readonly outcome: 'reject'; readonly reason: 'admin_blocklist'; readonly overrideId: string }
  | { readonly eligible: false; readonly outcome: 'client_user_only'; readonly reason: 'functional_account'; readonly matchedPattern: string }
  | { readonly eligible: false; readonly outcome: 'client_user_only'; readonly reason: 'name_shape_insufficient' }

const normalizeForMatch = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase()

/**
 * Find first override matching the input.
 * Match priority (within same effect): email > azure_oid > upn.
 * Hard rule: deny gana sobre allow (caller checks deny first).
 */
const findOverride = (
  overrides: readonly ScimEligibilityOverride[],
  effect: 'allow' | 'deny',
  email: string,
  externalId: string,
  upn: string
): ScimEligibilityOverride | null => {
  const emailNorm = normalizeForMatch(email)
  const oidNorm = normalizeForMatch(externalId)
  const upnNorm = normalizeForMatch(upn)

  for (const ov of overrides) {
    if (ov.effect !== effect) continue

    const valueNorm = normalizeForMatch(ov.matchValue)

    if (ov.matchType === 'email' && valueNorm === emailNorm) return ov
    if (ov.matchType === 'azure_oid' && valueNorm === oidNorm) return ov
    if (ov.matchType === 'upn' && valueNorm === upnNorm) return ov
  }

  return null
}

const isExternalGuest = (upn: string): boolean => upn.toLowerCase().includes('#ext#')

const isDomainAllowed = (email: string, allowedDomains: readonly string[]): boolean => {
  const at = email.lastIndexOf('@')

  if (at < 0 || at === email.length - 1) return false

  const domain = email.slice(at + 1).toLowerCase()

  
return allowedDomains.some(d => d.toLowerCase() === domain)
}

const matchFunctionalPattern = (email: string): RegExp | null => {
  const at = email.indexOf('@')

  if (at <= 0) return null

  const localPart = email.slice(0, at)

  for (const pattern of FUNCTIONAL_ACCOUNT_PATTERNS) {
    if (pattern.test(localPart)) return pattern
  }

  return null
}

const hasSufficientNameShape = (displayName: string | null, givenName: string | null, familyName: string | null): boolean => {
  const display = (displayName ?? '').trim()
  const given = (givenName ?? '').trim()
  const family = (familyName ?? '').trim()

  // Caso 1: tenemos givenName + familyName ambos con contenido real
  if (given.length >= 2 && family.length >= 2) return true

  // Caso 2: displayName con 2+ palabras de 2+ caracteres
  if (display.length >= 4) {
    const words = display.split(/\s+/).filter(w => w.length >= 2)

    if (words.length >= 2) return true
  }

  return false
}

/**
 * Evaluate eligibility verdict for a SCIM CREATE candidate.
 *
 * Returns discriminated union. Caller dispatches by `eligible` + (when false) `outcome`.
 * - eligible=true → run primitive (provision identity + member + membership)
 * - eligible=false, outcome=reject → reject SCIM CREATE entirely
 * - eligible=false, outcome=client_user_only → create client_user only, NO member
 */
export const evaluateInternalCollaboratorEligibility = (input: EligibilityInput): EligibilityVerdict => {
  // 1. Deny override (gana sobre todo)
  const denyMatch = findOverride(input.overrides, 'deny', input.email, input.externalId, input.upn)

  if (denyMatch) {
    return { eligible: false, outcome: 'reject', reason: 'admin_blocklist', overrideId: denyMatch.overrideId }
  }

  // 2. Allow override (bypass L1/L2/L3)
  const allowMatch = findOverride(input.overrides, 'allow', input.email, input.externalId, input.upn)

  if (allowMatch) {
    return { eligible: true, reason: 'admin_allowlist', overrideId: allowMatch.overrideId }
  }

  // 3. L1 hard reject
  if (isExternalGuest(input.upn)) {
    return { eligible: false, outcome: 'reject', reason: 'external_guest' }
  }

  if (!isDomainAllowed(input.email, input.allowedDomains)) {
    return { eligible: false, outcome: 'reject', reason: 'external_guest' }
  }

  // 4. L2 funcional regex
  const matchedPattern = matchFunctionalPattern(input.email)

  if (matchedPattern) {
    return { eligible: false, outcome: 'client_user_only', reason: 'functional_account', matchedPattern: matchedPattern.source }
  }

  // 5. L3 name shape
  if (!hasSufficientNameShape(input.displayName, input.givenName, input.familyName)) {
    return { eligible: false, outcome: 'client_user_only', reason: 'name_shape_insufficient' }
  }

  // 6. Default — humano colaborador elegible
  return { eligible: true, reason: 'human_collaborator' }
}
