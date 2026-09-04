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

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

const STYLES = `
  :root { color-scheme: light; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         background: #f4f6f9; color: #12213a; display: flex; min-height: 100vh; align-items: center; justify-content: center; }
  main { background: #fff; border-radius: 16px; padding: 40px 36px; max-width: 440px; width: calc(100% - 32px);
         box-shadow: 0 12px 40px rgba(2, 60, 112, 0.12); }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
  .brand svg { width: 44px; height: auto; }
  .brand span { font-size: 15px; font-weight: 600; letter-spacing: 0.02em; color: #023c70; }
  h1 { font-size: 22px; margin: 0 0 12px; line-height: 1.25; }
  p { margin: 0 0 12px; line-height: 1.5; font-size: 15px; }
  ul { list-style: none; padding: 0; margin: 16px 0 24px; }
  li { padding: 12px 14px; border: 1px solid #dfe5ee; border-radius: 10px; margin-bottom: 8px; font-size: 14px; }
  li code { display: block; color: #5b6b82; font-size: 12px; margin-top: 4px; }
  .actions { display: flex; gap: 12px; }
  button { flex: 1; padding: 12px 16px; border-radius: 10px; border: 1px solid #023c70; font-size: 15px; cursor: pointer; }
  button.primary { background: #023c70; color: #fff; }
  button.secondary { background: #fff; color: #023c70; }
  .muted { color: #5b6b82; font-size: 13px; }
  .code { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #5b6b82; word-break: break-all; }
`

const layout = (title: string, body: string): string => `<!doctype html>
<html lang="${GH_AUTH_SERVER.page_lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · ${escapeHtml(GH_AUTH_SERVER.brand_title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
  <div class="brand" aria-label="${escapeHtml(EFEONCE_BRAND_NAME)}">${EFEONCE_ISOTIPO_SVG}<span>${escapeHtml(GH_AUTH_SERVER.brand_title)}</span></div>
  ${body}
</main>
</body>
</html>`

export const renderLoginRequiredPage = (): string =>
  layout(
    GH_AUTH_SERVER.login_required_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.login_required_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_required_body)}</p>
  <p class="muted">${escapeHtml(GH_AUTH_SERVER.login_required_hint)}</p>`
  )

export const renderStepUpRequiredPage = (): string =>
  layout(
    GH_AUTH_SERVER.step_up_required_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.step_up_required_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.step_up_required_body)}</p>`
  )

export type ConsentPageInput = {
  clientName: string
  clientId: string
  scopes: readonly string[]
  /** Path + query del authorize original (mismo origen) al que se vuelve tras consentir. */
  returnTo: string
  actionPath: string
}

export const renderConsentPage = (input: ConsentPageInput): string => {
  const scopeItems = input.scopes
    .map(scope => {
      const description = GH_AUTH_SERVER.scope_descriptions[scope] ?? GH_AUTH_SERVER.scope_description_fallback(scope)

      return `<li>${escapeHtml(description)}<code>${escapeHtml(scope)}</code></li>`
    })
    .join('\n    ')

  return layout(
    GH_AUTH_SERVER.consent_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.consent_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.consent_intro(input.clientName))}</p>
  <ul aria-label="${escapeHtml(GH_AUTH_SERVER.consent_scope_label)}">
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
  <p class="code">${escapeHtml(GH_AUTH_SERVER.consent_client_id_label)}: ${escapeHtml(input.clientId)}</p>`
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
    `<h1>${escapeHtml(GH_AUTH_SERVER.error_title)}</h1>
  <p>${escapeHtml(ERROR_BODIES[code] ?? GH_AUTH_SERVER.error_generic_body)}</p>
  <p class="code">${escapeHtml(GH_AUTH_SERVER.error_code_label)}: ${escapeHtml(code)}</p>`
  )
