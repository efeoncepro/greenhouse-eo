import { randomBytes } from 'node:crypto'

import { AUTH_STEP_UP_COPY } from '@/lib/copy/auth-server-step-up'
import { STEP_UP_CONTROLLER_SCRIPT } from './step-up-controller.generated'
/** Read-only page model. Reading factor availability never enrolls or replaces a factor. */
import { GH_AUTH_SERVER } from '@/lib/copy/auth-server'
import { ICON_DEVICE, ICON_KEY } from '../oauth/pages/icons'
import { escapeHtml, layout } from '../oauth/pages/render'
import { htmlResponse, type OAuthHttpRequest } from '../oauth/http'
import type { AuthServerPersonAuthConfig } from './config'
import type { PersonAuthStorePort } from './store/port'
import { sanitizeReturnTo } from './magic-link'
import { readCookie, resolvePersonSession } from './sessions'

export const STEP_UP_PAGE_PATH = '/login/step-up'
export type StepUpPageModel = {
  returnTo: string
  authLevel: 'primary' | 'step_up'
  hasTotp: boolean
  hasPasskey: boolean
}
export type StepUpPageResolution =
  | { status: 'ready'; model: StepUpPageModel }
  | { status: 'invalid_return' | 'unauthenticated' | 'unavailable' }
export type StepUpPageDeps = {
  issuer: string
  environmentId: string
  expectedSourceSystem: string
  config: AuthServerPersonAuthConfig
  store: PersonAuthStorePort
  now: () => Date
}

export const resolveStepUpPage = async (
  request: OAuthHttpRequest,
  deps: StepUpPageDeps
): Promise<StepUpPageResolution> => {
  const values = request.url.searchParams.getAll('return_to')
  const returnTo = values.length === 1 ? sanitizeReturnTo(values[0]) : null

  if (!returnTo) return { status: 'invalid_return' }

  try {
    const target = new URL(returnTo, deps.issuer)

    if (
      target.origin !== new URL(deps.issuer).origin ||
      target.pathname !== '/oauth/authorize' ||
      target.hash ||
      target.username ||
      target.password
    )
      return { status: 'invalid_return' }

    const resolution = await resolvePersonSession({
      store: deps.store,
      config: deps.config,
      sessionId: readCookie(request.headers.get('cookie'), deps.config.sessionCookieName),
      expectedEnvironmentId: deps.environmentId,
      expectedSourceSystem: deps.expectedSourceSystem,
      now: deps.now()
    })

    if (resolution.status !== 'active') return { status: 'unauthenticated' }
    const identity = { environmentId: deps.environmentId, subject: resolution.session.subject }

    const [totp, credentials] = await Promise.all([
      deps.store.getTotpEnrollment(identity),
      deps.store.listPasskeyCredentials(identity)
    ])

    return {
      status: 'ready',
      model: {
        returnTo: target.pathname + target.search,
        authLevel: resolution.authLevel,
        hasTotp: totp?.status === 'active' && totp.revokedAt === null,
        hasPasskey: credentials.some(credential => credential.revokedAt === null)
      }
    }
  } catch {
    return { status: 'unavailable' }
  }
}

export const renderStepUpPage = (model: StepUpPageModel) => {
  const copy = AUTH_STEP_UP_COPY
  const nonce = randomBytes(24).toString('base64')
  const script = STEP_UP_CONTROLLER_SCRIPT

  const response = htmlResponse(
    200,
    layout(
      GH_AUTH_SERVER.step_up_required_title,
      `
    <section data-capture="auth-step-up">
      <h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.step_up_required_title)}</h1>
      <p>${escapeHtml(GH_AUTH_SERVER.step_up_required_body)}</p>
      <p data-step-status role="status" aria-live="polite"></p>
      <input type="hidden" name="return_to" value="${escapeHtml(model.returnTo)}">
      ${model.hasPasskey ? `<div class="id-actions"><button type="button" class="id-secondary" data-step-passkey>${ICON_KEY}${escapeHtml(copy.passkey)}</button></div>
      <p class="id-or" aria-hidden="true"><span>${escapeHtml(GH_AUTH_SERVER.login_methods_separator)}</span></p>` : ''}
      <section data-step-setup class="id-section" hidden>
        <p>${escapeHtml(copy.setup)}</p><img data-step-qr class="id-qr" alt="${escapeHtml(copy.qr)}" hidden><p>${escapeHtml(copy.secret)}</p><pre data-step-secret></pre>
        <p>${escapeHtml(copy.backups)}</p><pre data-step-backups></pre>
        <label><input type="checkbox" name="saved"> ${escapeHtml(copy.saved)}</label>
      </section>
      <form data-step-code class="id-section" ${model.hasTotp ? '' : 'hidden'}>
        <label class="id-field"><span data-step-code-label>${escapeHtml(copy.codeLabel)}</span><span class="id-input">${ICON_DEVICE}<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" required></span></label>
        <div class="id-actions"><button class="id-primary" data-step-submit type="submit">${escapeHtml(copy.verify)}</button></div>
      </form>
      ${!model.hasTotp ? `<div class="id-actions"><button type="button" class="id-secondary" data-step-enroll>${escapeHtml(copy.enroll)}</button></div>` : ''}
      <p><a data-step-cancel href="${escapeHtml(model.returnTo)}">${escapeHtml(copy.cancel)}</a></p>
      <noscript>${escapeHtml(copy.javascript)}</noscript>
    </section><script nonce="${nonce}">${script}</script>`
    )
  )

  response.headers['Content-Security-Policy'] += `; script-src 'nonce-${nonce}'; connect-src 'self'`

  return response
}

export const handleStepUpPage = async (request: OAuthHttpRequest, deps: StepUpPageDeps) => {
  const result = await resolveStepUpPage(request, deps)

  if (result.status === 'ready') return renderStepUpPage(result.model)
  const status = result.status === 'invalid_return' ? 400 : result.status === 'unauthenticated' ? 401 : 503

  return htmlResponse(
    status,
    layout(
      GH_AUTH_SERVER.step_up_required_title,
      `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.step_up_required_title)}</h1>
    <p>${escapeHtml(result.status === 'unauthenticated' ? AUTH_STEP_UP_COPY.expired : AUTH_STEP_UP_COPY.unavailable)}</p>`
    )
  )
}
