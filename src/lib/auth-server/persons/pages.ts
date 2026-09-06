/**
 * Páginas mínimas de la superficie de personas (TASK-1830).
 *
 * Mismo shell, misma marca y misma CSP estricta que las del protocolo (`oauth/pages/render.ts`): sin
 * JS, sin fuentes remotas, sin imágenes externas. `TASK-1835` las reemplaza por las pantallas reales
 * de «Efeonce ID» SIN cambiar este contrato (rutas, campos del formulario, ids de copy).
 *
 * La página intermedia del magic link existe por una razón concreta: los escáneres de correo y los
 * prefetchers de los clientes visitan los enlaces. Si el consumo fuera un GET, el enlace se quemaría
 * antes de que la persona lo abriera. Por eso el GET sólo pinta un formulario y el consumo es POST.
 */

import { randomBytes } from 'node:crypto'

import { GH_AUTH_SERVER } from '@/lib/copy/auth-server'

import { htmlResponse } from '../oauth/http'
import { ICON_ALERT, ICON_CLOCK, ICON_KEY, ICON_MAIL, MICROSOFT_MARK_SVG } from '../oauth/pages/icons'
import { escapeHtml, layout } from '../oauth/pages/render'
import { LOGIN_CONTROLLER_SCRIPT } from './login-controller.generated'

const backToLogin = (): string =>
  `<div class="id-actions" data-capture="id-actions"><a class="id-primary" href="/login">${escapeHtml(GH_AUTH_SERVER.login_continue_cta)}</a></div>`

/**
 * TASK-1835 — Salida de una pantalla terminal. El copy de estas páginas manda a «pedir uno nuevo
 * desde el inicio de sesión»: sin este control, la instrucción no tiene dónde ejecutarse.
 */
const exitToLogin = (label: string): string =>
  `<div class="id-actions" data-capture="id-actions"><a class="id-primary" href="/login">${escapeHtml(label)}</a></div>`

export const PERSON_AUTH_PATHS = {
  login: '/login',
  magicLinkRequest: '/auth/magic-link/request',
  magicLinkConsume: '/auth/magic-link/consume',
  magicLinkLanding: '/m/',
  invitationAccept: '/auth/invitations/accept',
  invitationLanding: '/i/',
  session: '/auth/session',
  logout: '/auth/session/logout',
  passkeyRegisterStart: '/auth/passkeys/register/start',
  passkeyRegisterFinish: '/auth/passkeys/register/finish',
  passkeyAuthenticateStart: '/auth/passkeys/authenticate/start',
  passkeyAuthenticateFinish: '/auth/passkeys/authenticate/finish',
  passkeyStepUpStart: '/auth/passkeys/step-up/start',
  passkeyStepUpFinish: '/auth/passkeys/step-up/finish',
  passkeyList: '/auth/passkeys',
  totpEnrollStart: '/auth/totp/enroll/start',
  totpEnrollFinish: '/auth/totp/enroll/finish',
  totpVerify: '/auth/totp/verify'
} as const

const hiddenField = (name: string, value: string | null): string =>
  value ? `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">` : ''

export type LoginPageInput = {
  returnTo: string | null
  internalLoginUrl?: string | null
  error?: 'invalid_email' | null
  /**
   * Nonce del módulo WebAuthn del login. Obligatorio: sin él la página se serviría sin el botón de
   * passkey y sin `script-src`, y el carril quedaría muerto EN SILENCIO. `renderLoginPageResponse`
   * es la forma canónica de servirla; este campo obliga a que ningún callsite se lo salte.
   */
  passkeyNonce: string
}

/**
 * Inicio de sesión. Dos carriles: passkey (ceremonia WebAuthn, sin correo) y enlace por correo.
 * El passkey va PRIMERO porque usa credenciales descubribles y no necesita que la persona escriba
 * nada; el campo de correo es el fallback. No hay contraseña que pedir en ninguno.
 */
