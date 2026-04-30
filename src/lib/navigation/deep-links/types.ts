export type GreenhouseDeepLinkKind =
  | 'home'
  | 'ops_health'
  | 'person'
  | 'quote'
  | 'income'
  | 'expense'
  | 'leave_request'
  | 'payroll_period'
  | 'public_quote_share'

export type GreenhouseDeepLinkAction = 'view' | 'edit' | 'review' | 'open'

export type GreenhouseDeepLinkAudience = 'internal' | 'public' | 'api_app' | 'teams' | 'email'

export type GreenhouseDeepLinkStatus = 'resolved' | 'fallback' | 'forbidden' | 'not_found' | 'invalid_reference'

export type GreenhouseDeepLinkPrimitive = string | number | boolean | null | undefined

export type GreenhouseDeepLinkParams = Record<string, GreenhouseDeepLinkPrimitive>

export type GreenhouseDeepLinkAccessPlane = 'views' | 'entitlements' | 'startup_policy' | 'public_share'

export type GreenhouseDeepLinkCapabilityRequirement = {
  capability: string
  actions: string[]
  scope?: string | null
}

export type GreenhouseDeepLinkCapabilityGrant = {
  capability: string
  actions?: string[] | null
  scope?: string | null
}

export type GreenhouseDeepLinkAccess = {
  planes: GreenhouseDeepLinkAccessPlane[]
  viewCode: string | null
  routeGroup: string | null
  requiredCapabilities: GreenhouseDeepLinkCapabilityRequirement[]
  notes?: string[]
}

export type GreenhouseDeepLinkPreview = {
  label?: string
  description?: string
}

export type GreenhouseDeepLinkReference = {
  kind: GreenhouseDeepLinkKind
  id?: string
  action?: GreenhouseDeepLinkAction
  params?: GreenhouseDeepLinkParams
  audience?: GreenhouseDeepLinkAudience
}

export type GreenhouseDeepLinkAccessContext = {
  authorizedViews?: string[] | null
  capabilityGrants?: GreenhouseDeepLinkCapabilityGrant[] | null
}

export type GreenhouseDeepLinkResolutionContext = {
  baseUrl?: string | null
  env?: NodeJS.ProcessEnv
  portalHomePath?: string | null
  access?: GreenhouseDeepLinkAccessContext | null
}

export type GreenhouseResolvedDeepLink = {
  status: GreenhouseDeepLinkStatus
  href: string
  absoluteUrl: string
  canonicalPath: string
  fallbackHref?: string
  access: GreenhouseDeepLinkAccess
  preview?: GreenhouseDeepLinkPreview
  kind: GreenhouseDeepLinkKind
  action: GreenhouseDeepLinkAction
  audience: GreenhouseDeepLinkAudience
}

export type GreenhouseDeepLinkBuildResult = {
  href: string
  canonicalPath?: string
  fallbackHref?: string
  preview?: GreenhouseDeepLinkPreview
}

export type GreenhouseDeepLinkDefinition = {
  kind: GreenhouseDeepLinkKind
  defaultAction: GreenhouseDeepLinkAction
  supportedActions: GreenhouseDeepLinkAction[]
  fallbackHref: string
  access: (reference: GreenhouseDeepLinkReference) => GreenhouseDeepLinkAccess
  build: (
    reference: GreenhouseDeepLinkReference,
    context: GreenhouseDeepLinkResolutionContext
  ) => GreenhouseDeepLinkBuildResult | null
}
