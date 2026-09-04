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

import { GH_AUTH_SERVER } from '@/lib/copy/auth-server'

import { escapeHtml, layout } from '../oauth/pages/render'

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
  passkeyList: '/auth/passkeys',
  totpEnrollStart: '/auth/totp/enroll/start',
  totpEnrollFinish: '/auth/totp/enroll/finish',
  totpVerify: '/auth/totp/verify'
} as const

const hiddenField = (name: string, value: string | null): string =>
  value ? `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">` : ''

/** Formulario de inicio de sesión por correo. Un solo campo: no hay contraseña que pedir. */
export const renderLoginPage = (input: { returnTo: string | null; error?: 'invalid_email' | null }): string =>
  layout(
    GH_AUTH_SERVER.login_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.login_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_intro)}</p>
  ${input.error === 'invalid_email' ? `<p class="muted">${escapeHtml(GH_AUTH_SERVER.login_invalid_email)}</p>` : ''}
  <form method="post" action="${escapeHtml(PERSON_AUTH_PATHS.magicLinkRequest)}">
    ${hiddenField('return_to', input.returnTo)}
    <ul>
      <li>
        <label for="email">${escapeHtml(GH_AUTH_SERVER.login_email_label)}</label>
        <input id="email" name="email" type="email" autocomplete="email" required
               style="width:100%;box-sizing:border-box;margin-top:8px;padding:10px;border:1px solid #dfe5ee;border-radius:8px;font-size:15px">
      </li>
    </ul>
    <div class="actions">
      <button class="primary" type="submit">${escapeHtml(GH_AUTH_SERVER.login_submit_cta)}</button>
    </div>
  </form>`
  )

export const renderMagicLinkSentPage = (): string =>
  layout(
    GH_AUTH_SERVER.login_sent_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.login_sent_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_sent_body)}</p>
  <p class="muted">${escapeHtml(GH_AUTH_SERVER.login_sent_hint)}</p>`
  )

export const renderRateLimitedPage = (): string =>
  layout(
    GH_AUTH_SERVER.login_rate_limited_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.login_rate_limited_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.login_rate_limited_body)}</p>`
  )

/** Página intermedia del magic link: el token viaja en un campo oculto y se consume por POST. */
export const renderMagicLinkConfirmPage = (token: string): string =>
  layout(
    GH_AUTH_SERVER.confirm_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.confirm_title)}</h1>
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
    `<h1>${escapeHtml(GH_AUTH_SERVER.confirm_invitation_title)}</h1>
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
    `<h1>${escapeHtml(GH_AUTH_SERVER.invitation_accepted_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.invitation_accepted_body)}</p>`
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
    `<h1>${escapeHtml(GH_AUTH_SERVER.link_invalid_title)}</h1>
  <p>${escapeHtml(body)}</p>`
  )
}

export const renderAccessRevokedPage = (): string =>
  layout(
    GH_AUTH_SERVER.link_access_revoked_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.link_access_revoked_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.link_access_revoked_body)}</p>`
  )

export const renderSessionStartedPage = (): string =>
  layout(
    GH_AUTH_SERVER.session_started_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.session_started_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.session_started_body)}</p>`
  )

export const renderSessionClosedPage = (): string =>
  layout(
    GH_AUTH_SERVER.session_closed_title,
    `<h1>${escapeHtml(GH_AUTH_SERVER.session_closed_title)}</h1>
  <p>${escapeHtml(GH_AUTH_SERVER.session_closed_body)}</p>`
  )