export const renderLoginPage = (input: LoginPageInput): string => {
  const invalidEmail = input.error === 'invalid_email'

  if (typeof input.passkeyNonce !== 'string' || input.passkeyNonce.length === 0) {
    throw new Error('renderLoginPage requires passkeyNonce: the passkey lane must never render unscripted')
  }

  /**
   * Jerarquía deliberada: el enlace por correo es la puerta de la gente invitada —la mayoría— así
   * que se queda con el botón primario. El acceso del equipo interno delega en Microsoft, va en
   * secundario y lleva el logo oficial, como pide el botón estándar de Microsoft.
   */
  const internalMethod = input.internalLoginUrl
    ? `<section class="id-section"><h2>${escapeHtml(GH_AUTH_SERVER.login_team_title)}</h2>
    <a class="id-secondary" href="${escapeHtml(input.internalLoginUrl)}">${MICROSOFT_MARK_SVG}${escapeHtml(GH_AUTH_SERVER.login_microsoft_cta)}</a></section>
  <p class="id-or" aria-hidden="true"><span>${escapeHtml(GH_AUTH_SERVER.login_methods_separator)}</span></p>`
    : ''

  return layout(
    GH_AUTH_SERVER.login_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.login_title)}</h1>
  <p class="id-intro">${escapeHtml(input.internalLoginUrl ? GH_AUTH_SERVER.login_methods_intro : GH_AUTH_SERVER.login_intro)}</p>
  ${invalidEmail ? `<p class="id-alert" id="email-error" role="alert" data-capture="id-status">${ICON_ALERT}<span>${escapeHtml(GH_AUTH_SERVER.login_invalid_email)}</span></p>` : ''}
  ${internalMethod}
  <section class="id-section"><h2>${escapeHtml(GH_AUTH_SERVER.login_invitation_title)}</h2>
  <div data-capture="id-passkey">
    ${hiddenField('return_to', input.returnTo)}
    <div class="id-actions"><button type="button" class="id-primary" data-login-passkey hidden>${ICON_KEY}${escapeHtml(GH_AUTH_SERVER.login_passkey_cta)}</button></div>
    <p class="id-note-fine" data-login-status role="status" aria-live="polite"></p>
    <p class="id-note-fine">${escapeHtml(GH_AUTH_SERVER.login_email_fallback_hint)}</p>
  </div>
  <form method="post" action="${escapeHtml(PERSON_AUTH_PATHS.magicLinkRequest)}" data-capture="id-form">
    ${hiddenField('return_to', input.returnTo)}
    <ul>
      <li class="id-field">
        <label for="email">${escapeHtml(GH_AUTH_SERVER.login_email_label)}</label>
        <span class="id-input">${ICON_MAIL}<input id="email" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="${escapeHtml(GH_AUTH_SERVER.login_email_placeholder)}" autofocus required${invalidEmail ? ' aria-invalid="true" aria-describedby="email-error"' : ''}></span>
      </li>
    </ul>
    <div class="actions">
      <button class="secondary" type="submit">${ICON_MAIL}${escapeHtml(GH_AUTH_SERVER.login_submit_cta)}</button>
    </div>
  </form>
  <p class="id-note-fine">${escapeHtml(GH_AUTH_SERVER.login_card_note)}</p></section>
  <script nonce="${escapeHtml(input.passkeyNonce)}">${LOGIN_CONTROLLER_SCRIPT}</script>`,
    { state: 'login' }
  )
}

/**
 * Forma canónica de servir `/login`: genera el nonce, lo pasa a la plantilla y lo declara en la CSP.
 * Construir la respuesta a mano deja el `script-src` fuera y el navegador bloquea el controlador sin
 * decir nada — la página se vería bien y el botón de passkey no haría nada.
 */
export const renderLoginPageResponse = (
  status: number,
  input: Omit<LoginPageInput, 'passkeyNonce'>,
  headers: Record<string, string> = {}
) => {
  const nonce = randomBytes(24).toString('base64')
  const response = htmlResponse(status, renderLoginPage({ ...input, passkeyNonce: nonce }), headers)

  response.headers['Content-Security-Policy'] += `; script-src 'nonce-${nonce}'; connect-src 'self'`

  return response
}

export const renderMagicLinkSentPage = (): string =>
  layout(
    GH_AUTH_SERVER.login_sent_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.login_sent_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_sent_body)}</p>
  <p class="id-note" data-capture="id-status" role="status">${ICON_MAIL}<span>${escapeHtml(GH_AUTH_SERVER.login_sent_hint)}</span></p>`
  )

