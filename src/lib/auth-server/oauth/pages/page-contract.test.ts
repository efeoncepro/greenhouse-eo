import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { htmlResponse } from '../http'
import { renderConsentPage, renderErrorPage, renderLoginRequiredPage, renderStepUpRequiredPage } from './render'
import {
  renderAccessRevokedPage,
  renderInvitationAcceptedPage,
  renderInvitationConfirmPage,
  renderLinkProblemPage,
  renderLoginPage,
  renderLoginPageResponse,
  renderMagicLinkConfirmPage,
  renderMagicLinkSentPage,
  renderRateLimitedPage,
  renderSessionClosedPage,
  renderSessionStartedPage
} from '../../persons/pages'
import { renderStepUpPage } from '../../persons/step-up-page'

const RETURN_TO = '/oauth/authorize?client_id=demo&scope=efeonce.mcp.read'

const consent = () =>
  renderConsentPage({
    organizations: [{ organizationName: 'Organización de ejemplo', capabilities: ['growth.seo.observation.read'] }],
    clientName: 'Aplicación de ejemplo',
    clientId: 'https://client.example/cimd.json',
    scopes: ['efeonce.mcp.read', 'efeonce.mcp.seo.write'],
    returnTo: RETURN_TO,
    actionPath: '/oauth/consent',
    redirectHost: 'client.example'
  })

/**
 * Toda página HTML que el emisor sirve, con el nombre que usa la matriz de captura de TASK-1835.
 * Agregar un renderer nuevo sin agregarlo acá deja su CSP y su salida sin medir.
 */
const PAGES: ReadonlyArray<{ name: string; html: string; terminal?: boolean }> = [
  { name: 'consent', html: consent() },
  { name: 'login-required', html: renderLoginRequiredPage(RETURN_TO) },
  { name: 'login-required-sin-retorno', html: renderLoginRequiredPage() },
  { name: 'step-up-required', html: renderStepUpRequiredPage(RETURN_TO) },
  { name: 'error-invalid-client', html: renderErrorPage('invalid_client'), terminal: true },
  { name: 'error-access-denied', html: renderErrorPage('access_denied'), terminal: true },
  { name: 'error-unavailable', html: renderErrorPage('temporarily_unavailable'), terminal: true },
  { name: 'magic-link-sent', html: renderMagicLinkSentPage(), terminal: true },
  { name: 'magic-link-confirm', html: renderMagicLinkConfirmPage('token-de-ejemplo') },
  { name: 'magic-link-expired', html: renderLinkProblemPage('expired') },
  { name: 'magic-link-used', html: renderLinkProblemPage('already_used') },
  { name: 'magic-link-invalid', html: renderLinkProblemPage('invalid') },
  { name: 'rate-limited', html: renderRateLimitedPage() },
  { name: 'invitation-confirm', html: renderInvitationConfirmPage('token-de-ejemplo') },
  { name: 'invitation-accepted', html: renderInvitationAcceptedPage() },
  { name: 'access-revoked', html: renderAccessRevokedPage(), terminal: true },
  { name: 'session-started', html: renderSessionStartedPage(), terminal: true },
  { name: 'session-started-directa', html: renderSessionStartedPage({ direct: true }) },
  { name: 'session-closed', html: renderSessionClosedPage() }
]

/** Las tres formas en que el emisor sirve `/login`. Llevan script (WebAuthn), así que su CSP se
 *  mide aparte: `script-src` por nonce, uno distinto por respuesta. */
const LOGIN_PAGES = [
  { name: 'login', response: renderLoginPageResponse(200, { returnTo: RETURN_TO, internalLoginUrl: '/auth/internal/login' }) },
  { name: 'login-external', response: renderLoginPageResponse(200, { returnTo: RETURN_TO }) },
  { name: 'login-invalid-email', response: renderLoginPageResponse(400, { returnTo: RETURN_TO, error: 'invalid_email' }) }
] as const

const styleBlocksOf = (html: string): string[] => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1])

const sha256 = (value: string): string => `'sha256-${createHash('sha256').update(value).digest('base64')}'`

