import { AUTH_INTERNAL_LOGIN_COPY } from '@/lib/copy/auth-server-internal-login'
import { AUTH_ORBIT_COPY, headingText } from '@/lib/copy/auth-server-orbit'
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
      headingText(AUTH_ORBIT_COPY.internalError.heading),
      `<section class="os-surface" data-capture="auth-internal-login-error">
      <p class="os-alert" role="alert">${escapeHtml(body)}</p>
      <p>${escapeHtml(copy.recovery)}</p>
      <div class="id-actions"><a class="id-primary" href="/login">${escapeHtml(copy.retryCta)}</a></div>
    </section>`,
      { heading: AUTH_ORBIT_COPY.internalError.heading, panel: { kind: 'word', lines: AUTH_ORBIT_COPY.errorWord } }
    ),
    responseHeaders
  )
}