export const renderRateLimitedPage = (): string =>
  layout(
    GH_AUTH_SERVER.login_rate_limited_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.login_rate_limited_title)}</h1>
  <p class="id-note" data-capture="id-status" role="status">${ICON_CLOCK}<span>${escapeHtml(GH_AUTH_SERVER.login_rate_limited_body)}</span></p>
  ${exitToLogin(GH_AUTH_SERVER.login_back_cta)}`
  )

/** Página intermedia del magic link: el token viaja en un campo oculto y se consume por POST. */
export const renderMagicLinkConfirmPage = (token: string): string =>
  layout(
    GH_AUTH_SERVER.confirm_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.confirm_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.confirm_body)}</p>
  <form method="post" action="${escapeHtml(PERSON_AUTH_PATHS.magicLinkConsume)}">
    ${hiddenField('token', token)}
    <div class="actions">
      <button class="primary" type="submit">${escapeHtml(GH_AUTH_SERVER.confirm_cta)}</button>
    </div>
  </form>`
  )

export const renderInvitationConfirmPage = (token: string): string =>
  layout(
    GH_AUTH_SERVER.confirm_invitation_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.confirm_invitation_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.confirm_invitation_body)}</p>
  <form method="post" action="${escapeHtml(PERSON_AUTH_PATHS.invitationAccept)}">
    ${hiddenField('token', token)}
    <div class="actions">
      <button class="primary" type="submit">${escapeHtml(GH_AUTH_SERVER.confirm_invitation_cta)}</button>
    </div>
  </form>`
  )

export const renderInvitationAcceptedPage = (): string =>
  layout(
    GH_AUTH_SERVER.invitation_accepted_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.invitation_accepted_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.invitation_accepted_body)}</p>
  ${backToLogin()}`
  )

/**
 * Un enlace inválido, vencido o ya usado comparte título: el detalle sólo cambia la línea de ayuda,
 * porque distinguir "no existe" de "vencido" le sirve más a quien sondea que a quien se equivocó.
 */
export const renderLinkProblemPage = (kind: 'invalid' | 'expired' | 'already_used'): string => {
  const body =
    kind === 'expired'
      ? GH_AUTH_SERVER.link_expired_body
      : kind === 'already_used'
        ? GH_AUTH_SERVER.link_used_body
        : GH_AUTH_SERVER.link_invalid_body

  return layout(
    GH_AUTH_SERVER.link_invalid_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.link_invalid_title)}</h1>
  <p data-capture="id-status">${escapeHtml(body)}</p>
  ${exitToLogin(GH_AUTH_SERVER.link_request_new_cta)}`
  )
}

export const renderAccessRevokedPage = (): string =>
  layout(
    GH_AUTH_SERVER.link_access_revoked_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.link_access_revoked_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.link_access_revoked_body)}</p>`
  )

export const renderSessionStartedPage = (input: { direct?: boolean } = {}): string =>
  layout(
    GH_AUTH_SERVER.session_started_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.session_started_title)}</h1>
  <p>${escapeHtml(input.direct ? GH_AUTH_SERVER.session_direct_body : GH_AUTH_SERVER.session_started_body)}</p>
  ${input.direct ? `<form method="post" action="${PERSON_AUTH_PATHS.logout}"><div class="id-actions"><button class="id-secondary" type="submit">${escapeHtml(GH_AUTH_SERVER.session_logout_cta)}</button></div></form>` : ''}`
  )

export const renderSessionClosedPage = (): string =>
  layout(
    GH_AUTH_SERVER.session_closed_title,
    `<h1 id="page-title" class="id-title" tabindex="-1">${escapeHtml(GH_AUTH_SERVER.session_closed_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.session_closed_body)}</p>
  ${backToLogin()}`
  )