/**
 * TASK-1835 — La CSP se mide por PÁGINA, no una sola vez sobre `htmlResponse`.
 *
 * El modo de falla que esto atrapa no es teórico: la CSP permite estilos por HASH, así que un
 * `<style>` que entre al HTML sin estar en la lista se bloquea y la página sale desnuda CON EL BUILD
 * VERDE. Pasó con el `<style>` embebido dentro del SVG de marca (`78cc2dc67`); la guarda de allá
 * mira el asset, ésta mira el documento servido.
 */
describe('TASK-1835 — contrato de CSP de cada página del emisor', () => {
  it.each(PAGES.map(page => [page.name, page.html] as const))('%s sirve con CSP estricta', (_name, html) => {
    const csp = htmlResponse(200, html).headers['Content-Security-Policy']

    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("base-uri 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("font-src 'self'")
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
    // Sin JS en estas páginas: la única con script es step-up, y va por nonce (abajo).
    expect(csp).not.toContain('script-src')
    expect(html).not.toContain('<script')
  })

  it.each(LOGIN_PAGES.map(page => [page.name, page.response] as const))(
    '%s admite script sólo por su propio nonce',
    (_name, response) => {
      const csp = response.headers['Content-Security-Policy']
      const nonce = /<script nonce="([^"]+)">/.exec(response.body)?.[1]

      expect(nonce).toBeTruthy()
      expect(csp).toContain(`script-src 'nonce-${nonce}'`)
      expect(csp).toContain("connect-src 'self'")
      expect(csp).not.toContain('unsafe-inline')
      expect(csp).toContain("default-src 'none'")
      // Un nonce por respuesta: reusarlo entre páginas lo vuelve adivinable.
      expect(response.body.match(/<script /g)).toHaveLength(1)
    }
  )

  it('cada respuesta de login trae un nonce distinto', () => {
    const nonces = Array.from({ length: 4 }, () => {
      const body = renderLoginPageResponse(200, { returnTo: RETURN_TO }).body

      return /<script nonce="([^"]+)">/.exec(body)?.[1]
    })

    expect(new Set(nonces).size).toBe(4)
  })

  it('la plantilla de login se niega a renderizar sin nonce', () => {
    expect(() => renderLoginPage({ returnTo: RETURN_TO, passkeyNonce: '' })).toThrow(/passkeyNonce/)
  })

  it.each([...PAGES.map(page => [page.name, page.html] as const), ...LOGIN_PAGES.map(page => [page.name, page.response.body] as const)])(
    '%s: cada <style> del documento está en la lista de hashes',
    (_name, html) => {
      const csp = htmlResponse(200, html).headers['Content-Security-Policy']
      const blocks = styleBlocksOf(html)

      expect(blocks.length).toBeGreaterThan(0)
      for (const block of blocks) expect(csp).toContain(sha256(block))
    }
  )

  it('step-up admite script sólo por nonce y su <style> también está en la lista', () => {
    const response = renderStepUpPage({ returnTo: RETURN_TO, authLevel: 'primary', hasTotp: true, hasPasskey: true })
    const csp = response.headers['Content-Security-Policy']
    const nonce = /<script nonce="([^"]+)">/.exec(response.body)?.[1]

    expect(nonce).toBeTruthy()
    expect(csp).toContain(`script-src 'nonce-${nonce}'`)
    expect(csp).toContain("connect-src 'self'")
    expect(csp).not.toContain('unsafe-inline')
    for (const block of styleBlocksOf(response.body)) expect(csp).toContain(sha256(block))
  })

  it('el redirect del formulario nunca amplía la CSP más allá del origen registrado', () => {
    const csp = htmlResponse(200, consent(), {}, { formActionRedirectUri: 'https://client.example/callback?state=abc' })
      .headers['Content-Security-Policy']

    expect(csp).toContain("form-action 'self' https://client.example")
    expect(csp).not.toContain('/callback')
    expect(() => htmlResponse(200, consent(), {}, { formActionRedirectUri: 'javascript:alert(1)' })).toThrow()
  })
})

