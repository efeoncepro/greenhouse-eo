/**
 * `POST /oauth/consent` (TASK-1829): materializa la decisión de la pantalla de consentimiento.
 *
 * Exige persona autenticada (SubjectSessionPort) y origen del propio emisor (`Origin`/`Referer`
 * same-origin + `Sec-Fetch-Site`); el formulario trae `client_id`, `scope`, `return_to` (path + query del
 * authorize original, mismo origen) y `decision` (`allow` | `deny`). `allow` ejecuta el command
 * `grantClientConsent` y vuelve a `return_to`; `deny` redirige al cliente con `access_denied`.
 */

import { buildRequestAuditContext } from './audit'
import { loopbackPolicyFor, resolveAuthorizeRedirectUri, resolveClient, type ClientResolverDeps } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { grantClientConsent } from './consent'
import { OAuthProtocolError, isOAuthProtocolError } from './errors'
import { htmlResponse, isFormContentType, parseFormBody, redirectResponse, requestOrigin, type OAuthHttpRequest, type OAuthHttpResponse } from './http'
import { OAUTH_ENDPOINT_PATHS } from './metadata'
import { renderErrorPage, renderLoginRequiredPage } from './pages/render'
import { isKnownScope } from './scopes'
import type { OAuthStorePort } from './store/port'
import type { SubjectSessionPort } from './subject'

export type ConsentEndpointDeps = {
  store: OAuthStorePort
  config: AuthServerOAuthConfig
  subjectPort: SubjectSessionPort
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

    const subject = await deps.subjectPort.resolve(request)

    if (!subject || subject.environmentId !== deps.config.environmentId) return htmlResponse(401, renderLoginRequiredPage())

    const form = parseFormBody(request.body)
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

    if (decision === 'allow') {
      await grantClientConsent(
        { subject: subject.subject, environmentId: subject.environmentId, clientId: client.clientId, scopes, actor: subject.subject, via: 'authorize_screen' },
        { store: deps.store, now: deps.now, audit }
      )

      return redirectResponse(`${deps.config.issuer}${returnTo}`)
    }

    // deny → de vuelta al cliente con access_denied (redirect_uri validado contra el registro).
    const original = new URL(`${deps.config.issuer}${returnTo}`)
    const requestedRedirect = original.searchParams.get('redirect_uri') ?? ''
    const redirectUri = resolveAuthorizeRedirectUri(client, requestedRedirect, loopbackPolicyFor(deps.config))

    if (!redirectUri) throw new OAuthProtocolError('invalid_redirect_uri', { description: 'redirect_uri not registered', reason: 'redirect_uri_unregistered' })

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
