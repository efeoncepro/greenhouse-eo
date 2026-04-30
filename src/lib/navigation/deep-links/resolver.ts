import { evaluateGreenhouseDeepLinkAccess } from './access'
import { joinGreenhouseAbsoluteUrl, resolveGreenhouseBaseUrl } from './base-url'
import { getGreenhouseDeepLinkDefinition } from './registry'
import type {
  GreenhouseDeepLinkAccess,
  GreenhouseDeepLinkAction,
  GreenhouseDeepLinkAudience,
  GreenhouseDeepLinkReference,
  GreenhouseDeepLinkResolutionContext,
  GreenhouseResolvedDeepLink
} from './types'

const DEFAULT_FALLBACK_HREF = '/home'

const EMPTY_ACCESS: GreenhouseDeepLinkAccess = {
  planes: [],
  viewCode: null,
  routeGroup: null,
  requiredCapabilities: [],
  notes: ['Definition missing; fallback applied.']
}

const normalizeAudience = (reference: GreenhouseDeepLinkReference): GreenhouseDeepLinkAudience =>
  reference.audience || (reference.kind === 'public_quote_share' ? 'public' : 'internal')

const normalizeAction = (
  supportedActions: GreenhouseDeepLinkAction[],
  fallbackAction: GreenhouseDeepLinkAction,
  candidate?: GreenhouseDeepLinkAction
) => {
  if (candidate && supportedActions.includes(candidate)) {
    return candidate
  }

  return fallbackAction
}

const buildResolvedTarget = ({
  kind,
  action,
  audience,
  status,
  href,
  fallbackHref,
  access,
  preview,
  context
}: {
  kind: GreenhouseDeepLinkReference['kind']
  action: GreenhouseDeepLinkAction
  audience: GreenhouseDeepLinkAudience
  status: GreenhouseResolvedDeepLink['status']
  href: string
  fallbackHref?: string
  access: GreenhouseDeepLinkAccess
  preview?: GreenhouseResolvedDeepLink['preview']
  context: GreenhouseDeepLinkResolutionContext
}): GreenhouseResolvedDeepLink => {
  const absoluteUrl = joinGreenhouseAbsoluteUrl(resolveGreenhouseBaseUrl(context), href)
  const canonicalPath = /^https?:\/\//i.test(href) ? new URL(href).pathname : href.split('?')[0] || '/'

  return {
    status,
    href,
    absoluteUrl,
    canonicalPath,
    fallbackHref,
    access,
    preview,
    kind,
    action,
    audience
  }
}

export const resolveGreenhouseDeepLink = (
  reference: GreenhouseDeepLinkReference,
  context: GreenhouseDeepLinkResolutionContext = {}
): GreenhouseResolvedDeepLink => {
  const definition = getGreenhouseDeepLinkDefinition(reference.kind)
  const audience = normalizeAudience(reference)

  if (!definition) {
    return buildResolvedTarget({
      kind: reference.kind,
      action: reference.action || 'view',
      audience,
      status: 'invalid_reference',
      href: DEFAULT_FALLBACK_HREF,
      fallbackHref: DEFAULT_FALLBACK_HREF,
      access: EMPTY_ACCESS,
      context
    })
  }

  const action = normalizeAction(definition.supportedActions, definition.defaultAction, reference.action)
  const normalizedReference: GreenhouseDeepLinkReference = { ...reference, action, audience }
  const access = definition.access(normalizedReference)
  const buildResult = definition.build(normalizedReference, context)

  if (!buildResult) {
    return buildResolvedTarget({
      kind: definition.kind,
      action,
      audience,
      status: 'invalid_reference',
      href: definition.fallbackHref,
      fallbackHref: definition.fallbackHref,
      access,
      context
    })
  }

  const accessEvaluation = evaluateGreenhouseDeepLinkAccess(access, context.access)

  if (accessEvaluation === false) {
    return buildResolvedTarget({
      kind: definition.kind,
      action,
      audience,
      status: 'forbidden',
      href: buildResult.fallbackHref || definition.fallbackHref,
      fallbackHref: buildResult.fallbackHref || definition.fallbackHref,
      access,
      preview: buildResult.preview,
      context
    })
  }

  return buildResolvedTarget({
    kind: definition.kind,
    action,
    audience,
    status: 'resolved',
    href: buildResult.href,
    fallbackHref: buildResult.fallbackHref || definition.fallbackHref,
    access,
    preview: buildResult.preview,
    context
  })
}
