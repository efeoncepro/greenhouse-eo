import type { ConsentContextResolution } from '../consent-context'
/**
 * Páginas HTML nativas del emisor: CSS generado bajo hash CSP y marca del SSOT.
 * El login usa V4 (TASK-2064). Todo lo demás —consentimiento, step-up, segundo factor, enlaces, sesión y errores—
 * usa el shell con la órbita aprobado el 2026-11-02 (`./orbit-shell`): formulario en papel y panel oscuro.
 * Los controladores se agregan con nonce desde persons/*, sin runtime React/Next.
 */

import { GH_AUTH_SERVER } from '@/lib/copy/auth-server'
import { AUTH_ORBIT_COPY, headingText, type OrbitHeading } from '@/lib/copy/auth-server-orbit'

import type { OAuthErrorCode } from '../errors'
import { renderClientMark } from './client-marks'
import { AUTH_SERVER_STYLES } from './styles.generated'
import { isWriteScope } from '../scopes'
import { renderLoginV4Body, type LoginPresentation } from './login-v4'
import { orbitBrand, orbitFootnote, orbitHeading, orbitHint, renderOrbitPanel, type OrbitPanel } from './orbit-shell'

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

const STYLES = AUTH_SERVER_STYLES

/**
 * Ficha de la aplicación que pide acceso.
 *
 * Cuando el origen del cliente no es comprobable no basta con no prestarle el logo: alguien que
 * llega desde una app llamada «Claude Desktop» puede leer el monograma como «el logo no cargó». La
 * ficha lo dice, con el hecho y no con una acusación, y el aviso va antes de la decisión.
 */
const clientContext = (clientName: string, clientId: string): string => {
  const mark = renderClientMark({ clientId, clientName })

  return `<div class="os-section" data-capture="id-client">
      <div class="os-card">${mark.html}<span><span class="os-label">${escapeHtml(AUTH_ORBIT_COPY.consent.clientLabel)}</span><strong class="os-value">${escapeHtml(clientName)}</strong></span>${mark.verified ? '' : `<span class="os-badge">${escapeHtml(AUTH_ORBIT_COPY.consent.unverifiedBadge)}</span>`}</div>
      ${mark.verified ? '' : `<p class="os-warning" data-capture="id-client-unverified"><strong>${escapeHtml(GH_AUTH_SERVER.application_unverified_label)}.</strong> ${escapeHtml(GH_AUTH_SERVER.application_unverified_hint)}</p>`}
    </div>`
}

export type LayoutOptions = {
  state?: 'login' | 'consent' | 'verification'
  /** Titular con la órbita; si falta, el body trae el suyo (sólo el login V4). */
  heading?: OrbitHeading
  /** Panel de escritorio. Por defecto, la órbita alrededor del ícono de seguridad. */
  panel?: OrbitPanel
  /** Pantallas cortas centradas; las de listas largas, alineadas a la izquierda. */
  align?: 'center' | 'start'
  clientName?: string
  clientId?: string
} & LoginPresentation

export const layout = (title: string, body: string, options: LayoutOptions = {}): string => {
  const state = options.state ?? 'verification'

  return `<!doctype html>
<html lang="${GH_AUTH_SERVER.page_lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<title>${escapeHtml(title)} · ${escapeHtml(GH_AUTH_SERVER.brand_title)}</title>
<style>${STYLES}</style>
</head>
${state === 'login' ? `<body>\n${renderLoginV4Body(body, options)}` : `<body class="os-body">
<div class="os-root" data-state="${state}">
  <main class="os-main" data-capture="id-shell" data-state="${state}" data-surface-recipe="orbitFlow" aria-labelledby="page-title">
    <div class="os-form" data-align="${options.align ?? 'center'}">
      ${orbitBrand()}
      ${options.heading ? orbitHeading(options.heading) : ''}
      ${options.clientName ? clientContext(options.clientName, options.clientId ?? '') : ''}
      <div class="os-surface">${body}</div>
    </div>
  </main>
  ${renderOrbitPanel(options.panel ?? { kind: 'icon', glyph: 'seguridad' })}
</div>`}
</body>
</html>`
}

/**
 * La salida SIEMPRE existe. Sin `returnTo` esta página mostraba el texto y ninguna acción: un
 * callejón sin salida servido con 401 (lo alcanzaba `consent-endpoint`). Sin destino de retorno se
 * va igual a `/login`, que es lo que la persona necesita; con destino, se preserva.
 */
