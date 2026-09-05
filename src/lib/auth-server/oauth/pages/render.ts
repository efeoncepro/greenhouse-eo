import type { ConsentContextResolution } from '../consent-context'
/**
 * Páginas HTML mínimas del emisor (TASK-1829): sin JS, CSS inline (CSP estricta), marca desde el
 * SSOT (`src/config/efeonce-brand.ts` + isotipo generado). La task ui-ux de login/consentimiento
 * reemplaza estas vistas; el contrato (rutas, campos del formulario, copy en `src/lib/copy/auth-server.ts`)
 * se mantiene.
 */

import { EFEONCE_BRAND_NAME } from '@/config/efeonce-brand'
import { GH_AUTH_SERVER } from '@/lib/copy/auth-server'

import type { OAuthErrorCode } from '../errors'
import { EFEONCE_ISOTIPO_SVG, EFEONCE_LOGOTYPE_NEGATIVE_SVG } from './efeonce-isotipo.generated'
import { renderClientMark } from './client-marks'
import { ICON_ALERT, ICON_ARROW_RIGHT, ICON_BUILDING, ICON_EYE, ICON_LOCK, ICON_PENCIL, ICON_SHIELD_CHECK } from './icons'
import { AUTH_SERVER_STYLES } from './styles.generated'
import { isWriteScope } from '../scopes'

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

const STYLES = AUTH_SERVER_STYLES

/**
 * Shell compartido de las páginas del emisor. Exportado para que la superficie de personas
 * (TASK-1830) use EXACTAMENTE la misma marca y CSP que las del protocolo, en vez de un segundo
 * layout que se desincronice.
 */
/**
 * Panel de marca del acceso. Sólo aparece en `/login` y sólo desde 64rem: es la primera pantalla que
 * ve alguien de fuera de Efeonce y lleva el logotipo institucional en negativo (SSOT
 * `public/branding/logo-negative.svg`), no una reconstrucción tipográfica. Va DESPUÉS del formulario
 * en el DOM —el orden visual lo pone CSS— para que el foco y los lectores de pantalla lleguen antes
 * al campo que al mensaje de marca.
 */
const brandRail = (): string => `<aside class="id-rail">
    <div class="id-rail-inner">
      <div class="id-rail-logo" role="img" aria-label="${escapeHtml(EFEONCE_BRAND_NAME)}">${EFEONCE_LOGOTYPE_NEGATIVE_SVG}</div>
      <p class="id-rail-kicker">${escapeHtml(GH_AUTH_SERVER.brand_title)}</p>
      <p class="id-rail-headline">${escapeHtml(GH_AUTH_SERVER.login_rail_headline)} <em>${escapeHtml(GH_AUTH_SERVER.login_rail_headline_accent)}</em>.</p>
      <p class="id-rail-body">${escapeHtml(GH_AUTH_SERVER.login_rail_body)}</p>
      <p class="id-rail-trust">${ICON_LOCK}<span>${escapeHtml(GH_AUTH_SERVER.login_rail_trust)}</span></p>
    </div>
    <span class="id-rail-mark" aria-hidden="true">${EFEONCE_ISOTIPO_SVG}</span>
  </aside>`

/**
 * Ficha de la aplicación que pide acceso.
 *
 * Cuando el origen del cliente no es comprobable no basta con no prestarle el logo: alguien que
 * llega desde una app llamada «Claude Desktop» puede leer el monograma como «el logo no cargó». La
 * ficha lo dice, con el hecho y no con una acusación, y el aviso va antes de la decisión.
 */
const clientContext = (clientName: string, clientId: string): string => {
  const mark = renderClientMark({ clientId, clientName })

  return `<div class="id-context" data-capture="id-client">
      <span class="id-muted">${escapeHtml(GH_AUTH_SERVER.application_context_label)}</span>
      <span class="id-client">${mark.html}<strong>${escapeHtml(clientName)}</strong></span>
      ${mark.verified ? '' : `<span class="id-unverified" data-capture="id-client-unverified">${ICON_ALERT}<span><strong>${escapeHtml(GH_AUTH_SERVER.application_unverified_label)}.</strong> ${escapeHtml(GH_AUTH_SERVER.application_unverified_hint)}</span></span>`}
    </div>`
}

export const layout = (
  title: string,
  body: string,
  options: { state?: 'login' | 'consent' | 'verification'; clientName?: string; clientId?: string } = {}
): string => {
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
<body>
<div class="id-canvas" data-state="${state}">
  <main class="id-page" data-capture="id-shell" data-state="${state}" data-surface-recipe="settingsFlow" aria-labelledby="page-title">
    <header class="id-brand" aria-label="${escapeHtml(EFEONCE_BRAND_NAME)}">${EFEONCE_ISOTIPO_SVG}<span>${escapeHtml(GH_AUTH_SERVER.brand_title)}</span></header>
    ${options.clientName ? clientContext(options.clientName, options.clientId ?? '') : ''}
    <div class="id-surface">${body}</div>
  </main>
  ${state === 'login' ? brandRail() : ''}
</div>
</body>
</html>`
}

/**
 * La salida SIEMPRE existe. Sin `returnTo` esta página mostraba el texto y ninguna acción: un
 * callejón sin salida servido con 401 (lo alcanzaba `consent-endpoint`). Sin destino de retorno se
 * va igual a `/login`, que es lo que la persona necesita; con destino, se preserva.
 */
export const renderLoginRequiredPage = (returnTo?: string): string =>
  layout(
    GH_AUTH_SERVER.login_required_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.login_required_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_required_body)}</p>
  <p class="muted">${escapeHtml(GH_AUTH_SERVER.login_required_hint)}</p>
  <div class="id-actions"><a class="id-primary" href="${escapeHtml(returnTo ? '/login?' + new URLSearchParams({ return_to: returnTo }) : '/login')}">${ICON_ARROW_RIGHT}${escapeHtml(GH_AUTH_SERVER.login_continue_cta)}</a></div>`
  )

