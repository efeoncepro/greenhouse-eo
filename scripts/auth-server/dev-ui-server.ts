/** TASK-1835 visual harness: real renderers, fictional DTOs, no authentication or command execution. */
import { createServer } from 'node:http'

import { internalLoginFailureResponse } from '../../src/lib/auth-server/internal/login-error-page'

import { htmlResponse } from '../../src/lib/auth-server/oauth/http'
import { getAuthFontAsset } from '../../src/lib/auth-server/oauth/pages/assets'
import {
  renderConsentPage,
  renderErrorPage,
  renderLoginRequiredPage
} from '../../src/lib/auth-server/oauth/pages/render'
import { renderStepUpPage } from '../../src/lib/auth-server/persons/step-up-page'
import {
  renderAccessRevokedPage,
  renderInvitationAcceptedPage,
  renderLinkProblemPage,
  renderLoginPageResponse,
  renderMagicLinkSentPage,
  renderRateLimitedPage,
  renderSessionClosedPage,
  renderSessionStartedPage
} from '../../src/lib/auth-server/persons/pages'

const host = '127.0.0.1'
const port = 19036
const authority = `${host}:${port}`
// This return path is inert: the harness has no OAuth route or command handler.
const returnTo = '/oauth/authorize?client_id=visual-fixture&scope=efeonce.mcp.read'

/** `/login` se sirve por el constructor canónico: su nonce y su `script-src` son los reales. */
const loginFixtures = new Map<string, () => ReturnType<typeof renderLoginPageResponse>>([
  ['/login', () => renderLoginPageResponse(200, { returnTo, internalLoginUrl: '/noop/microsoft' })],
  ['/login/external', () => renderLoginPageResponse(200, { returnTo })],
  [
    '/login/invalid-email',
    () => renderLoginPageResponse(400, { returnTo, internalLoginUrl: '/noop/microsoft', error: 'invalid_email' })
  ]
])

const renderers = new Map<string, () => string>([
  [
    '/consent',
    () =>
      renderConsentPage({
        clientName: 'Asistente de proyectos y análisis de visibilidad · ejemplo ficticio',
        clientId: 'https://application.example.invalid/cliente-de-demostracion',
        scopes: ['efeonce.mcp.read', 'efeonce.mcp.seo.write'],
        organizations: [
          {
            organizationName: 'Organización de ejemplo con un nombre extenso para revisión visual',
            capabilities: ['growth.seo.observation.read', 'growth.seo.target.configure']
          }
        ],
        returnTo,
        actionPath: '/noop/consent',
        redirectHost: 'application.example.invalid'
      })
  ],
  [
    '/consent/multiple',
    () =>
      renderConsentPage({
        clientName: 'Asistente ficticio',
        clientId: 'https://application.example.invalid/demo',
        scopes: ['efeonce.mcp.read'],
        organizations: [
          { organizationName: 'Organización de ejemplo A', capabilities: ['growth.seo.observation.read'] },
          { organizationName: 'Organización de ejemplo B', capabilities: ['growth.seo.observation.read'] }
        ],
        returnTo,
        actionPath: '/noop/consent',
        redirectHost: 'application.example.invalid'
      })
  ],
  ['/error/missing', () => renderLoginRequiredPage(returnTo)],
  ['/error/invalid-client', () => renderErrorPage('invalid_client')],
  ['/error/access-denied', () => renderErrorPage('access_denied')],
  ['/error/unavailable', () => renderErrorPage('temporarily_unavailable')],
  ['/error/rate-limited', renderRateLimitedPage],
  ['/magic-link/sent', renderMagicLinkSentPage],
  ['/magic-link/expired', () => renderLinkProblemPage('expired')],
  ['/magic-link/used', () => renderLinkProblemPage('already_used')],
  ['/invitation/accepted', renderInvitationAcceptedPage],
  ['/access/revoked', renderAccessRevokedPage],
  ['/session/started', renderSessionStartedPage],
  ['/session/closed', renderSessionClosedPage]
])

const server = createServer((request, response) => {
  if (request.headers.host !== authority) {
    response.writeHead(421)
    response.end()
    
return
  }

  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' })
    response.end()
    
return
  }

  // Exact paths: no arbitrary filesystem lookup, query-driven fixtures or redirects.
  const path = request.url ?? ''

  if (path === '/internal-error') {
    const result = internalLoginFailureResponse(
      {
        method: 'GET',
        url: new URL('http://127.0.0.1:19036/auth/internal/callback?error_description=hostile-fixture-not-for-display'),
        headers: { get: name => (name.toLowerCase() === 'accept' ? 'text/html' : null) },
        body: ''
      },
      400,
      'upstream_rejected'
    )

    response.writeHead(result.status, result.headers)
    response.end(result.body)
    
return
  }

  const loginFixture = loginFixtures.get(path)

  if (loginFixture) {
    const result = loginFixture()

    response.writeHead(result.status, {
      ...result.headers,
      'X-Auth-UI-Harness': 'fictional-fixtures-no-authentication'
    })
    response.end(result.body)

    return
  }

  if (path === '/step-up' || path === '/step-up/enroll') {
    const hasFactors = path === '/step-up'
    const result = renderStepUpPage({ returnTo, authLevel: 'primary', hasTotp: hasFactors, hasPasskey: hasFactors })

    // Preserve the real renderer nonce/CSP. POSTs from its controller remain blocked above.
    response.writeHead(result.status, {
      ...result.headers,
      'X-Auth-UI-Harness': 'fictional-fixtures-no-authentication'
    })
    response.end(result.body)
    
return
  }

  const asset = getAuthFontAsset(path)

  if (asset) {
    response.writeHead(200, {
      'Content-Type': asset.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    })
    response.end(asset.body)
    
return
  }

  const render = renderers.get(path)

  if (!render) {
    response.writeHead(404, { 'Cache-Control': 'no-store' })
    response.end('Visual harness: route unavailable')
    
return
  }

  const result = htmlResponse(200, render(), { 'X-Auth-UI-Harness': 'fictional-fixtures-no-authentication' })

  response.writeHead(result.status, result.headers)
  response.end(result.body)
})

server.requestTimeout = 5000
server.headersTimeout = 5000
server.listen(port, host, () =>
  console.log(`TASK-1835 visual harness: http://${authority}/login (fictional fixtures; no authentication)`)
)
