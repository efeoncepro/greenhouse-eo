import { AUTH_INTERNAL_LOGIN_COPY } from '@/lib/copy/auth-server-internal-login'
import { ICON_ALERT, ICON_ARROW_RIGHT } from '../oauth/pages/icons'
import { escapeHtml, layout } from '../oauth/pages/render'
import { acceptsHtml, htmlResponse, jsonResponse, type OAuthHttpRequest } from '../oauth/http'

/** Only explicitly accepted HTML gets a browser page. JSON consumers retain their existing payload. */
export const internalLoginFailureResponse = (
  request: OAuthHttpRequest,
  status: number,
  code: string,
  headers: Record<string, string> = {}
) => {
  const responseHeaders = { ...headers, Vary: 'Accept' }

  if (!acceptsHtml(request)) return jsonResponse(status, { error: code }, responseHeaders)
  const copy = AUTH_INTERNAL_LOGIN_COPY
  const body = status === 429 ? copy.limited : status >= 500 || status === 404 ? copy.unavailable : copy.rejected

  return htmlResponse(
    status,
    layout(
      copy.title,
      `<section data-capture="auth-internal-login-error">
      <h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(copy.title)}</h1>
      <p class="id-alert" role="alert">${ICON_ALERT}<span>${escapeHtml(body)}</span></p>
      <p class="id-muted">${escapeHtml(copy.recovery)}</p>
      <div class="id-actions"><a class="id-primary" href="/login">${ICON_ARROW_RIGHT}${escapeHtml(copy.retryCta)}</a></div>
    </section>`
    ),
    responseHeaders
  )
}
