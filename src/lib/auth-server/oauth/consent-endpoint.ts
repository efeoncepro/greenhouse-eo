import type { ConsentContextPort } from './consent-context'
/**
 * `POST /oauth/consent` (TASK-1829): materializa la decisión de la pantalla de consentimiento.
 *
 * Exige persona autenticada (SubjectSessionPort) y origen del propio emisor (`Origin`/`Referer`
 * same-origin + `Sec-Fetch-Site`); el formulario trae `client_id`, `scope`, `return_to` (path + query del
 * authorize original, mismo origen) y `decision` (`allow` | `deny`). `allow` ejecuta el command
 * `grantClientConsent` y vuelve a `return_to`; `deny` redirige al cliente con `access_denied`.
 */

import { buildRequestAuditContext } from './audit'
import { assertScopesAllowedForClient, loopbackPolicyFor, resolveAuthorizeRedirectUri, resolveClient, type ClientResolverDeps } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { grantClientConsent } from './consent'
import { OAuthProtocolError, isOAuthProtocolError } from './errors'
import type { GrantsVersionPort } from './grants'
import { htmlResponse, isFormContentType, parseFormBody, redirectResponse, requestOrigin, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { OAUTH_ENDPOINT_PATHS } from './metadata'
import { renderErrorPage, renderLoginRequiredPage, renderStepUpRequiredPage } from './pages/render'
import { isKnownScope, isWriteScope } from './scopes'
import type { OAuthStorePort } from './store/port'
import type { SubjectSessionPort } from './subject'

export type ConsentEndpointDeps = {
  store: OAuthStorePort
  config: AuthServerOAuthConfig
  subjectPort: SubjectSessionPort
  consentContextPort: ConsentContextPort
  grantsPort: GrantsVersionPort
  cimd: ClientResolverDeps['cimd']
  now?: () => Date
}

const isSameOriginSubmission = (request: OAuthHttpRequest, issuer: string): boolean => {
  const fetchSite = request.headers.get('sec-fetch-site')

  if (fetchSite && fetchSite !== 'same-origin') return false

  const origin = requestOrigin(request)

  return origin === null ? Boolean(fetchSite) : origin === issuer
}

export const handleConsent = async (request: OAuthHttpRequest, deps: ConsentEndpointDeps): Promise<OAuthHttpResponse> => {
  const audit = buildRequestAuditContext(request.headers)

  try {
    if (request.method !== 'POST' || !isFormContentType(request)) {
      throw new OAuthProtocolError('invalid_request', { description: 'POST form required', reason: 'method_or_content_type' })
    }

    if (!isSameOriginSubmission(request, deps.config.issuer)) {
      throw new OAuthProtocolError('invalid_request', { description: 'cross-origin submission', reason: 'csrf_origin' })
    }

    const form = parseFormBody(request.body)

    if (form.has('__duplicate__')) throw new OAuthProtocolError('invalid_request', { reason: 'duplicate_param' })

    const clientId = form.get('client_id')?.trim()
    const returnTo = form.get('return_to')?.trim()
    const decision = form.get('decision')
    const scopes = (form.get('scope') ?? '').split(/\s+/).filter(Boolean)

    if (!clientId || !returnTo || !returnTo.startsWith(`${OAUTH_ENDPOINT_PATHS.authorize}?`) || returnTo.includes('://')) {
      throw new OAuthProtocolError('invalid_request', { description: 'client_id and return_to required', reason: 'form_fields' })
    }

    if (scopes.length === 0 || scopes.some(scope => !isKnownScope(scope))) {
      throw new OAuthProtocolError('invalid_scope', { description: 'unknown scope', reason: 'unknown_scope' })
    }

    const client = await resolveClient(clientId, { store: deps.store, config: deps.config, cimd: deps.cimd })

    const original = new URL(returnTo, deps.config.issuer)
    const originalScopes = (original.searchParams.get('scope') ?? 'efeonce.mcp.read').split(/\s+/).filter(Boolean)

    if (original.origin !== deps.config.issuer || original.pathname !== OAUTH_ENDPOINT_PATHS.authorize ||
        original.hash || original.searchParams.get('client_id') !== client.clientId ||
        [...original.searchParams.keys()].some(key => original.searchParams.getAll(key).length > 1) ||
        originalScopes.length !== scopes.length || originalScopes.some(scope => !scopes.includes(scope)) ||
        (original.searchParams.has('resource') && original.searchParams.get('resource') !== deps.config.mcpAudience) ||
        (decision !== 'allow' && decision !== 'deny')) {
      throw new OAuthProtocolError('invalid_request', { reason: 'consent_request_mismatch' })
    }

    assertScopesAllowedForClient(client, scopes)
    const requestedRedirect = original.searchParams.get('redirect_uri') ?? ''
    const redirectUri = resolveAuthorizeRedirectUri(client, requestedRedirect, loopbackPolicyFor(deps.config))

    if (!redirectUri) throw new OAuthProtocolError('invalid_redirect_uri', { reason: 'redirect_uri_unregistered' })

    const subject = await deps.subjectPort.resolve(request, { clientId: client.clientId, audience: deps.config.mcpAudience })

    if (!subject || subject.environmentId !== deps.config.environmentId) return htmlResponse(401, renderLoginRequiredPage())

    if (decision === 'allow') {
      // Revalidate the factor at submission: the consent screen may outlive its freshness.
      if (scopes.some(isWriteScope) && subject.authLevel !== 'step_up') {
        return htmlResponse(403, renderStepUpRequiredPage(returnTo))
      }

      const grants = await deps.grantsPort.resolve({
        subject: subject.subject,
        environmentId: subject.environmentId,
        clientId: client.clientId,
        authorizationContextId: subject.authorizationContextId
      }).catch(() => null)

      if (!grants?.bound) {
        throw new OAuthProtocolError('access_denied', { reason: 'binding_unavailable' })
      }

      const consentContext = await deps.consentContextPort.resolve({
        environmentId: subject.environmentId,
        subject: subject.subject,
        clientId: client.clientId,
        audience: deps.config.mcpAudience,
        authorizationContextId: subject.authorizationContextId
      }).catch(() => ({ outcome: 'unavailable' as const }))

      if (consentContext.outcome !== 'resolved' || consentContext.organizations.length === 0) {
        throw new OAuthProtocolError(consentContext.outcome === 'unavailable' ? 'temporarily_unavailable' : 'access_denied', {
          reason: 'consent_context_unavailable'
        })
      }

      await grantClientConsent(
        { authorizationContextId: subject.authorizationContextId ?? null, subject: subject.subject, environmentId: subject.environmentId, clientId: client.clientId, scopes, actor: subject.subject, via: 'authorize_screen' },
        { store: deps.store, now: deps.now, audit }
      )

      return redirectResponse(`${deps.config.issuer}${returnTo}`)
    }

    // Validated client redirect for explicit denial.
    const target = new URL(redirectUri)
    const state = original.searchParams.get('state')

    target.searchParams.set('error', 'access_denied')
    if (state) target.searchParams.set('state', state)
    target.searchParams.set('iss', deps.config.issuer)

    return redirectResponse(target.toString())
  } catch (error) {
    if (isOAuthProtocolError(error)) return htmlResponse(error.statusCode, renderErrorPage(error.code))

    throw error
  }
}
