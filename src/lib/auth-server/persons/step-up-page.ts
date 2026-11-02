import { randomBytes } from 'node:crypto'

import { AUTH_STEP_UP_COPY } from '@/lib/copy/auth-server-step-up'
import { STEP_UP_CONTROLLER_SCRIPT } from './step-up-controller.generated'
/** Read-only page model. Reading factor availability never enrolls or replaces a factor. */
import { AUTH_ORBIT_COPY, headingText } from '@/lib/copy/auth-server-orbit'
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

const otpCells = (): string =>
  Array.from({ length: 6 }, (_, index) => {
    const cell = `<input class="os-otp-cell" data-otp-cell type="text" inputmode="numeric" maxlength="6" autocomplete="${index === 0 ? 'one-time-code' : 'off'}" aria-label="${escapeHtml(AUTH_ORBIT_COPY.totp.digit(index + 1))}">`

    return index === 2 ? `${cell}<span class="os-otp-sep" aria-hidden="true"></span>` : cell
  }).join('')

/**
 * Segundo factor (operador, 2026-11-02): titular «Escribe tu código» o, sin factor todavía, «Activa tu segundo
 * factor» en tres pasos. El campo real es `name="code"`; las seis casillas las enciende el controlador, y sin él
 * queda el campo de texto (`data-mode="backup"`), así que el formulario nunca depende de ellas.
 */
export const renderStepUpPage = (model: StepUpPageModel) => {
  const copy = AUTH_STEP_UP_COPY
  const orbit = AUTH_ORBIT_COPY
  const heading = model.hasTotp ? orbit.totp.heading : orbit.enroll.heading
  const nonce = randomBytes(24).toString('base64')
  const script = STEP_UP_CONTROLLER_SCRIPT

  const response = htmlResponse(
    200,
    layout(
      headingText(heading),
      `
    <section class="os-surface" data-capture="auth-step-up">
      <p>${escapeHtml(model.hasTotp ? orbit.totp.body : orbit.enroll.body)}</p>
      <p class="os-hint os-status" data-step-status role="status" aria-live="polite"></p>
      <input type="hidden" name="return_to" value="${escapeHtml(model.returnTo)}">
      ${model.hasPasskey ? `<div class="id-actions"><button type="button" class="secondary" data-step-passkey>${escapeHtml(copy.passkey)}</button></div>
      <p class="os-or" aria-hidden="true">${escapeHtml(orbit.totp.or)}</p>` : ''}
      <section data-step-setup class="os-steps" hidden>
        <div class="os-step" data-step="1"><div class="os-step-body">
          <h2 class="os-step-title">${escapeHtml(orbit.enroll.step1)}</h2><p>${escapeHtml(orbit.enroll.step1Body)}</p>
          <div class="os-panel-card"><img data-step-qr class="os-qr" alt="${escapeHtml(copy.qr)}" hidden>
            <div class="os-secret"><span class="os-label">${escapeHtml(copy.secret)}</span><pre data-step-secret></pre></div></div>
        </div></div>
        <div class="os-step" data-step="2"><div class="os-step-body">
          <h2 class="os-step-title">${escapeHtml(orbit.enroll.step2)}</h2><p>${escapeHtml(orbit.enroll.step2Body)}</p>
          <div class="os-panel-card os-backups"><span class="os-label">${escapeHtml(copy.backups)}</span><pre data-step-backups></pre>
            <p class="os-warning" data-step-backups-warning></p></div>
          <label class="os-check"><input type="checkbox" name="saved"> ${escapeHtml(copy.saved)}</label>
        </div></div>
      </section>
      <form data-step-code class="os-code-form" ${model.hasTotp ? '' : 'hidden'}>
        <div class="os-enroll-only"><h2 class="os-step-title">${escapeHtml(orbit.enroll.step3)}</h2><p>${escapeHtml(orbit.enroll.step3Body)}</p></div>
        <div class="os-otp" data-otp data-mode="backup">
          <label class="os-otp-label" for="step-code" data-step-code-label>${escapeHtml(copy.codeLabel)}</label>
          <div class="os-otp-cells" role="group" aria-label="${escapeHtml(orbit.totp.digitsLabel)}">${otpCells()}</div>
          <input class="os-otp-text" id="step-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" autocapitalize="off" spellcheck="false">
          <button type="button" class="os-link" data-otp-toggle hidden>${escapeHtml(orbit.totp.useBackup)}</button>
        </div>
        <div class="id-actions"><button class="primary" data-step-submit type="submit">${escapeHtml(copy.verify)}</button></div>
      </form>
      ${!model.hasTotp ? `<div class="id-actions"><button type="button" class="primary" data-step-enroll>${escapeHtml(copy.enroll)}</button></div>` : ''}
      <section data-step-backup-notice class="os-surface" hidden role="status">
        <h2 class="os-step-title">${escapeHtml(copy.backupUsedTitle)}</h2>
        <p data-step-backup-remaining></p>
        <div class="id-actions"><button type="button" class="primary" data-step-backup-continue>${escapeHtml(copy.backupContinue)}</button></div>
      </section>
      <a class="os-link" data-step-cancel href="${escapeHtml(model.returnTo)}">${escapeHtml(copy.cancel)}</a>
      <noscript>${escapeHtml(copy.javascript)}</noscript>
    </section><script nonce="${nonce}">${script}</script>`,
      { heading, panel: { kind: 'icon', glyph: 'seguridad' }, align: model.hasTotp ? 'center' : 'start' }
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
      headingText(AUTH_ORBIT_COPY.stepUpRequired.heading),
      `<p class="os-alert" role="alert">${escapeHtml(result.status === 'unauthenticated' ? AUTH_STEP_UP_COPY.expired : AUTH_STEP_UP_COPY.unavailable)}</p>`,
      { heading: AUTH_ORBIT_COPY.stepUpRequired.heading, panel: { kind: 'icon', glyph: 'seguridad' } }
    )
  )
}