export const renderLoginRequiredPage = (returnTo?: string): string => {
  const copy = AUTH_ORBIT_COPY.loginRequired

  return layout(
    headingText(copy.heading),
    `<p>${escapeHtml(copy.body)}</p>
  <div class="id-actions" data-capture="id-actions"><a class="id-primary" href="${escapeHtml(returnTo ? '/login?' + new URLSearchParams({ return_to: returnTo }) : '/login')}">${escapeHtml(GH_AUTH_SERVER.login_continue_cta)}</a></div>
  ${orbitFootnote(AUTH_ORBIT_COPY.footnoteNotInitiated)}`,
    { heading: copy.heading, panel: { kind: 'icon', glyph: 'integracion' } }
  )
}

export const renderStepUpRequiredPage = (returnTo?: string): string => {
  const copy = AUTH_ORBIT_COPY.stepUpRequired

  return layout(
    headingText(copy.heading),
    `<p>${escapeHtml(copy.body)}</p>
  ${orbitHint(copy.hint)}
  <div class="id-actions" data-capture="id-actions"><a class="id-primary" href="${escapeHtml(returnTo ? '/login/step-up?' + new URLSearchParams({ return_to: returnTo }) : '/login/step-up')}">${escapeHtml(copy.cta)}</a></div>
  ${orbitFootnote(copy.footnote)}`,
    { heading: copy.heading, panel: { kind: 'icon', glyph: 'seguridad' } }
  )
}

export type ConsentPageInput = {
  authorizationContextId?: string | null
  authorizationContextVersion?: 1 | 2
  authorityClass?: 'internal_multi_org'
  moreOrganizationsAvailable?: boolean
  organizations: Extract<ConsentContextResolution, { outcome: 'resolved' }>['organizations']
  clientName: string
  clientId: string
  scopes: readonly string[]
  /** Path + query del authorize original (mismo origen) al que se vuelve tras consentir. */
  returnTo: string
  actionPath: string
  /**
   * TASK-1837 — HOST del `redirect_uri` ya validado contra el cliente (host, no la URL completa: la
   * query puede llevar `state`). Obligatorio: el consentimiento NUNCA se renderiza sin decir a dónde
   * va el código (MUST del protocolo MCP/OAuth; `render.test.ts`).
   */
  redirectHost: string
}