export const renderStepUpRequiredPage = (returnTo?: string): string =>
  layout(
    GH_AUTH_SERVER.step_up_required_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.step_up_required_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.step_up_required_body)}</p>
  <div class="id-actions"><a class="id-primary" href="${escapeHtml(returnTo ? '/login/step-up?' + new URLSearchParams({ return_to: returnTo }) : '/login/step-up')}">${ICON_SHIELD_CHECK}${escapeHtml(GH_AUTH_SERVER.totp_verify_submit_cta)}</a></div>`
  )

export type ConsentPageInput = {
  organizations: Extract<ConsentContextResolution, { outcome: 'resolved' }>['organizations']
  clientName: string
  clientId: string
  scopes: readonly string[]
  /** Path + query del authorize original (mismo origen) al que se vuelve tras consentir. */
  returnTo: string
  actionPath: string
}

export const renderConsentPage = (input: ConsentPageInput): string => {
  const organizationItems = input.organizations.map(organization => `<li>
    ${ICON_BUILDING}
    <strong>${escapeHtml(organization.organizationName)}</strong>
    <details><summary>${escapeHtml(GH_AUTH_SERVER.consent_capabilities_label)}</summary>
      <ul>${organization.capabilities.map(capability => `<li><code>${escapeHtml(capability)}</code></li>`).join('')}</ul>
    </details>
  </li>`).join('')

  const scopeItems = input.scopes
    .map(scope => {
      const description = GH_AUTH_SERVER.scope_descriptions[scope] ?? GH_AUTH_SERVER.scope_description_fallback(scope)
      // El icono distingue leer de escribir de un vistazo; el badge de texto sigue siendo el que
      // porta el significado, porque el icono es decorativo (`aria-hidden`).
      const write = isWriteScope(scope)

      return `<li class="id-scope" data-kind="${write ? 'write' : 'read'}">${write ? ICON_PENCIL : ICON_EYE}<span class="id-scope-kind" data-kind="${write ? 'write' : 'read'}">${escapeHtml(write ? GH_AUTH_SERVER.scope_write_label : GH_AUTH_SERVER.scope_read_label)}</span><p>${escapeHtml(description)}</p><code class="code">${escapeHtml(scope)}</code></li>`
    })
    .join('\n    ')

  return layout(
    GH_AUTH_SERVER.consent_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.consent_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.consent_context_intro(input.organizations.length))}</p>
  <h2 class="id-muted">${escapeHtml(input.organizations.length === 1 ? GH_AUTH_SERVER.consent_organization_label : GH_AUTH_SERVER.consent_organizations_label)}</h2>
  <ul class="id-organizations" aria-label="${escapeHtml(GH_AUTH_SERVER.consent_organizations_label)}">${organizationItems}</ul>
  <ul class="id-permissions" aria-label="${escapeHtml(GH_AUTH_SERVER.consent_scope_label)}">
    ${scopeItems}
  </ul>
  <form method="post" action="${escapeHtml(input.actionPath)}">
    <input type="hidden" name="client_id" value="${escapeHtml(input.clientId)}">
    <input type="hidden" name="scope" value="${escapeHtml(input.scopes.join(' '))}">
    <input type="hidden" name="return_to" value="${escapeHtml(input.returnTo)}">
    <div class="actions">
      <button class="secondary" type="submit" name="decision" value="deny">${escapeHtml(GH_AUTH_SERVER.consent_deny_cta)}</button>
      <button class="primary" type="submit" name="decision" value="allow">${escapeHtml(GH_AUTH_SERVER.consent_allow_cta)}</button>
    </div>
  </form>
  <p class="muted">${escapeHtml(GH_AUTH_SERVER.consent_footer)}</p>
  <p class="code">${escapeHtml(GH_AUTH_SERVER.consent_client_id_label)}: ${escapeHtml(input.clientId)}</p>`,
    { state: 'consent', clientName: input.clientName, clientId: input.clientId }
  )
}

const ERROR_BODIES: Partial<Record<OAuthErrorCode, string>> = {
  invalid_client: GH_AUTH_SERVER.error_invalid_client_body,
  invalid_redirect_uri: GH_AUTH_SERVER.error_invalid_redirect_body,
  access_denied: GH_AUTH_SERVER.error_access_denied_body,
  slow_down: GH_AUTH_SERVER.error_rate_limited_body
}

export const renderErrorPage = (code: OAuthErrorCode): string =>
  layout(
    GH_AUTH_SERVER.error_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.error_title)}</h1>
  <p class="id-alert" role="alert">${ICON_ALERT}<span>${escapeHtml(ERROR_BODIES[code] ?? GH_AUTH_SERVER.error_generic_body)}</span></p>
  <p class="code">${escapeHtml(GH_AUTH_SERVER.error_code_label)}: ${escapeHtml(code)}</p>`
  )
