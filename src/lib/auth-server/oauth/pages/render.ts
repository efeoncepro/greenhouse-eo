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
import { EFEONCE_ISOTIPO_SVG } from './efeonce-isotipo.generated'
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
export const layout = (title: string, body: string, options: { state?: 'login' | 'consent' | 'verification'; clientName?: string } = {}): string => `<!doctype html>
<html lang="${GH_AUTH_SERVER.page_lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · ${escapeHtml(GH_AUTH_SERVER.brand_title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="id-page" data-capture="id-shell" data-state="${options.state ?? 'verification'}" data-surface-recipe="settingsFlow" aria-labelledby="page-title">
  <header class="id-brand" aria-label="${escapeHtml(EFEONCE_BRAND_NAME)}">${EFEONCE_ISOTIPO_SVG}<span>${escapeHtml(GH_AUTH_SERVER.brand_title)}</span></header>
  ${options.clientName ? `<div class="id-context" data-capture="id-client"><span class="id-muted">${escapeHtml(GH_AUTH_SERVER.application_context_label)}</span><strong>${escapeHtml(options.clientName)}</strong></div>` : ''}
  <div class="id-surface">${body}</div>
  <details class="id-footer"><summary>${escapeHtml(GH_AUTH_SERVER.font_licenses_label)}</summary><a href="/fonts/licenses/Geist-OFL.txt">Geist</a><a href="/fonts/licenses/Poppins-OFL.txt">Poppins</a></details>
</main>
</body>
</html>`

export const renderLoginRequiredPage = (returnTo?: string): string =>
  layout(
    GH_AUTH_SERVER.login_required_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.login_required_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_required_body)}</p>
  <p class="muted">${escapeHtml(GH_AUTH_SERVER.login_required_hint)}</p>
  ${returnTo ? `<a href="${escapeHtml('/login?' + new URLSearchParams({ return_to: returnTo }))}">${escapeHtml(GH_AUTH_SERVER.login_continue_cta)}</a>` : ''}`
  )

export const renderStepUpRequiredPage = (returnTo?: string): string =>
  layout(
    GH_AUTH_SERVER.step_up_required_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.step_up_required_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.step_up_required_body)}</p>
  ${returnTo ? `<a class="id-primary" href="${escapeHtml('/login/step-up?' + new URLSearchParams({ return_to: returnTo }))}">${escapeHtml(GH_AUTH_SERVER.totp_verify_submit_cta)}</a>` : ''}`
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
    <strong>${escapeHtml(organization.organizationName)}</strong>
    <details><summary>${escapeHtml(GH_AUTH_SERVER.consent_capabilities_label)}</summary>
      <ul>${organization.capabilities.map(capability => `<li><code>${escapeHtml(capability)}</code></li>`).join('')}</ul>
    </details>
  </li>`).join('')

  const scopeItems = input.scopes
    .map(scope => {
      const description = GH_AUTH_SERVER.scope_descriptions[scope] ?? GH_AUTH_SERVER.scope_description_fallback(scope)

      return `<li class="id-scope"><span class="id-scope-kind">${escapeHtml(isWriteScope(scope) ? GH_AUTH_SERVER.scope_write_label : GH_AUTH_SERVER.scope_read_label)}</span><p>${escapeHtml(description)}</p><code class="code">${escapeHtml(scope)}</code></li>`
    })
    .join('\n    ')

  return layout(
    GH_AUTH_SERVER.consent_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.consent_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.consent_context_intro(input.organizations.length))}</p>
  <h2 class="id-muted">${escapeHtml(input.organizations.length === 1 ? GH_AUTH_SERVER.consent_organization_label : GH_AUTH_SERVER.consent_organizations_label)}</h2>
  <ul aria-label="${escapeHtml(GH_AUTH_SERVER.consent_organizations_label)}">${organizationItems}</ul>
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
    { state: 'consent', clientName: input.clientName }
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
  <p>${escapeHtml(ERROR_BODIES[code] ?? GH_AUTH_SERVER.error_generic_body)}</p>
  <p class="code">${escapeHtml(GH_AUTH_SERVER.error_code_label)}: ${escapeHtml(code)}</p>`
  )