export const renderConsentPage = (input: ConsentPageInput): string => {
  if (typeof input.redirectHost !== 'string' || input.redirectHost.trim().length === 0) {
    throw new Error('renderConsentPage requires redirectHost: consent must disclose the authorization destination')
  }

  const multiOrg = input.authorityClass === 'internal_multi_org'

  if (multiOrg && (input.authorizationContextVersion !== 2 || !input.authorizationContextId || !input.organizations.length)) {
    throw new Error('multi_org_consent_context_required')
  }

  const organizationItems = input.organizations.map(organization => `<li class="os-org">
    <strong>${escapeHtml(organization.organizationName)}</strong>
    <details><summary>${escapeHtml(GH_AUTH_SERVER.consent_capabilities_label)}</summary>
      <ul>${organization.capabilities.map(capability => `<li><code>${escapeHtml(capability)}</code></li>`).join('')}</ul>
    </details>
  </li>`).join('')

  // Lectura y escritura se distinguen por el TEXTO del chip, no por un color: el teal no va en texto ni en fondos.
  const scopeItems = input.scopes
    .map(scope => {
      const description = GH_AUTH_SERVER.scope_descriptions[scope] ?? GH_AUTH_SERVER.scope_description_fallback(scope)
      const write = isWriteScope(scope)

      return `<li data-kind="${write ? 'write' : 'read'}"><span class="os-chip" data-kind="${write ? 'write' : 'read'}">${escapeHtml(write ? GH_AUTH_SERVER.scope_write_label : GH_AUTH_SERVER.scope_read_label)}</span><p class="os-scope-desc">${escapeHtml(description)}</p><span class="os-scope-code">${escapeHtml(scope)}</span></li>`
    })
    .join('\n    ')

  const copy = AUTH_ORBIT_COPY.consent

  return layout(
    headingText(copy.heading),
    `<p>${escapeHtml(multiOrg ? GH_AUTH_SERVER.consent_multi_org_intro : GH_AUTH_SERVER.consent_context_intro(input.organizations.length))}</p>
  <div class="os-text-left os-surface">
  <p class="os-card-stack" data-capture="id-redirect-host"><span class="os-label">${escapeHtml(GH_AUTH_SERVER.consent_redirect_host_label)}</span> <strong class="os-value">${escapeHtml(input.redirectHost.trim())}</strong> <span class="os-label">${escapeHtml(GH_AUTH_SERVER.consent_redirect_host_hint)}</span></p>
  <section class="os-section">
  <h2 class="os-section-title">${escapeHtml(multiOrg ? GH_AUTH_SERVER.consent_multi_org_organizations_label : input.organizations.length === 1 ? GH_AUTH_SERVER.consent_organization_label : GH_AUTH_SERVER.consent_organizations_label)}</h2>
  <ul class="os-list" data-capture="id-organizations" aria-label="${escapeHtml(GH_AUTH_SERVER.consent_organizations_label)}">${organizationItems}</ul>
  ${multiOrg ? `<p class="os-code" data-capture="id-multi-org-authority">${escapeHtml(GH_AUTH_SERVER.consent_multi_org_boundary)}</p>${input.moreOrganizationsAvailable ? `<p class="os-code">${escapeHtml(GH_AUTH_SERVER.consent_multi_org_more)}</p>` : ''}` : ''}
  </section>
  <section class="os-section">
  <h2 class="os-section-title">${escapeHtml(copy.scopesTitle(input.scopes.length))}</h2>
  <ul class="os-list" data-capture="id-scopes" aria-label="${escapeHtml(GH_AUTH_SERVER.consent_scope_label)}">
    ${scopeItems}
  </ul>
  </section>
  <form method="post" action="${escapeHtml(input.actionPath)}" data-capture="id-form">
    <input type="hidden" name="client_id" value="${escapeHtml(input.clientId)}">
    <input type="hidden" name="scope" value="${escapeHtml(input.scopes.join(' '))}">
    ${input.authorizationContextId ? `<input type="hidden" name="authorization_context_id" value="${escapeHtml(input.authorizationContextId)}"><input type="hidden" name="authorization_context_version" value="${input.authorizationContextVersion ?? 1}">` : ''}
    <input type="hidden" name="return_to" value="${escapeHtml(input.returnTo)}">
    <div class="actions" data-capture="id-actions">
      <button class="secondary" type="submit" name="decision" value="deny">${escapeHtml(GH_AUTH_SERVER.consent_deny_cta)}</button>
      <button class="primary" type="submit" name="decision" value="allow">${escapeHtml(GH_AUTH_SERVER.consent_allow_cta)}</button>
    </div>
  </form>
  </div>
  <p class="os-footnote">${escapeHtml(GH_AUTH_SERVER.consent_footer)} ${escapeHtml(GH_AUTH_SERVER.consent_client_id_label)}: ${escapeHtml(input.clientId)}</p>`,
    { state: 'consent', heading: copy.heading, clientName: input.clientName, clientId: input.clientId, panel: { kind: 'icon', glyph: 'integracion' } }
  )
}

const ERROR_BODIES: Partial<Record<OAuthErrorCode, string>> = {
  invalid_client: GH_AUTH_SERVER.error_invalid_client_body,
  invalid_redirect_uri: GH_AUTH_SERVER.error_invalid_redirect_body,
  access_denied: GH_AUTH_SERVER.error_access_denied_body,
  slow_down: GH_AUTH_SERVER.error_rate_limited_body
}

/**
 * Sin acción a propósito: el emisor no sabe a dónde volver cuando la solicitud de la aplicación no es válida
 * (`page-contract.test.ts`). La salida es la propia aplicación, y el texto lo dice.
 */
export const renderErrorPage = (code: OAuthErrorCode): string => {
  const copy = AUTH_ORBIT_COPY.error

  return layout(
    headingText(copy.heading),
    `<p class="os-alert" role="alert" data-capture="id-status">${escapeHtml(ERROR_BODIES[code] ?? GH_AUTH_SERVER.error_generic_body)}</p>
  <p>${escapeHtml(copy.recovery)}</p>
  <p class="os-footnote os-code">${escapeHtml(GH_AUTH_SERVER.error_code_label)}: <strong>${escapeHtml(code)}</strong></p>`,
    { heading: copy.heading, panel: { kind: 'word', lines: AUTH_ORBIT_COPY.errorWord } }
  )
}
