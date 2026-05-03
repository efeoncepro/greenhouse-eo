import type {
  GreenhouseDeepLinkAccess,
  GreenhouseDeepLinkAccessContext,
  GreenhouseDeepLinkCapabilityGrant,
  GreenhouseDeepLinkCapabilityRequirement
} from './types'

const normalizeValues = (values?: string[] | null) => (Array.isArray(values) ? values.filter(Boolean) : [])

const normalizeCapabilityActions = (values?: string[] | null) => (Array.isArray(values) ? values.filter(Boolean) : [])

const matchesCapabilityRequirement = (
  grant: GreenhouseDeepLinkCapabilityGrant,
  requirement: GreenhouseDeepLinkCapabilityRequirement
) => {
  if (grant.capability !== requirement.capability) {
    return false
  }

  if (requirement.scope && grant.scope && requirement.scope !== grant.scope) {
    return false
  }

  const grantActions = normalizeCapabilityActions(grant.actions)

  if (grantActions.length === 0) {
    return true
  }

  return requirement.actions.every(action => grantActions.includes(action))
}

export const evaluateGreenhouseDeepLinkAccess = (
  access: GreenhouseDeepLinkAccess,
  context?: GreenhouseDeepLinkAccessContext | null
) => {
  if (!context) {
    return null
  }

  let evaluated = false
  let allowed = true

  if (access.viewCode) {
    const authorizedViews = normalizeValues(context.authorizedViews)

    if (authorizedViews.length > 0) {
      evaluated = true
      allowed = allowed && authorizedViews.includes(access.viewCode)
    }
  }

  if (access.requiredCapabilities.length > 0) {
    const capabilityGrants = Array.isArray(context.capabilityGrants) ? context.capabilityGrants : []

    if (capabilityGrants.length > 0) {
      evaluated = true
      allowed =
        allowed &&
        access.requiredCapabilities.every(requirement =>
          capabilityGrants.some(grant => matchesCapabilityRequirement(grant, requirement))
        )
    }
  }

  return evaluated ? allowed : null
}
