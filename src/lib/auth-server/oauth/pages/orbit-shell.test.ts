import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { renderOrbitAssetsModule, ORBIT_ASSET_SOURCES } from '../../../../../scripts/auth-server/generate-orbit-assets'
import { internalLoginFailureResponse } from '../../internal/login-error-page'
import {
  renderAccessRevokedPage,
  renderInvitationAcceptedPage,
  renderInvitationConfirmPage,
  renderLinkProblemPage,
  renderMagicLinkConfirmPage,
  renderMagicLinkSentPage,
  renderRateLimitedPage,
  renderSessionClosedPage,
  renderSessionStartedPage
} from '../../persons/pages'
import { renderStepUpPage } from '../../persons/step-up-page'
import { renderClientMark } from './client-marks'
import { renderConsentPage, renderErrorPage, renderLoginRequiredPage, renderStepUpRequiredPage } from './render'

const consent = (clientId = 'efeonce-rooms-cli') =>
  renderConsentPage({
    organizations: [{ organizationName: 'Efeonce', capabilities: ['efeonce.mcp.rooms.read'] }],
    clientName: 'CLI de Rooms',
    clientId,
    scopes: ['efeonce.mcp.rooms.read', 'efeonce.mcp.rooms.author'],
    returnTo: '/oauth/authorize?client_id=x',
    actionPath: '/oauth/consent',
    redirectHost: '127.0.0.1'
  })

const PAGES: Record<string, () => string> = {
  loginRequired: () => renderLoginRequiredPage('/oauth/authorize?client_id=x'),
  stepUpRequired: () => renderStepUpRequiredPage('/oauth/authorize?client_id=x'),
  consent: () => consent(),
  error: () => renderErrorPage('invalid_client'),
  magicSent: () => renderMagicLinkSentPage(),
  magicConfirm: () => renderMagicLinkConfirmPage('token'),
  linkProblem: () => renderLinkProblemPage('expired'),
  invitationConfirm: () => renderInvitationConfirmPage('token'),
  invitationAccepted: () => renderInvitationAcceptedPage(),
  revoked: () => renderAccessRevokedPage(),
  rateLimited: () => renderRateLimitedPage(),
  sessionStarted: () => renderSessionStartedPage({ direct: true }),
  sessionClosed: () => renderSessionClosedPage(),
  totp: () => renderStepUpPage({ returnTo: '/oauth/authorize?x=1', authLevel: 'primary', hasTotp: true, hasPasskey: true }).body,
  enroll: () => renderStepUpPage({ returnTo: '/oauth/authorize?x=1', authLevel: 'primary', hasTotp: false, hasPasskey: false }).body,
  internalError: () =>
    internalLoginFailureResponse(
      { method: 'GET', url: new URL('https://auth.example/auth/internal/callback'), headers: new Headers({ accept: 'text/html' }), body: '' },
      400,
      'invalid_request'
    ).body
}

/** Marcado visible, sin el controlador serializado ni la hoja de estilos (que nombran clases sin pintarlas). */
const markupOf = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script[\s\S]*?<\/script>/g, '')

/**
 * Canon de La órbita en las pantallas de Efeonce ID (operador, 2026-11-02; skill `efeonce-graphic-line`, lección del
 * mismo día). Estas pruebas ejercitan el HTML que se sirve; el juicio visual sigue en el canvas y en la captura.
 */
describe('Efeonce ID — shell con la órbita', () => {
  it.each(Object.keys(PAGES))('%s: una sola órbita y una sola esfera', name => {
    const html = markupOf(PAGES[name]())

    expect(html.match(/class="os-panel"/g)).toHaveLength(1)
    expect(html.match(/class="os-orbit-sphere"|class="os-word-sphere"/g)).toHaveLength(1)
    expect(html).toContain('data-capture="id-shell"')
  })

  it.each(Object.keys(PAGES))('%s: sin íconos dibujados a mano ni medidas', name => {
    const html = markupOf(PAGES[name]())

    // Los íconos inline de icons.ts son los del diseño anterior; la órbita usa el catálogo AXIS (resolveIcon).
    expect(html).not.toContain('class="id-icon"')
    expect(html).not.toMatch(/data-step="?\d"?[^>]*class="os-orbit/)
    expect(html).not.toContain('os-orbit-measure')
  })

  it('el titular es Bricolage con contraste de pesos y su punto es un elemento propio', () => {
    const html = markupOf(PAGES.consent())

    expect(html).toMatch(/<h1[^>]*class="os-title"[^>]*><span class="os-lead">Autoriza<\/span> el acceso<span class="os-period"/)
  })

  it('el lockup sale de las copias exactas de AXIS', () => {
    const generated = readFileSync(join(process.cwd(), 'src/lib/auth-server/oauth/pages/orbit-assets.generated.ts'), 'utf8')

    expect(generated).toBe(renderOrbitAssetsModule(process.cwd()))

    for (const source of Object.values(ORBIT_ASSET_SOURCES)) {
      expect(readFileSync(join(process.cwd(), source), 'utf8')).not.toMatch(/<style\b|\sclass=/)
    }
  })

  it('el cliente first-party de Rooms lleva su marca; un id parecido por DCR no', () => {
    expect(renderClientMark({ clientId: 'efeonce-rooms-cli', clientName: 'CLI de Rooms' }).verified).toBe(true)
    expect(renderClientMark({ clientId: 'dcr-efeonce-rooms-cli', clientName: 'CLI de Rooms' }).verified).toBe(false)
    expect(markupOf(consent())).not.toContain('data-capture="id-client-unverified"')
    expect(markupOf(consent('dcr-123'))).toContain('data-capture="id-client-unverified"')
  })
})