/**
 * TASK-1835 — Anti-enumeración. Pedir un enlace responde IGUAL exista o no el correo, así que la
 * pantalla que sigue no puede tener variantes: `renderMagicLinkSentPage` no recibe entrada, y eso es
 * la garantía estructural (un parámetro nuevo sería la puerta por la que se filtra la diferencia).
 */
describe('TASK-1835 — anti-enumeración en las pantallas de enlace', () => {
  it('la pantalla «revisa tu correo» no admite entrada y por lo tanto no puede variar', () => {
    expect(renderMagicLinkSentPage.length).toBe(0)
    expect(renderMagicLinkSentPage()).toBe(renderMagicLinkSentPage())
    expect(renderInvitationAcceptedPage.length).toBe(0)
  })

  it('no insinúa si el correo existe ni si la invitación es de otra persona', () => {
    const html = `${renderMagicLinkSentPage()}${renderInvitationAcceptedPage()}`

    for (const leak of ['no encontramos', 'no existe', 'no está registrado', 'ya tiene', 'otra persona']) {
      expect(html.toLowerCase()).not.toContain(leak)
    }
  })

  it('los tres desenlaces del enlace comparten título: el detalle no distingue "no existe" de "vencido"', () => {
    const titles = (['invalid', 'expired', 'already_used'] as const).map(
      kind => /<h1[^>]*>([^<]+)<\/h1>/.exec(renderLinkProblemPage(kind))?.[1]
    )

    expect(new Set(titles).size).toBe(1)
    expect(titles[0]).toBeTruthy()
  })
})

/**
 * TASK-1835 — Ninguna pantalla es un callejón sin salida. Una página que dice «pide uno nuevo desde
 * el inicio de sesión» y no ofrece cómo llegar ahí obliga a la persona a escribir la URL a mano.
 * Las terminales legítimas se declaran arriba con `terminal: true` y llevan su razón acá.
 */
describe('TASK-1835 — toda pantalla ofrece una salida', () => {
  it.each(PAGES.filter(page => !page.terminal).map(page => [page.name, page.html] as const))(
    '%s ofrece una acción',
    (_name, html) => {
      expect(/<(a|button)\b/.test(html)).toBe(true)
    }
  )

  it('las pantallas sin acción lo son a propósito', () => {
    // Correo enviado: la acción vive en el buzón, y ofrecer «reenviar» acá filtraría si el correo existe.
    expect(renderMagicLinkSentPage()).not.toContain('<button')
    // Errores del protocolo y acceso retirado: se vuelve DESDE la aplicación o hablando con Efeonce.
    expect(renderErrorPage('invalid_client')).not.toContain('<button')
    expect(renderAccessRevokedPage()).not.toContain('<button')
    // Sesión iniciada: el wireframe la declara terminal — el destino es la aplicación nativa que
    // pidió el acceso, fuera del navegador, y no hay URL que ofrecer.
    expect(renderSessionStartedPage()).not.toContain('<button')
  })
})

/**
 * TASK-1835 — Los marcadores que la matriz GVC afirma tienen que existir en el DOM real. Sin esto,
 * una aserción de captura puede quedar apuntando a un selector que ya no existe y pasar igual.
 */
describe('TASK-1835 — marcadores de captura declarados', () => {
  it.each([...PAGES.map(page => [page.name, page.html] as const), ...LOGIN_PAGES.map(page => [page.name, page.response.body] as const)])(
    '%s marca la superficie',
    (_name, html) => {
      expect(html).toContain('data-capture="id-shell"')
    }
  )

  it('el consentimiento marca cliente, destino, permisos, formulario y acciones', () => {
    const html = consent()

    for (const marker of ['id-client', 'id-redirect-host', 'id-scopes', 'id-form', 'id-actions']) {
      expect(html).toContain(`data-capture="${marker}"`)
    }
  })

  it('el login marca su formulario, su carril de passkey y su error inline', () => {
    const html = renderLoginPageResponse(200, { returnTo: RETURN_TO }).body

    expect(html).toContain('data-capture="id-form"')
    expect(html).toContain('data-capture="id-passkey"')
    expect(renderLoginPageResponse(400, { returnTo: RETURN_TO, error: 'invalid_email' }).body).toContain(
      'data-capture="id-status"'
    )
  })
})
